"use client";

import Link from "next/link";
import type { CSSProperties } from "react";
import { useState } from "react";
import { logActivityFeedItem } from "@/lib/activityFeed";
import { logAuditEvent } from "@/lib/auditLog";
import { supabase } from "@/lib/supabase";
import {
  CompactPlayerSelect,
  NoShenanigansGamePrompt,
  ShenanigansGameBar,
  useShenanigansGame,
} from "@/lib/shenanigansGame";

const goodThings = [
  "Longest Drive",
  "FIR",
  "Longest Approach",
  "GIR",
  "Made Eagle Putt",
  "Made Birdie Putt",
  "Best Putt",
];

const badThings = [
  "Tree Hard",
  "Tree Medium",
  "Tree Light",
  "Water Entry",
  "Water Skip",
  "Water Exit",
  "Manmade Object Hit",
  "Cart Path Bounce",
  "Other",
];

const holeNumbers = Array.from({ length: 18 }, (_, index) => index + 1);
const pointValues = Array.from({ length: 15 }, (_, index) => index + 1);

function toggleSelection(currentValues: string[], value: string) {
  return currentValues.includes(value)
    ? currentValues.filter((currentValue) => currentValue !== value)
    : [...currentValues, value];
}

export default function ShenanigansLogEventPage() {
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
  const [selectedHole, setSelectedHole] = useState<number>(1);
  const [selectedGoodThings, setSelectedGoodThings] = useState<string[]>([]);
  const [selectedBadThings, setSelectedBadThings] = useState<string[]>([]);
  const [selectedPoints, setSelectedPoints] = useState<number | null>(3);
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const selectedPlayer = selectablePlayers.some(
    (player) => player.display_name === chosenPlayer,
  )
    ? chosenPlayer
    : selectablePlayers[0]?.display_name || "";

  const signedPoints =
    selectedPoints === null
      ? "-"
      : `+${selectedPoints}`;
  const selectedTags = [...selectedGoodThings, ...selectedBadThings];
  const optionalDescription = description.trim();
  const generatedDescription = [
    selectedPlayer,
    `Hole ${selectedHole}`,
    selectedTags.join(" - "),
    optionalDescription,
  ]
    .filter(Boolean)
    .join(" - ");
  const previewDescription =
    generatedDescription || "Select a player, hole, and what happened.";

  async function handleSubmit() {
    setMessage("");
    setError("");

    if (!selectedPlayer) {
      setError("Select a player.");
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

    if (selectedTags.length === 0 && !optionalDescription) {
      setError("Select at least one tag or add an optional note.");
      return;
    }

    setIsSubmitting(true);

    const payload = {
      player_name: selectedPlayer,
      event_type: "Log Points",
      description: generatedDescription,
      points: selectedPoints,
      game_id: selectedGameId,
    };

    try {
      const { data, error: insertError } = await supabase
        .from("shenanigans_events")
        .insert(payload)
        .select();

      if (insertError) {
        setError(insertError.message || "Could not add event.");
        return;
      }

      setMessage("Points logged.");
      const createdEventId = Array.isArray(data) ? data[0]?.id : null;
      await logActivityFeedItem({
        type: "shenanigans_event_logged",
        source: "shenanigans",
        sourceId: createdEventId || null,
        linkUrl: "/shenanigans/ledger",
        message: `Shenanigans: ${selectedPlayer} ${signedPoints} — ${generatedDescription}.`,
      });
      await logAuditEvent({
        actionType: "shenanigans_ledger_event_created",
        entityType: "shenanigans_event",
        entityId: createdEventId || null,
        summary: `${selectedPlayer} logged ${signedPoints} Shenanigans points.`,
        newValue: Array.isArray(data) ? data[0] : payload,
        metadata: {
          game_id: selectedGameId,
          hole: selectedHole,
          good_things: selectedGoodThings,
          bad_things: selectedBadThings,
        },
      });
      setSelectedPoints(null);
      setSelectedGoodThings([]);
      setSelectedBadThings([]);
      setDescription("");
    } catch (submitError) {
      console.error("shenanigans_events insert failed:", submitError);
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Could not add event.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main
      className="gc-mobile-shell text-[#f5f5f5]"
      style={{ "--page-accent": "#EB9C5C" } as CSSProperties}
    >
      <Link href="/shenanigans" className="gc-back-link gc-floating-back">
        ← BACK
      </Link>
      <div className="gc-mobile-stage w-full max-w-md justify-center space-y-8">
        <div className="gc-section-head">
          <p className="gc-card-kicker text-[#EB9C5C]">
            Shenanigans
          </p>

          <h1 className="gc-card-title">
            Log Points
          </h1>

          <p className="gc-card-copy">
            Select the player, hole, tags, and points.
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

        {!selectedGameId && !isLoadingGame && <NoShenanigansGamePrompt />}

        {selectedGameId && (
        <section className="gc-edge-card p-5">
          <p className="mb-4 text-xs font-semibold uppercase tracking-[0.28em] text-[#b91c1c]">
            Player
          </p>

          <CompactPlayerSelect
            players={selectablePlayers}
            selectedName={selectedPlayer}
            onSelect={setChosenPlayer}
            isLoading={isLoadingGame}
            label="Player"
          />
        </section>
        )}

        {selectedGameId && (
        <section className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#b91c1c]">
            Hole Number
          </p>

          <div className="grid grid-cols-6 gap-2">
            {holeNumbers.map((hole) => {
              const isSelected = hole === selectedHole;

              return (
                <button
                  key={hole}
                  type="button"
                  onClick={() => setSelectedHole(hole)}
                  className={`rounded-xl border py-3 text-center text-sm font-black transition-colors duration-200 ${
                    isSelected
                      ? "border-[#b91c1c] bg-[#b91c1c] text-[#f5f5f5]"
                      : "border-[#242424] bg-[#111111] text-[#f5f5f5] hover:border-[#b91c1c]"
                  }`}
                >
                  {hole}
                </button>
              );
            })}
          </div>
        </section>
        )}

        {selectedGameId && (
        <section className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#b91c1c]">
            Good Things
          </p>

          <div className="grid grid-cols-2 gap-3">
            {goodThings.map((tag) => {
              const isSelected = selectedGoodThings.includes(tag);

              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() =>
                    setSelectedGoodThings((currentTags) =>
                      toggleSelection(currentTags, tag),
                    )
                  }
                  className={`rounded-2xl border px-3 py-3 text-left text-sm font-semibold transition-colors duration-200 ${
                    isSelected
                      ? "border-[#EB9C5C] bg-[#EB9C5C] text-black"
                      : "border-[#242424] bg-[#111111] text-[#f5f5f5] hover:border-[#EB9C5C]"
                  }`}
                >
                  {tag}
                </button>
              );
            })}
          </div>
        </section>
        )}

        {selectedGameId && (
        <section className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#b91c1c]">
            Bad Things
          </p>

          <div className="grid grid-cols-2 gap-3">
            {badThings.map((tag) => {
              const isSelected = selectedBadThings.includes(tag);

              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() =>
                    setSelectedBadThings((currentTags) =>
                      toggleSelection(currentTags, tag),
                    )
                  }
                  className={`rounded-2xl border px-3 py-3 text-left text-sm font-semibold transition-colors duration-200 ${
                    isSelected
                      ? "border-[#b91c1c] bg-[#b91c1c] text-[#f5f5f5]"
                      : "border-[#242424] bg-[#111111] text-[#f5f5f5] hover:border-[#b91c1c]"
                  }`}
                >
                  {tag}
                </button>
              );
            })}
          </div>
        </section>
        )}

        {selectedGameId && (
        <section className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#b91c1c]">
            Point Value
          </p>

          <div className="grid grid-cols-5 gap-2">
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
                      : "border-[#242424] bg-[#111111] text-[#f5f5f5] hover:border-[#b91c1c]"
                  }`}
                >
                  {points}
                </button>
              );
            })}
          </div>
        </section>
        )}

        {selectedGameId && (
        <section className="space-y-3">
          <label
            htmlFor="event-description"
            className="block text-xs font-semibold uppercase tracking-[0.28em] text-[#b91c1c]"
          >
            Optional Note
          </label>

          <input
            id="event-description"
            type="text"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Only add weird details if needed."
            className="w-full rounded-2xl border border-[#242424] bg-[#111111] px-4 py-4 text-[#f5f5f5] outline-none transition-colors duration-200 placeholder:text-[#737373] focus:border-[#b91c1c]"
          />
        </section>
        )}

        {selectedGameId && (
        <section className="gc-edge-card p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#b91c1c]">
            Preview
          </p>

          <div className="mt-4 flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-bold">{selectedPlayer}</h2>

                <span className="rounded-full border border-[#242424] px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#a3a3a3]">
                  Hole {selectedHole}
                </span>
              </div>

              <p className="mt-2 text-sm leading-6 text-[#a3a3a3]">
                {previewDescription}
              </p>
            </div>

            <span
              className={`shrink-0 rounded-full border px-3 py-1 text-sm font-bold ${
                selectedPoints !== null
                  ? "border-[#b91c1c]/70 text-[#f5f5f5]"
                  : "border-[#7f1d1d] bg-[#1f1111] text-[#fca5a5]"
              }`}
            >
              {signedPoints}
            </span>
          </div>
        </section>
        )}

        {message && (
          <p className="text-center text-sm text-[#f5f5f5]">{message}</p>
        )}

        {error && (
          <p className="text-center text-sm text-[#fca5a5]">{error}</p>
        )}

        <button
          type="button"
          onClick={handleSubmit}
          disabled={
            isSubmitting ||
            isLoadingGame ||
            !selectedGameId ||
            selectablePlayers.length === 0
          }
          className="gc-primary-button px-5 py-4 text-center text-base font-bold transition disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSubmitting ? "Adding..." : "Log Points"}
        </button>
      </div>
    </main>
  );
}
