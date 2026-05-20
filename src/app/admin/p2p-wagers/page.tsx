"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type P2PWager = {
  id: string;
  description: string;
  amount: number;
  status: string | null;
  player_names: string[];
  winner_name: string | null;
  loser_names: string[] | null;
  created_at: string | null;
  settled_at: string | null;
};

function formatMoney(amount: number) {
  return `$${Number(amount || 0).toFixed(2).replace(/\.00$/, "")}`;
}

function formatDate(value: string | null) {
  return value ? new Date(value).toLocaleString() : "No timestamp";
}

export default function P2PAdminPage() {
  const [wagers, setWagers] = useState<P2PWager[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const activeWagers = useMemo(
    () => wagers.filter((wager) => wager.status !== "settled"),
    [wagers],
  );
  const settledWagers = useMemo(
    () => wagers.filter((wager) => wager.status === "settled"),
    [wagers],
  );

  async function fetchWagers() {
    setIsLoading(true);

    const { data, error: fetchError } = await supabase
      .from("p2p_wagers")
      .select("*")
      .order("created_at", { ascending: false });

    console.log("Admin p2p_wagers fetch:", { data, error: fetchError });

    if (fetchError) {
      setWagers([]);
      setError(fetchError.message || "Could not load P2P wagers.");
      setIsLoading(false);
      return;
    }

    setWagers((data as P2PWager[]) || []);
    setError("");
    setIsLoading(false);
  }

  useEffect(() => {
    let isCurrent = true;

    async function loadWagers() {
      const { data, error: fetchError } = await supabase
        .from("p2p_wagers")
        .select("*")
        .order("created_at", { ascending: false });

      console.log("Admin p2p_wagers fetch:", { data, error: fetchError });

      if (!isCurrent) {
        return;
      }

      if (fetchError) {
        setWagers([]);
        setError(fetchError.message || "Could not load P2P wagers.");
        setIsLoading(false);
        return;
      }

      setWagers((data as P2PWager[]) || []);
      setError("");
      setIsLoading(false);
    }

    loadWagers();

    return () => {
      isCurrent = false;
    };
  }, []);

  async function handleDeleteWager(wager: P2PWager) {
    if (!window.confirm(`Delete wager: ${wager.description}?`)) {
      return;
    }

    setMessage("");
    setError("");

    const { data, error: deleteError } = await supabase
      .from("p2p_wagers")
      .delete()
      .eq("id", wager.id)
      .select();

    console.log("Admin p2p_wagers delete:", {
      wager,
      data,
      error: deleteError,
    });

    if (deleteError) {
      setError(deleteError.message || "Could not delete wager.");
      return;
    }

    setMessage("P2P wager deleted.");
    await fetchWagers();
  }

  async function handleResetWagers() {
    if (
      !window.confirm("Reset all P2P wagers? This cannot be undone.")
    ) {
      return;
    }

    setMessage("");
    setError("");

    const { data, error: resetError } = await supabase
      .from("p2p_wagers")
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000")
      .select();

    console.log("Admin p2p_wagers reset:", { data, error: resetError });

    if (resetError) {
      setError(resetError.message || "Could not reset P2P wagers.");
      return;
    }

    setMessage("All P2P wagers reset.");
    await fetchWagers();
  }

  return (
    <main className="min-h-screen bg-black p-6 text-[#f5f5f5]">
      <div className="mx-auto w-full max-w-md space-y-8 py-10">
        <div className="space-y-2">
          <p className="text-sm uppercase tracking-[0.35em] text-[#a3a3a3]">
            Admin
          </p>

          <h1 className="text-4xl font-bold tracking-tight">
            P2P Wagers
          </h1>

          <p className="text-[#a3a3a3]">
            Manage freeform wagers and settlements.
          </p>
        </div>

        <section className="flex items-end justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold">Wager Rows</h2>
            <p className="mt-1 text-sm text-[#a3a3a3]">
              Active and settled p2p_wagers records.
            </p>
          </div>

          <button
            type="button"
            onClick={handleResetWagers}
            disabled={isLoading || wagers.length === 0}
            className="rounded-xl border border-[#242424] px-3 py-2 text-xs font-bold transition hover:border-[#f5f5f5] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Reset All
          </button>
        </section>

        {message && (
          <p className="text-center text-sm text-[#f5f5f5]">{message}</p>
        )}

        {error && (
          <div className="rounded-2xl border border-[#242424] bg-[#111111] p-5 text-sm leading-6 text-[#a3a3a3]">
            {error}
          </div>
        )}

        {isLoading && (
          <div className="rounded-2xl border border-[#242424] bg-[#111111] p-5 text-sm text-[#a3a3a3]">
            Loading P2P wagers...
          </div>
        )}

        {!isLoading && !error && (
          <section className="space-y-6">
            {[
              ["Active", activeWagers],
              ["Settled", settledWagers],
            ].map(([label, wagerGroup]) => (
              <div key={label as string} className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#a3a3a3]">
                  {label as string}
                </p>

                {(wagerGroup as P2PWager[]).length === 0 && (
                  <div className="rounded-2xl border border-[#242424] bg-[#111111] p-5 text-sm text-[#a3a3a3]">
                    No {(label as string).toLowerCase()} P2P wagers.
                  </div>
                )}

                {(wagerGroup as P2PWager[]).map((wager) => (
                  <div
                    key={wager.id}
                    className="rounded-2xl border border-[#242424] bg-[#111111] p-5"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <h3 className="text-lg font-bold">
                          {wager.player_names.join(" vs ")}
                        </h3>
                        <p className="mt-2 text-sm leading-6 text-[#a3a3a3]">
                          {wager.description}
                        </p>
                        <p className="mt-2 text-xs text-[#737373]">
                          {formatMoney(wager.amount)} · {wager.status || "active"} ·{" "}
                          {formatDate(wager.created_at)}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleDeleteWager(wager)}
                        className="shrink-0 rounded-xl border border-[#242424] px-3 py-2 text-xs font-bold transition hover:border-[#f5f5f5]"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </section>
        )}

        <Link href="/admin" className="block text-center text-sm text-[#a3a3a3]">
          ← Back to Admin
        </Link>
      </div>
    </main>
  );
}
