"use client";

import Link from "next/link";
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useActivePlayers } from "@/lib/useActivePlayers";

const targets = [
  "1G",
  "1Y",
  "1R",
  "2G",
  "2Y",
  "2R",
  "3G",
  "3Y",
  "3R",
];

type NightGolfSubmitPageProps = {
  night: string;
  nightLabel: string;
  backHref: string;
};

export function NightGolfSubmitPage({
  night,
  nightLabel,
  backHref,
}: NightGolfSubmitPageProps) {
  const [chosenPlayerName, setChosenPlayerName] = useState("");
  const [selectedTarget, setSelectedTarget] = useState("1G");
  const [selectedScore, setSelectedScore] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const {
    players,
    isLoading: isLoadingPlayers,
    error: playersError,
  } = useActivePlayers();
  const selectedPlayerName =
    chosenPlayerName || players[0]?.display_name || "";

  async function handleSubmit() {
    const trimmedPlayerName = selectedPlayerName.trim();

    setMessage("");
    setError("");

    if (!trimmedPlayerName) {
      setError("Select a player before submitting.");
      return;
    }

    if (selectedScore === null) {
      setError("Select a score before submitting.");
      return;
    }

    setIsSubmitting(true);

    const payload = {
      night,
      player_name: trimmedPlayerName,
      target: selectedTarget,
      score: selectedScore,
    };

    try {
      const { error: insertError } = await supabase
        .from("night_golf_scores")
        .insert(payload);

      if (insertError) {
        setError(insertError.message || "Could not submit result.");
        return;
      }

      const currentTargetIndex = targets.indexOf(selectedTarget);
      const nextTarget = targets[currentTargetIndex + 1];

      setMessage("Result added.");
      setSelectedScore(null);

      if (nextTarget) {
        setSelectedTarget(nextTarget);
      }
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Could not submit result.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(236,72,153,0.11),transparent_34%),#050505] p-5 text-[#f5f5f5]">
      <div className="mx-auto w-full max-w-md space-y-7 py-8">
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-[0.28em] text-[#a3a3a3]">
            {nightLabel} Night Golf
          </p>

          <h1 className="text-[2.7rem] font-semibold leading-none tracking-[-0.04em] text-[#f5f5f5]">
            Scorecard
          </h1>

          <p className="text-[#a3a3a3]">
            Enter target-by-target results.
          </p>
        </div>

        <div className="space-y-4">
          <section className="rounded-[1.45rem] border border-[#242424] bg-[#101010]/92 p-5 shadow-[0_18px_50px_rgba(0,0,0,0.24)]">
            <label className="mb-3 block text-xs font-semibold uppercase tracking-[0.2em] text-[#a3a3a3]">
              Player
            </label>

            {isLoadingPlayers && (
              <p className="text-sm text-[#a3a3a3]">Loading players...</p>
            )}

            {!isLoadingPlayers && playersError && (
              <p className="text-sm text-[#ff8a8a]">{playersError}</p>
            )}

            {!isLoadingPlayers && !playersError && players.length === 0 && (
              <p className="text-sm text-[#a3a3a3]">No active players found.</p>
            )}

            {!isLoadingPlayers && !playersError && players.length > 0 && (
              <div className="grid grid-cols-2 gap-3">
                {players.map((player) => (
                  <button
                    key={player.id}
                    type="button"
                    onClick={() => setChosenPlayerName(player.display_name)}
                    className={`rounded-2xl border p-4 text-left text-sm font-semibold transition ${
                      selectedPlayerName === player.display_name
                        ? "border-[#ec4899] bg-[#2a111f] text-[#f5f5f5]"
                        : "border-[#242424] bg-black/70 text-[#f5f5f5] hover:border-[#ec4899]"
                    }`}
                  >
                    {player.display_name}
                  </button>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-[1.45rem] border border-[#242424] bg-[#101010]/92 p-5 shadow-[0_18px_50px_rgba(0,0,0,0.24)]">
            <label className="mb-3 block text-xs font-semibold uppercase tracking-[0.2em] text-[#a3a3a3]">
              Target
            </label>

            <div className="grid grid-cols-3 gap-3">
              {targets.map((target) => (
                <button
                  key={target}
                  onClick={() => setSelectedTarget(target)}
                  className={`rounded-2xl border p-4 text-lg font-semibold transition ${
                    selectedTarget === target
                      ? "border-[#ec4899] bg-[#2a111f] text-[#f5f5f5]"
                      : "border-[#242424] bg-black/70 text-[#f472b6]"
                  }`}
                >
                  {target}
                </button>
              ))}
            </div>
          </section>

          <section className="rounded-[1.45rem] border border-[#242424] bg-[#101010]/92 p-5 shadow-[0_18px_50px_rgba(0,0,0,0.24)]">
            <label className="mb-3 block text-xs font-semibold uppercase tracking-[0.2em] text-[#a3a3a3]">
              Result
            </label>

            <div className="grid grid-cols-3 gap-3">
              <button
                onClick={() => setSelectedScore(0)}
                className={`rounded-2xl border p-5 text-xl font-semibold transition ${
                  selectedScore === 0
                    ? "border-[#a3a3a3] bg-[#242424] text-[#f5f5f5]"
                    : "border-[#242424] bg-black/70"
                }`}
              >
                0
              </button>

              <button
                onClick={() => setSelectedScore(1)}
                className={`rounded-2xl border p-5 text-xl font-semibold transition ${
                  selectedScore === 1
                    ? "border-[#f5f5f5] bg-[#242424] text-[#f5f5f5]"
                    : "border-[#242424] bg-black/70"
                }`}
              >
                1
              </button>

              <button
                onClick={() => setSelectedScore(3)}
                className={`rounded-2xl border p-5 text-xl font-semibold transition ${
                  selectedScore === 3
                    ? "border-[#ec4899] bg-[#2a111f] text-[#f5f5f5]"
                    : "border-[#242424] bg-black/70"
                }`}
              >
                3
              </button>
            </div>
          </section>

          <div className="space-y-4">
            <div className="rounded-[1.45rem] border border-[#d8d1c4]/80 bg-[#efe9dc] p-5 text-center text-[#17130e]">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#7a6f60]">
                Current Total
              </p>

              <p className="mt-1 text-4xl font-semibold tracking-[-0.04em]">
                {selectedScore ?? 0}
              </p>
            </div>

            {message && (
              <p className="text-center text-sm text-[#f472b6]">
                {message}
              </p>
            )}

            {error && (
              <p className="text-center text-sm text-[#ff8a8a]">
                {error}
              </p>
            )}

            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting || isLoadingPlayers || players.length === 0}
              className="w-full rounded-[1.35rem] bg-[#db2777] py-5 text-lg font-semibold text-white transition hover:bg-[#ec4899] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting ? "Submitting..." : "Submit Result"}
            </button>
          </div>
        </div>

        <Link
          href={backHref}
          className="block text-center text-sm text-[#a3a3a3]"
        >
          ← Back to {nightLabel} Night Golf
        </Link>

      </div>
    </main>
  );
}
