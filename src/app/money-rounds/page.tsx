"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  buildYearlyMoneyBank,
  isCurrentYearRound,
  isScoredOrFinalRound,
  MoneyRound,
  MoneyScore,
  MoneyTeam,
  YearlyMoneyBankRow,
  money,
  signedMoney,
} from "@/app/money-rounds/_lib/moneyRoundUtils";

export default function MoneyRoundsPage() {
  const [rounds, setRounds] = useState<MoneyRound[]>([]);
  const [yearlyBankRows, setYearlyBankRows] = useState<YearlyMoneyBankRow[]>([]);
  const [hasScoredRounds, setHasScoredRounds] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isCurrent = true;

    async function fetchRounds() {
      const { data, error: fetchError } = await supabase
        .from("money_rounds")
        .select("*")
        .order("round_date", { ascending: false })
        .order("created_at", { ascending: false });

      if (!isCurrent) {
        return;
      }

      if (fetchError) {
        setRounds([]);
        setError(fetchError.message || "Could not load money rounds.");
        setIsLoading(false);
        return;
      }

      const nextRounds = (data as MoneyRound[]) || [];
      setRounds(nextRounds);

      const bankRounds = nextRounds.filter(
        (round) => isScoredOrFinalRound(round) && isCurrentYearRound(round),
      );
      setHasScoredRounds(bankRounds.length > 0);

      if (bankRounds.length === 0) {
        setYearlyBankRows([]);
        setIsLoading(false);
        console.log("money_rounds public bank fetch:", {
          roundCount: nextRounds.length,
          bankRoundCount: 0,
          teamCount: 0,
          scoreCount: 0,
          bankRowCount: 0,
        });
        return;
      }

      const roundIds = bankRounds.map((round) => round.id);
      const [
        { data: teamData, error: teamError },
        { data: scoreData, error: scoreError },
      ] = await Promise.all([
        supabase.from("money_round_teams").select("*").in("money_round_id", roundIds),
        supabase.from("money_round_scores").select("*").in("money_round_id", roundIds),
      ]);

      if (teamError || scoreError) {
        setYearlyBankRows([]);
        setError(
          teamError?.message ||
            scoreError?.message ||
            "Could not load Money Rounds bank.",
        );
        setIsLoading(false);
        return;
      }

      const nextYearlyBankRows = buildYearlyMoneyBank(
        bankRounds,
        (teamData as MoneyTeam[]) || [],
        (scoreData as MoneyScore[]) || [],
      );
      console.log("money_rounds public bank fetch:", {
        roundCount: nextRounds.length,
        bankRoundCount: bankRounds.length,
        teamCount: teamData?.length || 0,
        scoreCount: scoreData?.length || 0,
        bankRowCount: nextYearlyBankRows.length,
      });
      setYearlyBankRows(nextYearlyBankRows);
      setIsLoading(false);
    }

    fetchRounds();

    return () => {
      isCurrent = false;
    };
  }, []);

  return (
    <main className="min-h-screen bg-black p-6 text-[#f5f5f5]">
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center space-y-8 py-8">
        <div className="space-y-2">
          <p className="text-sm uppercase tracking-[0.35em] text-[#16a34a]">
            Golf Camp 2026
          </p>

          <h1 className="text-4xl font-bold tracking-tight">Money Rounds</h1>

          <p className="text-[#a3a3a3]">
            Official team rounds, skins, payouts, and bank summaries.
          </p>
        </div>

        <section className="space-y-3">
          {isLoading && (
            <div className="rounded-2xl border border-[#242424] bg-[#111111] p-5 text-sm text-[#a3a3a3]">
              Loading rounds...
            </div>
          )}

          {!isLoading && error && (
            <div className="rounded-2xl border border-[#242424] bg-[#111111] p-5 text-sm text-[#ff8a8a]">
              {error}
            </div>
          )}

          {!isLoading && !error && rounds.length === 0 && (
            <div className="rounded-2xl border border-[#242424] bg-[#111111] p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#16a34a]">
                No Rounds Yet
              </p>
              <h2 className="mt-2 text-2xl font-bold">Coming Soon</h2>
              <p className="mt-3 text-sm leading-6 text-[#a3a3a3]">
                Money Rounds will appear here when a commissioner creates them.
              </p>
            </div>
          )}

          {!isLoading &&
            !error &&
            rounds.map((round) => (
              <Link
                key={round.id}
                href={`/money-rounds/${round.id}`}
                className="block rounded-2xl border border-[#15803d] bg-[#111111] p-5 transition hover:bg-[#0f1f16]"
              >
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#16a34a]">
                  {round.status}
                </p>
                <h2 className="mt-2 text-2xl font-bold">{round.name}</h2>
                <p className="mt-1 text-sm text-[#a3a3a3]">
                  {round.round_date || "Date TBD"} · Buy-in{" "}
                  {money(Number(round.buy_in_per_player ?? round.buy_in ?? 0))}
                </p>
              </Link>
            ))}
        </section>

        <section className="rounded-2xl border border-[#242424] bg-[#111111] p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#16a34a]">
            Yearly Bank
          </p>
          <h2 className="mt-2 text-2xl font-bold">Money Rounds Bank</h2>
          <p className="mt-2 text-sm text-[#a3a3a3]">
            Cumulative placement, skins, buy-ins, and net from scored/final
            Money Rounds this year.
          </p>

          <div className="mt-4 space-y-3 text-sm">
            {!isLoading && yearlyBankRows.length === 0 && (
              <p className="rounded-xl border border-[#242424] bg-black p-4 text-[#a3a3a3]">
                {hasScoredRounds
                  ? "No Money Rounds bank activity yet."
                  : "No finalized/scored Money Rounds yet."}
              </p>
            )}

            {yearlyBankRows.map((row) => (
              <div
                key={row.playerName}
                className="rounded-xl border border-[#242424] bg-black p-4"
              >
                <div className="flex justify-between gap-3">
                  <span className="font-semibold">{row.playerName}</span>
                  <span className={row.net >= 0 ? "text-[#16a34a]" : "text-[#a3a3a3]"}>
                    {signedMoney(row.net)}
                  </span>
                </div>
                <p className="mt-2 text-xs leading-5 text-[#a3a3a3]">
                  Total Placement Winnings {money(row.placementWinnings)} ·
                  Total Skins Winnings {money(row.skinsWinnings)} · Total
                  Buy-Ins {money(row.buyIns)} · Total Net {signedMoney(row.net)}
                </p>
              </div>
            ))}
          </div>
        </section>

        <Link href="/home" className="text-center text-sm text-[#a3a3a3]">
          ← Back to Dashboard
        </Link>
      </div>
    </main>
  );
}
