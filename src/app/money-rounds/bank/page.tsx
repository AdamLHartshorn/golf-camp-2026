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

export default function MoneyRoundsBankPage() {
  const [bankRows, setBankRows] = useState<YearlyMoneyBankRow[]>([]);
  const [hasScoredRounds, setHasScoredRounds] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isCurrent = true;

    async function fetchBank() {
      const { data: roundData, error: roundError } = await supabase
        .from("money_rounds")
        .select("*")
        .in("status", ["scored", "final"])
        .order("round_date", { ascending: false })
        .order("created_at", { ascending: false });

      if (!isCurrent) {
        return;
      }

      if (roundError) {
        setError(roundError.message || "Could not load Money Rounds.");
        setIsLoading(false);
        return;
      }

      const rounds = ((roundData as MoneyRound[]) || []).filter((round) =>
        isCurrentYearRound(round),
      );
      setHasScoredRounds(rounds.length > 0);

      if (rounds.length === 0) {
        setBankRows([]);
        setIsLoading(false);
        return;
      }

      const roundIds = rounds.map((round) => round.id);
      const [
        { data: teamData, error: teamError },
        { data: scoreData, error: scoreError },
      ] = await Promise.all([
        supabase
          .from("money_round_teams")
          .select("*")
          .in("money_round_id", roundIds),
        supabase
          .from("money_round_scores")
          .select("*")
          .in("money_round_id", roundIds),
      ]);

      if (!isCurrent) {
        return;
      }

      if (teamError || scoreError) {
        setError(
          teamError?.message ||
            scoreError?.message ||
            "Could not load Money Rounds bank.",
        );
        setIsLoading(false);
        return;
      }

      const nextBankRows = buildYearlyMoneyBank(
        rounds.filter(isScoredOrFinalRound),
        (teamData as MoneyTeam[]) || [],
        (scoreData as MoneyScore[]) || [],
      );

      console.log("money_rounds full bank fetch:", {
        roundCount: rounds.length,
        teamCount: teamData?.length || 0,
        scoreCount: scoreData?.length || 0,
        bankRowCount: nextBankRows.length,
      });

      setBankRows(nextBankRows);
      setIsLoading(false);
    }

    fetchBank();

    return () => {
      isCurrent = false;
    };
  }, []);

  return (
    <main className="min-h-screen bg-black p-6 text-[#f5f5f5]">
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center space-y-8 py-8">
        <div className="space-y-2">
          <p className="text-sm uppercase tracking-[0.35em] text-[#16a34a]">
            Money Rounds
          </p>

          <h1 className="text-4xl font-bold tracking-tight">
            Yearly Bank
          </h1>

          <p className="text-[#a3a3a3]">
            Cumulative placement, skins, buy-ins, and net from scored/final
            Money Rounds.
          </p>
        </div>

        {isLoading && (
          <div className="rounded-2xl border border-[#242424] bg-[#111111] p-5 text-sm text-[#a3a3a3]">
            Loading bank...
          </div>
        )}

        {!isLoading && error && (
          <div className="rounded-2xl border border-[#242424] bg-[#111111] p-5 text-sm text-[#ff8a8a]">
            {error}
          </div>
        )}

        {!isLoading && !error && bankRows.length === 0 && (
          <div className="rounded-2xl border border-[#242424] bg-[#111111] p-5 text-sm text-[#a3a3a3]">
            {hasScoredRounds
              ? "No Money Rounds bank activity yet."
              : "No finalized/scored Money Rounds yet."}
          </div>
        )}

        {!isLoading && !error && bankRows.length > 0 && (
          <section className="rounded-2xl border border-[#242424] bg-[#111111] px-5">
            {bankRows.map((row, index) => (
              <div
                key={row.playerName}
                className="border-b border-[#242424] py-5 last:border-b-0"
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#16a34a]">
                      #{index + 1}
                    </p>
                    <h2 className="mt-1 truncate text-xl font-bold">
                      {row.playerName}
                    </h2>
                  </div>

                  <span
                    className={`shrink-0 text-2xl font-bold ${
                      row.net >= 0 ? "text-[#16a34a]" : "text-[#a3a3a3]"
                    }`}
                  >
                    {signedMoney(row.net)}
                  </span>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-xl border border-[#242424] bg-black p-3">
                    <p className="text-xs text-[#a3a3a3]">Placement</p>
                    <p className="mt-1 font-bold">
                      {money(row.placementWinnings)}
                    </p>
                  </div>
                  <div className="rounded-xl border border-[#242424] bg-black p-3">
                    <p className="text-xs text-[#a3a3a3]">Skins</p>
                    <p className="mt-1 font-bold">
                      {money(row.skinsWinnings)}
                    </p>
                  </div>
                  <div className="rounded-xl border border-[#242424] bg-black p-3">
                    <p className="text-xs text-[#a3a3a3]">Buy-Ins</p>
                    <p className="mt-1 font-bold">{money(row.buyIns)}</p>
                  </div>
                  <div className="rounded-xl border border-[#242424] bg-black p-3">
                    <p className="text-xs text-[#a3a3a3]">Total Net</p>
                    <p className="mt-1 font-bold">{signedMoney(row.net)}</p>
                  </div>
                </div>
              </div>
            ))}
          </section>
        )}

        <Link
          href="/money-rounds"
          className="text-center text-sm text-[#a3a3a3]"
        >
          ← Back to Money Rounds
        </Link>
      </div>
    </main>
  );
}
