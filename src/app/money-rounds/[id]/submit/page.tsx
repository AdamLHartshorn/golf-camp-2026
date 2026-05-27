"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { logActivityFeedItem } from "@/lib/activityFeed";
import { supabase } from "@/lib/supabase";
import {
  formatScoreToCompletedPar,
  formatScoreToCompletedParForHoles,
  getScoresByTeam,
  getTeamScoreStatus,
  holes,
  moneyRoundScorecard,
  MoneyRound,
  MoneyScore,
  MoneyTeam,
  teamScoreStatusLabel,
  TeamScoreStatus,
} from "@/app/money-rounds/_lib/moneyRoundUtils";

type ScoreDrafts = Record<number, string>;

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

function draftFromScores(teamId: string, scores: MoneyScore[]) {
  return scores.reduce<ScoreDrafts>((drafts, score) => {
    if (score.money_round_team_id !== teamId || !score.hole_number) {
      return drafts;
    }

    drafts[score.hole_number] = String(score.score);
    return drafts;
  }, {});
}

function draftScore(scoreDrafts: ScoreDrafts, hole: number) {
  const value = scoreDrafts[hole]?.trim();

  if (!value) {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function sumDraftScores(scoreDrafts: ScoreDrafts, selectedHoles: number[]) {
  return selectedHoles.reduce(
    (total, hole) => total + (draftScore(scoreDrafts, hole) ?? 0),
    0,
  );
}

export default function MoneyRoundSubmitPage() {
  const params = useParams<{ id: string }>();
  const [round, setRound] = useState<MoneyRound | null>(null);
  const [teams, setTeams] = useState<MoneyTeam[]>([]);
  const [scores, setScores] = useState<MoneyScore[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState("");
  const [scoreDrafts, setScoreDrafts] = useState<ScoreDrafts>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const selectedTeam = useMemo(
    () => teams.find((team) => team.id === selectedTeamId) || null,
    [selectedTeamId, teams],
  );
  const selectedStatus = selectedTeam
    ? getTeamScoreStatus(selectedTeam)
    : "pending";
  const isVerified = selectedStatus === "verified";
  const scoresByTeam = useMemo(() => getScoresByTeam(scores), [scores]);
  const outTotal = sumDraftScores(scoreDrafts, frontNine);
  const inTotal = sumDraftScores(scoreDrafts, backNine);
  const total = outTotal + inTotal;
  const draftedScoresByHole = Object.fromEntries(
    Object.entries(scoreDrafts)
      .filter(([, value]) => value.trim() !== "")
      .map(([hole, value]) => [Number(hole), Number(value)])
      .filter(([, value]) => Number.isFinite(value)),
  ) as Record<number, number>;

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

    if (roundError || teamError || scoreError) {
      setError(
        roundError?.message ||
          teamError?.message ||
          scoreError?.message ||
          "Could not load score submission.",
      );
      setIsLoading(false);
      return;
    }

    const nextTeams = (teamData as MoneyTeam[]) || [];
    const nextScores = (scoreData as MoneyScore[]) || [];
    const requestedTeamId =
      typeof window !== "undefined"
        ? new URLSearchParams(window.location.search).get("team")
        : null;
    const nextSelectedTeamId =
      selectedTeamId ||
      (requestedTeamId && nextTeams.some((team) => team.id === requestedTeamId)
        ? requestedTeamId
        : nextTeams[0]?.id || "");

    setRound(roundData as MoneyRound);
    setTeams(nextTeams);
    setScores(nextScores);
    setSelectedTeamId(nextSelectedTeamId);
    setScoreDrafts(
      nextSelectedTeamId ? draftFromScores(nextSelectedTeamId, nextScores) : {},
    );
    setIsLoading(false);
  }

  useEffect(() => {
    window.setTimeout(() => {
      fetchRound();
    }, 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  async function handleSubmitScores() {
    if (!round || !selectedTeam || isVerified) {
      return;
    }

    setMessage("");
    setError("");
    setIsSaving(true);

    for (const hole of holes) {
      const value = scoreDrafts[hole]?.trim() || "";
      const existingScore = scores.find(
        (score) =>
          score.money_round_team_id === selectedTeam.id &&
          score.hole_number === hole,
      );

      if (!value && !existingScore) {
        continue;
      }

      if (!value && existingScore) {
        const { error: deleteError } = await supabase
          .from("money_round_scores")
          .delete()
          .eq("id", existingScore.id);

        if (deleteError) {
          setError(deleteError.message || "Could not clear score.");
          setIsSaving(false);
          return;
        }

        continue;
      }

      const parsedScore = Number(value);

      if (!Number.isInteger(parsedScore)) {
        setError("Scores must be whole numbers.");
        setIsSaving(false);
        return;
      }

      const payload = {
        money_round_id: round.id,
        money_round_team_id: selectedTeam.id,
        hole_number: hole,
        score: parsedScore,
        score_label: `Hole ${hole}`,
        updated_at: new Date().toISOString(),
      };
      const response = existingScore
        ? await supabase
            .from("money_round_scores")
            .update(payload)
            .eq("id", existingScore.id)
        : await supabase.from("money_round_scores").insert(payload);

      if (response.error) {
        setError(response.error.message || "Could not save score.");
        setIsSaving(false);
        return;
      }
    }

    const { error: teamError } = await supabase
      .from("money_round_teams")
      .update({
        score_status: "submitted",
        updated_at: new Date().toISOString(),
      })
      .eq("id", selectedTeam.id);

    if (teamError) {
      setError(teamError.message || "Could not submit scorecard.");
      setIsSaving(false);
      return;
    }

    await logActivityFeedItem({
      type: "money_round_score_submitted",
      source: "Money Rounds",
      sourceId: round.id,
      linkUrl: `/money-rounds/${round.id}`,
      message: `${selectedTeam.name} submits ${formatScoreToCompletedPar(
        total,
        draftedScoresByHole,
      )} in ${round.name}.`,
    });

    await fetchRound();
    setMessage("Scorecard submitted. Awaiting commissioner verification.");
    setIsSaving(false);
  }

  function renderNine(label: string, selectedHoles: number[]) {
    const subtotal = sumDraftScores(scoreDrafts, selectedHoles);
    const scoreToPar = formatScoreToCompletedParForHoles(
      subtotal,
      draftedScoresByHole,
      selectedHoles,
    );

    return (
      <div className="rounded-xl border border-[#242424] bg-[#111111] p-3">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#a3a3a3]">
            {label}
          </p>
          <p className="text-sm font-bold text-[#16a34a]">
            {label === "Front 9" ? "OUT" : "IN"}{" "}
            {scoreToPar}
          </p>
        </div>
        <div className="grid grid-cols-5 gap-2 sm:grid-cols-10">
          {selectedHoles.map((hole) => {
            const metadata = scorecardByHole.get(hole);

            return (
              <label key={hole} className="block text-center">
                <span className="block text-[11px] font-semibold text-[#f5f5f5]">
                  {hole}
                </span>
                <span className="block text-[9px] uppercase text-[#a3a3a3]">
                  Par {metadata?.par}
                </span>
                <span className="mb-1 block text-[9px] uppercase text-[#737373]">
                  Hcp {metadata?.handicap}
                </span>
                <input
                  type="number"
                  inputMode="numeric"
                  value={scoreDrafts[hole] ?? ""}
                  disabled={isVerified}
                  onChange={(event) =>
                    setScoreDrafts((current) => ({
                      ...current,
                      [hole]: event.target.value,
                    }))
                  }
                  className="h-12 w-full rounded-lg border border-[#242424] bg-black px-1 text-center text-base font-semibold [appearance:textfield] outline-none focus:border-[#16a34a] disabled:cursor-not-allowed disabled:opacity-50 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                  aria-label={`${selectedTeam?.name || "Team"} hole ${hole} score`}
                />
              </label>
            );
          })}
          <div className="text-center">
            <span className="mb-1 block text-[11px] font-semibold text-[#16a34a]">
              {label === "Front 9" ? "OUT" : "IN"}
            </span>
            <div className="flex h-12 items-center justify-center rounded-lg border border-[#166534]/70 bg-black text-base font-bold text-[#16a34a]">
              {scoreToPar}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-black p-6 text-[#f5f5f5]">
      <div className="mx-auto w-full max-w-3xl space-y-6 py-8">
        <div className="space-y-2">
          <p className="text-sm uppercase tracking-[0.35em] text-[#16a34a]">
            Money Rounds
          </p>
          <h1 className="text-4xl font-bold tracking-tight">Submit Scores</h1>
          <p className="text-[#a3a3a3]">
            {round?.name || "Loading round..."} · live standings are unofficial
            until verified.
          </p>
        </div>

        {isLoading && (
          <div className="rounded-2xl border border-[#242424] bg-[#111111] p-5 text-sm text-[#a3a3a3]">
            Loading scorecard...
          </div>
        )}

        {!isLoading && teams.length === 0 && (
          <div className="rounded-2xl border border-[#242424] bg-[#111111] p-5 text-sm text-[#a3a3a3]">
            No teams have been added to this round yet.
          </div>
        )}

        {!isLoading && teams.length > 0 && (
          <>
            <section className="rounded-2xl border border-[#242424] bg-[#111111] p-5">
              <p className="font-mono text-[10px] font-black uppercase tracking-[0.24em] text-[#16a34a]">
                Scorecard Flow
              </p>
              <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
                <div className="rounded-xl border border-[#315f48]/60 bg-black/45 px-2 py-3">
                  <p className="font-black text-[#8ee6a7]">1</p>
                  <p className="mt-1 text-[#a3a3a3]">Select Team</p>
                </div>
                <div className="rounded-xl border border-[#315f48]/60 bg-black/45 px-2 py-3">
                  <p className="font-black text-[#8ee6a7]">2</p>
                  <p className="mt-1 text-[#a3a3a3]">Enter Scores</p>
                </div>
                <div className="rounded-xl border border-[#315f48]/60 bg-black/45 px-2 py-3">
                  <p className="font-black text-[#8ee6a7]">3</p>
                  <p className="mt-1 text-[#a3a3a3]">Submit</p>
                </div>
              </div>
            </section>

            <section className="space-y-3">
              <div>
                <p className="font-mono text-[10px] font-black uppercase tracking-[0.24em] text-[#16a34a]">
                  Select Team
                </p>
                <h2 className="mt-2 text-xl font-bold">Choose Your Scorecard</h2>
              </div>
            <section className="grid gap-2 sm:grid-cols-2">
              {teams.map((team) => {
                const status = getTeamScoreStatus(team);
                const hasScores = scoresByTeam[team.id]
                  ? Object.keys(scoresByTeam[team.id]).length > 0
                  : false;

                return (
                  <button
                    key={team.id}
                    type="button"
                    onClick={() => {
                      setSelectedTeamId(team.id);
                      setScoreDrafts(draftFromScores(team.id, scores));
                    }}
                    className={`rounded-xl border p-4 text-left transition ${
                      selectedTeamId === team.id
                        ? "border-[#16a34a] bg-[#0f1f16]"
                        : "border-[#242424] bg-[#111111] hover:border-[#16a34a]"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-bold">{team.name}</span>
                      <span
                        className={`rounded-full border px-2 py-1 text-[10px] font-bold uppercase tracking-[0.18em] ${scoreStatusClasses(
                          status,
                        )}`}
                      >
                        {teamScoreStatusLabel(team)}
                      </span>
                    </div>
                    <p className="mt-2 text-xs text-[#a3a3a3]">
                      {status === "verified"
                        ? "Verified by Commissioner"
                        : status === "submitted"
                          ? "Edit Submitted Scores"
                          : hasScores
                            ? "Resume Scorecard"
                            : "Enter Scores"}
                    </p>
                  </button>
                );
              })}
            </section>
            </section>

            {selectedTeam && (
              <section className="space-y-4 rounded-2xl border border-[#242424] bg-[#111111] p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-2xl font-bold">{selectedTeam.name}</h2>
                      <span
                        className={`rounded-full border px-2 py-1 text-[10px] font-bold uppercase tracking-[0.18em] ${scoreStatusClasses(
                          selectedStatus,
                        )}`}
                      >
                        {teamScoreStatusLabel(selectedTeam)}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-[#a3a3a3]">
                      {selectedTeam.player_names.join(", ") || "No players"}
                    </p>
                  </div>
                  <div className="rounded-xl border border-[#16a34a] bg-black px-4 py-2 text-center">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#a3a3a3]">
                      Total
                    </p>
                    <p className="text-lg font-bold text-[#16a34a]">
                      {formatScoreToCompletedPar(total, draftedScoresByHole)}
                    </p>
                  </div>
                </div>

                {isVerified && (
                  <p className="rounded-xl border border-[#166534] bg-[#0f1f16] p-4 text-sm text-[#16a34a]">
                    Verified by Commissioner. Team edits are locked, but Nick
                    can still adjust this scorecard in admin.
                  </p>
                )}

                {renderNine("Front 9", frontNine)}
                {renderNine("Back 9", backNine)}

                <div className="rounded-xl border border-[#242424] bg-black/45 p-4 text-sm text-[#a3a3a3]">
                  {isVerified
                    ? "This scorecard is verified. Nick can still adjust it in admin if needed."
                    : selectedStatus === "submitted"
                      ? "This scorecard is submitted and awaiting verification. You can edit and resubmit until Nick verifies it."
                      : "Submit when your team scorecard is ready. Standings remain unofficial until Nick verifies."}
                </div>

                <button
                  type="button"
                  onClick={handleSubmitScores}
                  disabled={isSaving || isVerified}
                  className="w-full rounded-xl bg-[#16a34a] px-4 py-3 font-bold text-black transition hover:bg-[#15803d] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isVerified
                    ? "Verified by Commissioner"
                    : selectedStatus === "submitted"
                      ? "Resubmit Scores"
                      : "Submit Scores"}
                </button>
              </section>
            )}
          </>
        )}

        {message && <p className="text-center text-sm">{message}</p>}
        {error && <p className="text-center text-sm text-[#ff8a8a]">{error}</p>}

        <Link
          href={`/money-rounds/${params.id}`}
          className="block text-center text-sm text-[#a3a3a3]"
        >
          ← Back to Money Round
        </Link>
      </div>
    </main>
  );
}
