"use client";

import Link from "next/link";
import type { CSSProperties } from "react";
import { useState } from "react";
import { useToast } from "@/components/ToastProvider";
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

const scoreRows = ["1", "2", "3"] as const;
const scoreColumns = [
  {
    key: "G",
    label: "Green",
    accent: "#22c55e",
    fill: "#1fa358",
    text: "#f0fff6",
  },
  {
    key: "Y",
    label: "Orange",
    accent: "#EB9C5C",
    fill: "#d97837",
    text: "#fff6ee",
  },
  {
    key: "R",
    label: "Red",
    accent: "#c93a4d",
    fill: "#b72a3f",
    text: "#fff2f4",
  },
] as const;

const emptyScores = targets.reduce<Record<string, string>>((values, target) => {
  values[target] = "";
  return values;
}, {});

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
  const { showToast } = useToast();
  const [chosenPlayerName, setChosenPlayerName] = useState("");
  const [scoresByTarget, setScoresByTarget] =
    useState<Record<string, string>>(emptyScores);
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
      showToast({
        title: "Choose a player",
        message: "Select a player before submitting.",
        tone: "warning",
        accent: "#f472b6",
      });
      return;
    }

    const parsedScores = targets.map((target) => ({
      target,
      score: Number(scoresByTarget[target]),
    }));
    const hasMissingScore = parsedScores.some(
      ({ score }) => !Number.isFinite(score),
    );
    const hasInvalidScore = parsedScores.some(
      ({ score }) => ![0, 1, 3, 5].includes(score),
    );

    if (hasMissingScore) {
      setError("Enter all 9 scores before submitting.");
      showToast({
        title: "Scorecard incomplete",
        message: "Enter all 9 scores before submitting.",
        tone: "warning",
        accent: "#f472b6",
      });
      return;
    }

    if (hasInvalidScore) {
      setError("Night Golf scores must be 0, 1, 3, or 5.");
      showToast({
        title: "Invalid score",
        message: "Night Golf scores must be 0, 1, 3, or 5.",
        tone: "error",
        accent: "#f472b6",
      });
      return;
    }

    setIsSubmitting(true);

    const payload = parsedScores.map(({ target, score }) => ({
      night,
      player_name: trimmedPlayerName,
      target,
      score,
    }));

    try {
      const { error: insertError } = await supabase
        .from("night_golf_scores")
        .insert(payload);

      if (insertError) {
        const nextError = insertError.message || "Could not submit result.";
        setError(nextError);
        showToast({
          title: "Scorecard not submitted",
          message: nextError,
          tone: "error",
          accent: "#f472b6",
        });
        return;
      }

      setMessage("Scorecard submitted.");
      showToast({
        title: "Night Golf scorecard submitted",
        message: `${trimmedPlayerName} is on the board.`,
        tone: "success",
        accent: "#f472b6",
      });
      setScoresByTarget({ ...emptyScores });
    } catch (submitError) {
      const nextError =
        submitError instanceof Error
          ? submitError.message
          : "Could not submit result.";
      setError(nextError);
      showToast({
        title: "Scorecard not submitted",
        message: nextError,
        tone: "error",
        accent: "#f472b6",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  function updateScore(target: string, value: string) {
    const normalizedValue = value.replace(/[^0-9]/g, "").slice(0, 1);

    setScoresByTarget((currentScores) => ({
      ...currentScores,
      [target]: normalizedValue,
    }));
  }

  const scorecardTotal = targets.reduce(
    (total, target) => total + (Number(scoresByTarget[target]) || 0),
    0,
  );

  function getScoreCellStyle(column: (typeof scoreColumns)[number]) {
    return {
      backgroundColor: column.fill,
      borderColor: column.accent,
      color: column.text,
      caretColor: column.text,
      boxShadow: `inset 0 0 0 1px rgba(255,255,255,0.1), inset 0 0 24px ${column.accent}66, 0 0 22px ${column.accent}40`,
    } satisfies CSSProperties;
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(236,72,153,0.11),transparent_34%),#050505] p-5 text-[#f5f5f5]">
      <Link href={backHref} className="gc-back-link gc-floating-back gc-back-night">
        ← BACK
      </Link>
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
          <section className="rounded-[1rem] border border-[#ec4899]/30 bg-[#101010]/92 p-4 shadow-[0_18px_50px_rgba(0,0,0,0.24),0_0_34px_rgba(236,72,153,0.08)]">
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
              <label className="block">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-[#a3a3a3]">
                  Player
                </span>
                <select
                  value={selectedPlayerName}
                  onChange={(event) => setChosenPlayerName(event.target.value)}
                  className="w-full appearance-none rounded-[0.75rem] border border-[#ec4899]/35 bg-black/70 px-4 py-3 text-base font-bold text-[#f5f5f5] outline-none transition focus:border-[#ec4899] focus:ring-2 focus:ring-[#ec4899]/20"
                >
                  {players.map((player) => (
                    <option
                    key={player.id}
                      value={player.display_name}
                      className="bg-[#111111] text-[#f5f5f5]"
                  >
                    {player.display_name}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </section>

          <section className="rounded-[1.1rem] border border-[#ec4899]/30 bg-[#101010]/92 p-4 shadow-[0_18px_50px_rgba(0,0,0,0.24),0_0_34px_rgba(236,72,153,0.08)]">
            <div className="mb-4 flex items-end justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#f472b6]">
                  Scorecard Grid
                </p>
                <p className="mt-1 text-xs font-semibold text-[#a3a3a3]">
                  Enter 0, 1, 3, or 5 for each target.
                </p>
              </div>
              <div className="rounded-[0.65rem] border border-[#ec4899]/35 bg-[#2a111f] px-3 py-2 text-right">
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#f472b6]">
                  Total
                </p>
                <p className="text-2xl font-black">{scorecardTotal}</p>
              </div>
            </div>

            <div className="grid grid-cols-[2.15rem_repeat(3,minmax(0,1fr))] gap-2">
              {scoreRows.map((row) =>
                scoreColumns.map((column, columnIndex) => {
                  const target = `${row}${column.key}`;

                  return (
                    <div
                      key={columnIndex === 0 ? `${row}-group` : target}
                      className={
                        columnIndex === 0
                          ? "contents"
                          : undefined
                      }
                    >
                      {columnIndex === 0 && (
                        <div className="flex h-14 items-center justify-center rounded-[0.55rem] border border-[#f5f5f5]/75 bg-black/55 font-mono text-lg font-black text-[#f5f5f5] shadow-[0_0_16px_rgba(245,245,245,0.08)]">
                          {row}
                        </div>
                      )}
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0135]*"
                        value={scoresByTarget[target]}
                        onChange={(event) => updateScore(target, event.target.value)}
                        aria-label={`${row} ${column.label} score`}
                        style={getScoreCellStyle(column)}
                        className="h-14 w-full rounded-[0.55rem] border-2 text-center text-2xl font-black outline-none transition focus:ring-2 focus:ring-white/25"
                      />
                    </div>
                  );
                }),
              )}
            </div>
          </section>

          <div className="space-y-4">
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
              {isSubmitting ? "Submitting..." : "Submit Scorecard"}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
