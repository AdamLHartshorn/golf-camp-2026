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
};

type PaymentInstruction = {
  payer: string;
  receiver: string;
  amount: number;
};

function formatMoney(amount: number) {
  const prefix = amount > 0 ? "+" : amount < 0 ? "-" : "";
  return `${prefix}$${Math.abs(amount).toFixed(2).replace(/\.00$/, "")}`;
}

function formatPayment(amount: number) {
  return `$${amount.toFixed(2).replace(/\.00$/, "")}`;
}

export default function P2PSettlementPage() {
  const [wagers, setWagers] = useState<P2PWager[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isCurrent = true;

    async function fetchSettledWagers() {
      const { data, error: fetchError } = await supabase
        .from("p2p_wagers")
        .select("*")
        .eq("status", "settled")
        .order("settled_at", { ascending: false });

      console.log("settled p2p_wagers fetched rows:", {
        data,
        error: fetchError,
      });

      if (!isCurrent) {
        return;
      }

      if (fetchError) {
        setWagers([]);
        setError(fetchError.message || "Could not load settlement.");
        setIsLoading(false);
        return;
      }

      setWagers((data as P2PWager[]) || []);
      setIsLoading(false);
    }

    fetchSettledWagers();

    return () => {
      isCurrent = false;
    };
  }, []);

  const { winners, losers, paymentInstructions } = useMemo(() => {
    const netByPlayer: Record<string, number> = {};

    wagers.forEach((wager) => {
      const winnerName = wager.winner_name;
      const loserNames = wager.loser_names || [];
      const amount = Number(wager.amount || 0);

      if (!winnerName || loserNames.length === 0 || amount <= 0) {
        return;
      }

      netByPlayer[winnerName] = (netByPlayer[winnerName] || 0) + amount * loserNames.length;

      loserNames.forEach((loserName) => {
        netByPlayer[loserName] = (netByPlayer[loserName] || 0) - amount;
      });
    });

    const positiveBalances = Object.entries(netByPlayer)
      .filter(([, amount]) => amount > 0)
      .map(([name, amount]) => ({ name, amount }))
      .sort((a, b) => b.amount - a.amount);
    const negativeBalances = Object.entries(netByPlayer)
      .filter(([, amount]) => amount < 0)
      .map(([name, amount]) => ({ name, amount }))
      .sort((a, b) => a.amount - b.amount);
    const creditors = positiveBalances.map((balance) => ({ ...balance }));
    const debtors = negativeBalances.map((balance) => ({
      name: balance.name,
      amount: Math.abs(balance.amount),
    }));
    const instructions: PaymentInstruction[] = [];
    let debtorIndex = 0;
    let creditorIndex = 0;

    while (debtorIndex < debtors.length && creditorIndex < creditors.length) {
      const debtor = debtors[debtorIndex];
      const creditor = creditors[creditorIndex];
      const paymentAmount = Math.min(debtor.amount, creditor.amount);

      if (paymentAmount > 0) {
        instructions.push({
          payer: debtor.name,
          receiver: creditor.name,
          amount: paymentAmount,
        });
      }

      debtor.amount -= paymentAmount;
      creditor.amount -= paymentAmount;

      if (debtor.amount <= 0.009) {
        debtorIndex += 1;
      }

      if (creditor.amount <= 0.009) {
        creditorIndex += 1;
      }
    }

    console.log("p2p settlement calculated:", {
      winners: positiveBalances,
      losers: negativeBalances,
      paymentInstructions: instructions,
    });

    return {
      winners: positiveBalances,
      losers: negativeBalances,
      paymentInstructions: instructions,
    };
  }, [wagers]);

  return (
    <main className="min-h-screen bg-black p-6 text-[#f5f5f5]">
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center space-y-8 py-8">
        <div className="space-y-2">
          <p className="text-sm uppercase tracking-[0.35em] text-[#d6a84f]">
            P2P Wagers
          </p>

          <h1 className="text-4xl font-bold tracking-tight">Settlement</h1>

          <p className="text-[#a3a3a3]">
            Net balances and clean payment instructions.
          </p>
        </div>

        {error && (
          <p className="text-center text-sm text-[#f5c56f]">{error}</p>
        )}

        <section className="space-y-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#d6a84f]">
              Net Winners
            </p>
            <h2 className="mt-2 text-xl font-bold">Collecting</h2>
          </div>

          <div className="space-y-3">
            {isLoading && (
              <div className="rounded-2xl border border-[#242424] bg-[#111111] p-5 text-sm text-[#a3a3a3]">
                Loading settlement...
              </div>
            )}

            {!isLoading && winners.length === 0 && (
              <div className="rounded-2xl border border-[#242424] bg-[#111111] p-5 text-sm text-[#a3a3a3]">
                No net winners yet.
              </div>
            )}

            {!isLoading &&
              winners.map((player) => (
                <div
                  key={player.name}
                  className="rounded-2xl border border-[#3a2a12] bg-[#14110c] p-5"
                >
                  <div className="flex items-center justify-between gap-4">
                    <h3 className="truncate font-bold">{player.name}</h3>
                    <span className="text-xl font-bold text-[#d6a84f]">
                      {formatMoney(player.amount)}
                    </span>
                  </div>
                </div>
              ))}
          </div>
        </section>

        <section className="space-y-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#d6a84f]">
              Net Losers
            </p>
            <h2 className="mt-2 text-xl font-bold">Paying</h2>
          </div>

          <div className="space-y-3">
            {isLoading && (
              <div className="rounded-2xl border border-[#242424] bg-[#111111] p-5 text-sm text-[#a3a3a3]">
                Loading balances...
              </div>
            )}

            {!isLoading && losers.length === 0 && (
              <div className="rounded-2xl border border-[#242424] bg-[#111111] p-5 text-sm text-[#a3a3a3]">
                No net losers yet.
              </div>
            )}

            {!isLoading &&
              losers.map((player) => (
                <div
                  key={player.name}
                  className="rounded-2xl border border-[#242424] bg-[#111111] p-5"
                >
                  <div className="flex items-center justify-between gap-4">
                    <h3 className="truncate font-bold">{player.name}</h3>
                    <span className="text-xl font-bold text-[#a3a3a3]">
                      {formatMoney(player.amount)}
                    </span>
                  </div>
                </div>
              ))}
          </div>
        </section>

        <section className="space-y-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#d6a84f]">
              Payment Instructions
            </p>
            <h2 className="mt-2 text-xl font-bold">Settle Up</h2>
          </div>

          <div className="space-y-3">
            {isLoading && (
              <div className="rounded-2xl border border-[#242424] bg-[#111111] p-5 text-sm text-[#a3a3a3]">
                Calculating payments...
              </div>
            )}

            {!isLoading && paymentInstructions.length === 0 && (
              <div className="rounded-2xl border border-[#242424] bg-[#111111] p-5 text-sm text-[#a3a3a3]">
                No payments due.
              </div>
            )}

            {!isLoading &&
              paymentInstructions.map((payment) => (
                <div
                  key={`${payment.payer}-${payment.receiver}-${payment.amount}`}
                  className="rounded-2xl border border-[#242424] bg-[#111111] p-5"
                >
                  <div className="flex items-center justify-between gap-4">
                    <p className="min-w-0 text-sm leading-6 text-[#a3a3a3]">
                      <span className="font-semibold text-[#f5f5f5]">
                        {payment.payer}
                      </span>{" "}
                      owes{" "}
                      <span className="font-semibold text-[#f5f5f5]">
                        {payment.receiver}
                      </span>
                    </p>
                    <span className="shrink-0 rounded-full border border-[#d6a84f]/70 px-3 py-1 text-sm font-bold text-[#f5f5f5]">
                      {formatPayment(payment.amount)}
                    </span>
                  </div>
                </div>
              ))}
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
