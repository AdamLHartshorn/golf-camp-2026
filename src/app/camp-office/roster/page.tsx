"use client";

import Link from "next/link";
import type { CSSProperties } from "react";
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
    <main className="gc-mobile-shell" style={{ "--page-accent": "#f4f1ea" } as CSSProperties}>
      <div className="gc-mobile-stage justify-start">
        <div className="gc-topbar">
          <Link href="/camp-office" className="gc-back-link">
            ← BACK
          </Link>
          <p className="gc-topbar-title">
            Camp Roster
          </p>
          <span className="gc-top-icon text-xl">⌕</span>
        </div>

        <div className="gc-edge-card text-[#f5f5f5]">
          <div className="gc-section-head">
            <p className="gc-card-kicker">
              Players, rooms, years served
            </p>
          </div>
          <div className="grid grid-cols-[5rem_1fr_3rem] border-b border-[#2a2925] px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#b8b0a1]">
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
              className="camp-roster-player-row grid grid-cols-[5rem_1fr_3rem] items-center border-b border-[#2a2925] px-4 py-4 transition last:border-b-0"
            >
              {player.photo_url ? (
                <div
                  aria-label={`${player.display_name} profile`}
                  className="h-14 w-14 shrink-0 rounded-full border border-[#4a453c] bg-cover bg-center shadow-[0_12px_30px_rgba(0,0,0,0.28)]"
                  role="img"
                  style={{ backgroundImage: `url(${player.photo_url})` }}
                />
              ) : (
                <PlayerSilhouette
                  className="h-14 w-14 border-[#4a453c] shadow-[0_12px_30px_rgba(0,0,0,0.28)]"
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
                    ? player.years_served === 0
                      ? "Rookie"
                      : `${player.years_served} ${
                          player.years_served === 1 ? "Year" : "Years"
                        } Served`
                    : "Years TBD"}
                </p>
              </div>

              <div
                className={`camp-roster-rank-badge camp-roster-rank-${player.rank || "unknown"} flex h-10 w-10 items-center justify-center justify-self-end rounded-xl border text-lg font-semibold ${
                  rankStyles[player.rank || ""] ||
                  "border-[#34312a] bg-black/35 text-[#b8b0a1]"
                }`}
              >
                {getPublicDisplayRank(player.display_rank, player.rank)}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
