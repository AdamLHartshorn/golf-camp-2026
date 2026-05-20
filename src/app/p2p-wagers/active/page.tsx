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
};

function formatMoney(amount: number) {
  return `$${Number(amount || 0).toFixed(2).replace(/\.00$/, "")}`;
}

function formatDate(value: string | null) {
  if (!value) {
    return "Pending";
  }

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export default function P2PActiveWagersPage() {
  const [wagers, setWagers] = useState<P2PWager[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [settlingId, setSettlingId] = useState("");
  const [expandedWagers, setExpandedWagers] = useState<Record<string, boolean>>(
    {},
  );
  const [selectedWinners, setSelectedWinners] = useState<Record<string, string>>(
    {},
  );
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const activeWagers = useMemo(
    () => wagers.filter((wager) => wager.status !== "settled"),
    [wagers],
  );

  async function fetchWagers() {
    setIsLoading(true);

    const { data, error: fetchError } = await supabase
      .from("p2p_wagers")
      .select("*")
      .neq("status", "settled")
      .order("created_at", { ascending: false });

    console.log("active p2p_wagers fetched rows:", {
      data,
      error: fetchError,
    });

    if (fetchError) {
      setWagers([]);
      setError(fetchError.message || "Could not load active P2P wagers.");
      setIsLoading(false);
      return;
    }

    setWagers((data as P2PWager[]) || []);
    setIsLoading(false);
  }

  useEffect(() => {
    let isCurrent = true;

    async function fetchInitialWagers() {
      const { data, error: fetchError } = await supabase
        .from("p2p_wagers")
        .select("*")
        .neq("status", "settled")
        .order("created_at", { ascending: false });

      console.log("active p2p_wagers fetched rows:", {
        data,
        error: fetchError,
      });

      if (!isCurrent) {
        return;
      }

      if (fetchError) {
        setWagers([]);
        setError(fetchError.message || "Could not load active P2P wagers.");
        setIsLoading(false);
        return;
      }

      setWagers((data as P2PWager[]) || []);
      setIsLoading(false);
    }

    fetchInitialWagers();

    return () => {
      isCurrent = false;
    };
  }, []);

  async function handleSettleWager(wager: P2PWager) {
    const winnerName = selectedWinners[wager.id] || "";
    const loserNames = wager.player_names.filter((name) => name !== winnerName);

    setMessage("");
    setError("");

    if (!winnerName) {
      setError("Select a winner before settling.");
      return;
    }

    if (loserNames.length === 0) {
      setError("A wager needs at least one loser.");
      return;
    }

    setSettlingId(wager.id);

    const payload = {
      status: "settled",
      winner_name: winnerName,
      loser_names: loserNames,
      settled_at: new Date().toISOString(),
    };

    console.log("Settling p2p_wager:", {
      wagerId: wager.id,
      payload,
    });

    try {
      const { data, error: updateError } = await supabase
        .from("p2p_wagers")
        .update(payload)
        .eq("id", wager.id)
        .select();

      console.log("p2p_wagers settle result:", {
        data,
        error: updateError,
      });

      if (updateError) {
        setError(updateError.message || "Could not settle wager.");
        return;
      }

      setSelectedWinners((currentWinners) => {
        const nextWinners = { ...currentWinners };
        delete nextWinners[wager.id];
        return nextWinners;
      });
      setExpandedWagers((currentWagers) => {
        const nextWagers = { ...currentWagers };
        delete nextWagers[wager.id];
        return nextWagers;
      });
      setMessage("Wager settled.");
      await fetchWagers();
    } catch (settleError) {
      console.error("p2p_wagers settle failed:", settleError);
      setError(
        settleError instanceof Error
          ? settleError.message
          : "Could not settle wager.",
      );
    } finally {
      setSettlingId("");
    }
  }

  return (
    <main className="min-h-screen bg-black p-6 text-[#f5f5f5]">
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center space-y-8 py-8">
        <div className="space-y-2">
          <p className="text-sm uppercase tracking-[0.35em] text-[#d6a84f]">
            P2P Wagers
          </p>

          <h1 className="text-4xl font-bold tracking-tight">Active Wagers</h1>

          <p className="text-[#a3a3a3]">
            Open tickets ready to settle.
          </p>
        </div>

        {message && (
          <p className="text-center text-sm text-[#f5f5f5]">{message}</p>
        )}

        {error && (
          <p className="text-center text-sm text-[#f5c56f]">{error}</p>
        )}

        <section className="space-y-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#d6a84f]">
              Active Wagers
            </p>
            <h2 className="mt-2 text-xl font-bold">Open Tickets</h2>
          </div>

          <div className="space-y-3">
            {isLoading && (
              <div className="rounded-2xl border border-[#242424] bg-[#111111] p-5 text-sm text-[#a3a3a3]">
                Loading wagers...
              </div>
            )}

            {!isLoading && activeWagers.length === 0 && (
              <div className="rounded-2xl border border-[#242424] bg-[#111111] p-5 text-sm text-[#a3a3a3]">
                No active P2P wagers yet.
              </div>
            )}

            {!isLoading &&
              activeWagers.map((wager) => {
                const isExpanded = Boolean(expandedWagers[wager.id]);

                return (
                  <div
                    key={wager.id}
                    role="button"
                    tabIndex={0}
                    onClick={() =>
                      setExpandedWagers((currentWagers) => ({
                        ...currentWagers,
                        [wager.id]: !currentWagers[wager.id],
                      }))
                    }
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        setExpandedWagers((currentWagers) => ({
                          ...currentWagers,
                          [wager.id]: !currentWagers[wager.id],
                        }));
                      }
                    }}
                    className="cursor-pointer rounded-2xl border border-[#3a2a12] bg-[#14110c] p-5 shadow-[0_0_0_1px_rgba(214,168,79,0.08)] transition-colors duration-200 hover:border-[#d6a84f]"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-lg font-bold">
                            {wager.player_names.join(" vs ")}
                          </h3>

                          <span className="rounded-full border border-[#d6a84f]/70 px-2 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-[#d6a84f]">
                            Open
                          </span>
                        </div>

                        <p className="mt-2 line-clamp-2 text-sm leading-6 text-[#a3a3a3]">
                          {wager.description}
                        </p>
                      </div>
                      <span className="rounded-full border border-[#d6a84f]/70 px-3 py-1 text-sm font-bold text-[#f5f5f5]">
                        {formatMoney(Number(wager.amount))}
                      </span>
                    </div>

                    <div className="mt-4 flex items-center justify-between border-t border-[#3a2a12] pt-4">
                      <span className="text-xs text-[#a3a3a3]">
                        Created {formatDate(wager.created_at)}
                      </span>

                      <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[#d6a84f]">
                        {isExpanded ? "Hide" : "Tap to settle"}
                      </span>
                    </div>

                    {isExpanded && (
                      <div
                        className="mt-4 space-y-3 border-t border-[#3a2a12] pt-4"
                        onClick={(event) => event.stopPropagation()}
                      >
                        <div className="rounded-xl border border-[#242424] bg-black/40 p-4">
                          <p className="text-xs uppercase tracking-[0.2em] text-[#737373]">
                            Details
                          </p>

                          <p className="mt-2 text-sm leading-6 text-[#a3a3a3]">
                            {wager.description}
                          </p>

                          <p className="mt-3 text-sm text-[#f5f5f5]">
                            {wager.player_names.join(" / ")}
                          </p>
                        </div>

                        <p className="text-xs uppercase tracking-[0.2em] text-[#737373]">
                          Settle Winner
                        </p>

                        <div className="grid grid-cols-2 gap-3">
                          {wager.player_names.map((playerName) => {
                            const isSelected =
                              selectedWinners[wager.id] === playerName;

                            return (
                              <button
                                key={`${wager.id}-${playerName}`}
                                type="button"
                                onClick={() =>
                                  setSelectedWinners((currentWinners) => ({
                                    ...currentWinners,
                                    [wager.id]: playerName,
                                  }))
                                }
                                className={`rounded-xl border px-3 py-3 text-left text-sm font-semibold transition-colors duration-200 ${
                                  isSelected
                                    ? "border-[#d6a84f] bg-[#d6a84f] text-black"
                                    : "border-[#242424] bg-black text-[#f5f5f5] hover:border-[#d6a84f]"
                                }`}
                              >
                                {playerName}
                              </button>
                            );
                          })}
                        </div>

                        <button
                          type="button"
                          onClick={() => handleSettleWager(wager)}
                          disabled={settlingId === wager.id}
                          className="w-full rounded-2xl border border-[#3a2a12] bg-black px-5 py-4 text-center text-sm font-bold text-[#f5f5f5] transition-colors duration-200 hover:border-[#d6a84f] disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {settlingId === wager.id
                            ? "Settling..."
                            : "Confirm Settlement"}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        </section>

        <Link
          href="/p2p-wagers"
          className="text-center text-sm text-[#a3a3a3]"
        >
          ← Back to P2P Wagers
        </Link>
      </div>
    </main>
  );
}
