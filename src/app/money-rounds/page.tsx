"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { GolfCampIcon } from "@/components/GolfCampIcons";
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
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(22,163,74,0.12),transparent_34%),#050505] p-5 text-[#f5f5f5]">
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center space-y-5 py-6">
        <div className="flex items-center justify-between gap-4">
          <Link href="/home" className="text-2xl text-[#a3a3a3]">
            ‹
          </Link>
          <p className="font-mono text-sm uppercase tracking-[0.22em] text-[#f5f5f5]">
            Money Rounds
          </p>
          <span className="flex h-9 w-9 items-center justify-center rounded-full border border-[#166534] bg-[#102116] text-[#16a34a]">
            <GolfCampIcon name="money" className="h-4 w-4" />
          </span>
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
            <div className="overflow-hidden rounded-2xl border border-[#d8d1c4]/80 bg-[#efe9dc] text-[#17130e] shadow-[0_18px_55px_rgba(0,0,0,0.38)]">
              <div className="grid grid-cols-[1fr_auto] gap-4 border-b border-[#cec5b5] bg-[#dfe9d2] px-5 py-4">
                <div>
                  <p className="font-mono text-[10px] font-black uppercase tracking-[0.22em] text-[#8ee6a7]">
                    Active Money Round
                  </p>
                  <h1 className="mt-2 text-2xl font-black tracking-tight">
                    {activeRound.name}
                  </h1>
                </div>
                <div className="text-right">
                  <p className="rounded-full border border-[#31552d]/30 bg-[#f8f2e6] px-2.5 py-1 font-mono text-[10px] font-black uppercase text-[#31552d]">
                    {activeRound.status}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 border-b border-[#d2c8b8] text-sm">
                <div className="border-r border-[#d2c8b8] px-5 py-3">
                  <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#5f574b]">
                    Date
                  </p>
                  <p className="mt-1 font-semibold">
                    {activeRound.round_date || "TBD"}
                  </p>
                </div>
                <div className="px-5 py-3">
                  <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#5f574b]">
                    Buy-In
                  </p>
                  <p className="mt-1 font-semibold">
                    {money(Number(activeRound.buy_in_per_player ?? activeRound.buy_in ?? 0))}
                  </p>
                </div>
              </div>

              <div className="px-5 py-4">
                {activeLeader ? (
                  <div className="grid grid-cols-[1fr_auto] gap-4">
                    <div className="min-w-0">
                      <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-[#5f574b]">
                        Leader
                      </p>
                      <p className="mt-1 truncate text-xl font-black">
                        {activeLeader.team.name}
                      </p>
                      <p className="mt-1 truncate text-sm text-[#5f574b]">
                        {activeLeader.team.player_names.join(", ")}
                      </p>
                    </div>
                    <p className="self-center font-mono text-3xl font-black text-[#16a34a]">
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

                <div className="mt-4 overflow-hidden rounded-xl border border-[#d2c8b8] bg-[#f8f2e6]">
                  <div className="grid grid-cols-[2.5rem_1fr_4.5rem] bg-[#dfe9d2] px-3 py-2 font-mono text-[10px] uppercase tracking-[0.16em] text-[#31552d]">
                    <span>Pos</span>
                    <span>Team</span>
                    <span className="text-right">Score</span>
                  </div>
                  {activeCalculation?.standings.slice(0, 3).map((standing) => (
                  <div
                    key={standing.team.id}
                    className="grid grid-cols-[2.5rem_1fr_4.5rem] border-t border-[#d2c8b8] px-3 py-2 text-sm"
                  >
                    <span className="font-mono text-[#5f574b]">
                      {standing.position}
                    </span>
                    <span className="truncate text-[#17130e]">
                      {standing.team.name}
                    </span>
                    <span className="text-right font-mono font-black text-[#16a34a]">
                      {formatScoreToCompletedPar(
                        standing.total,
                        standing.scoresByHole,
                      )}
                    </span>
                  </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 border-t border-[#d2c8b8]">
                <Link
                  href={`/money-rounds/${activeRound.id}`}
                  className="border-b border-r border-[#d2c8b8] px-4 py-3 text-center text-sm font-black text-[#15803d] transition hover:bg-[#f6f0e3]"
                >
                  View Round
                </Link>
                <Link
                  href={`/money-rounds/${activeRound.id}/submit`}
                  className="border-b border-[#d2c8b8] px-4 py-3 text-center text-sm font-black text-[#17130e] transition hover:bg-[#f6f0e3]"
                >
                  Enter Scores
                </Link>
                <Link
                  href={`/money-rounds/${activeRound.id}/submit`}
                  className="border-r border-[#d2c8b8] px-4 py-3 text-center text-sm font-black text-[#17130e] transition hover:bg-[#f6f0e3]"
                >
                  Submit Team Scores
                </Link>
                {canPresentActiveRound && (
                  <Link
                    href={`/money-rounds/${activeRound.id}/results`}
                    className="px-4 py-3 text-center text-sm font-black text-[#15803d] transition hover:bg-[#f6f0e3]"
                  >
                    Results Presentation
                  </Link>
                )}
              </div>
            </div>
          )}
        </section>

        <section className="overflow-hidden rounded-2xl border border-[#2b2b27] bg-[#0d0d0b] shadow-[0_18px_45px_rgba(0,0,0,0.35)]">
          <div className="border-b border-[#2a2925] bg-[#11110f] px-5 py-4">
            <p className="font-mono text-[10px] font-black uppercase tracking-[0.24em] text-[#16a34a]">
              Recent Rounds
            </p>
            <h2 className="mt-2 text-xl font-black">Round Archive</h2>
          </div>

          <div>
            {!isLoading && !error && recentRounds.length === 0 && (
              <p className="p-5 text-sm text-[#a3a3a3]">
                No previous rounds yet.
              </p>
            )}

            {!isLoading &&
              !error &&
              recentRounds.slice(0, 6).map((round) => (
                <div
                  key={round.id}
                  className="border-b border-[#2a2925] px-5 py-4 last:border-b-0"
                >
                  <div className="grid grid-cols-[1fr_auto] items-center gap-3">
                    <Link href={`/money-rounds/${round.id}`} className="min-w-0">
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#16a34a]">
                        {round.status}
                      </p>
                      <h3 className="mt-1 truncate text-lg font-black">
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

        <section className="overflow-hidden rounded-2xl border border-[#2b2b27] bg-[#0d0d0b] shadow-[0_18px_45px_rgba(0,0,0,0.35)]">
          <div className="border-b border-[#2a2925] bg-[#11110f] px-5 py-4">
            <p className="font-mono text-[10px] font-black uppercase tracking-[0.24em] text-[#16a34a]">
              Yearly Bank
            </p>
            <h2 className="mt-2 text-xl font-black">Money Rounds Bank</h2>
          </div>

          <div className="text-sm">
            {!isLoading && bankPreviewRows.length === 0 && (
              <p className="p-5 text-[#a3a3a3]">
                {hasScoredRounds
                  ? "No Money Rounds bank activity yet."
                  : "No finalized/scored Money Rounds yet."}
              </p>
            )}

            {bankPreviewRows.map((row, index) => (
              <div
                key={row.playerName}
                className="grid grid-cols-[2.5rem_1fr_auto] items-center gap-3 border-b border-[#2a2925] px-5 py-4 last:border-b-0"
              >
                <span className="font-mono text-sm font-bold text-[#a8a29a]">
                  {index + 1}
                </span>
                <div className="min-w-0">
                  <p className="truncate font-semibold">{row.playerName}</p>
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
            className="block border-t border-[#34312a] px-5 py-4 text-center text-sm font-bold text-[#16a34a] transition hover:bg-[#0f1f16]"
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
