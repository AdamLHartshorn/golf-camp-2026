"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { GolfCampIcon } from "@/components/GolfCampIcons";
import { PlayerSilhouette } from "@/components/PlayerSilhouette";
import { displayRanks, getPublicDisplayRank } from "@/lib/playerRanks";
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
  questionnaire_answers: Record<string, string> | null;
};

const fallbackQuestions = [
  ["Question 1", "Answer 1"],
  ["Question 2", "Answer 2"],
  ["Question 3", "Answer 3"],
];

function rankWorstToBestValue(player: DraftPrepPlayer) {
  const publicRank = getPublicDisplayRank(player.display_rank, player.rank);
  const index = displayRanks.indexOf(publicRank as (typeof displayRanks)[number]);

  if (index === -1) {
    return Number.POSITIVE_INFINITY;
  }

  return displayRanks.length - 1 - index;
}

function internalRankValue(value: string | null) {
  const match = String(value || "")
    .trim()
    .toUpperCase()
    .match(/^([A-D])(\d+)$/);

  if (!match) {
    return Number.POSITIVE_INFINITY;
  }

  const rankOffset = "ABCD".indexOf(match[1]) * 1000;
  return rankOffset + Number(match[2]);
}

function getQuestionRows(player: DraftPrepPlayer) {
  const answers = player.questionnaire_answers || {};
  const rows = Object.entries(answers)
    .filter(([, answer]) => String(answer || "").trim().length > 0)
    .slice(0, 3);

  return rows.length > 0 ? rows : fallbackQuestions;
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
          "id, first_name, last_name, display_name, rank, display_rank, internal_rank_order, years_served, photo_url, questionnaire_answers",
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
        const rankDifference = rankWorstToBestValue(a) - rankWorstToBestValue(b);

        if (rankDifference !== 0) {
          return rankDifference;
        }

        return (
          internalRankValue(a.internal_rank_order) -
            internalRankValue(b.internal_rank_order) ||
          String(a.last_name || "").localeCompare(String(b.last_name || "")) ||
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
    <main className="min-h-screen bg-[radial-gradient(circle_at_50%_-8%,rgba(50,77,112,0.2),transparent_34%),radial-gradient(circle_at_92%_10%,rgba(244,241,234,0.07),transparent_28%),#050505] px-4 py-5 text-[#f5f5f5]">
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center gap-4 py-4">
        <header className="flex items-center justify-between gap-4">
          <Link href="/draft" className="text-2xl text-[#a3a3a3]">
            ‹
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
            <div
              ref={carouselRef}
              onScroll={handleScroll}
              className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
              {sortedPlayers.map((player, index) => {
                const publicRank = getPublicDisplayRank(
                  player.display_rank,
                  player.rank,
                );
                const questionRows = getQuestionRows(player);

                return (
                  <article
                    key={player.id}
                    data-draft-prep-card
                    className="min-w-full snap-center overflow-hidden rounded-[1.75rem] border border-[#324d70]/55 bg-[linear-gradient(180deg,rgba(50,77,112,0.2),rgba(7,17,35,0.9)_34%,rgba(8,10,15,0.98))] shadow-[0_30px_90px_rgba(0,0,0,0.56),0_0_55px_rgba(50,77,112,0.13)]"
                  >
                    <div className="relative h-[21rem] overflow-hidden border-b border-[#324d70]/35 bg-[#080d18]">
                      {player.photo_url ? (
                        <div
                          className="absolute inset-0 bg-cover bg-center"
                          style={{ backgroundImage: `url(${player.photo_url})` }}
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center bg-[radial-gradient(circle_at_50%_16%,rgba(143,166,106,0.12),transparent_38%),#090b0f]">
                          <PlayerSilhouette
                            label={player.display_name}
                            className="h-44 w-44 border-[#324d70]/55 bg-[#0c1420] text-[#d7dfeb]"
                          />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.02),rgba(0,0,0,0.14)_42%,rgba(0,0,0,0.86))]" />
                      <div className="absolute left-5 right-5 top-5 flex items-center justify-between">
                        <span className="rounded-full border border-[#8fb0d8]/40 bg-black/45 px-3 py-1 font-mono text-[10px] font-black uppercase tracking-[0.18em] text-[#8fb0d8] backdrop-blur">
                          Card {index + 1}/{sortedPlayers.length}
                        </span>
                        <span className="rounded-full border border-[#8fb0d8]/45 bg-[#071123]/75 px-4 py-2 text-xl font-black text-[#f4f1ea] shadow-[0_0_24px_rgba(50,77,112,0.2)]">
                          {publicRank}
                        </span>
                      </div>
                      <div className="absolute bottom-0 left-0 right-0 p-5">
                        <h2 className="text-4xl font-black leading-none tracking-tight text-[#f4f1ea] drop-shadow-[0_12px_28px_rgba(0,0,0,0.7)]">
                          {player.display_name}
                        </h2>
                        <p className="mt-3 font-mono text-[10px] font-black uppercase tracking-[0.2em] text-[#b8c3d4]">
                          {typeof player.years_served === "number"
                            ? `${player.years_served} Years Served`
                            : "Years Served TBD"}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-3 p-5">
                      {questionRows.map(([question, answer]) => (
                        <div
                          key={question}
                          className="rounded-2xl border border-[#24364f]/55 bg-black/24 px-4 py-3"
                        >
                          <p className="font-mono text-[9px] font-black uppercase tracking-[0.18em] text-[#8fb0d8]">
                            {question}
                          </p>
                          <p className="mt-1 text-sm font-semibold leading-5 text-[#f4f1ea]">
                            {answer}
                          </p>
                        </div>
                      ))}
                    </div>
                  </article>
                );
              })}
            </div>

            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => goToCard(activeIndex - 1)}
                disabled={activeIndex === 0}
                className="rounded-full border border-[#324d70]/60 bg-[#071123]/80 px-5 py-3 text-sm font-black text-[#d7dfeb] transition hover:border-[#8fb0d8]/70 disabled:cursor-not-allowed disabled:opacity-35"
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
                className="rounded-full border border-[#324d70]/60 bg-[#071123]/80 px-5 py-3 text-sm font-black text-[#d7dfeb] transition hover:border-[#8fb0d8]/70 disabled:cursor-not-allowed disabled:opacity-35"
              >
                Next →
              </button>
            </div>

            <Link
              href="/draft"
              className="sticky bottom-4 z-10 block rounded-2xl border border-[#324d70]/60 bg-[#071123]/90 px-5 py-4 text-center text-sm font-black uppercase tracking-[0.14em] text-[#d7dfeb] shadow-[0_18px_46px_rgba(0,0,0,0.45),0_0_30px_rgba(50,77,112,0.14)] backdrop-blur transition hover:border-[#8fb0d8]/70"
            >
              Back to Draft
            </Link>
          </>
        )}
      </div>
    </main>
  );
}
