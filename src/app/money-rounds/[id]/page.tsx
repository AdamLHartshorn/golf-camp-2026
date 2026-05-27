"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  calculateRoundMoney,
  formatScoreToCompletedPar,
  formatScoreToCompletedParForHoles,
  getTeamScoreStatus,
  holes,
  isRoundPresentationReady,
  moneyRoundScorecard,
  MoneyRound,
  MoneyScore,
  MoneyTeam,
  money,
  signedMoney,
  sumHoleScores,
  teamScoreStatusLabel,
  TeamScoreStatus,
} from "@/app/money-rounds/_lib/moneyRoundUtils";

const frontNine = holes.slice(0, 9);
const backNine = holes.slice(9);
const scorecardByHole = new Map<number, (typeof moneyRoundScorecard)[number]>(
  moneyRoundScorecard.map((item) => [item.hole, item]),
);

function scoreStatusClasses(status: TeamScoreStatus) {
  if (status === "verified") {
    return "border-[#16a34a] bg-[#0f1f16] text-[#16a34a]";
  }

  if (status === "submitted") {
    return "border-[#365f3d] bg-[#111b14] text-[#d8f5df]";
  }

  return "border-[#242424] bg-black text-[#a3a3a3]";
}

export default function MoneyRoundDetailPage() {
  const params = useParams<{ id: string }>();
  const [round, setRound] = useState<MoneyRound | null>(null);
  const [teams, setTeams] = useState<MoneyTeam[]>([]);
  const [scores, setScores] = useState<MoneyScore[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isCurrent = true;

    async function fetchRound() {
      const [
        { data: roundData, error: roundError },
        { data: teamData, error: teamError },
        { data: scoreData, error: scoreError },
      ] = await Promise.all([
        supabase.from("money_rounds").select("*").eq("id", params.id).single(),
        supabase
          .from("money_round_teams")
          .select("*")
          .eq("money_round_id", params.id)
          .order("created_at", { ascending: true }),
        supabase
          .from("money_round_scores")
          .select("*")
          .eq("money_round_id", params.id)
          .order("hole_number", { ascending: true }),
      ]);

      if (!isCurrent) {
        return;
      }

      if (roundError || teamError || scoreError) {
        setError(
          roundError?.message ||
            teamError?.message ||
            scoreError?.message ||
            "Could not load round.",
        );
        setIsLoading(false);
        return;
      }

      setRound(roundData as MoneyRound);
      setTeams((teamData as MoneyTeam[]) || []);
      setScores((scoreData as MoneyScore[]) || []);
      console.log("money_round public detail raw fetch:", {
        roundId: params.id,
        teamCount: teamData?.length || 0,
        scoreCount: scoreData?.length || 0,
        sampleScore: scoreData?.[0] || null,
      });
      setIsLoading(false);
    }

    fetchRound();

    return () => {
      isCurrent = false;
    };
  }, [params.id]);

  const calculation = useMemo(
    () => calculateRoundMoney(round, teams, scores),
    [round, scores, teams],
  );
  const { bankRows, hasScores, scoresByTeam, skins, standings } = calculation;
  const canPresentRound = useMemo(
    () => isRoundPresentationReady(round, teams, scores),
    [round, scores, teams],
  );

  useEffect(() => {
    if (isLoading || error) {
      return;
    }

    console.log("money_round public detail fetch:", {
      roundId: params.id,
      teamCount: teams.length,
      scoreCount: scores.length,
      bankRowCount: bankRows.length,
    });
  }, [bankRows.length, error, isLoading, params.id, scores.length, teams.length]);

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(49,95,72,0.1),transparent_34%),#050505] p-5 text-[#f5f5f5]">
      <div className="mx-auto w-full max-w-3xl space-y-6 py-6">
        {isLoading && (
          <div className="rounded-2xl border border-[#242424] bg-[#111111] p-5 text-sm text-[#a3a3a3]">
            Loading round...
          </div>
        )}

        {!isLoading && error && (
          <div className="rounded-2xl border border-[#242424] bg-[#111111] p-5 text-sm text-[#ff8a8a]">
            {error}
          </div>
        )}

        {!isLoading && !error && round && (
          <>
            <div className="overflow-hidden rounded-2xl border border-[#1f6c38] bg-[#0c0f0b] shadow-[0_0_32px_rgba(49,95,72,0.09)]">
              <div className="border-b border-[#164c2a] bg-[#102116] px-5 py-5">
                <p className="font-mono text-[10px] font-black uppercase tracking-[0.24em] text-[#8ee6a7]">
                  Money Rounds
                </p>
                <h1 className="mt-2 text-4xl font-black tracking-tight">
                  {round.name}
                </h1>
                <p className="mt-2 text-sm text-[#a3a3a3]">
                  {round.round_date || "Date TBD"} · {round.status}
                </p>
              </div>
              <div className="grid grid-cols-3 border-b border-[#2a2925] text-center text-sm">
                <div className="border-r border-[#2a2925] px-3 py-3">
                  <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#a3a3a3]">
                    Status
                  </p>
                  <p className="mt-1 font-black text-[#8ee6a7]">{round.status}</p>
                </div>
                <div className="border-r border-[#2a2925] px-3 py-3">
                  <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#a3a3a3]">
                    Teams
                  </p>
                  <p className="mt-1 font-black">{teams.length}</p>
                </div>
                <div className="px-3 py-3">
                  <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#a3a3a3]">
                    Scores
                  </p>
                  <p className="mt-1 font-black">{hasScores ? "Live" : "Open"}</p>
                </div>
              </div>
              <div className="grid gap-3 px-5 py-4 sm:grid-cols-2">
                <Link
                  href={`/money-rounds/${round.id}/submit`}
                  className="rounded-xl border border-[#16a34a] bg-[#0f1f16] px-4 py-3 text-center text-sm font-bold text-[#8ee6a7] transition hover:bg-[#12301f]"
                >
                  Enter Team Scores
                </Link>
                {canPresentRound && (
                  <Link
                    href={`/money-rounds/${round.id}/results`}
                    className="rounded-xl border border-[#242424] px-4 py-3 text-center text-sm font-bold text-[#f5f5f5] transition hover:border-[#16a34a]"
                  >
                    Results Presentation
                  </Link>
                )}
              </div>
            </div>

            <section className="rounded-2xl border border-[#2b2b27] bg-[#0d0d0b] p-5 shadow-[0_18px_45px_rgba(0,0,0,0.35)]">
              <h2 className="text-xl font-bold">Standings</h2>
              <p className="mt-2 text-sm text-[#a3a3a3]">
                Live standings are unofficial until verified. Tie breaker by
                hole handicap coming soon.
              </p>
              <div className="mt-4 space-y-3">
                {!hasScores && (
                  <p className="rounded-xl border border-[#242424] bg-black p-4 text-sm text-[#a3a3a3]">
                    This round does not have scores entered yet.
                  </p>
                )}
                {hasScores &&
                  standings.map((standing) => (
                    <div
                      key={standing.team.id}
                      className="flex justify-between rounded-xl border border-[#242420] bg-black/50 p-4"
                    >
                      <span className="space-y-1">
                        <span className="block">
                          {standing.position}. {standing.team.name}
                          {standing.isTied ? " (Tied)" : ""}
                        </span>
                        <span
                          className={`inline-flex rounded-full border px-2 py-1 text-[10px] font-bold uppercase tracking-[0.18em] ${scoreStatusClasses(
                            getTeamScoreStatus(standing.team),
                          )}`}
                        >
                          {teamScoreStatusLabel(standing.team)}
                        </span>
                      </span>
                      <span className="text-[#16a34a]">
                        {formatScoreToCompletedPar(
                          standing.total,
                          standing.scoresByHole,
                        )}
                      </span>
                    </div>
                  ))}
              </div>
            </section>

            <section className="space-y-3">
              <div>
                <p className="font-mono text-[10px] font-black uppercase tracking-[0.24em] text-[#16a34a]">
                  Team Scores
                </p>
                <h2 className="mt-2 text-xl font-bold">Scorecards</h2>
              </div>
              {teams.length === 0 && (
                <div className="rounded-2xl border border-[#242424] bg-[#111111] p-5 text-sm text-[#a3a3a3]">
                  No teams have been added to this round yet.
                </div>
              )}
              {teams.map((team) => {
                const scoreStatus = getTeamScoreStatus(team);

                return (
                <div key={team.id} className="rounded-2xl border border-[#2b2b27] bg-[#0d0d0b] p-5 shadow-[0_18px_45px_rgba(0,0,0,0.28)]">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-lg font-bold">{team.name}</h3>
                    <span
                      className={`rounded-full border px-2 py-1 text-[10px] font-bold uppercase tracking-[0.18em] ${scoreStatusClasses(
                        scoreStatus,
                      )}`}
                    >
                      {teamScoreStatusLabel(team)}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-[#a3a3a3]">
                    {team.player_names.join(", ")}
                  </p>
                  {scoreStatus !== "verified" ? (
                    <Link
                      href={`/money-rounds/${round.id}/submit?team=${team.id}`}
                      className="mt-3 inline-flex rounded-lg border border-[#242424] px-3 py-2 text-xs font-bold text-[#f5f5f5] transition hover:border-[#16a34a]"
                    >
                      {scoreStatus === "submitted"
                        ? "Edit Submitted Scores"
                        : "Enter Scores"}
                    </Link>
                  ) : (
                    <p className="mt-3 inline-flex rounded-lg border border-[#166534] px-3 py-2 text-xs font-bold text-[#16a34a]">
                      Verified by Commissioner
                    </p>
                  )}
                  <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold text-[#16a34a]">
                    <span className="rounded-full border border-[#166534]/70 px-3 py-1">
                      OUT{" "}
                      {formatScoreToCompletedParForHoles(
                        sumHoleScores(scoresByTeam[team.id] || {}, frontNine),
                        scoresByTeam[team.id] || {},
                        frontNine,
                      )}
                    </span>
                    <span className="rounded-full border border-[#166534]/70 px-3 py-1">
                      IN{" "}
                      {formatScoreToCompletedParForHoles(
                        sumHoleScores(scoresByTeam[team.id] || {}, backNine),
                        scoresByTeam[team.id] || {},
                        backNine,
                      )}
                    </span>
                    <span className="rounded-full border border-[#16a34a] px-3 py-1">
                      TOTAL{" "}
                      {formatScoreToCompletedPar(
                        sumHoleScores(scoresByTeam[team.id] || {}, holes),
                        scoresByTeam[team.id] || {},
                      )}
                    </span>
                  </div>
                  <div className="mt-4 grid grid-cols-9 gap-2 text-center text-sm">
                    {holes.map((hole) => {
                      const metadata = scorecardByHole.get(hole);

                      return (
                        <div key={hole} className="rounded-lg border border-[#242424] bg-black p-2">
                          <p className="text-[10px] font-bold text-[#f5f5f5]">
                            {hole}
                          </p>
                          <p className="text-[9px] uppercase text-[#a3a3a3]">
                            Par {metadata?.par}
                          </p>
                          <p className="text-[9px] uppercase text-[#737373]">
                            Hcp {metadata?.handicap}
                          </p>
                          <p className="mt-1 font-bold">
                            {scoresByTeam[team.id]?.[hole] ?? "-"}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
                );
              })}
            </section>

            <section className="rounded-2xl border border-[#242424] bg-[#111111] p-5">
              <p className="font-mono text-[10px] font-black uppercase tracking-[0.24em] text-[#16a34a]">
                Skins
              </p>
              <h2 className="mt-2 text-xl font-bold">Hole Winners</h2>
              <div className="mt-4 space-y-2 text-sm text-[#a3a3a3]">
                {skins.length === 0 && <p>No skins won yet.</p>}
                {skins.map((skin) => {
                  const metadata = scorecardByHole.get(skin.hole);

                  return (
                    <p key={skin.hole}>
                      Hole {skin.hole}
                      {metadata
                        ? ` · Par ${metadata.par} · Hcp ${metadata.handicap}`
                        : ""}
                      : {skin.team.name} ({skin.score}) · {money(skin.value)}
                    </p>
                  );
                })}
              </div>
            </section>

            <section className="rounded-2xl border border-[#242424] bg-[#111111] p-5">
              <p className="font-mono text-[10px] font-black uppercase tracking-[0.24em] text-[#16a34a]">
                Round Bank
              </p>
              <h2 className="mt-2 text-xl font-bold">Player Payouts</h2>
              <div className="mt-4 space-y-3 text-sm">
                {bankRows.length === 0 && (
                  <p className="rounded-xl border border-[#242424] bg-black p-4 text-[#a3a3a3]">
                    No Money Rounds bank activity yet.
                  </p>
                )}
                {bankRows.map((row) => (
                  <div key={`${row.teamName}-${row.playerName}`} className="border-b border-[#242424] pb-3 last:border-b-0">
                    <div className="flex justify-between gap-3">
                      <span>{row.playerName}</span>
                      <span className={row.net >= 0 ? "text-[#16a34a]" : "text-[#a3a3a3]"}>
                        {signedMoney(row.net)}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-[#a3a3a3]">
                      {row.placementLabel} {money(row.placementWinnings)} ·
                      Skins {money(row.skinsWinnings)} · Buy-In{" "}
                      {money(row.buyIn)} · Round Net {signedMoney(row.net)}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          </>
        )}

        <Link href="/money-rounds" className="block text-center text-sm text-[#a3a3a3]">
          ← Back to Money Rounds
        </Link>
      </div>
    </main>
  );
}
