"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { getPlayerSession, PlayerSession } from "@/lib/playerSession";
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
  const [session] = useState<PlayerSession | null>(() => getPlayerSession());
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
  const recentRounds = rounds.filter(isScoredOrFinalRound);
  const isAdmin = Boolean(session?.is_admin);
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
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(49,95,72,0.1),transparent_34%),#050505] p-5 text-[#f5f5f5]">
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
            <div className="overflow-hidden rounded-2xl border border-[#166534]/70 bg-[#0d0d0b]/95 text-[#f5f5f5] shadow-[0_28px_80px_rgba(0,0,0,0.5),0_0_48px_rgba(49,95,72,0.1)]">
              <div className="grid grid-cols-[1fr_auto] gap-4 border-b border-[#166534]/45 bg-[#0f1f16] px-5 py-4">
                <div>
                  <p className="font-mono text-[10px] font-black uppercase tracking-[0.22em] text-[#8ee6a7]">
                    Active Money Round
                  </p>
                  <h1 className="mt-2 text-2xl font-black tracking-tight">
                    {activeRound.name}
                  </h1>
                </div>
                <div className="text-right">
                  <p className="rounded-full border border-[#16a34a]/40 bg-black/35 px-2.5 py-1 font-mono text-[10px] font-black uppercase text-[#8ee6a7]">
                    {activeRound.status}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 border-b border-[#2a2925] text-sm">
                <div className="border-r border-[#2a2925] px-5 py-3">
                  <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#b8b0a1]">
                    Date
                  </p>
                  <p className="mt-1 font-semibold">
                    {activeRound.round_date || "TBD"}
                  </p>
                </div>
                <div className="px-5 py-3">
                  <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#b8b0a1]">
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
                      <p className="mt-1 truncate text-sm text-[#b8b0a1]">
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

                <div className="mt-4 overflow-hidden rounded-xl border border-[#2a2925] bg-black/35">
                  <div className="grid grid-cols-[2.5rem_1fr_4.5rem] bg-[#0f1f16] px-3 py-2 font-mono text-[10px] uppercase tracking-[0.16em] text-[#8ee6a7]">
                    <span>Pos</span>
                    <span>Team</span>
                    <span className="text-right">Score</span>
                  </div>
                  {activeCalculation?.standings.slice(0, 3).map((standing) => (
                  <div
                    key={standing.team.id}
                    className="grid grid-cols-[2.5rem_1fr_4.5rem] border-t border-[#2a2925] px-3 py-2 text-sm"
                  >
                    <span className="font-mono text-[#b8b0a1]">
                      {standing.position}
                    </span>
                    <span className="truncate text-[#f4f1ea]">
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

              <div className="border-t border-[#2a2925] px-5 py-4">
                <Link
                  href={`/money-rounds/${activeRound.id}`}
                  className="block rounded-xl border border-[#16a34a] bg-[#0f1f16] px-4 py-3 text-center text-sm font-black text-[#8ee6a7] transition hover:bg-[#12301f]"
                >
                  View Round
                </Link>

                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <Link
                    href={`/money-rounds/${activeRound.id}/submit`}
                    className="rounded-xl border border-[#2a2925] px-4 py-3 text-center text-sm font-black text-[#f4f1ea] transition hover:border-[#315f48] hover:bg-[#0f1f16]"
                  >
                    Enter Scores
                  </Link>
                  {canPresentActiveRound && (
                  <Link
                    href={`/money-rounds/${activeRound.id}/results`}
                    className="rounded-xl border border-[#2a2925] px-4 py-3 text-center text-sm font-black text-[#8ee6a7] transition hover:border-[#315f48] hover:bg-[#0f1f16]"
                  >
                    Presentation
                  </Link>
                  )}
                </div>
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
                No scored or final rounds yet.
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
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#16a34a]">
                          {round.status}
                        </p>
                        {activeRound?.id === round.id && (
                          <span className="rounded-full border border-[#315f48]/70 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-[#8ee6a7]">
                            Current
                          </span>
                        )}
                      </div>
                      <h3 className="mt-1 truncate text-lg font-black">
                        {round.name}
                      </h3>
                      <p className="mt-1 text-sm text-[#a3a3a3]">
                        {round.round_date || "Date TBD"}
                      </p>
                    </Link>
                    <div className="flex shrink-0 flex-col gap-2">
                      <Link
                        href={`/money-rounds/${round.id}`}
                        className="shrink-0 rounded-lg border border-[#242424] px-3 py-2 text-xs font-bold text-[#16a34a] transition hover:border-[#16a34a]"
                      >
                        View
                      </Link>
                      <Link
                        href={`/money-rounds/${round.id}/results`}
                        className="shrink-0 rounded-lg border border-[#242424] px-3 py-2 text-xs font-bold text-[#f5f5f5] transition hover:border-[#16a34a]"
                      >
                        Results
                      </Link>
                      {isAdmin && (
                        <Link
                          href={`/admin/money-rounds/${round.id}/present`}
                          className="shrink-0 rounded-lg border border-[#242424] px-3 py-2 text-xs font-bold text-[#a3a3a3] transition hover:border-[#16a34a]"
                        >
                          Control
                        </Link>
                      )}
                    </div>
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
