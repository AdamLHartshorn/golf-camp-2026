"use client";

import Link from "next/link";
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useActivePlayers } from "@/lib/useActivePlayers";

const eventTypes = ["Bank", "Wager", "Side Game", "Custom"];
const pointValues = [-5, -3, -1, 1, 2, 3, 5, 10];

export default function ShenanigansLogEventPage() {
  const [chosenPlayer, setChosenPlayer] = useState("");
  const [selectedType, setSelectedType] = useState(eventTypes[0]);
  const [selectedPoints, setSelectedPoints] = useState<number | null>(2);
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const {
    players,
    isLoading: isLoadingPlayers,
    error: playersError,
  } = useActivePlayers();
  const selectedPlayer = chosenPlayer || players[0]?.display_name || "";

  const signedPoints =
    selectedPoints === null
      ? "-"
      : selectedPoints > 0
        ? `+${selectedPoints}`
        : String(selectedPoints);
  const previewDescription = description.trim() || "What happened?";

  async function handleSubmit() {
    const trimmedDescription = description.trim();

    setMessage("");
    setError("");

    if (!selectedPlayer) {
      setError("Select a player.");
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
      event_type: selectedType,
      description: trimmedDescription,
      points: selectedPoints,
    };

    console.log("Submitting shenanigans_events payload:", payload);

    try {
      const { data, error: insertError } = await supabase
        .from("shenanigans_events")
        .insert(payload)
        .select();

      console.log("shenanigans_events insert result:", {
        data,
        error: insertError,
      });

      if (insertError) {
        setError(insertError.message || "Could not add event.");
        return;
      }

      setMessage("Event added.");
      setSelectedPoints(null);
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
    <main className="min-h-screen bg-black p-6 text-[#f5f5f5]">
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center space-y-8 py-8">
        <div className="space-y-2">
          <p className="text-sm uppercase tracking-[0.35em] text-[#b91c1c]">
            Shenanigans
          </p>

          <h1 className="text-4xl font-bold tracking-tight">
            Log Event
          </h1>

          <p className="text-[#a3a3a3]">
            Add points to the chaos ledger.
          </p>
        </div>

        <section className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#b91c1c]">
            Player
          </p>

          {isLoadingPlayers && (
            <div className="rounded-2xl border border-[#242424] bg-[#111111] p-4 text-sm text-[#a3a3a3]">
              Loading players...
            </div>
          )}

          {!isLoadingPlayers && playersError && (
            <div className="rounded-2xl border border-[#242424] bg-[#111111] p-4 text-sm text-[#fca5a5]">
              {playersError}
            </div>
          )}

          {!isLoadingPlayers && !playersError && players.length === 0 && (
            <div className="rounded-2xl border border-[#242424] bg-[#111111] p-4 text-sm text-[#a3a3a3]">
              No active players found.
            </div>
          )}

          {!isLoadingPlayers && !playersError && players.length > 0 && (
            <div className="grid grid-cols-2 gap-3">
              {players.map((player) => {
                const isSelected = player.display_name === selectedPlayer;

                return (
                  <button
                    key={player.id}
                    type="button"
                    onClick={() => setChosenPlayer(player.display_name)}
                    className={`rounded-2xl border p-4 text-left text-sm font-semibold transition-colors duration-200 ${
                      isSelected
                        ? "border-[#b91c1c] bg-[#b91c1c] text-[#f5f5f5]"
                        : "border-[#242424] bg-[#111111] text-[#f5f5f5] hover:border-[#b91c1c]"
                    }`}
                  >
                    {player.display_name}
                  </button>
                );
              })}
            </div>
          )}
        </section>

        <section className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#b91c1c]">
            Event Type
          </p>

          <div className="grid grid-cols-2 gap-3">
            {eventTypes.map((type) => {
              const isSelected = type === selectedType;

              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => setSelectedType(type)}
                  className={`rounded-2xl border p-4 text-left text-sm font-semibold transition-colors duration-200 ${
                    isSelected
                      ? "border-[#b91c1c] bg-[#b91c1c] text-[#f5f5f5]"
                      : "border-[#242424] bg-[#111111] text-[#f5f5f5] hover:border-[#b91c1c]"
                  }`}
                >
                  {type}
                </button>
              );
            })}
          </div>
        </section>

        <section className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#b91c1c]">
            Point Value
          </p>

          <div className="grid grid-cols-4 gap-3">
            {pointValues.map((points) => {
              const isSelected = points === selectedPoints;
              const label = points > 0 ? `+${points}` : String(points);

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
                  {label}
                </button>
              );
            })}
          </div>
        </section>

        <section className="space-y-3">
          <label
            htmlFor="event-description"
            className="block text-xs font-semibold uppercase tracking-[0.28em] text-[#b91c1c]"
          >
            Description
          </label>

          <input
            id="event-description"
            type="text"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="What happened?"
            className="w-full rounded-2xl border border-[#242424] bg-[#111111] px-4 py-4 text-[#f5f5f5] outline-none transition-colors duration-200 placeholder:text-[#737373] focus:border-[#b91c1c]"
          />
        </section>

        <section className="rounded-2xl border border-[#242424] bg-[#111111] p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#b91c1c]">
            Preview
          </p>

          <div className="mt-4 flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-bold">{selectedPlayer}</h2>

                <span className="rounded-full border border-[#242424] px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#a3a3a3]">
                  {selectedType}
                </span>
              </div>

              <p className="mt-2 text-sm leading-6 text-[#a3a3a3]">
                {previewDescription}
              </p>
            </div>

            <span
              className={`shrink-0 rounded-full border px-3 py-1 text-sm font-bold ${
                selectedPoints !== null && selectedPoints > 0
                  ? "border-[#b91c1c]/70 text-[#f5f5f5]"
                  : "border-[#7f1d1d] bg-[#1f1111] text-[#fca5a5]"
              }`}
            >
              {signedPoints}
            </span>
          </div>
        </section>

        {message && (
          <p className="text-center text-sm text-[#f5f5f5]">{message}</p>
        )}

        {error && (
          <p className="text-center text-sm text-[#fca5a5]">{error}</p>
        )}

        <button
          type="button"
          onClick={handleSubmit}
          disabled={isSubmitting || isLoadingPlayers || players.length === 0}
          className="rounded-2xl border border-[#b91c1c] bg-[#b91c1c] px-5 py-4 text-center text-base font-bold text-[#f5f5f5] transition-colors duration-200 hover:border-[#991b1b] hover:bg-[#991b1b] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSubmitting ? "Adding..." : "Add to Ledger"}
        </button>

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
