"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

const cards = [
  {
    name: "Log Wager",
    href: "/p2p-wagers/log",
    description: "Create a new freeform side bet.",
  },
  {
    name: "Active Wagers",
    href: "/p2p-wagers/active",
    description: "View open wagers and settle winners.",
  },
  {
    name: "Settlement",
    href: "/p2p-wagers/settlement",
    description: "Net balances and payment instructions.",
  },
];

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

export default function P2PWagersPage() {
  const [wagers, setWagers] = useState<P2PWager[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isCurrent = true;

    async function fetchWagers() {
      const { data, error: fetchError } = await supabase
        .from("p2p_wagers")
        .select("*")
        .order("created_at", { ascending: false });

      console.log("p2p_wagers hub preview fetched rows:", {
        data,
        error: fetchError,
      });

      if (!isCurrent) {
        return;
      }

      if (fetchError) {
        setWagers([]);
        setError(fetchError.message || "Could not load wager previews.");
        setIsLoading(false);
        return;
      }

      setWagers((data as P2PWager[]) || []);
      setIsLoading(false);
    }

    fetchWagers();

    return () => {
      isCurrent = false;
    };
  }, []);

  const activePreview = useMemo(
    () => wagers.filter((wager) => wager.status !== "settled").slice(0, 3),
    [wagers],
  );
  const settledPreview = useMemo(
    () => wagers.filter((wager) => wager.status === "settled").slice(0, 3),
    [wagers],
  );

  return (
    <main className="min-h-screen bg-black p-6 text-[#f5f5f5]">
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center space-y-8 py-8">
        <div className="space-y-2">
          <p className="text-sm uppercase tracking-[0.35em] text-[#d6a84f]">
            Golf Camp 2026
          </p>

          <h1 className="text-4xl font-bold tracking-tight">P2P Wagers</h1>

          <p className="text-[#a3a3a3]">
            Freeform side action and camp degeneracy.
          </p>
        </div>

        <section className="space-y-3">
          {cards.map((card) => (
            <Link
              key={card.name}
              href={card.href}
              className="block rounded-2xl border border-[#3a2a12] bg-[#14110c] p-5 transition-colors duration-200 hover:border-[#d6a84f]"
            >
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <h2 className="text-xl font-bold">{card.name}</h2>

                  <p className="mt-1 text-sm leading-5 text-[#a3a3a3]">
                    {card.description}
                  </p>
                </div>

                <span className="text-2xl text-[#d6a84f]">→</span>
              </div>
            </Link>
          ))}
        </section>

        {error && (
          <p className="text-center text-sm text-[#f5c56f]">{error}</p>
        )}

        <section className="space-y-3">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#d6a84f]">
                Active Wagers
              </p>

              <h2 className="mt-2 text-xl font-bold">Open Tickets</h2>
            </div>

            <Link
              href="/p2p-wagers/active"
              className="text-xs font-semibold uppercase tracking-[0.16em] text-[#d6a84f]"
            >
              Manage
            </Link>
          </div>

          <div className="space-y-3">
            {isLoading && (
              <div className="rounded-2xl border border-[#242424] bg-[#111111] p-5 text-sm text-[#a3a3a3]">
                Loading active wagers...
              </div>
            )}

            {!isLoading && activePreview.length === 0 && (
              <div className="rounded-2xl border border-[#242424] bg-[#111111] p-5 text-sm text-[#a3a3a3]">
                No active P2P wagers yet.
              </div>
            )}

            {!isLoading &&
              activePreview.map((wager) => (
                <Link
                  key={wager.id}
                  href="/p2p-wagers/active"
                  className="block rounded-2xl border border-[#3a2a12] bg-[#14110c] p-5 transition-colors duration-200 hover:border-[#d6a84f]"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-bold">
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

                    <span className="shrink-0 rounded-full border border-[#d6a84f]/70 px-3 py-1 text-sm font-bold text-[#f5f5f5]">
                      {formatMoney(Number(wager.amount))}
                    </span>
                  </div>
                </Link>
              ))}
          </div>
        </section>

        <section className="space-y-3">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#d6a84f]">
                Recent Settlements
              </p>

              <h2 className="mt-2 text-xl font-bold">Booked Results</h2>
            </div>

            <Link
              href="/p2p-wagers/settlement"
              className="text-xs font-semibold uppercase tracking-[0.16em] text-[#d6a84f]"
            >
              Settle Up
            </Link>
          </div>

          <div className="space-y-3">
            {isLoading && (
              <div className="rounded-2xl border border-[#242424] bg-[#111111] p-5 text-sm text-[#a3a3a3]">
                Loading settlements...
              </div>
            )}

            {!isLoading && settledPreview.length === 0 && (
              <div className="rounded-2xl border border-[#242424] bg-[#111111] p-5 text-sm text-[#a3a3a3]">
                No settled P2P wagers yet.
              </div>
            )}

            {!isLoading &&
              settledPreview.map((wager) => (
                <Link
                  key={wager.id}
                  href="/p2p-wagers/settlement"
                  className="block rounded-2xl border border-[#242424] bg-[#0b0b0b] p-5 opacity-90 transition-colors duration-200 hover:border-[#3a2a12]"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <h3 className="font-bold">
                        {wager.winner_name || "Winner"} beat{" "}
                        {(wager.loser_names || []).join(", ") || "the field"}
                      </h3>

                      <p className="mt-2 line-clamp-2 text-sm leading-6 text-[#a3a3a3]">
                        {wager.description}
                      </p>

                      <p className="mt-2 text-xs text-[#737373]">
                        {formatDate(wager.settled_at)}
                      </p>
                    </div>

                    <span className="shrink-0 rounded-full border border-[#242424] px-3 py-1 text-sm font-bold text-[#d6a84f]">
                      {formatMoney(Number(wager.amount))}
                    </span>
                  </div>
                </Link>
              ))}
          </div>
        </section>

        <Link href="/home" className="text-center text-sm text-[#a3a3a3]">
          ← Back to Camp Dashboard
        </Link>
      </div>
    </main>
  );
}
