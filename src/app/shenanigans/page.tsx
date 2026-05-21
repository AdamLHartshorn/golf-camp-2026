"use client";

import Link from "next/link";
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { GolfCampIcon, GolfCampIconName } from "@/components/GolfCampIcons";
import { useActivePlayers } from "@/lib/useActivePlayers";
import {
  setCurrentShenanigansGameId,
  ShenanigansGameBar,
  useShenanigansGame,
} from "@/lib/shenanigansGame";

const cards = [
  {
    icon: "rules",
    initial: "R",
    name: "Rules",
    href: "/shenanigans/rules",
    description:
      "Official format, Bank points, wagers, side games, and settlement rules.",
    featured: true,
  },
  {
    icon: "log",
    initial: "L",
    name: "Log Event",
    href: "/shenanigans/log-event",
    description: "Add Bank points, wagers, side games, or custom chaos.",
  },
  {
    icon: "wagers",
    initial: "W",
    name: "Live Wagers",
    href: "/shenanigans/wagers",
    description: "Track player-to-player action.",
  },
  {
    icon: "ledger",
    initial: "G",
    name: "Ledger",
    href: "/shenanigans/ledger",
    description: "Live point totals and round activity.",
  },
  {
    icon: "sideGames",
    initial: "S",
    name: "Side Games",
    href: "/shenanigans/side-games",
    description: "Bocce, basket-golf, and whatever else gets invented.",
  },
  {
    icon: "settlement",
    initial: "$",
    name: "Settlement",
    href: "/shenanigans/settlement",
    description: "Calculate final point payouts.",
  },
  {
    icon: "bank",
    initial: "B",
    name: "The Bank",
    href: "/shenanigans/bank",
    description: "Structured points and standard prop values.",
  },
] satisfies {
  icon: GolfCampIconName;
  initial: string;
  name: string;
  href: string;
  description: string;
  featured?: boolean;
}[];

