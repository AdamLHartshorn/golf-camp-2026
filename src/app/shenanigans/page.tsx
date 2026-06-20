"use client";

import Link from "next/link";
import type { CSSProperties } from "react";
import { useState } from "react";
import { useToast } from "@/components/ToastProvider";
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
    name: "Log Points",
    href: "/shenanigans/log-event",
    description: "Quickly score one player, one hole, and what happened.",
  },
  {
    icon: "wagers",
    initial: "W",
    name: "Live Wagers",
    href: "/shenanigans/wagers",
    description: "Track player-to-player action.",
  },
  {
    icon: "sideGames",
    initial: "S",
    name: "Side Games",
    href: "/shenanigans/side-games",
    description: "Bocce, basket-golf, and whatever else gets invented.",
  },
  {
    icon: "ledger",
    initial: "G",
    name: "Ledger",
    href: "/shenanigans/ledger",
    description: "Live point totals and round activity.",
  },
  {
    icon: "settlement",
    initial: "$",
    name: "Settlement",
    href: "/shenanigans/settlement",
    description: "Calculate final point payouts.",
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
  const { showToast } = useToast();
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
  const [gameName, setGameName] = useState("");
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
      showToast({
        title: "Name The Game",
        message: "Add a Shenanigans game name.",
        tone: "warning",
        accent: "#EB9C5C",
      });
      return;
    }

    if (selectedPlayers.length < 2 || selectedPlayers.length > 4) {
      setError("Select 2 to 4 players.");
      showToast({
        title: "Choose Players",
        message: "Select 2 to 4 players before starting.",
        tone: "warning",
        accent: "#EB9C5C",
      });
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
      showToast({
        title: "Game Not Started",
        message: gameInsertError?.message || "Could not start game.",
        tone: "error",
        accent: "#EB9C5C",
      });
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

    const { error: playersInsertError } = await supabase
      .from("shenanigans_game_players")
      .insert(playerRows);

    if (playersInsertError) {
      await supabase.from("shenanigans_games").delete().eq("id", gameId);
      setError(playersInsertError.message || "Game started, but setup failed.");
      showToast({
        title: "Game Setup Failed",
        message: playersInsertError.message || "Could not add players.",
        tone: "error",
        accent: "#EB9C5C",
      });
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
    showToast({
      title: "Game Started",
      message: `${trimmedName} is ready.`,
      accent: "#EB9C5C",
    });
    setIsCreating(false);
  }

  async function handleEndSelectedGame() {
    if (!selectedGame) {
      return;
    }

    const confirmed = window.confirm(`End ${selectedGame.name}?`);

    if (!confirmed) {
      return;
    }

    setMessage("");
    setError("");
    const selectedName = selectedGame.name;
    const { error: endError } = await supabase
      .from("shenanigans_games")
      .update({ status: "ended", ended_at: new Date().toISOString() })
      .eq("id", selectedGame.id);

    if (endError) {
      setError(endError.message || "Could not end game.");
      showToast({
        title: "Game Not Ended",
        message: endError.message || "Could not end game.",
        tone: "error",
        accent: "#EB9C5C",
      });
      return;
    }

    await refreshGameState();
    setMessage("Game ended.");
    showToast({
      title: "Game Ended",
      message: `${selectedName} has been closed.`,
      accent: "#EB9C5C",
    });
  }

  return (
    <main className="gc-mobile-shell" style={{ "--page-accent": "#EB9C5C" } as CSSProperties}>
      <div className="gc-mobile-stage">
        <div className="gc-topbar">
          <Link href="/home" className="gc-back-link">
            ← BACK
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

        {selectedGame && selectedGame.status === "active" && (
          <section className="gc-edge-card">
            <div className="flex items-center justify-between gap-3 p-4">
              <div className="min-w-0">
                <p className="font-mono text-[9px] font-black uppercase tracking-[0.18em] text-[#EB9C5C]">
                  Selected Game
                </p>
                <h2 className="mt-1 truncate text-lg font-black text-[#f5f5f5]">
                  {selectedGame.name}
                </h2>
              </div>
              <button
                type="button"
                onClick={handleEndSelectedGame}
                className="shrink-0 rounded-xl border border-[#EB9C5C]/60 px-3 py-2 text-xs font-black uppercase tracking-[0.12em] text-[#EB9C5C] transition hover:border-[#EB9C5C] hover:bg-[#EB9C5C]/10"
              >
                End Game
              </button>
            </div>
          </section>
        )}

        <section className="gc-edge-card">
          <div className="gc-section-head">
            <p className="gc-card-kicker">
              Start New Game
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
              isLoadingPlayers
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
      </div>
    </main>
  );
}
