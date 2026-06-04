"use client";

import { toPng } from "html-to-image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { GolfCampIcon } from "@/components/GolfCampIcons";
import { PlayerSilhouette } from "@/components/PlayerSilhouette";
import { getPublicDisplayRank } from "@/lib/playerRanks";
import { supabase } from "@/lib/supabase";

type DraftPrepPlayer = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  display_name: string;
  rank: string | null;
  display_rank: string | null;
  internal_rank_order: string | null;
  years_served: number | null;
  photo_url: string | null;
  questionnaire_answers: Record<string, QuestionnaireAnswerValue> | null;
  scouting_2025_draft_value_grade: string | null;
  scouting_2025_draft_value_index: string | null;
  scouting_2025_avg_draft_position: number | null;
  scouting_2025_total_earnings: number | null;
  scouting_2025_best_finish: string | null;
};

type QuestionnaireAnswerValue =
  | string
  | {
      question?: string;
      answer?: string;
    };

function getAnswerText(value: QuestionnaireAnswerValue | undefined) {
  if (typeof value === "string") {
    return value.trim();
  }

  if (value && typeof value === "object") {
    return String(value.answer || "").trim();
  }

  return "";
}

function getQuestionRows(player: DraftPrepPlayer): Array<readonly [string, string]> {
  const answers = player.questionnaire_answers || {};
  const importedRows = Object.entries(answers)
    .map(([key, value]) => {
      if (!key.match(/^q\d+$/i) || typeof value !== "object" || !value) {
        return null;
      }

      return [
        String(value.question || key.toUpperCase()),
        String(value.answer || "").trim(),
        Number(key.replace(/\D/g, "")) || Number.POSITIVE_INFINITY,
      ] as const;
    })
    .filter((row): row is readonly [string, string, number] =>
      Boolean(row && row[1]),
    )
    .sort((a, b) => a[2] - b[2])
    .map(([question, answer]) => [question, answer] as const);

  if (importedRows.length > 0) {
    return importedRows;
  }

  const legacyRows: Array<[string, QuestionnaireAnswerValue | undefined]> = [
    ["Strength", answers.strength || answers.personal_scouting_report],
    ["Weakness", answers.weakness || answers.most_likely_to],
    ["Other", answers.other || answers.other_funny_notes],
  ];
  const rows = legacyRows
    .map(([question, answer]) => [
      question,
      getAnswerText(answer),
    ] as const)
    .filter(([, answer]) => answer.length > 0);

  return rows;
}

function formatMoney(value: number | null) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return "N/A";
  }

  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: value % 1 === 0 ? 0 : 2,
  });
}

function formatScoutingNumber(value: number | null) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return "N/A";
  }

  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function shufflePlayers(players: DraftPrepPlayer[]) {
  const deck = players.slice();

  for (let index = deck.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [deck[index], deck[swapIndex]] = [deck[swapIndex], deck[index]];
  }

  return deck;
}

function getCardFilename(player: DraftPrepPlayer | undefined) {
  const name = player?.display_name || "draft-prep-card";
  return `${name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")}-draft-prep-card.png`;
}

