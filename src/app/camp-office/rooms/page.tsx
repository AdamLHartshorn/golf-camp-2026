"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { PlayerSilhouette } from "@/components/PlayerSilhouette";

type PlayerRow = {
  id: string;
  first_name: string;
  last_name: string;
  display_name: string;
  rank: string | null;
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
        .select("id, first_name, last_name, display_name, rank, room, arrival")
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
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(244,241,234,0.08),transparent_34%),#050505] p-5 text-[#f5f5f5]">
      <div className="mx-auto w-full max-w-md space-y-5 py-6">
        <div className="flex items-center justify-between gap-4">
          <Link href="/camp-office" className="text-2xl text-[#a3a3a3]">
            ‹
          </Link>
          <p className="font-mono text-sm uppercase tracking-[0.22em] text-[#f5f5f5]">
            Room Assignments
          </p>
          <span className="flex h-9 w-9 items-center justify-center rounded-full border border-[#34312a] bg-[#151411] font-mono text-xs font-black">
            RM
          </span>
        </div>

        <div className="space-y-4">
          {isLoading && (
            <div className="rounded-[1.45rem] border border-[#d8d1c4]/80 bg-[#efe9dc] p-5 text-center text-sm text-[#7a6f60]">
              Loading room assignments...
            </div>
          )}

          {!isLoading && error && (
            <div className="rounded-[1.45rem] border border-[#242424] bg-[#111111] p-5 text-center text-sm text-[#ff8a8a]">
              {error}
            </div>
          )}

          {!isLoading && !error && roomAssignments.length === 0 && (
            <div className="rounded-[1.45rem] border border-[#d8d1c4]/80 bg-[#efe9dc] p-5 text-center text-sm text-[#7a6f60]">
              No active room assignments yet.
            </div>
          )}

          {!isLoading &&
            !error &&
            roomAssignments.map((room) => (
              <section
                key={room.room}
                className="overflow-hidden rounded-[1.65rem] border border-[#d8d1c4]/80 bg-[#efe9dc] text-[#17130e] shadow-[0_18px_45px_rgba(0,0,0,0.3)]"
              >
                <div className="grid grid-cols-[1fr_auto] gap-4 border-b border-[#d8d1c4] px-5 py-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#7a6f60]">
                      Room #
                    </p>

                    <h2 className="mt-2 text-3xl font-semibold tracking-[-0.04em]">
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
                        {player.rank || "-"}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="border-t border-[#d8d1c4] px-5 py-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#7a6f60]">
                    Arrival Timing
                  </p>

                  <p className="mt-2 text-sm leading-6 text-[#17130e]">
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
