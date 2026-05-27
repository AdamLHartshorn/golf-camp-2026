"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { PlayerSilhouette } from "@/components/PlayerSilhouette";
import { getPublicDisplayRank } from "@/lib/playerRanks";

type PlayerRow = {
  id: string;
  first_name: string;
  last_name: string;
  display_name: string;
  rank: "A" | "B" | "C" | "D" | null;
  display_rank: string | null;
  internal_rank_order: string | null;
  years_served: number | null;
  room: string | null;
  arrival: string | null;
  photo_url: string | null;
};

const rankStyles: Record<string, string> = {
  A: "border-[#b08a38]/70 bg-[#2a2110] text-[#d9c06a]",
  B: "border-[#aaa39a]/70 bg-[#232321] text-[#d8d3c8]",
  C: "border-[#a6744a]/70 bg-[#281b13] text-[#d0a078]",
  D: "border-[#8c93a0]/70 bg-[#171b22] text-[#aeb7c4]",
};

export default function CampRosterPage() {
  const [players, setPlayers] = useState<PlayerRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isCurrent = true;

    async function fetchPlayers() {
      const { data, error: fetchError } = await supabase
        .from("players")
        .select("id, first_name, last_name, display_name, rank, display_rank, internal_rank_order, years_served, room, arrival, photo_url")
        .eq("active", true)
        .order("last_name", { ascending: true })
        .order("first_name", { ascending: true });

      console.log("Camp roster players fetch:", {
        data,
        error: fetchError,
      });

      if (!isCurrent) {
        return;
      }

      if (fetchError) {
        setPlayers([]);
        setError(fetchError.message || "Could not load roster.");
        setIsLoading(false);
        return;
      }

      setPlayers((data as PlayerRow[]) || []);
      setIsLoading(false);
    }

    fetchPlayers();

    return () => {
      isCurrent = false;
    };
  }, []);

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(244,241,234,0.08),transparent_34%),#050505] p-5 text-[#f5f5f5]">
      <div className="mx-auto w-full max-w-md space-y-5 py-6">
        <div className="flex items-center justify-between gap-4">
          <Link href="/camp-office" className="text-2xl text-[#a3a3a3]">
            ‹
          </Link>
          <p className="font-mono text-sm uppercase tracking-[0.22em] text-[#f5f5f5]">
            Camp Roster
          </p>
          <span className="text-xl text-[#a3a3a3]">⌕</span>
        </div>

        <div className="overflow-hidden rounded-[1.65rem] border border-[#2f2a22] bg-[#0d0d0b]/95 text-[#f5f5f5] shadow-[0_28px_80px_rgba(0,0,0,0.48),0_0_48px_rgba(244,241,234,0.05)]">
          <div className="border-b border-[#2a2925] px-5 py-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#b8b0a1]">
              Players, rooms, arrivals
            </p>
          </div>
          <div className="grid grid-cols-[4.25rem_1fr_3rem] border-b border-[#2a2925] px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#b8b0a1]">
            <span>ID</span>
            <span>Player</span>
            <span className="text-right">Rank</span>
          </div>

          {isLoading && (
            <div className="p-5 text-center text-sm text-[#b8b0a1]">
              Loading roster...
            </div>
          )}

          {!isLoading && error && (
            <div className="p-5 text-center text-sm text-[#ff8a8a]">
              {error}
            </div>
          )}

          {!isLoading && !error && players.length === 0 && (
            <div className="p-5 text-center text-sm text-[#b8b0a1]">
              No active players yet.
            </div>
          )}

          {!isLoading && !error && players.map((player) => (
            <Link
              key={player.id}
              href={`/camp-office/roster/${player.id}`}
              className="grid grid-cols-[4.25rem_1fr_3rem] items-center border-b border-[#2a2925] px-4 py-3.5 transition hover:bg-[#161511] last:border-b-0"
            >
              {player.photo_url ? (
                <div
                  aria-label={`${player.display_name} profile`}
                  className="h-12 w-12 shrink-0 rounded-full border border-[#34312a] bg-cover bg-center"
                  role="img"
                  style={{ backgroundImage: `url(${player.photo_url})` }}
                />
              ) : (
                <PlayerSilhouette
                  className="h-12 w-12"
                  label={`${player.display_name} profile placeholder`}
                />
              )}

              <div className="min-w-0">
                <h2 className="truncate text-lg font-semibold tracking-[-0.02em]">
                  {player.display_name}
                </h2>

                <p className="mt-1 text-sm text-[#b8b0a1]">
                  Room {player.room || "-"} ·{" "}
                  {typeof player.years_served === "number"
                    ? `${player.years_served} Years Served`
                    : player.arrival || "Arrival TBD"}
                </p>
              </div>

              <div
                className={`flex h-10 w-10 items-center justify-center justify-self-end rounded-xl border text-lg font-semibold ${
                  rankStyles[player.rank || ""] ||
                  "border-[#34312a] bg-black/35 text-[#b8b0a1]"
                }`}
              >
                {getPublicDisplayRank(player.display_rank, player.rank)}
              </div>
            </Link>
          ))}
        </div>

        <Link
          href="/camp-office"
          className="block text-center text-sm text-[#a3a3a3]"
        >
          ← Back to Camp Office
        </Link>
      </div>
    </main>
  );
}
