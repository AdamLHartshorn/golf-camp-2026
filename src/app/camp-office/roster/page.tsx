"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type PlayerRow = {
  id: string;
  first_name: string;
  last_name: string;
  display_name: string;
  rank: "A" | "B" | "C" | "D" | null;
  room: string | null;
  arrival: string | null;
  photo_url: string | null;
};

const rankStyles: Record<string, string> = {
  A: "border-[#8b6f2f] bg-[#2b2517] text-[#d7bd75]",
  B: "border-[#8a8a8a] bg-[#242424] text-[#d4d4d4]",
  C: "border-[#7a4f32] bg-[#2a1f18] text-[#c28a5a]",
  D: "border-[#4b5563] bg-[#1f242b] text-[#9ca3af]",
};

function getInitials(player: PlayerRow) {
  return `${player.first_name?.[0] || ""}${player.last_name?.[0] || ""}` || "?";
}

export default function CampRosterPage() {
  const [players, setPlayers] = useState<PlayerRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isCurrent = true;

    async function fetchPlayers() {
      const { data, error: fetchError } = await supabase
        .from("players")
        .select("id, first_name, last_name, display_name, rank, room, arrival, photo_url")
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
    <main className="min-h-screen bg-black p-6 text-[#f5f5f5]">
      <div className="mx-auto w-full max-w-md space-y-8 py-10">
        <div className="space-y-2">
          <p className="text-sm uppercase tracking-[0.35em] text-[#a3a3a3]">
            Camp Office
          </p>

          <h1 className="text-4xl font-bold tracking-tight">
            Camp Roster
          </h1>

          <p className="text-[#a3a3a3]">
            Players, rankings, and arrivals.
          </p>
        </div>

        <div className="space-y-3">
          {isLoading && (
            <div className="rounded-2xl border border-[#242424] bg-[#111111] p-5 text-center text-sm text-[#a3a3a3]">
              Loading roster...
            </div>
          )}

          {!isLoading && error && (
            <div className="rounded-2xl border border-[#242424] bg-[#111111] p-5 text-center text-sm text-[#ff8a8a]">
              {error}
            </div>
          )}

          {!isLoading && !error && players.length === 0 && (
            <div className="rounded-2xl border border-[#242424] bg-[#111111] p-5 text-center text-sm text-[#a3a3a3]">
              No active players yet.
            </div>
          )}

          {!isLoading && !error && players.map((player) => (
            <Link
              key={player.id}
              href={`/camp-office/roster/${player.id}`}
              className="block rounded-2xl border border-[#242424] bg-[#24201c] p-4 transition hover:border-[#3a3a3a] hover:bg-[#2a251f]"
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex min-w-0 items-center gap-4">
                  {player.photo_url ? (
                    <div
                      aria-label={`${player.display_name} profile`}
                      className="h-14 w-14 shrink-0 rounded-full border border-[#3a3a3a] bg-cover bg-center"
                      role="img"
                      style={{ backgroundImage: `url(${player.photo_url})` }}
                    />
                  ) : (
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-[#3a3a3a] bg-black text-base font-bold text-[#f5f5f5]">
                      {getInitials(player)}
                    </div>
                  )}

                  <div className="min-w-0">
                    <h2 className="truncate text-xl font-bold">
                      {player.display_name}
                    </h2>

                    <p className="mt-1 text-sm text-[#a3a3a3]">
                      Room {player.room || "-"} · {player.arrival || "Arrival TBD"}
                    </p>
                  </div>
                </div>

                <div
                  className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border text-2xl font-bold ${
                    rankStyles[player.rank || ""] ||
                    "border-[#242424] bg-black text-[#a3a3a3]"
                  }`}
                >
                  {player.rank || "-"}
                </div>
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
