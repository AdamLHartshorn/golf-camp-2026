"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
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
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const isSupabaseConnected = Boolean(supabase);
  const selectedPlayerName =
    chosenPlayerName || players[0]?.display_name || "";

  useEffect(() => {
    async function fetchExistingScores() {
      const { data, error: fetchError } = await supabase
        .from("night_golf_scores")
        .select("*");

      console.log("night_golf_scores page-load rows:", {
        data,
        error: fetchError,
      });
    }

    fetchExistingScores();
  }, []);

  async function handleSubmit() {
    console.log("SUBMIT CLICKED");

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

    console.log("Submitting night_golf_scores payload:", payload);

    try {
      const { data, error: insertError } = await supabase
        .from("night_golf_scores")
        .insert(payload);

      console.log("night_golf_scores insert result:", {
        data,
        error: insertError,
      });

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
      console.error("night_golf_scores insert failed:", submitError);
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
    <main className="min-h-screen bg-black text-[#f5f5f5] p-6">
      <div className="mx-auto w-full max-w-md space-y-8 py-10">
        <div className="space-y-2">
          <p className="text-sm uppercase tracking-[0.35em] text-[#a3a3a3]">
            {nightLabel} Night Golf
          </p>

          <h1 className="text-4xl font-bold tracking-tight text-[#f472b6]">
            Scorecard
          </h1>

          <p className="text-[#a3a3a3]">
            Enter target-by-target results.
          </p>
        </div>

        <div className="space-y-6">
          <section className="rounded-2xl border border-[#242424] bg-[#111111] p-5">
            <label className="mb-3 block text-sm text-[#a3a3a3]">
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
                    className={`rounded-xl border p-4 text-left text-sm font-semibold transition ${
                      selectedPlayerName === player.display_name
                        ? "border-[#ec4899] bg-[#db2777] text-black"
                        : "border-[#242424] bg-black text-[#f5f5f5] hover:border-[#ec4899]"
                    }`}
                  >
                    {player.display_name}
                  </button>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-[#242424] bg-[#111111] p-5">
            <label className="mb-3 block text-sm text-[#a3a3a3]">
              Target
            </label>

            <div className="grid grid-cols-3 gap-3">
              {targets.map((target) => (
                <button
                  key={target}
                  onClick={() => setSelectedTarget(target)}
                  className={`rounded-xl p-4 text-lg font-bold transition ${
                    selectedTarget === target
                      ? "bg-[#db2777] text-black"
                      : "border border-[#242424] bg-black text-[#f472b6]"
                  }`}
                >
                  {target}
                </button>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-[#242424] bg-[#111111] p-5">
            <label className="mb-3 block text-sm text-[#a3a3a3]">
              Result
            </label>

            <div className="grid grid-cols-3 gap-3">
              <button
                onClick={() => setSelectedScore(0)}
                className={`rounded-xl p-5 text-xl font-bold transition ${
                  selectedScore === 0
                    ? "bg-[#a3a3a3] text-black"
                    : "border border-[#242424] bg-black"
                }`}
              >
                0
              </button>

              <button
                onClick={() => setSelectedScore(1)}
                className={`rounded-xl p-5 text-xl font-bold transition ${
                  selectedScore === 1
                    ? "bg-[#f5f5f5] text-black"
                    : "border border-[#242424] bg-black"
                }`}
              >
                1
              </button>

              <button
                onClick={() => setSelectedScore(3)}
                className={`rounded-xl p-5 text-xl font-bold transition ${
                  selectedScore === 3
                    ? "bg-[#db2777] text-black"
                    : "border border-[#242424] bg-black"
                }`}
              >
                3
              </button>
            </div>
          </section>

          <div className="space-y-4">
            <div className="rounded-2xl border border-[#242424] bg-[#111111] p-5 text-center">
              <p className="text-sm text-[#a3a3a3]">
                Current Total
              </p>

              <p className="mt-1 text-4xl font-bold text-[#f472b6]">
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
              className="w-full rounded-2xl bg-[#db2777] py-5 text-xl font-bold text-black transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
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

        <div className="space-y-1 text-center text-xs text-[#737373]">
          <p>
            {isSupabaseConnected
              ? "Supabase Connected"
              : "Supabase Not Connected"}
          </p>

          <p>{supabaseUrl || "Missing NEXT_PUBLIC_SUPABASE_URL"}</p>
        </div>
      </div>
    </main>
  );
}
