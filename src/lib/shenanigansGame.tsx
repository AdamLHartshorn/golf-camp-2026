"use client";

import { useEffect, useMemo, useState } from "react";
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
    const activeGames = nextGames.filter(
      (game) =>
        !game.status || game.status === "active" || game.status === "open",
    );
    const storedGameId = getCurrentShenanigansGameId();
    const selectedGame =
      activeGames.find((game) => game.id === storedGameId) ||
      activeGames[0] ||
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
  games,
  selectedGameId,
  isLoadingGame,
  gameError,
  onSwitchGame,
}: {
  selectedGame: ShenanigansGame | null;
  games: ShenanigansGame[];
  selectedGameId: string;
  isLoadingGame: boolean;
  gameError: string;
  onSwitchGame: (gameId: string) => void;
  onEndGame: () => void;
}) {
  const activeGames = games.filter(
    (game) => !game.status || game.status === "active" || game.status === "open",
  );

  return (
    <section className="overflow-hidden rounded-2xl border border-[#242424] bg-[linear-gradient(90deg,rgba(235,156,92,0.18),rgba(17,17,17,0.98)_42%,rgba(17,17,17,0.92))] shadow-[0_0_28px_rgba(235,156,92,0.1)]">
      <div className="flex items-center justify-between gap-3 border-b border-[#242424] px-4 py-3">
        <div className="min-w-0">
          <h2 className="font-mono text-sm font-black uppercase tracking-[0.22em] text-[#f5f5f5]">
            Active Games
          </h2>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {activeGames.length > 0 && (
            <span className="rounded-full border border-[#EB9C5C]/70 bg-black/35 px-2.5 py-1 font-mono text-[9px] font-black uppercase tracking-[0.14em] text-[#EB9C5C]">
              {activeGames.length} active
            </span>
          )}
        </div>
      </div>

      {isLoadingGame && (
        <p className="px-4 py-3 text-sm text-[#a3a3a3]">Loading game...</p>
      )}

      {!isLoadingGame && gameError && (
        <p className="px-4 py-3 text-sm text-[#fca5a5]">{gameError}</p>
      )}

      {!isLoadingGame && !gameError && activeGames.length === 0 && (
        <div className="space-y-3 px-4 py-3">
          <p className="text-sm text-[#a3a3a3]">
            No active Shenanigans games yet. Use Start New Game on the Shenanigans home page when the group is ready.
          </p>
        </div>
      )}

      {!isLoadingGame && !gameError && activeGames.length > 0 && (
        <div className="space-y-2 px-4 py-3">
          {activeGames.map((game) => {
            const isSelected = game.id === selectedGameId;

            return (
              <button
                key={game.id}
                type="button"
                onClick={() => onSwitchGame(game.id)}
                className={`flex w-full items-center justify-between gap-3 rounded-xl border px-3 py-2 text-left transition ${
                  isSelected
                    ? "border-[#EB9C5C] bg-[#EB9C5C]/14 shadow-[0_0_18px_rgba(235,156,92,0.12)]"
                    : "border-[#242424] bg-black/35 hover:border-[#EB9C5C]/70"
                }`}
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-black text-[#f5f5f5]">
                    {game.name}
                  </span>
                  <span className="mt-0.5 block font-mono text-[9px] font-black uppercase tracking-[0.14em] text-[#a3a3a3]">
                    {isSelected ? "Selected" : "Tap to select"}
                  </span>
                </span>
                <span className="font-mono text-[9px] font-black uppercase tracking-[0.14em] text-[#EB9C5C]">
                  {game.status || "active"}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}

export function CompactPlayerSelect({
  players,
  selectedName,
  onSelect,
  isLoading,
  emptyLabel = "No players are in this game.",
  label = "Player",
}: {
  players: GameAwarePlayer[];
  selectedName: string;
  onSelect: (displayName: string) => void;
  isLoading?: boolean;
  emptyLabel?: string;
  label?: string;
}) {
  const selectId = `${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-select`;

  return (
    <div className="space-y-2">
      <label className="block text-sm text-[#a3a3a3]" htmlFor={selectId}>
        {label}
      </label>

      {isLoading && <p className="text-sm text-[#a3a3a3]">Loading players...</p>}

      {!isLoading && players.length === 0 && (
        <p className="text-sm text-[#a3a3a3]">{emptyLabel}</p>
      )}

      {!isLoading && players.length > 0 && (
        <>
          <select
            id={selectId}
            value={selectedName}
            onChange={(event) => onSelect(event.target.value)}
            className="w-full rounded-xl border border-[#242424] bg-black px-4 py-3 text-sm text-[#f5f5f5] outline-none focus:border-[#b91c1c]"
          >
            {players.map((player) => (
              <option key={player.id} value={player.display_name}>
                {player.display_name}
              </option>
            ))}
          </select>

          {selectedName && (
            <div className="flex flex-wrap gap-2">
              <span className="shenanigans-selected-player-pill rounded-full border px-3 py-1 text-xs font-bold">
                {selectedName}
              </span>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export function CompactPlayerMultiSelect({
  players,
  selectedNames,
  onChange,
  isLoading,
  label = "Players",
  minSelected,
  maxSelected,
}: {
  players: GameAwarePlayer[];
  selectedNames: string[];
  onChange: (displayNames: string[]) => void;
  isLoading?: boolean;
  label?: string;
  minSelected?: number;
  maxSelected?: number;
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const selectedSet = useMemo(() => new Set(selectedNames), [selectedNames]);
  const filteredPlayers = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    if (!normalizedSearch) {
      return players;
    }

    return players.filter((player) =>
      player.display_name.toLowerCase().includes(normalizedSearch),
    );
  }, [players, searchTerm]);

  function togglePlayer(displayName: string) {
    if (selectedSet.has(displayName)) {
      onChange(selectedNames.filter((name) => name !== displayName));
      return;
    }

    if (maxSelected && selectedNames.length >= maxSelected) {
      return;
    }

    onChange([...selectedNames, displayName]);
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-[#a3a3a3]">{label}</p>
        {(minSelected || maxSelected) && (
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-[#737373]">
            {selectedNames.length}
            {maxSelected ? `/${maxSelected}` : ""} selected
          </span>
        )}
      </div>

      {isLoading && <p className="text-sm text-[#a3a3a3]">Loading players...</p>}

      {!isLoading && players.length === 0 && (
        <p className="text-sm text-[#a3a3a3]">No players available.</p>
      )}

      {!isLoading && players.length > 0 && (
        <>
          <input
            type="search"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search players"
            className="w-full rounded-xl border border-[#242424] bg-black px-4 py-3 text-sm text-[#f5f5f5] outline-none placeholder:text-[#737373] focus:border-[#b91c1c]"
          />

          <div className="flex max-h-36 flex-wrap gap-2 overflow-y-auto rounded-xl border border-[#242424] bg-black/35 p-2">
            {filteredPlayers.map((player) => {
              const isSelected = selectedSet.has(player.display_name);
              const isDisabled =
                Boolean(maxSelected) &&
                selectedNames.length >= Number(maxSelected) &&
                !isSelected;

              return (
                <button
                  key={player.id}
                  type="button"
                  onClick={() => togglePlayer(player.display_name)}
                  disabled={isDisabled}
                  className={`rounded-full border px-3 py-1.5 text-xs font-bold transition ${
                    isSelected
                      ? "border-[#b91c1c] bg-[#b91c1c] text-[#f5f5f5]"
                      : "border-[#242424] bg-[#111111] text-[#d4d4d4] hover:border-[#b91c1c]"
                  } disabled:cursor-not-allowed disabled:opacity-35`}
                >
                  {player.display_name}
                </button>
              );
            })}
          </div>

          {selectedNames.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {selectedNames.map((name) => (
                <button
                  key={name}
                  type="button"
                  onClick={() => togglePlayer(name)}
                  className="shenanigans-selected-player-pill rounded-full border px-3 py-1 text-xs font-bold"
                >
                  {name} ×
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
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
