"use client";

import Link from "next/link";
import type { CSSProperties } from "react";
import { useEffect, useState } from "react";
import { logActivityFeedItem } from "@/lib/activityFeed";
import { logAuditEvent } from "@/lib/auditLog";
import { supabase } from "@/lib/supabase";
import {
  CompactPlayerSelect,
  NoShenanigansGamePrompt,
  ShenanigansGameBar,
  useShenanigansGame,
} from "@/lib/shenanigansGame";

const featuredGames = [
  {
    title: "Ultimate Bocce",
    description:
      "Establish a target, then each player rolls a golf ball. Closest ball wins.",
    pointNote: "Play for agreed-upon points.",
  },
  {
    title: "Basket-Golf",
    description:
      "Any object that can contain a golf ball can become the basket. First player to make it wins.",
    pointNote: "Play for agreed-upon points.",
  },
];

const sideGameTypes = ["Ultimate Bocce", "Basket-Golf", "Custom"];
const pointValues = [1, 2, 3, 4, 5, 10];

type SideGameEvent = {
  id: string;
  player_name: string;
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

export default function ShenanigansSideGamesPage() {
  const {
    games,
    selectedGame,
    selectedGameId,
    selectablePlayers,
    isLoadingGame,
    gameError,
    switchGame,
    endGame,
  } = useShenanigansGame();
  const [chosenPlayer, setChosenPlayer] = useState("");
  const [selectedType, setSelectedType] = useState(sideGameTypes[0]);
  const [selectedPoints, setSelectedPoints] = useState<number | null>(3);
  const [description, setDescription] = useState("");
  const [events, setEvents] = useState<SideGameEvent[]>([]);
  const [isLoadingEvents, setIsLoadingEvents] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const selectedPlayer = selectablePlayers.some(
    (player) => player.display_name === chosenPlayer,
  )
    ? chosenPlayer
    : selectablePlayers[0]?.display_name || "";

  async function fetchSideGameEvents() {
    if (!selectedGameId) {
      setEvents([]);
      setIsLoadingEvents(false);
      return;
    }

    setIsLoadingEvents(true);

    const { data, error: fetchError } = await supabase
      .from("shenanigans_events")
      .select("id, player_name, description, points, created_at, game_id")
      .eq("event_type", "Side Game")
      .eq("game_id", selectedGameId)
      .order("created_at", { ascending: false });

    console.log("side game events fetched rows:", {
      selectedGameId,
      data,
      error: fetchError,
    });

    if (fetchError) {
      setEvents([]);
      setError(fetchError.message || "Could not load side game events.");
      setIsLoadingEvents(false);
      return;
    }

    setEvents((data as SideGameEvent[]) || []);
    setIsLoadingEvents(false);
  }

  useEffect(() => {
    let isCurrent = true;

    async function fetchInitialSideGameEvents() {
      if (!selectedGameId) {
        setEvents([]);
        setIsLoadingEvents(false);
        return;
      }

      setIsLoadingEvents(true);

      const { data, error: fetchError } = await supabase
        .from("shenanigans_events")
        .select("id, player_name, description, points, created_at, game_id")
        .eq("event_type", "Side Game")
        .eq("game_id", selectedGameId)
        .order("created_at", { ascending: false });

      console.log("side game events fetched rows:", {
        selectedGameId,
        data,
        error: fetchError,
      });

      if (!isCurrent) {
        return;
      }

      if (fetchError) {
        setEvents([]);
        setError(fetchError.message || "Could not load side game events.");
        setIsLoadingEvents(false);
        return;
      }

      setEvents((data as SideGameEvent[]) || []);
      setIsLoadingEvents(false);
    }

    fetchInitialSideGameEvents();

    return () => {
      isCurrent = false;
    };
  }, [selectedGameId]);

  async function handleSubmit() {
    const trimmedDescription = description.trim();

    setMessage("");
    setError("");

    if (!selectedPlayer) {
      setError("Select a winner.");
      return;
    }

    if (!selectedGameId) {
      setError("Select or start a Shenanigans game first.");
      return;
    }

    if (selectedPoints === null) {
      setError("Select a point value.");
      return;
    }

    if (!trimmedDescription) {
      setError("Description is required.");
      return;
    }

    setIsSubmitting(true);

    const payload = {
      player_name: selectedPlayer,
      event_type: "Side Game",
      description: `${selectedType}: ${trimmedDescription}`,
      points: selectedPoints,
      game_id: selectedGameId,
    };

    console.log("Submitting side game event payload:", payload);

    try {
      const { data, error: insertError } = await supabase
        .from("shenanigans_events")
        .insert(payload)
        .select();

      console.log("side game event insert result:", {
        data,
        error: insertError,
      });

      if (insertError) {
        setError(insertError.message || "Could not log side game.");
        return;
      }

      setMessage("Side game logged.");
      const createdEventId = Array.isArray(data) ? data[0]?.id : null;
      await logActivityFeedItem({
        type: "shenanigans_side_game_logged",
        source: "shenanigans",
        sourceId: createdEventId || null,
        linkUrl: "/shenanigans/side-games",
        message: `Shenanigans: ${selectedPlayer} wins ${selectedType}.`,
      });
      await logAuditEvent({
        actionType: "shenanigans_ledger_event_created",
        entityType: "shenanigans_event",
        entityId: createdEventId || null,
        summary: `${selectedPlayer} logged a ${selectedType} side game.`,
        newValue: Array.isArray(data) ? data[0] : payload,
        metadata: { game_id: selectedGameId },
      });
      setSelectedPoints(null);
      setDescription("");
      await fetchSideGameEvents();
    } catch (submitError) {
      console.error("side game event insert failed:", submitError);
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Could not log side game.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main
      className="gc-mobile-shell text-[#f5f5f5]"
      style={{ "--page-accent": "#a45a66" } as CSSProperties}
    >
      <div className="gc-mobile-stage w-full max-w-md justify-center space-y-8">
        <div className="gc-section-head">
          <p className="gc-card-kicker text-[#a45a66]">
            Shenanigans
          </p>

          <h1 className="gc-card-title">Side Games</h1>

          <p className="gc-card-copy">
            Bocce, basket-golf, and whatever else gets invented.
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

        <section className="space-y-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#b91c1c]">
              Featured Side Games
            </p>

            <h2 className="mt-2 text-xl font-bold">Round Breakers</h2>
          </div>

          <div className="space-y-3">
            {featuredGames.map((game) => (
              <div
                key={game.title}
                className="gc-edge-card p-5"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-xl font-bold">{game.title}</h3>

                    <p className="mt-2 text-sm leading-6 text-[#a3a3a3]">
                      {game.description}
                    </p>
                  </div>

                  <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-[#b91c1c]" />
                </div>

                <div className="mt-4 border-t border-[#242424] pt-4">
                  <p className="text-sm font-semibold text-[#f5f5f5]">
                    {game.pointNote}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="gc-edge-card p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#b91c1c]">
            Custom Games
          </p>

          <h2 className="mt-2 text-xl font-bold">Invented Shenanigans</h2>

          <p className="mt-2 text-sm leading-6 text-[#a3a3a3]">
            Additional side games can be created during the round if all players agree.
          </p>

          <p className="mt-4 text-sm font-bold text-[#f5f5f5]">
            If everyone agrees, it counts.
          </p>
        </section>

        {!selectedGameId && !isLoadingGame && <NoShenanigansGamePrompt />}

        {selectedGameId && (
        <section className="gc-edge-card p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#b91c1c]">
            Log Side Game
          </p>

          <div className="mt-4 space-y-4">
            <div className="space-y-3">
              <CompactPlayerSelect
                players={selectablePlayers}
                selectedName={selectedPlayer}
                onSelect={setChosenPlayer}
                isLoading={isLoadingGame}
                label="Winner"
              />
            </div>

            <div className="space-y-3">
              <p className="text-sm text-[#a3a3a3]">Game Type</p>

              <div className="grid grid-cols-3 gap-3">
                {sideGameTypes.map((type) => {
                  const isSelected = type === selectedType;

                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setSelectedType(type)}
                      className={`rounded-2xl border px-3 py-4 text-left text-sm font-semibold transition-colors duration-200 ${
                        isSelected
                          ? "border-[#b91c1c] bg-[#b91c1c] text-[#f5f5f5]"
                          : "border-[#242424] bg-black text-[#f5f5f5] hover:border-[#b91c1c]"
                      }`}
                    >
                      {type}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-sm text-[#a3a3a3]">Point Value</p>

              <div className="grid grid-cols-3 gap-3">
                {pointValues.map((points) => {
                  const isSelected = points === selectedPoints;

                  return (
                    <button
                      key={points}
                      type="button"
                      onClick={() => setSelectedPoints(points)}
                      className={`rounded-2xl border py-3 text-sm font-bold transition-colors duration-200 ${
                        isSelected
                          ? "border-[#b91c1c] bg-[#b91c1c] text-[#f5f5f5]"
                          : "border-[#242424] bg-black text-[#f5f5f5] hover:border-[#b91c1c]"
                      }`}
                    >
                      +{points}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label
                htmlFor="side-game-description"
                className="mb-2 block text-sm text-[#a3a3a3]"
              >
                Description
              </label>

              <input
                id="side-game-description"
                type="text"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="What happened?"
                className="w-full rounded-xl border border-[#242424] bg-black px-4 py-4 text-[#f5f5f5] outline-none transition-colors duration-200 placeholder:text-[#737373] focus:border-[#b91c1c]"
              />
            </div>

            <button
              type="button"
              onClick={handleSubmit}
              disabled={
                isSubmitting ||
                isLoadingGame ||
                selectablePlayers.length === 0
              }
              className="w-full rounded-2xl border border-[#b91c1c] bg-[#b91c1c] px-5 py-4 text-center text-base font-bold text-[#f5f5f5] transition-colors duration-200 hover:border-[#991b1b] hover:bg-[#991b1b] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting ? "Logging..." : "Log Side Game"}
            </button>
          </div>
        </section>
        )}

        {message && (
          <p className="text-center text-sm text-[#f5f5f5]">{message}</p>
        )}

        {error && (
          <p className="text-center text-sm text-[#fca5a5]">{error}</p>
        )}

        {selectedGameId && (
        <section className="space-y-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#b91c1c]">
              Recent Side Games
            </p>

            <h2 className="mt-2 text-xl font-bold">Booked Chaos</h2>
          </div>

          <div className="space-y-3">
            {isLoadingEvents && (
              <div className="gc-edge-card p-5 text-sm text-[#a3a3a3]">
                Loading side games...
              </div>
            )}

            {!isLoadingEvents && events.length === 0 && (
              <div className="gc-edge-card p-5 text-sm text-[#a3a3a3]">
                No side games logged yet.
              </div>
            )}

            {!isLoadingEvents &&
              events.map((event) => (
                <div
                  key={event.id}
                  className="gc-edge-card p-5"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-bold">{event.player_name}</h3>

                        <span className="text-xs text-[#737373]">
                          {formatTimestamp(event.created_at)}
                        </span>
                      </div>

                      <p className="mt-2 text-sm leading-6 text-[#a3a3a3]">
                        {event.description}
                      </p>
                    </div>

                    <span className="shrink-0 rounded-full border border-[#b91c1c]/70 px-3 py-1 text-sm font-bold text-[#f5f5f5]">
                      +{event.points}
                    </span>
                  </div>
                </div>
              ))}
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
