"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  calculateRoundMoney,
  holes,
  MoneyRound,
  MoneyScore,
  MoneyTeam,
  money,
  signedMoney,
  sumHoleScores,
} from "@/app/money-rounds/_lib/moneyRoundUtils";

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
    <main className="min-h-screen bg-black p-6 text-[#f5f5f5]">
      <div className="mx-auto w-full max-w-3xl space-y-8 py-8">
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
            <div className="space-y-2">
              <p className="text-sm uppercase tracking-[0.35em] text-[#16a34a]">
                Money Rounds
              </p>
              <h1 className="text-4xl font-bold tracking-tight">{round.name}</h1>
              <p className="text-[#a3a3a3]">
                {round.round_date || "Date TBD"} · {round.status}
              </p>
              <Link
                href={`/money-rounds/${round.id}/results`}
                className="inline-flex rounded-xl border border-[#16a34a] px-4 py-3 text-sm font-bold text-[#16a34a] transition hover:bg-[#0f1f16]"
              >
                Open Results Presentation
              </Link>
              <Link
                href={`/admin/money-rounds/${round.id}/present`}
                className="ml-0 mt-3 inline-flex rounded-xl border border-[#242424] px-4 py-3 text-sm font-bold text-[#f5f5f5] transition hover:border-[#16a34a] sm:ml-3"
              >
                Control Presentation
              </Link>
            </div>

            <section className="rounded-2xl border border-[#242424] bg-[#111111] p-5">
              <h2 className="text-xl font-bold">Standings</h2>
              <p className="mt-2 text-sm text-[#a3a3a3]">
                Tie breaker by hole handicap coming soon.
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
                      className="flex justify-between rounded-xl border border-[#242424] bg-black p-4"
                    >
                      <span>
                        {standing.position}. {standing.team.name}
                        {standing.isTied ? " (Tied)" : ""}
                      </span>
                      <span className="text-[#16a34a]">{standing.total}</span>
                    </div>
                  ))}
              </div>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-bold">Teams & Scores</h2>
              {teams.length === 0 && (
                <div className="rounded-2xl border border-[#242424] bg-[#111111] p-5 text-sm text-[#a3a3a3]">
                  No teams have been added to this round yet.
                </div>
              )}
              {teams.map((team) => (
                <div key={team.id} className="rounded-2xl border border-[#242424] bg-[#111111] p-5">
                  <h3 className="text-lg font-bold">{team.name}</h3>
                  <p className="mt-1 text-sm text-[#a3a3a3]">
                    {team.player_names.join(", ")}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold text-[#16a34a]">
                    <span className="rounded-full border border-[#166534]/70 px-3 py-1">
                      OUT {sumHoleScores(scoresByTeam[team.id] || {}, holes.slice(0, 9))}
                    </span>
                    <span className="rounded-full border border-[#166534]/70 px-3 py-1">
                      IN {sumHoleScores(scoresByTeam[team.id] || {}, holes.slice(9))}
                    </span>
                    <span className="rounded-full border border-[#16a34a] px-3 py-1">
                      TOTAL {sumHoleScores(scoresByTeam[team.id] || {}, holes)}
                    </span>
                  </div>
                  <div className="mt-4 grid grid-cols-9 gap-2 text-center text-sm">
                    {holes.map((hole) => (
                      <div key={hole} className="rounded-lg border border-[#242424] bg-black p-2">
                        <p className="text-[10px] text-[#737373]">{hole}</p>
                        <p className="font-bold">
                          {scoresByTeam[team.id]?.[hole] ?? "-"}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </section>

            <section className="rounded-2xl border border-[#242424] bg-[#111111] p-5">
              <h2 className="text-xl font-bold">Skins</h2>
              <div className="mt-4 space-y-2 text-sm text-[#a3a3a3]">
                {skins.length === 0 && <p>No skins won yet.</p>}
                {skins.map((skin) => (
                  <p key={skin.hole}>
                    Hole {skin.hole}: {skin.team.name} ({skin.score}) ·{" "}
                    {money(skin.value)}
                  </p>
                ))}
              </div>
            </section>

            <section className="rounded-2xl border border-[#242424] bg-[#111111] p-5">
              <h2 className="text-xl font-bold">Money Rounds Bank</h2>
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
