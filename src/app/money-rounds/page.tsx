"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  buildYearlyMoneyBank,
  calculateRoundMoney,
  formatScoreToCompletedPar,
  isCurrentYearRound,
  isRoundPresentationReady,
  isScoredOrFinalRound,
  MoneyRound,
  MoneyScore,
  MoneyTeam,
  YearlyMoneyBankRow,
  money,
  signedMoney,
} from "@/app/money-rounds/_lib/moneyRoundUtils";

function isOperationalRound(round: MoneyRound) {
  const status = String(round.status || "").trim().toLowerCase();
  return status === "active" || status === "scored" || status === "final";
}

export default function MoneyRoundsPage() {
  const [rounds, setRounds] = useState<MoneyRound[]>([]);
  const [teams, setTeams] = useState<MoneyTeam[]>([]);
  const [scores, setScores] = useState<MoneyScore[]>([]);
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
      const relatedRoundIds = nextRounds
        .filter(
          (round) =>
            isOperationalRound(round) ||
            (isScoredOrFinalRound(round) && isCurrentYearRound(round)),
        )
        .map((round) => round.id);

      if (relatedRoundIds.length === 0) {
        setTeams([]);
        setScores([]);
        setYearlyBankRows([]);
        setHasScoredRounds(false);
        setIsLoading(false);
        return;
      }

      const [
        { data: teamData, error: teamError },
        { data: scoreData, error: scoreError },
      ] = await Promise.all([
        supabase
          .from("money_round_teams")
          .select("*")
          .in("money_round_id", relatedRoundIds),
        supabase
          .from("money_round_scores")
          .select("*")
          .in("money_round_id", relatedRoundIds),
      ]);

      if (teamError || scoreError) {
        setTeams([]);
        setScores([]);
        setYearlyBankRows([]);
        setError(
          teamError?.message ||
            scoreError?.message ||
            "Could not load Money Rounds data.",
        );
        setIsLoading(false);
        return;
      }

      const nextTeams = (teamData as MoneyTeam[]) || [];
      const nextScores = (scoreData as MoneyScore[]) || [];
      setTeams(nextTeams);
      setScores(nextScores);

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
          teamCount: nextTeams.length,
          scoreCount: nextScores.length,
          bankRowCount: 0,
        });
        return;
      }

      const nextYearlyBankRows = buildYearlyMoneyBank(
        bankRounds,
        nextTeams,
        nextScores,
      );
      console.log("money_rounds public bank fetch:", {
        roundCount: nextRounds.length,
        bankRoundCount: bankRounds.length,
        teamCount: nextTeams.length,
        scoreCount: nextScores.length,
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

  const activeRound = rounds.find(isOperationalRound) || null;
  const recentRounds = activeRound
    ? rounds.filter((round) => round.id !== activeRound.id)
    : rounds;
  const activeTeams = activeRound
    ? teams.filter((team) => team.money_round_id === activeRound.id)
    : [];
  const activeScores = activeRound
    ? scores.filter((score) => score.money_round_id === activeRound.id)
    : [];
  const activeCalculation = activeRound
    ? calculateRoundMoney(activeRound, activeTeams, activeScores)
    : null;
  const activeLeader = activeCalculation?.standings[0] || null;
  const canPresentActiveRound = activeRound
    ? isRoundPresentationReady(activeRound, activeTeams, activeScores)
    : false;
  const bankPreviewRows = yearlyBankRows.slice(0, 3);

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

          {!isLoading && !error && activeRound && (
            <div className="rounded-2xl border border-[#16a34a] bg-[#0f1f16] p-5 shadow-[0_0_0_1px_rgba(22,163,74,0.16)]">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#16a34a]">
                Active Round
              </p>
              <div className="mt-3 flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <h2 className="text-3xl font-bold tracking-tight">
                    {activeRound.name}
                  </h2>
                  <p className="mt-1 text-sm text-[#a3a3a3]">
                    {activeRound.round_date || "Date TBD"} · {activeRound.status} ·
                    Buy-in {money(Number(activeRound.buy_in_per_player ?? activeRound.buy_in ?? 0))}
                  </p>
                </div>
                <span className="shrink-0 rounded-full border border-[#16a34a]/70 px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-[#d8f5df]">
                  {activeRound.status}
                </span>
              </div>

              <div className="mt-5 rounded-xl border border-[#166534] bg-black/40 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#a3a3a3]">
                  Leader
                </p>
                {activeLeader ? (
                  <div className="mt-2 flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <p className="truncate text-xl font-bold">
                        {activeLeader.team.name}
                      </p>
                      <p className="mt-1 truncate text-sm text-[#a3a3a3]">
                        {activeLeader.team.player_names.join(", ")}
                      </p>
                    </div>
                    <p className="shrink-0 text-2xl font-bold text-[#16a34a]">
                      {formatScoreToCompletedPar(
                        activeLeader.total,
                        activeLeader.scoresByHole,
                      )}
                    </p>
                  </div>
                ) : (
                  <p className="mt-2 text-sm text-[#a3a3a3]">
                    No scores submitted yet.
                  </p>
                )}

                {activeCalculation?.standings.slice(0, 3).map((standing) => (
                  <div
                    key={standing.team.id}
                    className="mt-3 flex items-center justify-between gap-3 border-t border-[#1f3a29] pt-3 text-sm"
                  >
                    <span className="truncate text-[#a3a3a3]">
                      {standing.position}. {standing.team.name}
                    </span>
                    <span className="font-semibold text-[#f5f5f5]">
                      {formatScoreToCompletedPar(
                        standing.total,
                        standing.scoresByHole,
                      )}
                    </span>
                  </div>
                ))}
              </div>

              <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Link
                  href={`/money-rounds/${activeRound.id}`}
                  className="rounded-xl border border-[#16a34a] bg-[#16a34a] px-4 py-3 text-center text-sm font-bold text-black transition hover:bg-[#15803d]"
                >
                  View Round
                </Link>
                <Link
                  href={`/money-rounds/${activeRound.id}/submit`}
                  className="rounded-xl border border-[#242424] bg-black px-4 py-3 text-center text-sm font-bold text-[#f5f5f5] transition hover:border-[#16a34a]"
                >
                  Enter Scores
                </Link>
                <Link
                  href={`/money-rounds/${activeRound.id}/submit`}
                  className="rounded-xl border border-[#242424] bg-black px-4 py-3 text-center text-sm font-bold text-[#f5f5f5] transition hover:border-[#16a34a]"
                >
                  Submit Team Scores
                </Link>
                {canPresentActiveRound && (
                  <Link
                    href={`/money-rounds/${activeRound.id}/results`}
                    className="rounded-xl border border-[#242424] bg-black px-4 py-3 text-center text-sm font-bold text-[#16a34a] transition hover:border-[#16a34a]"
                  >
                    Results Presentation
                  </Link>
                )}
              </div>
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-[#242424] bg-[#111111] p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#16a34a]">
            Recent Rounds
          </p>
          <h2 className="mt-2 text-2xl font-bold">Browse Rounds</h2>
          <p className="mt-2 text-sm text-[#a3a3a3]">
            Older rounds live here so the active round stays front and center.
          </p>

          <div className="mt-4 space-y-3">
            {!isLoading && !error && recentRounds.length === 0 && (
              <p className="rounded-xl border border-[#242424] bg-black p-4 text-sm text-[#a3a3a3]">
                No previous rounds yet.
              </p>
            )}

            {!isLoading &&
              !error &&
              recentRounds.slice(0, 6).map((round) => (
                <div
                  key={round.id}
                  className="rounded-xl border border-[#242424] bg-black p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <Link href={`/money-rounds/${round.id}`} className="min-w-0">
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#16a34a]">
                        {round.status}
                      </p>
                      <h3 className="mt-1 truncate text-lg font-bold">
                        {round.name}
                      </h3>
                      <p className="mt-1 text-sm text-[#a3a3a3]">
                        {round.round_date || "Date TBD"}
                      </p>
                    </Link>
                    {isScoredOrFinalRound(round) && (
                      <Link
                        href={`/money-rounds/${round.id}/results`}
                        className="shrink-0 rounded-lg border border-[#242424] px-3 py-2 text-xs font-bold text-[#16a34a] transition hover:border-[#16a34a]"
                      >
                        Results
                      </Link>
                    )}
                  </div>
                </div>
              ))}
          </div>
        </section>

        <section className="rounded-2xl border border-[#242424] bg-[#111111] p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#16a34a]">
            Yearly Bank
          </p>
          <h2 className="mt-2 text-2xl font-bold">Money Rounds Bank</h2>
          <p className="mt-2 text-sm text-[#a3a3a3]">
            A concise look at cumulative winnings. Open the full bank for every
            player total.
          </p>

          <div className="mt-4 space-y-3 text-sm">
            {!isLoading && bankPreviewRows.length === 0 && (
              <p className="rounded-xl border border-[#242424] bg-black p-4 text-[#a3a3a3]">
                {hasScoredRounds
                  ? "No Money Rounds bank activity yet."
                  : "No finalized/scored Money Rounds yet."}
              </p>
            )}

            {bankPreviewRows.map((row, index) => (
              <div
                key={row.playerName}
                className="flex items-center justify-between gap-4 rounded-xl border border-[#242424] bg-black p-4"
              >
                <div className="min-w-0">
                  <p className="truncate font-semibold">
                    {index + 1}. {row.playerName}
                  </p>
                  <p className="mt-1 text-xs text-[#a3a3a3]">
                    Placement {money(row.placementWinnings)} · Skins{" "}
                    {money(row.skinsWinnings)}
                  </p>
                </div>
                <span
                  className={`shrink-0 text-lg font-bold ${
                    row.net >= 0 ? "text-[#16a34a]" : "text-[#a3a3a3]"
                  }`}
                >
                    {signedMoney(row.net)}
                </span>
              </div>
            ))}
          </div>

          <Link
            href="/money-rounds/bank"
            className="mt-4 block rounded-xl border border-[#16a34a] px-4 py-3 text-center text-sm font-bold text-[#16a34a] transition hover:bg-[#07120c]"
          >
            Open Full Money Rounds Bank
          </Link>
        </section>

        <Link href="/home" className="text-center text-sm text-[#a3a3a3]">
          ← Back to Dashboard
        </Link>
      </div>
    </main>
  );
}
