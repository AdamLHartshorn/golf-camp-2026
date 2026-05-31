"use client";

import Link from "next/link";
import type { CSSProperties } from "react";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  NoShenanigansGamePrompt,
  ShenanigansGameBar,
  useShenanigansGame,
} from "@/lib/shenanigansGame";

type ShenanigansEvent = {
  id: string;
  player_name: string;
  event_type: string;
  description: string;
  points: number;
  created_at: string | null;
  game_id: string | null;
};

function formatTimestamp(createdAt: string | null) {
  if (!createdAt) {
    return "just now";
  }

  const elapsedMs = Date.now() - new Date(createdAt).getTime();
  const elapsedMinutes = Math.max(0, Math.floor(elapsedMs / 60000));

  if (elapsedMinutes < 1) {
    return "just now";
  }

  if (elapsedMinutes < 60) {
    return `${elapsedMinutes}m ago`;
  }

  const elapsedHours = Math.floor(elapsedMinutes / 60);

  if (elapsedHours < 24) {
    return `${elapsedHours}h ago`;
  }

  return new Date(createdAt).toLocaleDateString();
}

export default function ShenanigansLedgerPage() {
  const {
    games,
    selectedGame,
    selectedGameId,
    isLoadingGame,
    gameError,
    switchGame,
    endGame,
  } = useShenanigansGame();
  const [events, setEvents] = useState<ShenanigansEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isCurrent = true;

    async function fetchEvents() {
      if (!selectedGameId) {
        setEvents([]);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);

      const { data, error: fetchError } = await supabase
        .from("shenanigans_events")
        .select("id, player_name, event_type, description, points, created_at, game_id")
        .eq("game_id", selectedGameId)
        .order("created_at", { ascending: false });

      console.log("shenanigans_events fetched rows:", {
        selectedGameId,
        data,
        error: fetchError,
      });

      if (!isCurrent) {
        return;
      }

      if (fetchError) {
        setEvents([]);
        setError(fetchError.message || "Could not load Shenanigans events.");
        setIsLoading(false);
        return;
      }

      setEvents((data as ShenanigansEvent[]) || []);
      setIsLoading(false);
    }

    fetchEvents();

    return () => {
      isCurrent = false;
    };
  }, [selectedGameId]);

  const players = useMemo(() => {
    const totals = events.reduce<Record<string, number>>((accumulator, event) => {
      const playerName = event.player_name.trim();

      if (!playerName) {
        return accumulator;
      }

      accumulator[playerName] = (accumulator[playerName] || 0) + event.points;

      return accumulator;
    }, {});

    const aggregatedTotals = Object.entries(totals)
      .map(([name, points]) => ({ name, points }))
      .sort((a, b) => b.points - a.points);

    console.log("shenanigans_events aggregated totals:", aggregatedTotals);

    return aggregatedTotals;
  }, [events]);

  return (
    <main
      className="gc-mobile-shell text-[#f5f5f5]"
      style={{ "--page-accent": "#EB9C5C" } as CSSProperties}
    >
      <div className="gc-mobile-stage w-full max-w-md justify-center space-y-5">
        <div className="gc-topbar">
          <Link href="/shenanigans" className="gc-back-link">
            ‹
          </Link>
          <p className="gc-topbar-title">
            Shenanigans
          </p>
          <span className="gc-top-icon text-[#EB9C5C]">◇</span>
        </div>

        <ShenanigansGameBar
          selectedGame={selectedGame}
          games={games}
          selectedGameId={selectedGameId}
          isLoadingGame={isLoadingGame}
          gameError={gameError}
          onSwitchGame={switchGame}
          onEndGame={endGame}
        />

        {!selectedGameId && !isLoadingGame && <NoShenanigansGamePrompt />}

        {selectedGameId && (
        <section className="gc-edge-card overflow-hidden p-0">
          <div className="grid grid-cols-2 border-b border-[#2a2925] bg-[#151411] text-center font-mono text-[10px] font-semibold uppercase tracking-[0.16em]">
            <span className="border-b-2 border-[#b91c1c] py-3 text-[#f5f5f5]">
              Leaderboard
            </span>
            <span className="py-3 text-[#a3a3a3]">Activity</span>
          </div>

          <div>
            {isLoading && (
              <div className="p-4 text-center text-sm text-[#a3a3a3]">
                Loading ledger...
              </div>
            )}

            {!isLoading && players.length === 0 && (
              <div className="p-4 text-center text-sm text-[#a3a3a3]">
                No Shenanigans events yet.
              </div>
            )}

            {!isLoading &&
              players.map((player, index) => {
                const isLeader = index === 0;

                return (
                  <div
                    key={player.name}
                    className="grid grid-cols-[2.5rem_1fr_4rem] items-center border-b border-[#242420] px-4 py-3 last:border-b-0"
                  >
                    <span className={`font-mono text-sm font-black ${isLeader ? "text-[#b91c1c]" : "text-[#a3a3a3]"}`}>
                      {index + 1}
                    </span>

                    <div className="min-w-0">
                      <h3 className="truncate font-semibold">
                        {player.name}
                      </h3>
                      <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#a3a3a3]">
                        Position {index + 1}
                      </p>
                    </div>

                    <p className={`text-right font-mono text-xl font-black ${isLeader ? "text-[#b91c1c]" : "text-[#f5f5f5]"}`}>
                      {player.points}
                    </p>
                  </div>
                );
              })}
          </div>
        </section>
        )}

        {error && (
          <p className="text-center text-sm text-[#fca5a5]">{error}</p>
        )}

        {selectedGameId && (
        <section className="gc-edge-card overflow-hidden p-0">
          <div className="border-b border-[#3a1d1d] bg-[#1a0d0d] px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#b91c1c] opacity-40" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[#b91c1c]" />
              </span>

              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#b91c1c]">
                Live Activity
              </p>
            </div>

          </div>

          <div>
            {isLoading && (
              <div className="p-4 text-center text-sm text-[#a3a3a3]">
                Loading activity...
              </div>
            )}

            {!isLoading && events.length === 0 && (
              <div className="p-4 text-center text-sm text-[#a3a3a3]">
                No activity logged yet.
              </div>
            )}

            {!isLoading &&
              events.map((item) => {
                const isPositive = item.points > 0;

                return (
                  <div
                    key={item.id}
                    className="border-b border-[#3a1d1d] px-4 py-3 last:border-b-0"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-semibold">{item.player_name}</h3>

                          <span className="rounded-full border border-[#242424] px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#a3a3a3]">
                            {item.event_type}
                          </span>

                          <span className="text-xs text-[#737373]">
                            {formatTimestamp(item.created_at)}
                          </span>
                        </div>

                        <p className="text-sm leading-6 text-[#a3a3a3]">
                          {item.description}
                        </p>
                      </div>

                      <span
                        className={`shrink-0 rounded-full border px-3 py-1 text-sm font-bold ${
                          isPositive
                            ? "border-[#b91c1c]/70 text-[#f5f5f5]"
                            : "border-[#7f1d1d] bg-[#1f1111] text-[#fca5a5]"
                        }`}
                      >
                        {isPositive ? "+" : ""}
                        {item.points}
                      </span>
                    </div>
                  </div>
                );
              })}
          </div>
        </section>
        )}

        <Link
          href="/shenanigans"
          className="text-center text-sm text-[#a3a3a3]"
        >
          ← Back to Shenanigans
        </Link>
      </div>
    </main>
  );
}
