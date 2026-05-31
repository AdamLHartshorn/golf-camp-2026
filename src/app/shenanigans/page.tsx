"use client";

import Link from "next/link";
import type { CSSProperties } from "react";
import { useState } from "react";
import { logActivityFeedItem } from "@/lib/activityFeed";
import { logAuditEvent } from "@/lib/auditLog";
import { supabase } from "@/lib/supabase";
import { GolfCampIcon, GolfCampIconName } from "@/components/GolfCampIcons";
import { useActivePlayers } from "@/lib/useActivePlayers";
import {
  CompactPlayerMultiSelect,
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
  const [selectedPlayerNames, setSelectedPlayerNames] = useState<string[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function handleStartGame() {
    const trimmedName = gameName.trim();
    const selectedPlayers = players.filter((player) =>
      selectedPlayerNames.includes(player.display_name),
    );

    setMessage("");
    setError("");

    if (!trimmedName) {
      setError("Game name is required.");
      return;
    }

    if (selectedPlayers.length < 2 || selectedPlayers.length > 4) {
      setError("Select 2 to 4 players.");
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
    await logActivityFeedItem({
      type: "shenanigans_game_started",
      source: "shenanigans",
      sourceId: gameId,
      linkUrl: "/shenanigans",
      message: `Shenanigans game started: ${trimmedName}.`,
    });
    await logAuditEvent({
      actionType: "shenanigans_game_created",
      entityType: "shenanigans_game",
      entityId: gameId,
      summary: `Shenanigans game created: ${trimmedName}.`,
      newValue: { game: gameData, players: playerRows },
    });
    await refreshGameState();
    await switchGame(gameId);
    setSelectedPlayerNames([]);
    setMessage("Game started.");
    setIsCreating(false);
  }

  return (
    <main className="gc-mobile-shell" style={{ "--page-accent": "#EB9C5C" } as CSSProperties}>
      <div className="gc-mobile-stage">
        <div className="gc-topbar">
          <Link href="/home" className="gc-back-link">
            ‹
          </Link>
          <p className="gc-topbar-title">
            Shenanigans
          </p>
          <span className="gc-top-icon">
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

        <section className="gc-edge-card">
          <div className="gc-section-head">
            <p className="gc-card-kicker">
              Current Game
            </p>
            <h1 className="gc-card-title">
              Shenanigans
            </h1>
            <p className="gc-card-copy">
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
            className="gc-input mt-4"
            placeholder="Game name"
          />
          <div className="mt-4">
            <CompactPlayerMultiSelect
              players={players}
              selectedNames={selectedPlayerNames}
              onChange={setSelectedPlayerNames}
              isLoading={isLoadingPlayers}
              label="Players"
              minSelected={2}
              maxSelected={4}
            />
          </div>
          <button
            type="button"
            onClick={handleStartGame}
            disabled={
              isCreating ||
              selectedPlayerNames.length < 2 ||
              selectedPlayerNames.length > 4
            }
            className="gc-primary-button mt-4 transition disabled:opacity-50"
          >
            {isCreating ? "Starting..." : "Start Game"}
          </button>
          </div>
        </section>

        {message && <p className="text-center text-sm">{message}</p>}
        {error && <p className="text-center text-sm text-[#fca5a5]">{error}</p>}

        <div className="gc-edge-list">
          {cards.map((card) => (
            <Link
              key={card.name}
              href={card.href}
              className="gc-edge-row"
            >
              <span className="gc-edge-mark">
                <GolfCampIcon name={card.icon} className="h-6 w-6" />
              </span>
                <div className="min-w-0">
                  <h2 className="gc-edge-title">
                    {card.name}
                  </h2>

                  <p className="gc-edge-meta">
                    {card.description}
                  </p>
                </div>

                <span className="gc-edge-arrow">
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
