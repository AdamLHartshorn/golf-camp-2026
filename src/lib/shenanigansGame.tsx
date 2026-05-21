"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

const currentGameKey = "shenanigansCurrentGameId";

export type ShenanigansGame = {
  id: string;
  name: string;
  status: string | null;
  created_by_player_id: string | null;
  created_at: string | null;
  ended_at: string | null;
};

export type ShenanigansGamePlayer = {
  id: string;
  game_id: string;
  player_id: string;
  player_name: string;
  starting_points: number | null;
};

export type GameAwarePlayer = {
  id: string;
  display_name: string;
};

export function getCurrentShenanigansGameId() {
  if (typeof window === "undefined") {
    return "";
  }

  return window.localStorage.getItem(currentGameKey) || "";
}

export function setCurrentShenanigansGameId(gameId: string) {
  window.localStorage.setItem(currentGameKey, gameId);
}

export function clearCurrentShenanigansGameId() {
  window.localStorage.removeItem(currentGameKey);
}

export function useShenanigansGame() {
  const [games, setGames] = useState<ShenanigansGame[]>([]);
  const [gamePlayers, setGamePlayers] = useState<ShenanigansGamePlayer[]>([]);
  const [selectedGameId, setSelectedGameId] = useState("");
  const [isLoadingGame, setIsLoadingGame] = useState(true);
  const [gameError, setGameError] = useState("");

  async function fetchGameState() {
    setIsLoadingGame(true);
    const [
      { data: gamesData, error: gamesError },
      { data: gamePlayersData, error: playersError },
    ] = await Promise.all([
      supabase
        .from("shenanigans_games")
        .select("*")
        .order("created_at", { ascending: false }),
      supabase.from("shenanigans_game_players").select("*"),
    ]);

    if (gamesError || playersError) {
      setGames([]);
      setGamePlayers([]);
      setGameError(
        gamesError?.message ||
          playersError?.message ||
          "Could not load Shenanigans games.",
      );
      setIsLoadingGame(false);
      return;
    }

    const nextGames = (gamesData as ShenanigansGame[]) || [];
    const storedGameId = getCurrentShenanigansGameId();
    const selectedGame =
      nextGames.find((game) => game.id === storedGameId) ||
      nextGames.find((game) => game.status === "active") ||
      null;

    setGames(nextGames);
    setGamePlayers((gamePlayersData as ShenanigansGamePlayer[]) || []);
    setSelectedGameId(selectedGame?.id || "");

    if (selectedGame) {
      setCurrentShenanigansGameId(selectedGame.id);
    }

    setGameError("");
    setIsLoadingGame(false);
  }

  useEffect(() => {
    let isCurrent = true;

    async function load() {
      await fetchGameState();

      if (!isCurrent) {
        return;
      }
    }

    load();

    return () => {
      isCurrent = false;
    };
  }, []);

  const selectedGame = useMemo(
    () => games.find((game) => game.id === selectedGameId) || null,
    [games, selectedGameId],
  );
  const selectedGamePlayers = useMemo(
    () => gamePlayers.filter((player) => player.game_id === selectedGameId),
    [gamePlayers, selectedGameId],
  );
  const selectablePlayers = useMemo<GameAwarePlayer[]>(
    () =>
      selectedGamePlayers.map((player) => ({
        id: player.player_id,
        display_name: player.player_name,
      })),
    [selectedGamePlayers],
  );

  async function switchGame(gameId: string) {
    setSelectedGameId(gameId);

    if (gameId) {
      setCurrentShenanigansGameId(gameId);
    } else {
      clearCurrentShenanigansGameId();
    }
  }

  async function endGame() {
    if (!selectedGame) {
      return;
    }

    const { error } = await supabase
      .from("shenanigans_games")
      .update({ status: "ended", ended_at: new Date().toISOString() })
      .eq("id", selectedGame.id);

    if (error) {
      setGameError(error.message || "Could not end game.");
      return;
    }

    await fetchGameState();
  }

  return {
    games,
    selectedGame,
    selectedGameId,
    selectedGamePlayers,
    selectablePlayers,
    isLoadingGame,
    gameError,
    switchGame,
    endGame,
    refreshGameState: fetchGameState,
  };
}

export function ShenanigansGameBar({
  selectedGame,
  games,
  selectedGameId,
  isLoadingGame,
  gameError,
  onSwitchGame,
  onEndGame,
}: {
  selectedGame: ShenanigansGame | null;
  games: ShenanigansGame[];
  selectedGameId: string;
  isLoadingGame: boolean;
  gameError: string;
  onSwitchGame: (gameId: string) => void;
  onEndGame: () => void;
}) {
  return (
    <section className="rounded-2xl border border-[#242424] bg-[#111111] p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#b91c1c]">
        Current Game
      </p>

      {isLoadingGame && (
        <p className="mt-2 text-sm text-[#a3a3a3]">Loading game...</p>
      )}

      {!isLoadingGame && gameError && (
        <p className="mt-2 text-sm text-[#fca5a5]">{gameError}</p>
      )}

      {!isLoadingGame && !selectedGame && (
        <div className="mt-3 space-y-3">
          <p className="text-sm text-[#a3a3a3]">
            Start or select a Shenanigans game before logging live activity.
          </p>
          <Link
            href="/shenanigans"
            className="block rounded-xl border border-[#b91c1c] px-4 py-3 text-center text-sm font-bold text-[#b91c1c]"
          >
            Start Game
          </Link>
        </div>
      )}

      {selectedGame && (
        <div className="mt-3 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold">{selectedGame.name}</h2>
              <p className="text-xs uppercase tracking-[0.2em] text-[#a3a3a3]">
                {selectedGame.status || "active"}
              </p>
            </div>
            {selectedGame.status === "active" && (
              <button
                type="button"
                onClick={onEndGame}
                className="rounded-xl border border-[#242424] px-3 py-2 text-xs font-bold text-[#a3a3a3] transition hover:border-[#b91c1c]"
              >
                End Game
              </button>
            )}
          </div>

          <select
            value={selectedGameId}
            onChange={(event) => onSwitchGame(event.target.value)}
            className="w-full rounded-xl border border-[#242424] bg-black px-4 py-3 text-sm outline-none focus:border-[#b91c1c]"
          >
            {games.map((game) => (
              <option key={game.id} value={game.id}>
                {game.name} ({game.status || "active"})
              </option>
            ))}
          </select>
        </div>
      )}
    </section>
  );
}

export function NoShenanigansGamePrompt() {
  return (
    <div className="rounded-2xl border border-[#242424] bg-[#111111] p-5 text-center text-sm text-[#a3a3a3]">
      Select or start a Shenanigans game to view this page.
    </div>
  );
}

export function ShenanigansCurrentGameNotice() {
  const {
    games,
    selectedGame,
    selectedGameId,
    isLoadingGame,
    gameError,
    switchGame,
    endGame,
  } = useShenanigansGame();

  return (
    <ShenanigansGameBar
      selectedGame={selectedGame}
      games={games}
      selectedGameId={selectedGameId}
      isLoadingGame={isLoadingGame}
      gameError={gameError}
      onSwitchGame={switchGame}
      onEndGame={endGame}
    />
  );
}
