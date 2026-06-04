"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
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

export default function DraftPrepPage() {
  const [players, setPlayers] = useState<DraftPrepPlayer[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
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

      setPlayers((data as DraftPrepPlayer[]) || []);
      setError("");
      setIsLoading(false);
    }

    fetchPlayers();

    return () => {
      isCurrent = false;
    };
  }, []);

  const sortedPlayers = useMemo(
    () =>
      players.slice().sort((a, b) => {
        return (
          String(a.last_name || "").localeCompare(String(b.last_name || "")) ||
          String(a.first_name || "").localeCompare(String(b.first_name || "")) ||
          a.display_name.localeCompare(b.display_name)
        );
      }),
    [players],
  );

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
                    className="draft-prep-card draft-prep-trading-card min-w-full snap-center overflow-hidden rounded-[1.05rem] border border-[#7da6d6]/62 bg-[#07101f] shadow-[0_30px_90px_rgba(0,0,0,0.56),0_0_55px_rgba(50,77,112,0.18)]"
                  >
                    <div className="border-b border-[#7da6d6]/40 bg-[linear-gradient(90deg,rgba(125,166,214,0.18),rgba(7,17,35,0.92)_34%,rgba(125,166,214,0.1))] px-4 py-3">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="font-mono text-[8px] font-black uppercase tracking-[0.22em] text-[#8fb0d8]">
                            Golf Camp Draft Prep
                          </p>
                          <p className="mt-1 font-mono text-[9px] font-black uppercase tracking-[0.16em] text-[#d7dfeb]">
                            Card {String(index + 1).padStart(2, "0")} /{" "}
                            {String(sortedPlayers.length).padStart(2, "0")}
                          </p>
                        </div>

                        <div className="flex items-center overflow-hidden rounded-[0.7rem] border border-[#8fb0d8]/55 bg-[#d7dfeb] text-[#071123] shadow-[0_0_24px_rgba(125,166,214,0.26)]">
                          <span className="px-4 py-2 text-2xl font-black leading-none">
                            {publicRank}
                          </span>
                          <span className="border-l border-[#071123]/18 px-3.5 py-2 font-mono text-[10px] font-black uppercase tracking-[0.16em] text-[#24364f]">
                            {seasonsLabel}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="draft-prep-photo-panel relative h-[20rem] overflow-hidden border-b border-[#324d70]/35 bg-[#080d18]">
                      {player.photo_url ? (
                        <div
                          className="absolute inset-0 bg-cover bg-center"
                          style={{ backgroundImage: `url(${player.photo_url})` }}
                        />
                      ) : (
                        <div className="draft-prep-photo-empty absolute inset-0 flex items-center justify-center bg-[radial-gradient(circle_at_50%_16%,rgba(143,166,106,0.12),transparent_38%),#090b0f]">
                          <PlayerSilhouette
                            label={player.display_name}
                            className="h-44 w-44 border-[#324d70]/55 bg-[#0c1420] text-[#d7dfeb]"
                          />
                        </div>
                      )}
                      <div className="draft-prep-photo-scrim absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.02),rgba(0,0,0,0.14)_42%,rgba(0,0,0,0.86))]" />
                      <div className="absolute bottom-0 left-0 right-0 p-5">
                        <h2 className="text-[2.65rem] font-black uppercase leading-[0.9] tracking-[-0.05em] text-[#f4f1ea] drop-shadow-[0_12px_28px_rgba(0,0,0,0.7)]">
                          {player.display_name}
                        </h2>
                      </div>
                    </div>

                    <div className="space-y-4 p-5">
                      <section className="rounded-2xl border border-[#8fb0d8]/25 bg-[#071123]/72 p-4 shadow-[inset_0_0_24px_rgba(50,77,112,0.16)]">
                        <div className="mb-3 flex items-center justify-between gap-3">
                          <p className="font-mono text-[11px] font-black uppercase tracking-[0.2em] text-[#8fb0d8]">
                            2025 Performance
                          </p>
                          <span className="rounded-full border border-[#324d70]/65 px-2.5 py-1 font-mono text-[8px] font-black uppercase tracking-[0.16em] text-[#b8c3d4]">
                            Scouting
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          {performanceRows.map(([label, value]) => (
                            <div
                              key={label}
                              className="rounded-[0.75rem] border border-[#7da6d6]/30 bg-black/26 px-3 py-2"
                            >
                              <p className="font-mono text-[9px] font-black uppercase tracking-[0.13em] text-[#a7b7ce]">
                                {label}
                              </p>
                              <p className="mt-1 text-lg font-black leading-5 text-[#f4f1ea]">
                                {value}
                              </p>
                            </div>
                          ))}
                        </div>
                      </section>

                      <section className="space-y-3">
                        <p className="font-mono text-[11px] font-black uppercase tracking-[0.2em] text-[#8fb0d8]">
                          Full Questionnaire Responses
                        </p>

                        {questionRows.length === 0 && (
                          <div className="draft-prep-qa-card rounded-2xl border border-[#24364f]/55 bg-black/24 px-4 py-3">
                            <p className="text-sm font-semibold leading-5 text-[#b8c3d4]">
                              Questionnaire responses pending.
                            </p>
                          </div>
                        )}

                        {questionRows.map(([question, answer]) => (
                          <div
                            key={question}
                            className="draft-prep-qa-card rounded-[0.8rem] border border-[#24364f]/55 bg-black/24 px-4 py-3"
                          >
                            <p className="font-mono text-[10px] font-black uppercase tracking-[0.16em] text-[#8fb0d8]">
                              {question}
                            </p>
                            <p className="mt-2 whitespace-pre-line text-sm font-semibold leading-5 text-[#f4f1ea]">
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
