"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type ScoreRow = {
  player_name: string | null;
  score: number | null;
};

type LeaderboardPlayer = {
  name: string;
  total: number;
};

type NightGolfLeaderboardPageProps = {
  night: string;
  nightLabel: string;
  backHref: string;
};

export function NightGolfLeaderboardPage({
  night,
  nightLabel,
  backHref,
}: NightGolfLeaderboardPageProps) {
  const [leaderboard, setLeaderboard] = useState<LeaderboardPlayer[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchLeaderboard() {
      const { data, error } = await supabase
        .from("night_golf_scores")
        .select("player_name, score")
        .eq("night", night);

      if (error) {
        setLeaderboard([]);
        setIsLoading(false);
        return;
      }

      const totals = (data as ScoreRow[]).reduce<Record<string, number>>(
        (accumulator, row) => {
          const playerName = row.player_name?.trim();

          if (!playerName) {
            return accumulator;
          }

          accumulator[playerName] =
            (accumulator[playerName] || 0) + (row.score || 0);

          return accumulator;
        },
        {},
      );

      const aggregatedTotals = Object.entries(totals)
        .map(([name, total]) => ({ name, total }))
        .sort((a, b) => b.total - a.total);

      setLeaderboard(aggregatedTotals);
      setIsLoading(false);
    }

    fetchLeaderboard();
  }, [night, nightLabel]);

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(236,72,153,0.11),transparent_34%),#050505] p-5 text-[#f5f5f5]">
      <Link href={backHref} className="gc-back-link gc-floating-back gc-back-night">
        ← BACK
      </Link>
      <div className="mx-auto w-full max-w-md space-y-7 py-8">
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-[0.28em] text-[#a3a3a3]">
            {nightLabel} Night Golf
          </p>

          <h1 className="text-[2.7rem] font-semibold leading-none tracking-[-0.04em] text-[#f5f5f5]">
            Leaderboard
          </h1>

          <p className="text-[#a3a3a3]">
            Current standings.
          </p>
        </div>

        <div className="overflow-hidden rounded-[1.65rem] border border-[#d8d1c4]/80 bg-[#efe9dc] text-[#17130e] shadow-[0_18px_50px_rgba(0,0,0,0.3)]">
          <div className="flex items-center justify-between border-b border-[#d8d1c4] px-5 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#7a6f60]">
              Standings
            </p>

            <span className="h-1.5 w-10 rounded-full bg-[#db2777]" />
          </div>

          {isLoading && (
            <div className="p-6 text-center text-sm text-[#7a6f60]">
              Loading leaderboard…
            </div>
          )}

          {!isLoading && leaderboard.length === 0 && (
            <div className="p-6 text-center text-sm text-[#7a6f60]">
              No scores submitted yet.
            </div>
          )}

          {!isLoading &&
            leaderboard.map((player, index) => (
              <div
                key={player.name}
                className="flex items-center justify-between border-b border-[#d8d1c4]/80 px-5 py-4 last:border-b-0"
              >
                <div className="flex min-w-0 items-center gap-4">
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${
                      index === 0
                        ? "bg-[#db2777] text-white"
                        : "bg-[#17130e] text-[#efe9dc]"
                    }`}
                  >
                    {index + 1}
                  </div>

                  <div className="min-w-0">
                    <p className="truncate text-lg font-semibold tracking-[-0.02em]">
                      {player.name}
                    </p>

                    <p className="text-xs uppercase tracking-[0.18em] text-[#7a6f60]">
                      Total Score
                    </p>
                  </div>
                </div>

                <p className="text-3xl font-semibold tracking-[-0.04em] text-[#17130e]">
                  {player.total}
                </p>
              </div>
            ))}
        </div>
      </div>
    </main>
  );
}
