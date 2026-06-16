"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

const nights = [
  { label: "Tuesday", value: "tuesday" },
  { label: "Wednesday", value: "wednesday" },
  { label: "Thursday", value: "thursday" },
  { label: "Friday", value: "friday" },
  { label: "Saturday", value: "saturday" },
];

type ScoreRow = {
  id: string;
  player_name: string | null;
  target: string | null;
  score: number | null;
  created_at: string | null;
};

export default function NightGolfAdminPage() {
  const [selectedNight, setSelectedNight] = useState("tuesday");
  const [rows, setRows] = useState<ScoreRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const selectedNightLabel =
    nights.find((night) => night.value === selectedNight)?.label || "Tuesday";

  const totals = useMemo(() => {
    const totalsByPlayer = rows.reduce<Record<string, number>>(
      (accumulator, row) => {
        const playerName = row.player_name?.trim();

        if (!playerName) {
          return accumulator;
        }

        accumulator[playerName] =
          (accumulator[playerName] || 0) + (row.score || 0);

        return accumulator;
      },
      {},
    );

    return Object.entries(totalsByPlayer)
      .map(([name, total]) => ({ name, total }))
      .sort((a, b) => b.total - a.total);
  }, [rows]);

  async function fetchRows(night = selectedNight) {
    const { data, error: fetchError } = await supabase
      .from("night_golf_scores")
      .select("id, player_name, target, score, created_at")
      .eq("night", night)
      .order("created_at", { ascending: false });

    if (fetchError) {
      setRows([]);
      setError(fetchError.message || "Could not load submissions.");
      setIsLoading(false);
      return;
    }

    setRows((data as ScoreRow[]) || []);
    setIsLoading(false);
  }

  useEffect(() => {
    let isCurrent = true;

    async function loadSelectedNight() {
      const { data, error: fetchError } = await supabase
        .from("night_golf_scores")
        .select("id, player_name, target, score, created_at")
        .eq("night", selectedNight)
        .order("created_at", { ascending: false });

      if (!isCurrent) {
        return;
      }

      if (fetchError) {
        setRows([]);
        setError(fetchError.message || "Could not load submissions.");
        setIsLoading(false);
        return;
      }

      setRows((data as ScoreRow[]) || []);
      setIsLoading(false);
    }

    loadSelectedNight();

    return () => {
      isCurrent = false;
    };
  }, [selectedNight]);

  async function handleDelete(row: ScoreRow) {
    const playerName = row.player_name || "this player";

    if (!row.id) {
      setMessage("");
      setError("Could not delete submission: missing Supabase row id.");
      return;
    }

    if (!window.confirm(`Delete ${playerName}'s ${row.target || "score"} submission?`)) {
      return;
    }

    setMessage("");
    setError("");

    const { data, error: deleteError } = await supabase
      .from("night_golf_scores")
      .delete()
      .eq("id", row.id)
      .select("id");

    if (deleteError) {
      setError(deleteError.message || "Could not delete submission.");
      return;
    }

    if (!data || data.length === 0) {
      setError(
        "Delete did not remove a row. Check Supabase delete policy or row id.",
      );
      return;
    }

    setRows((currentRows) =>
      currentRows.filter((currentRow) => currentRow.id !== row.id),
    );
    setMessage("Submission deleted.");
  }

  async function handleResetNight() {
    if (
      !window.confirm(
        `Reset all ${selectedNightLabel} Night Golf submissions? This cannot be undone.`,
      )
    ) {
      return;
    }

    setMessage("");
    setError("");

    const { error: resetError } = await supabase
      .from("night_golf_scores")
      .delete()
      .eq("night", selectedNight)
      .select();

    if (resetError) {
      setError(resetError.message || "Could not reset night.");
      return;
    }

    setMessage(`${selectedNightLabel} reset.`);
    setIsLoading(true);
    await fetchRows();
  }

  return (
    <main className="min-h-screen bg-black p-6 text-[#f5f5f5]">
      <Link href="/admin" className="gc-back-link gc-floating-back gc-back-night">
        ← BACK
      </Link>
      <div className="mx-auto w-full max-w-md space-y-8 py-10">
        <div className="space-y-2">
          <p className="text-sm uppercase tracking-[0.35em] text-[#a3a3a3]">
            Admin
          </p>

          <h1 className="text-4xl font-bold tracking-tight">
            Night Golf
          </h1>

          <p className="text-[#a3a3a3]">
            Review and manage score submissions.
          </p>
        </div>

        <section className="rounded-2xl border border-[#242424] bg-[#111111] p-5">
          <label className="mb-3 block text-sm text-[#a3a3a3]">
            Select Night
          </label>

          <div className="grid grid-cols-2 gap-3">
            {nights.map((night) => (
              <button
                key={night.value}
                type="button"
                onClick={() => {
                  setMessage("");
                  setError("");
                  setIsLoading(true);
                  setSelectedNight(night.value);
                }}
                className={`rounded-xl border p-3 text-left text-sm font-bold transition ${
                  selectedNight === night.value
                    ? "border-[#f5f5f5] bg-[#f5f5f5] text-black"
                    : "border-[#242424] bg-black text-[#f5f5f5]"
                }`}
              >
                {night.label}
              </button>
            ))}
          </div>
        </section>

        <section className="space-y-3">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold">Player Totals</h2>

              <p className="mt-1 text-sm text-[#a3a3a3]">
                {selectedNightLabel} standings.
              </p>
            </div>

            <button
              type="button"
              onClick={handleResetNight}
              disabled={isLoading || rows.length === 0}
              className="rounded-xl border border-[#242424] px-3 py-2 text-xs font-bold text-[#f5f5f5] transition hover:border-[#f5f5f5] disabled:cursor-not-allowed disabled:opacity-50"
            >
              Reset Night
            </button>
          </div>

          <div className="rounded-2xl border border-[#242424] bg-[#111111] px-5">
            {isLoading && (
              <p className="py-5 text-center text-sm text-[#a3a3a3]">
                Loading submissions…
              </p>
            )}

            {!isLoading && totals.length === 0 && (
              <p className="py-5 text-center text-sm text-[#a3a3a3]">
                No scores submitted yet.
              </p>
            )}

            {!isLoading &&
              totals.map((player) => (
                <div
                  key={player.name}
                  className="flex items-center justify-between border-b border-[#242424] py-4 last:border-b-0"
                >
                  <p className="font-semibold">{player.name}</p>

                  <p className="text-2xl font-bold">{player.total}</p>
                </div>
              ))}
          </div>
        </section>

        <section className="space-y-3">
          <div>
            <h2 className="text-xl font-bold">Raw Submissions</h2>

            <p className="mt-1 text-sm text-[#a3a3a3]">
              Individual score rows from Supabase.
            </p>
          </div>

          {message && (
            <p className="text-center text-sm text-[#f5f5f5]">{message}</p>
          )}

          {error && (
            <p className="text-center text-sm text-[#ff8a8a]">{error}</p>
          )}

          <div className="space-y-3">
            {!isLoading &&
              rows.map((row) => (
                <div
                  key={row.id}
                  className="rounded-2xl border border-[#242424] bg-[#111111] p-5"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <h3 className="truncate text-lg font-bold">
                        {row.player_name || "Unknown Player"}
                      </h3>

                      <p className="mt-1 text-sm text-[#a3a3a3]">
                        Target {row.target || "-"} · Score {row.score ?? 0}
                      </p>

                      <p className="mt-2 text-xs text-[#737373]">
                        {row.created_at
                          ? new Date(row.created_at).toLocaleString()
                          : "No timestamp"}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDelete(row)}
                      className="shrink-0 rounded-xl border border-[#242424] px-3 py-2 text-xs font-bold text-[#f5f5f5] transition hover:border-[#f5f5f5]"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
          </div>
        </section>
      </div>
    </main>
  );
}
