"use client";

import Link from "next/link";
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useActivePlayers } from "@/lib/useActivePlayers";
import {
  setCurrentShenanigansGameId,
  ShenanigansGameBar,
  useShenanigansGame,
} from "@/lib/shenanigansGame";

const cards = [
  {
    name: "Rules",
    href: "/shenanigans/rules",
    description:
      "Official format, Bank points, wagers, side games, and settlement rules.",
    featured: true,
  },
  {
    name: "Log Event",
    href: "/shenanigans/log-event",
    description: "Add Bank points, wagers, side games, or custom chaos.",
  },
  {
    name: "Live Wagers",
    href: "/shenanigans/wagers",
    description: "Track player-to-player action.",
  },
  {
    name: "Ledger",
    href: "/shenanigans/ledger",
    description: "Live point totals and round activity.",
  },
  {
    name: "Side Games",
    href: "/shenanigans/side-games",
    description: "Bocce, basket-golf, and whatever else gets invented.",
  },
  {
    name: "Settlement",
    href: "/shenanigans/settlement",
    description: "Calculate final point payouts.",
  },
  {
    name: "The Bank",
    href: "/shenanigans/bank",
    description: "Structured points and standard prop values.",
  },
];

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
    <main className="min-h-screen bg-black p-6 text-[#f5f5f5]">
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center space-y-8 py-8">
        <div className="space-y-2">
          <p className="text-sm uppercase tracking-[0.35em] text-[#a3a3a3]">
            Golf Camp 2026
          </p>

          <h1 className="text-4xl font-bold tracking-tight text-[#b91c1c]">
            Shenanigans
          </h1>

          <p className="text-[#a3a3a3]">
            Points, wagers, props, and bad decisions.
          </p>
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

        <section className="rounded-2xl border border-[#b91c1c] bg-[#111111] p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#b91c1c]">
            Start Game
          </p>
          <input
            value={gameName}
            onChange={(event) => setGameName(event.target.value)}
            className="mt-4 w-full rounded-xl border border-[#242424] bg-black px-4 py-3 outline-none focus:border-[#b91c1c]"
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
                        : "border-[#242424] bg-black hover:border-[#b91c1c]"
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
        </section>

        {message && <p className="text-center text-sm">{message}</p>}
        {error && <p className="text-center text-sm text-[#fca5a5]">{error}</p>}

        <div className="space-y-4">
          {cards.map((card) => (
            <Link
              key={card.name}
              href={card.href}
              className={`block min-h-[116px] rounded-2xl border p-5 transition-colors duration-200 ${
                card.featured
                  ? "border-[#b91c1c] bg-[#b91c1c] text-[#f5f5f5] hover:border-[#991b1b] hover:bg-[#991b1b]"
                  : "border-[#242424] bg-[#111111] hover:border-[#b91c1c]"
              }`}
            >
              <div className="flex h-full items-center justify-between gap-4">
                <div className="min-w-0 space-y-1">
                  <h2 className="text-2xl font-bold leading-tight">
                    {card.name}
                  </h2>

                  <p
                    className={`text-sm leading-5 ${
                      card.featured ? "text-[#f5f5f5]/80" : "text-[#a3a3a3]"
                    }`}
                  >
                    {card.description}
                  </p>
                </div>

                <span
                  className={`shrink-0 self-center text-2xl leading-none ${
                    card.featured ? "text-[#f5f5f5]" : "text-[#b91c1c]"
                  }`}
                >
                  →
                </span>
              </div>
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
