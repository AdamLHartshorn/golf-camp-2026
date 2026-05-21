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

export default function LeaderboardPage() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardPlayer[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchLeaderboard() {
      const { data, error } = await supabase
        .from("night_golf_scores")
        .select("player_name, score")
        .eq("night", "tuesday");

      console.log("Tuesday leaderboard fetched rows:", {
        data,
        error,
      });

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

      console.log("Tuesday leaderboard aggregated totals:", aggregatedTotals);

      setLeaderboard(aggregatedTotals);
      setIsLoading(false);
    }

    fetchLeaderboard();
  }, []);

  return (
    <main className="min-h-screen bg-black text-[#f5f5f5] p-6">
      <div className="mx-auto w-full max-w-md space-y-8 py-10">
        <div className="space-y-2">
          <p className="text-sm uppercase tracking-[0.35em] text-[#a3a3a3]">
            Tuesday Night Golf
          </p>

          <h1 className="text-4xl font-bold tracking-tight text-[#f472b6]">
            Leaderboard
          </h1>

          <p className="text-[#a3a3a3]">
            Current standings.
          </p>
        </div>

        <div className="space-y-3">
          {isLoading && (
            <div className="rounded-2xl border border-[#242424] bg-[#111111] p-5 text-center text-[#a3a3a3]">
              Loading leaderboard…
            </div>
          )}

          {!isLoading && leaderboard.length === 0 && (
            <div className="rounded-2xl border border-[#242424] bg-[#111111] p-5 text-center text-[#a3a3a3]">
              No scores submitted yet.
            </div>
          )}

          {!isLoading &&
            leaderboard.map((player, index) => (
              <div
                key={player.name}
                className={`flex items-center justify-between rounded-2xl border p-5 ${
                  index === 0
                    ? "border-[#ec4899] bg-[#111111]"
                    : "border-[#242424] bg-[#111111]"
                }`}
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-full text-lg font-bold ${
                      index === 0
                        ? "bg-[#db2777] text-black"
                        : "bg-black text-[#a3a3a3]"
                    }`}
                  >
                    {index + 1}
                  </div>

                  <div>
                    <p className="text-xl font-bold">{player.name}</p>

                    <p className="text-sm text-[#a3a3a3]">
                      Total Score
                    </p>
                  </div>
                </div>

                <p className="text-3xl font-bold text-[#f472b6]">
                  {player.total}
                </p>
              </div>
            ))}
        </div>

        <Link
          href="/night-golf/tuesday"
          className="block text-center text-sm text-[#a3a3a3]"
        >
          ← Back to Tuesday Night Golf
        </Link>
      </div>
    </main>
  );
}
