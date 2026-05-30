"use client";

import Link from "next/link";
import type { CSSProperties } from "react";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { PlayerSilhouette } from "@/components/PlayerSilhouette";
import { getPublicDisplayRank } from "@/lib/playerRanks";

type PlayerRow = {
  id: string;
  first_name: string;
  last_name: string;
  display_name: string;
  rank: string | null;
  display_rank: string | null;
  internal_rank_order: string | null;
  room: string | null;
  arrival: string | null;
};

export default function RoomAssignmentsPage() {
  const [players, setPlayers] = useState<PlayerRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isCurrent = true;

    async function fetchPlayers() {
      const { data, error: fetchError } = await supabase
        .from("players")
        .select("id, first_name, last_name, display_name, rank, display_rank, internal_rank_order, room, arrival")
        .eq("active", true)
        .order("last_name", { ascending: true })
        .order("first_name", { ascending: true });

      console.log("Camp rooms players fetch:", {
        data,
        error: fetchError,
      });

      if (!isCurrent) {
        return;
      }

      if (fetchError) {
        setPlayers([]);
        setError(fetchError.message || "Could not load room assignments.");
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

  const roomAssignments = useMemo(() => {
    const groupedRooms = players.reduce<
      Record<string, { room: string; players: PlayerRow[]; arrivals: string[] }>
    >((accumulator, player) => {
      const room = player.room?.trim() || "No Room";

      if (!accumulator[room]) {
        accumulator[room] = {
          room,
          players: [],
          arrivals: [],
        };
      }

      accumulator[room].players.push(player);

      const arrival = player.arrival?.trim() || "Arrival TBD";

      if (!accumulator[room].arrivals.includes(arrival)) {
        accumulator[room].arrivals.push(arrival);
      }

      return accumulator;
    }, {});

    return Object.values(groupedRooms).sort((a, b) =>
      a.room.localeCompare(b.room, undefined, { numeric: true }),
    );
  }, [players]);

  return (
    <main className="gc-mobile-shell" style={{ "--page-accent": "#f4f1ea" } as CSSProperties}>
      <div className="gc-mobile-stage justify-start">
        <div className="gc-topbar">
          <Link href="/camp-office" className="gc-back-link">
            ‹
          </Link>
          <p className="gc-topbar-title">
            Room Assignments
          </p>
          <span className="gc-top-icon font-mono text-xs font-black">
            RM
          </span>
        </div>

        <div className="space-y-4">
          {isLoading && (
            <div className="gc-edge-card p-5 text-center text-sm text-[#b8b0a1]">
              Loading room assignments...
            </div>
          )}

          {!isLoading && error && (
            <div className="gc-edge-card p-5 text-center text-sm text-[#ff8a8a]">
              {error}
            </div>
          )}

          {!isLoading && !error && roomAssignments.length === 0 && (
            <div className="gc-edge-card p-5 text-center text-sm text-[#b8b0a1]">
              No active room assignments yet.
            </div>
          )}

          {!isLoading &&
            !error &&
            roomAssignments.map((room) => (
              <section
                key={room.room}
                className="gc-edge-card text-[#f4f1ea]"
              >
                <div className="gc-section-head grid grid-cols-[1fr_auto] gap-4">
                  <div>
                    <p className="gc-card-kicker">
                      Room #
                    </p>

                    <h2 className="gc-card-title">
                      {room.room}
                    </h2>
                  </div>

                  <span className="self-start rounded-full border border-[#cfc4b3] bg-[#e6dfd2] px-3 py-1 text-sm font-semibold text-[#5d5448]">
                    {room.players.length} players
                  </span>
                </div>

                <div>
                  {room.players.map((player) => (
                    <div
                      key={player.id}
                      className="grid grid-cols-[3rem_1fr_2rem] items-center gap-3 border-b border-[#d8d1c4]/80 px-5 py-3 last:border-b-0"
                    >
                      <PlayerSilhouette
                        className="h-10 w-10"
                        label={`${player.display_name} profile placeholder`}
                      />

                      <p className="truncate font-semibold">
                        {player.display_name}
                      </p>

                      <span className="justify-self-end text-sm font-semibold text-[#7a6f60]">
                        {getPublicDisplayRank(player.display_rank, player.rank)}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="border-t border-[#34312a] px-5 py-4">
                  <p className="gc-card-kicker">
                    Arrival Timing
                  </p>

                  <p className="mt-2 text-sm leading-6 text-[#f4f1ea]">
                    {room.arrivals.join(" / ")}
                  </p>
                </div>
              </section>
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
