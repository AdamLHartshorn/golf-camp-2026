"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type ShenanigansWager = {
  id: string;
  points: number;
  status: string | null;
  winner_name: string | null;
  loser_names: string[] | null;
};

type FinalTotal = {
  name: string;
  points: number;
  net: number;
};

type PaymentRow = {
  payer: string;
  receiver: string;
  amount: number;
};

function formatMoney(amount: number) {
  const prefix = amount > 0 ? "+" : amount < 0 ? "-" : "";

  return `${prefix}$${Math.abs(amount)}`;
}

export default function ShenanigansSettlementPage() {
  const [wagers, setWagers] = useState<ShenanigansWager[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isCurrent = true;

    async function fetchSettledWagers() {
      const { data, error: fetchError } = await supabase
        .from("shenanigans_wagers")
        .select("id, points, status, winner_name, loser_names")
        .eq("status", "settled");

      console.log("shenanigans settlement wagers fetched rows:", {
        data,
        error: fetchError,
      });

      if (!isCurrent) {
        return;
      }

      if (fetchError) {
        setWagers([]);
        setError(fetchError.message || "Could not load settlement totals.");
        setIsLoading(false);
        return;
      }

      setWagers((data as ShenanigansWager[]) || []);
      setIsLoading(false);
    }

    fetchSettledWagers();

    return () => {
      isCurrent = false;
    };
  }, []);

  const { finalTotals, paymentRows } = useMemo(() => {
    const totalsByPlayer = wagers.reduce<Record<string, number>>(
      (accumulator, wager) => {
        const winnerName = wager.winner_name?.trim();
        const loserNames = wager.loser_names || [];
        const points = Number(wager.points || 0);

        if (!winnerName || loserNames.length === 0 || points <= 0) {
          return accumulator;
        }

        accumulator[winnerName] =
          (accumulator[winnerName] || 0) + points * loserNames.length;

        loserNames.forEach((loserName) => {
          accumulator[loserName] = (accumulator[loserName] || 0) - points;
        });

        return accumulator;
      },
      {},
    );
    const sortedTotals = Object.entries(totalsByPlayer)
      .map(([name, points]) => ({ name, points, net: 0 }))
      .sort((a, b) => b.points - a.points);
    const settlementRows: PaymentRow[] = [];
    const netByPlayer = sortedTotals.reduce<Record<string, number>>(
      (accumulator, player) => {
        accumulator[player.name] = 0;
        return accumulator;
      },
      {},
    );

    sortedTotals.forEach((receiver, receiverIndex) => {
      sortedTotals.slice(receiverIndex + 1).forEach((payer) => {
        const amount = receiver.points - payer.points;

        if (amount <= 0) {
          return;
        }

        settlementRows.push({
          payer: payer.name,
          receiver: receiver.name,
          amount,
        });
        netByPlayer[receiver.name] += amount;
        netByPlayer[payer.name] -= amount;
      });
    });

    const totalsWithNet: FinalTotal[] = sortedTotals.map((player) => ({
      ...player,
      net: netByPlayer[player.name] || 0,
    }));

    console.log("shenanigans settled wager settlement totals:", {
      finalTotals: totalsWithNet,
      paymentRows: settlementRows,
    });

    return {
      finalTotals: totalsWithNet,
      paymentRows: settlementRows,
    };
  }, [wagers]);
  const hasSettlementData = finalTotals.length > 0;

  return (
    <main className="min-h-screen bg-black p-6 text-[#f5f5f5]">
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center space-y-8 py-8">
        <div className="space-y-2">
          <p className="text-sm uppercase tracking-[0.35em] text-[#b91c1c]">
            Shenanigans
          </p>

          <h1 className="text-4xl font-bold tracking-tight">Settlement</h1>

          <p className="text-[#a3a3a3]">
            Final points, units, and payouts.
          </p>
        </div>

        <section className="rounded-2xl border border-[#242424] bg-[#111111] p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#b91c1c]">
                Source
              </p>

              <h2 className="mt-2 text-xl font-bold">Settled wagers only</h2>
            </div>

            <span className="rounded-full border border-[#b91c1c]/70 px-3 py-1 text-sm font-bold text-[#f5f5f5]">
              Live
            </span>
          </div>
        </section>

        {error && (
          <p className="text-center text-sm text-[#fca5a5]">{error}</p>
        )}

        <section className="space-y-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#b91c1c]">
              Final Point Totals
            </p>

            <h2 className="mt-2 text-xl font-bold">Closing Board</h2>
          </div>

          <div className="space-y-3">
            {isLoading && (
              <div className="rounded-2xl border border-[#242424] bg-[#111111] p-5 text-center text-sm text-[#a3a3a3]">
                Loading settlement...
              </div>
            )}

            {!isLoading && !hasSettlementData && (
              <div className="rounded-2xl border border-[#242424] bg-[#111111] p-5 text-center text-sm text-[#a3a3a3]">
                No settled wagers yet.
              </div>
            )}

            {!isLoading &&
              finalTotals.map((player, index) => (
                <div
                  key={player.name}
                  className="rounded-2xl border border-[#242424] bg-[#111111] p-4"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#242424] text-sm font-bold text-[#a3a3a3]">
                        {index + 1}
                      </span>

                      <div className="min-w-0">
                        <h3 className="truncate text-lg font-semibold">
                          {player.name}
                        </h3>

                        <p className="text-xs uppercase tracking-[0.2em] text-[#a3a3a3]">
                          Settled wager total
                        </p>
                      </div>
                    </div>

                    <p className="text-2xl font-bold text-[#f5f5f5]">
                      {player.points}
                    </p>
                  </div>
                </div>
              ))}
          </div>
        </section>

        {hasSettlementData && (
          <section className="space-y-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#b91c1c]">
                Net Settlement
              </p>

              <h2 className="mt-2 text-xl font-bold">After Everyone Pays Up</h2>
            </div>

            <div className="rounded-2xl border border-[#242424] bg-[#111111] px-5">
              {finalTotals.map((player) => {
                const isPositive = player.net > 0;

                return (
                  <div
                    key={player.name}
                    className="flex items-center justify-between gap-4 border-b border-[#242424] py-4 last:border-b-0"
                  >
                    <div className="min-w-0">
                      <h3 className="truncate font-semibold">{player.name}</h3>

                      <p className="mt-1 text-sm text-[#a3a3a3]">
                        {player.points} points
                      </p>
                    </div>

                    <span
                      className={`shrink-0 text-xl font-bold ${
                        isPositive ? "text-[#b91c1c]" : "text-[#a3a3a3]"
                      }`}
                    >
                      {formatMoney(player.net)}
                    </span>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {hasSettlementData && (
          <section className="space-y-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#b91c1c]">
                Payment Matrix
              </p>

              <h2 className="mt-2 text-xl font-bold">Who Pays Who</h2>
            </div>

            <div className="space-y-3">
              {paymentRows.length === 0 && (
                <div className="rounded-2xl border border-[#242424] bg-[#111111] p-4 text-sm text-[#a3a3a3]">
                  Everyone is square.
                </div>
              )}

              {paymentRows.map((payment) => (
                <div
                  key={`${payment.payer}-${payment.receiver}-${payment.amount}`}
                  className="rounded-2xl border border-[#242424] bg-[#111111] p-4"
                >
                  <div className="flex items-center justify-between gap-4">
                    <p className="min-w-0 text-sm leading-6 text-[#a3a3a3]">
                      <span className="font-semibold text-[#f5f5f5]">
                        {payment.payer}
                      </span>{" "}
                      pays{" "}
                      <span className="font-semibold text-[#f5f5f5]">
                        {payment.receiver}
                      </span>
                    </p>

                    <span className="shrink-0 rounded-full border border-[#b91c1c]/70 px-3 py-1 text-sm font-bold text-[#f5f5f5]">
                      ${payment.amount}
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