export default function ShenanigansPage() {
  const {
    games,
    selectedGame,
    selectedGameId,
    isLoadingGame,
    gameError,
    switchGame,
    endGame,
    refreshGameState,
  } = useShenanigansGame();
  const { players, isLoading: isLoadingPlayers } = useActivePlayers();
  const [gameName, setGameName] = useState("New Shenanigans Game");
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  function togglePlayer(playerId: string) {
    setSelectedPlayerIds((current) =>
      current.includes(playerId)
        ? current.filter((id) => id !== playerId)
        : [...current, playerId],
    );
  }

  async function handleStartGame() {
    const trimmedName = gameName.trim();
    const selectedPlayers = players.filter((player) =>
      selectedPlayerIds.includes(player.id),
    );

    setMessage("");
    setError("");

    if (!trimmedName) {
      setError("Game name is required.");
      return;
    }

    if (selectedPlayers.length === 0) {
      setError("Select at least one player.");
      return;
    }

    setIsCreating(true);

    const { data: gameData, error: gameInsertError } = await supabase
      .from("shenanigans_games")
      .insert({ name: trimmedName, status: "active" })
      .select("*")
      .single();

    if (gameInsertError || !gameData) {
      setError(gameInsertError?.message || "Could not start game.");
      setIsCreating(false);
      return;
    }

    const gameId = gameData.id as string;
    const playerRows = selectedPlayers.map((player) => ({
      game_id: gameId,
      player_id: player.id,
      player_name: player.display_name,
      starting_points: 5,
    }));
    const startingEvents = selectedPlayers.map((player) => ({
      game_id: gameId,
      player_name: player.display_name,
      event_type: "Starting Points",
      description: "Starting points",
      points: 5,
    }));
    const [{ error: playersInsertError }, { error: eventsInsertError }] =
      await Promise.all([
        supabase.from("shenanigans_game_players").insert(playerRows),
        supabase.from("shenanigans_events").insert(startingEvents),
      ]);

    if (playersInsertError || eventsInsertError) {
      setError(
        playersInsertError?.message ||
          eventsInsertError?.message ||
          "Game started, but setup failed.",
      );
      setIsCreating(false);
      return;
    }

    setCurrentShenanigansGameId(gameId);
    await refreshGameState();
    await switchGame(gameId);
    setSelectedPlayerIds([]);
    setMessage("Game started.");
    setIsCreating(false);
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(106,49,60,0.12),transparent_34%),#050505] p-5 text-[#f5f5f5]">
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center space-y-5 py-6">
        <div className="flex items-center justify-between gap-4">
          <Link href="/home" className="text-2xl text-[#a3a3a3]">
            ‹
          </Link>
          <p className="font-mono text-sm uppercase tracking-[0.22em] text-[#f5f5f5]">
            Shenanigans
          </p>
          <span className="flex h-9 w-9 items-center justify-center rounded-full border border-[#7f1d1d] bg-[#1a0d0d] text-[#ef4444]">
            <GolfCampIcon name="shenanigans" className="h-4 w-4" />
          </span>
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

        <section className="overflow-hidden rounded-2xl border border-[#7f1d1d] bg-[#120d0d] shadow-[0_0_32px_rgba(106,49,60,0.1)]">
          <div className="border-b border-[#3a1d1d] bg-[#1a0d0d] px-5 py-4">
            <p className="font-mono text-[10px] font-black uppercase tracking-[0.24em] text-[#ef4444]">
              Current Game
            </p>
            <h1 className="mt-2 text-3xl font-black tracking-tight">
              Shenanigans
            </h1>
            <p className="mt-1 text-sm text-[#a3a3a3]">
              Points, wagers, props, and bad decisions.
            </p>
          </div>

          <div className="p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#ef4444]">
            Start Game
          </p>
          <input
            value={gameName}
            onChange={(event) => setGameName(event.target.value)}
            className="mt-4 w-full rounded-xl border border-[#3a1d1d] bg-black/55 px-4 py-3 outline-none focus:border-[#b91c1c]"
            placeholder="Game name"
          />
          <div className="mt-4 grid grid-cols-2 gap-2">
            {isLoadingPlayers && (
              <p className="text-sm text-[#a3a3a3]">Loading players...</p>
            )}
            {!isLoadingPlayers &&
              players.map((player) => {
                const isSelected = selectedPlayerIds.includes(player.id);

                return (
                  <button
                    key={player.id}
                    type="button"
                    onClick={() => togglePlayer(player.id)}
                    className={`rounded-xl border p-3 text-left text-sm font-bold ${
                      isSelected
                        ? "border-[#b91c1c] bg-[#b91c1c]"
                        : "border-[#3a1d1d] bg-black/45 hover:border-[#b91c1c]"
                    }`}
                  >
                    {player.display_name}
                  </button>
                );
              })}
          </div>
          <button
            type="button"
            onClick={handleStartGame}
            disabled={isCreating}
            className="mt-4 w-full rounded-xl bg-[#b91c1c] px-4 py-3 font-bold transition hover:bg-[#991b1b] disabled:opacity-50"
          >
            {isCreating ? "Starting..." : "Start Game"}
          </button>
          </div>
        </section>

        {message && <p className="text-center text-sm">{message}</p>}
        {error && <p className="text-center text-sm text-[#fca5a5]">{error}</p>}

        <div className="overflow-hidden rounded-2xl border border-[#7f1d1d]/70 bg-[#0d0d0b]/95 text-[#f5f5f5] shadow-[0_28px_80px_rgba(0,0,0,0.5),0_0_42px_rgba(106,49,60,0.1)]">
          {cards.map((card) => (
            <Link
              key={card.name}
              href={card.href}
              className="grid grid-cols-[3.25rem_1fr_auto] items-center gap-3 border-b border-[#2a2925] px-4 py-3.5 transition-colors duration-200 hover:bg-[#1a0d0d] last:border-b-0"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#7f1d1d]/70 bg-[#1a0d0d] text-[#ef4444]">
                <GolfCampIcon name={card.icon} className="h-6 w-6" />
              </span>
                <div className="min-w-0">
                  <h2 className="truncate text-base font-black leading-tight text-[#f4f1ea]">
                    {card.name}
                  </h2>

                  <p className="mt-0.5 truncate text-xs font-semibold text-[#b8b0a1]">
                    {card.description}
                  </p>
                </div>

                <span className="shrink-0 self-center font-mono text-xl font-black leading-none text-[#82786a]">
                  →
                </span>
            </Link>
          ))}
        </div>

        <Link href="/home" className="text-center text-sm text-[#a3a3a3]">
          ← Back to Camp Dashboard
        </Link>
      </div>
    </main>
  );
}