export default function DraftPrepPage() {
  const [players, setPlayers] = useState<DraftPrepPlayer[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [saveMessage, setSaveMessage] = useState("");
  const [isSavingCard, setIsSavingCard] = useState(false);
  const carouselRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let isCurrent = true;

    async function fetchPlayers() {
      const { data, error: fetchError } = await supabase
        .from("players")
        .select(
          "id, first_name, last_name, display_name, rank, display_rank, internal_rank_order, years_served, photo_url, questionnaire_answers, scouting_2025_draft_value_grade, scouting_2025_draft_value_index, scouting_2025_avg_draft_position, scouting_2025_total_earnings, scouting_2025_best_finish",
        )
        .eq("active", true);

      if (!isCurrent) {
        return;
      }

      if (fetchError) {
        setPlayers([]);
        setError(fetchError.message || "Could not load draft prep.");
        setIsLoading(false);
        return;
      }

      setPlayers(shufflePlayers((data as DraftPrepPlayer[]) || []));
      setActiveIndex(0);
      setError("");
      setIsLoading(false);
    }

    fetchPlayers();

    return () => {
      isCurrent = false;
    };
  }, []);

  const sortedPlayers = players;

  function goToCard(nextIndex: number) {
    const clampedIndex = Math.min(
      Math.max(nextIndex, 0),
      Math.max(sortedPlayers.length - 1, 0),
    );

    setActiveIndex(clampedIndex);
    carouselRef.current
      ?.querySelectorAll<HTMLElement>("[data-draft-prep-card]")
      [clampedIndex]?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "center",
      });
  }

  function handleScroll() {
    const carousel = carouselRef.current;

    if (!carousel) {
      return;
    }

    const cardWidth = carousel.clientWidth;
    const nextIndex = Math.round(carousel.scrollLeft / cardWidth);
    setActiveIndex(Math.min(Math.max(nextIndex, 0), sortedPlayers.length - 1));
  }

  async function saveCurrentCard() {
    const activePlayer = sortedPlayers[activeIndex];
    const cardElement =
      carouselRef.current?.querySelectorAll<HTMLElement>(
        "[data-draft-prep-card]",
      )[activeIndex];

    if (!activePlayer || !cardElement) {
      setSaveMessage("Card not ready yet.");
      return;
    }

    setIsSavingCard(true);
    setSaveMessage("");

    try {
      const dataUrl = await toPng(cardElement, {
        backgroundColor: "#f4ead2",
        cacheBust: true,
        pixelRatio: 2,
      });
      const link = document.createElement("a");
      link.download = getCardFilename(activePlayer);
      link.href = dataUrl;
      link.click();
      setSaveMessage("Card image ready.");
    } catch (saveError) {
      console.warn("Draft prep card save failed", saveError);
      setSaveMessage("Could not save this card. Try again.");
    } finally {
      setIsSavingCard(false);
    }
  }

  return (
    <main className="draft-prep-shell min-h-screen bg-[radial-gradient(circle_at_50%_-8%,rgba(50,77,112,0.2),transparent_34%),radial-gradient(circle_at_92%_10%,rgba(244,241,234,0.07),transparent_28%),#050505] px-4 py-5 text-[#f5f5f5]">
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center gap-4 py-4">
        <header className="flex items-center justify-between gap-4">
          <Link href="/draft" className="gc-back-link">
            ← BACK
          </Link>
          <div className="text-center">
            <p className="font-mono text-[10px] font-black uppercase tracking-[0.24em] text-[#8fb0d8]">
              Draft Prep
            </p>
            <h1 className="mt-1 text-xl font-black tracking-tight">
              Scouting Cards
            </h1>
          </div>
          <span className="flex h-9 w-9 items-center justify-center rounded-full border border-[#324d70]/70 bg-[#071123] text-[#8fb0d8]">
            <GolfCampIcon name="draft" className="h-4 w-4" />
          </span>
        </header>

        {isLoading && (
          <section className="rounded-3xl border border-[#324d70]/45 bg-[#071123]/80 p-6 text-sm font-semibold text-[#93a3bb]">
            Loading scouting cards...
          </section>
        )}

        {!isLoading && error && (
          <section className="rounded-3xl border border-[#5a2b33] bg-[#14090c]/80 p-6 text-sm font-semibold text-[#fca5a5]">
            {error}
          </section>
        )}

        {!isLoading && !error && sortedPlayers.length === 0 && (
          <section className="rounded-3xl border border-[#324d70]/45 bg-[#071123]/80 p-6 text-sm font-semibold text-[#93a3bb]">
            No active players found.
          </section>
        )}

        {!isLoading && !error && sortedPlayers.length > 0 && (
          <>
            <div className="draft-prep-stack relative">
            <div
              ref={carouselRef}
              onScroll={handleScroll}
              className="-mx-4 flex snap-x snap-mandatory items-start gap-4 overflow-x-auto px-4 pb-2 scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
              {sortedPlayers.map((player, index) => {
                const publicRank = getPublicDisplayRank(
                  player.display_rank,
                  player.rank,
                );
                const seasonsLabel =
                  typeof player.years_served === "number"
                    ? `season ${player.years_served}`
                    : "season ?";
                const questionRows = getQuestionRows(player);
                const performanceRows = [
                  [
                    "Draft Value Index",
                    player.scouting_2025_draft_value_index ||
                      player.scouting_2025_draft_value_grade ||
                      "N/A",
                  ],
                  [
                    "Avg Draft Position",
                    formatScoutingNumber(
                      player.scouting_2025_avg_draft_position,
                    ),
                  ],
                  [
                    "Total Earnings",
                    formatMoney(player.scouting_2025_total_earnings),
                  ],
                  [
                    "Best Finish",
                    player.scouting_2025_best_finish || "N/A",
                  ],
                ];

                return (
                  <article
                    key={player.id}
                    data-draft-prep-card
                    className="draft-prep-card draft-prep-trading-card min-w-full snap-center overflow-hidden rounded-[0.38rem] border-[5px] border-[#f6d34b] bg-[#f4ead2] p-2 text-[#17120c] shadow-[0_30px_90px_rgba(0,0,0,0.62),0_0_0_2px_rgba(192,43,39,0.82)]"
                  >
                    <div className="rounded-[0.18rem] border-[3px] border-[#17120c] bg-[repeating-linear-gradient(-45deg,rgba(192,43,39,0.16)_0_9px,rgba(37,87,151,0.14)_9px_18px),linear-gradient(180deg,#fff3c8,#f4ead2)] p-2">
                      <div className="draft-prep-card-topper flex items-center justify-between gap-3 border-[3px] border-[#17120c] bg-[#c02b27] px-2 py-1.5 text-[#fff3c8] shadow-[3px_3px_0_#255797]">
                        <div className="flex items-baseline gap-2">
                          <p className="text-xl font-black uppercase italic leading-none tracking-[-0.055em]">
                            Longview
                          </p>
                          <p className="font-mono text-[8px] font-black uppercase tracking-[0.2em] text-[#f6d34b]">
                            Draft Prep
                          </p>
                        </div>

                        <p className="font-mono text-[9px] font-black uppercase tracking-[0.12em] text-[#fff3c8]">
                          {String(index + 1).padStart(2, "0")} /{" "}
                          {String(sortedPlayers.length).padStart(2, "0")}
                        </p>
                      </div>

                      <div className="relative mt-3 overflow-hidden rounded-[0.18rem] border-[4px] border-[#17120c] bg-[#255797] p-2 shadow-[5px_5px_0_#c02b27]">
                        <div className="absolute left-4 top-4 z-20 flex rotate-[-3deg] items-center overflow-hidden rounded-[0.2rem] border-[3px] border-[#17120c] bg-[#f6d34b] text-[#17120c] shadow-[4px_4px_0_rgba(0,0,0,0.35)]">
                          <span className="px-3.5 py-2 text-3xl font-black leading-none">
                            {publicRank}
                          </span>
                          <span className="border-l-[3px] border-[#17120c] px-3 py-2 font-mono text-[10px] font-black uppercase tracking-[0.1em] text-[#c02b27]">
                            {seasonsLabel}
                          </span>
                        </div>

                        <div className="draft-prep-photo-panel relative h-[21rem] overflow-hidden rounded-[0.08rem] border-[3px] border-[#fff3c8] bg-[#080d18]">
                          {player.photo_url ? (
                            <div
                              className="absolute inset-0 bg-cover bg-center"
                              style={{
                                backgroundImage: `url(${player.photo_url})`,
                              }}
                            />
                          ) : (
                            <div className="draft-prep-photo-empty absolute inset-0 flex items-center justify-center bg-[radial-gradient(circle_at_50%_16%,rgba(143,166,106,0.12),transparent_38%),#090b0f]">
                              <PlayerSilhouette
                                label={player.display_name}
                                className="h-44 w-44 border-[#324d70]/55 bg-[#0c1420] text-[#d7dfeb]"
                              />
                            </div>
                          )}
                          <div className="draft-prep-photo-scrim absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.0),rgba(0,0,0,0.02)_44%,rgba(0,0,0,0.42))]" />
                          <div className="absolute bottom-0 left-0 right-0 p-3">
                            <div className="draft-prep-nameplate -skew-x-6 rounded-[0.08rem] border-[3px] border-[#17120c] bg-[#fff3c8] px-3 py-2 text-[#17120c] shadow-[5px_5px_0_#c02b27]">
                              <h2 className="skew-x-6 text-[2.45rem] font-black uppercase italic leading-[0.83] tracking-[-0.07em]">
                                {player.display_name}
                              </h2>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="mt-3 rounded-[0.14rem] border-[3px] border-[#17120c] bg-[#fff3c8] p-2 text-[#17120c] shadow-[4px_4px_0_#255797]">
                        <div className="mb-2 flex items-center justify-between border-b-[3px] border-[#17120c] bg-[#f6d34b] px-2 py-1">
                          <h3 className="text-[1.32rem] font-black uppercase italic leading-none tracking-[-0.045em]">
                            2025 Performance
                          </h3>
                          <span className="font-mono text-[9px] font-black uppercase tracking-[0.12em] text-[#c02b27]">
                            Scouting Line
                          </span>
                        </div>

                        <div className="divide-y-[3px] divide-[#17120c] border-[3px] border-[#17120c] bg-[#f4ead2]">
                          {performanceRows.map(([label, value]) => (
                            <div
                              key={label}
                              className="grid grid-cols-[1.12fr_0.88fr] items-center gap-3 px-2 py-2"
                            >
                              <p className="font-mono text-[10px] font-black uppercase tracking-[0.11em] text-[#255797]">
                                {label}
                              </p>
                              <p className="text-right text-2xl font-black uppercase italic leading-none tracking-[-0.04em] text-[#c02b27]">
                                {value}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>

                      <section className="mt-3 rounded-[0.14rem] border-[3px] border-[#17120c] bg-[#f4ead2] p-3 text-[#17120c] shadow-[4px_4px_0_#c02b27]">
                        <div className="mb-2 flex items-center justify-between border-b-[3px] border-[#17120c] bg-[#255797] px-2 py-1 text-[#fff3c8]">
                          <h3 className="text-[1.32rem] font-black uppercase italic leading-none tracking-[-0.045em]">
                            Scouting Report
                          </h3>
                          <span className="font-mono text-[9px] font-black uppercase tracking-[0.12em] text-[#f6d34b]">
                            Card Back
                          </span>
                        </div>

                        {questionRows.length === 0 && (
                          <div className="draft-prep-qa-card rounded-[0.1rem] border-[3px] border-[#17120c] bg-[#fff3c8] px-4 py-3">
                            <p className="text-sm font-bold leading-5 text-[#17120c]">
                              Questionnaire responses pending.
                            </p>
                          </div>
                        )}

                        {questionRows.map(([question, answer]) => (
                          <div
                            key={question}
                            className="draft-prep-qa-card border-b-[3px] border-[#17120c]/80 px-1 py-3 last:border-b-0"
                          >
                            <p className="font-mono text-[10px] font-black uppercase tracking-[0.1em] text-[#c02b27]">
                              {question}
                            </p>
                            <p className="mt-2 whitespace-pre-line text-sm font-bold leading-5 text-[#17120c]">
                              {answer}
                            </p>
                          </div>
                        ))}
                      </section>
                    </div>
                  </article>
                );
              })}
            </div>
            </div>

            <div className="flex flex-col items-center gap-2">
              <button
                type="button"
                onClick={saveCurrentCard}
                disabled={isSavingCard}
                className="rounded-[0.35rem] border-[3px] border-[#17120c] bg-[#f6d34b] px-5 py-3 text-sm font-black uppercase tracking-[0.12em] text-[#17120c] shadow-[4px_4px_0_#c02b27] transition active:translate-x-0.5 active:translate-y-0.5 active:shadow-[2px_2px_0_#c02b27] disabled:cursor-wait disabled:opacity-65"
              >
                {isSavingCard ? "Saving..." : "Save Card"}
              </button>
              {saveMessage && (
                <p className="font-mono text-[10px] font-black uppercase tracking-[0.16em] text-[#b8c3d4]">
                  {saveMessage}
                </p>
              )}
            </div>

            <div className="flex items-center justify-center gap-1.5">
              {sortedPlayers.slice(0, 12).map((player, index) => (
                <button
                  key={player.id}
                  type="button"
                  onClick={() => goToCard(index)}
                  aria-label={`Go to draft prep card ${index + 1}`}
                  className={`h-1.5 rounded-full transition ${
                    index === activeIndex
                      ? "w-7 bg-[#8fb0d8]"
                      : "w-1.5 bg-[#324d70]/70"
                  }`}
                />
              ))}
              {sortedPlayers.length > 12 && (
                <span className="ml-1 font-mono text-[9px] font-black text-[#8a94a6]">
                  +{sortedPlayers.length - 12}
                </span>
              )}
            </div>

            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => goToCard(activeIndex - 1)}
                disabled={activeIndex === 0}
                className="draft-prep-control rounded-full border border-[#324d70]/60 bg-[#071123]/80 px-5 py-3 text-sm font-black text-[#d7dfeb] transition hover:border-[#8fb0d8]/70 disabled:cursor-not-allowed disabled:opacity-35"
              >
                ← Previous
              </button>
              <p className="font-mono text-[10px] font-black uppercase tracking-[0.2em] text-[#8a94a6]">
                Swipe · {activeIndex + 1}/{sortedPlayers.length}
              </p>
              <button
                type="button"
                onClick={() => goToCard(activeIndex + 1)}
                disabled={activeIndex === sortedPlayers.length - 1}
                className="draft-prep-control rounded-full border border-[#324d70]/60 bg-[#071123]/80 px-5 py-3 text-sm font-black text-[#d7dfeb] transition hover:border-[#8fb0d8]/70 disabled:cursor-not-allowed disabled:opacity-35"
              >
                Next →
              </button>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
