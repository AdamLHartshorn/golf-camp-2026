"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { logActivityFeedItem } from "@/lib/activityFeed";
import { logAuditEvent } from "@/lib/auditLog";
import { supabase } from "@/lib/supabase";
import {
  buildPlayerBank,
  calculateSkins,
  calculateStandings,
  formatScoreToCompletedPar,
  formatScoreToCompletedParForHoles,
  getTeamScoreStatus,
  holes,
  isRoundPresentationReady,
  moneyRoundScorecard,
  MoneyPlayer,
  MoneyRound,
  MoneyScore,
  MoneyTeam,
  money,
  signedMoney,
  teamScoreStatusLabel,
  TeamScoreStatus,
} from "@/app/money-rounds/_lib/moneyRoundUtils";

type DraftSession = {
  id: string;
  name: string;
  status: string | null;
};

type DraftTeam = {
  id: string;
  name: string;
  captain_player_id: string | null;
};

type DraftPick = {
  draft_team_id: string;
  player_id: string;
  pick_number: number;
};

const defaultRound = {
  name: "Wednesday Money Round",
  round_date: "",
  status: "pending",
  buy_in_per_player: "50",
  main_pot_per_player: "40",
  skins_pot_per_player: "10",
  first_place_payout: "0",
  second_place_payout: "0",
  third_place_payout: "0",
  skins_pot: "0",
};

type ScoreDrafts = Record<string, Record<number, string>>;
const frontNine = holes.slice(0, 9);
const backNine = holes.slice(9);
const scorecardByHole = new Map<number, (typeof moneyRoundScorecard)[number]>(
  moneyRoundScorecard.map((item) => [item.hole, item]),
);

function buildScoreDrafts(scores: MoneyScore[]) {
  return scores.reduce<ScoreDrafts>((drafts, score) => {
    if (!score.hole_number) {
      return drafts;
    }

    drafts[score.money_round_team_id] = {
      ...(drafts[score.money_round_team_id] || {}),
      [score.hole_number]: String(score.score),
    };
    return drafts;
  }, {});
}

function buildCurrentScoreRows(
  savedScores: MoneyScore[],
  scoreDrafts: ScoreDrafts,
  roundId: string,
) {
  const scoreMap = new Map<string, MoneyScore>();

  savedScores.forEach((score) => {
    if (!score.hole_number) {
      return;
    }

    scoreMap.set(`${score.money_round_team_id}:${score.hole_number}`, score);
  });

  Object.entries(scoreDrafts).forEach(([teamId, teamScores]) => {
    Object.entries(teamScores).forEach(([hole, value]) => {
      const holeNumber = Number(hole);
      const key = `${teamId}:${holeNumber}`;
      const trimmedValue = value.trim();

      if (!trimmedValue) {
        scoreMap.delete(key);
        return;
      }

      const parsedScore = Number(trimmedValue);

      if (!Number.isFinite(parsedScore)) {
        return;
      }

      const existingScore = scoreMap.get(key);
      scoreMap.set(key, {
        id: existingScore?.id || `draft-${teamId}-${holeNumber}`,
        money_round_id: existingScore?.money_round_id || roundId,
        money_round_team_id: teamId,
        hole_number: holeNumber,
        score: parsedScore,
      });
    });
  });

  return Array.from(scoreMap.values());
}

function getDraftScore(scoreDrafts: ScoreDrafts, teamId: string, hole: number) {
  const value = scoreDrafts[teamId]?.[hole]?.trim();

  if (!value) {
    return null;
  }

  const parsedScore = Number(value);
  return Number.isFinite(parsedScore) ? parsedScore : null;
}

function sumDraftScores(scoreDrafts: ScoreDrafts, teamId: string, selectedHoles: number[]) {
  return selectedHoles.reduce((total, hole) => {
    const score = getDraftScore(scoreDrafts, teamId, hole);
    return total + (score ?? 0);
  }, 0);
}

function scoreStatusClasses(status: TeamScoreStatus) {
  if (status === "verified") {
    return "border-[#16a34a] bg-[#0f1f16] text-[#16a34a]";
  }

  if (status === "submitted") {
    return "border-[#365f3d] bg-[#111b14] text-[#d8f5df]";
  }

  return "border-[#242424] bg-black text-[#a3a3a3]";
}

export default function AdminMoneyRoundsPage() {
  const [players, setPlayers] = useState<MoneyPlayer[]>([]);
  const [rounds, setRounds] = useState<MoneyRound[]>([]);
  const [selectedRoundId, setSelectedRoundId] = useState("");
  const [round, setRound] = useState<MoneyRound | null>(null);
  const [teams, setTeams] = useState<MoneyTeam[]>([]);
  const [scores, setScores] = useState<MoneyScore[]>([]);
  const [scoreDrafts, setScoreDrafts] = useState<ScoreDrafts>({});
  const [draftSessions, setDraftSessions] = useState<DraftSession[]>([]);
  const [selectedDraftSessionId, setSelectedDraftSessionId] = useState("");
  const [roundForm, setRoundForm] = useState(defaultRound);
  const [teamName, setTeamName] = useState("");
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const playersById = useMemo(
    () => new Map(players.map((player) => [player.id, player])),
    [players],
  );
  const currentScores = useMemo(
    () => buildCurrentScoreRows(scores, scoreDrafts, round?.id || ""),
    [round?.id, scoreDrafts, scores],
  );
  const standings = useMemo(
    () => calculateStandings(teams, currentScores),
    [currentScores, teams],
  );
  const skins = useMemo(
    () => calculateSkins(teams, currentScores, Number(round?.skins_pot || 0)),
    [currentScores, round?.skins_pot, teams],
  );
  const bankRows = useMemo(
    () => buildPlayerBank(round, standings, skins),
    [round, skins, standings],
  );
  const canPresentRound = useMemo(
    () => isRoundPresentationReady(round, teams, currentScores),
    [currentScores, round, teams],
  );
  const savedScoreByTeamHole = useMemo(
    () =>
      scores.reduce<Record<string, Record<number, MoneyScore>>>(
        (groups, score) => {
          if (!score.hole_number) {
            return groups;
          }

          groups[score.money_round_team_id] = {
            ...(groups[score.money_round_team_id] || {}),
            [score.hole_number]: score,
          };
          return groups;
        },
        {},
      ),
    [scores],
  );
  const payoutNotice = useMemo(() => {
    if (!round) {
      return "";
    }

    if (teams.length === 0) {
      return "Add teams to calculate standings, skins, and payouts.";
    }

    const enteredScores = currentScores.filter((score) => score.hole_number).length;
    const expectedScores = teams.length * holes.length;

    if (enteredScores < expectedScores) {
      return "Preview is based on scores entered so far. Complete all 18 holes for final skins and payouts.";
    }

    if (bankRows.length === 0) {
      return "Add players to teams to generate player bank rows.";
    }

    if (skins.length === 0) {
      return "No skins are currently awarded. Tied holes and incomplete holes do not pay skins.";
    }

    return "";
  }, [bankRows.length, currentScores, round, skins.length, teams.length]);

  async function fetchPlayers() {
    const { data, error: fetchError } = await supabase
      .from("players")
      .select("id, first_name, last_name, display_name")
      .eq("active", true)
      .order("last_name", { ascending: true });

    if (fetchError) {
      setError(fetchError.message || "Could not load players.");
      return;
    }

    setPlayers((data as MoneyPlayer[]) || []);
  }

  async function fetchRounds() {
    const { data, error: fetchError } = await supabase
      .from("money_rounds")
      .select("*")
      .order("round_date", { ascending: false })
      .order("created_at", { ascending: false });

    if (fetchError) {
      setError(fetchError.message || "Could not load money rounds.");
      return;
    }

    const nextRounds = (data as MoneyRound[]) || [];
    setRounds(nextRounds);

    if (!selectedRoundId && nextRounds.length > 0) {
      setSelectedRoundId(nextRounds[0].id);
    }
  }

  async function fetchDraftSessions() {
    const { data } = await supabase
      .from("draft_sessions")
      .select("id, name, status")
      .in("status", ["complete", "completed", "final", "finalized", "active"])
      .order("created_at", { ascending: false });

    setDraftSessions((data as DraftSession[]) || []);
  }

  async function fetchRoundState(roundId: string) {
    const [
      { data: roundData, error: roundError },
      { data: teamData, error: teamError },
      { data: scoreData, error: scoreError },
    ] = await Promise.all([
      supabase.from("money_rounds").select("*").eq("id", roundId).single(),
      supabase
        .from("money_round_teams")
        .select("*")
        .eq("money_round_id", roundId)
        .order("created_at", { ascending: true }),
      supabase
        .from("money_round_scores")
        .select("*")
        .eq("money_round_id", roundId)
        .order("hole_number", { ascending: true }),
    ]);

    if (roundError || teamError || scoreError) {
      setError(
        roundError?.message ||
          teamError?.message ||
          scoreError?.message ||
          "Could not load round.",
      );
      return;
    }

    setRound(roundData as MoneyRound);
    setTeams((teamData as MoneyTeam[]) || []);
    setScores((scoreData as MoneyScore[]) || []);
    setScoreDrafts(buildScoreDrafts((scoreData as MoneyScore[]) || []));
    setRoundForm({
      name: (roundData as MoneyRound).name || "",
      round_date: (roundData as MoneyRound).round_date || "",
      status: (roundData as MoneyRound).status || "pending",
      buy_in_per_player: String((roundData as MoneyRound).buy_in_per_player ?? 50),
      main_pot_per_player: String((roundData as MoneyRound).main_pot_per_player ?? 40),
      skins_pot_per_player: String((roundData as MoneyRound).skins_pot_per_player ?? 10),
      first_place_payout: String((roundData as MoneyRound).first_place_payout ?? 0),
      second_place_payout: String((roundData as MoneyRound).second_place_payout ?? 0),
      third_place_payout: String((roundData as MoneyRound).third_place_payout ?? 0),
      skins_pot: String((roundData as MoneyRound).skins_pot ?? 0),
    });
  }

  useEffect(() => {
    async function loadInitialData() {
      setIsLoading(true);
      await Promise.all([fetchPlayers(), fetchRounds(), fetchDraftSessions()]);
      setIsLoading(false);
    }

    loadInitialData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (selectedRoundId) {
      window.setTimeout(() => {
        fetchRoundState(selectedRoundId);
      }, 0);
    }
  }, [selectedRoundId]);

  useEffect(() => {
    if (!round) {
      return;
    }

    console.log("money_round payout calculation inputs:", {
      roundId: round.id,
      teamCount: teams.length,
      scoreCount: currentScores.length,
      standings,
      skins,
      bankRows,
    });
  }, [bankRows, currentScores, round, skins, standings, teams.length]);

  function updateRoundForm(field: keyof typeof defaultRound, value: string) {
    setRoundForm((current) => ({ ...current, [field]: value }));
  }

  function togglePlayer(playerId: string) {
    setSelectedPlayerIds((current) =>
      current.includes(playerId)
        ? current.filter((id) => id !== playerId)
        : [...current, playerId],
    );
  }

  async function handleSaveRound() {
    setMessage("");
    setError("");
    setIsSaving(true);

    const payload = {
      name: roundForm.name.trim(),
      round_date: roundForm.round_date || null,
      status: roundForm.status,
      buy_in: Number(roundForm.buy_in_per_player || 0),
      buy_in_per_player: Number(roundForm.buy_in_per_player || 0),
      main_pot_per_player: Number(roundForm.main_pot_per_player || 0),
      skins_pot_per_player: Number(roundForm.skins_pot_per_player || 0),
      first_place_payout: Number(roundForm.first_place_payout || 0),
      second_place_payout: Number(roundForm.second_place_payout || 0),
      third_place_payout: Number(roundForm.third_place_payout || 0),
      skins_pot: Number(roundForm.skins_pot || 0),
      updated_at: new Date().toISOString(),
    };

    if (!payload.name) {
      setError("Round name is required.");
      setIsSaving(false);
      return;
    }

    if (round) {
      const { data, error: updateError } = await supabase
        .from("money_rounds")
        .update(payload)
        .eq("id", round.id)
        .select("*")
        .single();

      console.log("money_round settings update response:", {
        roundId: round.id,
        data,
        error: updateError,
      });

      if (updateError) {
        setError(updateError.message || "Could not update round.");
        setIsSaving(false);
        return;
      }

      const updatedRound = data
        ? (data as MoneyRound)
        : ({ ...round, ...payload } as MoneyRound);

      setRound(updatedRound);
      setMessage("Round settings updated.");
      await logAuditEvent({
        actionType: "money_round_settings_updated",
        entityType: "money_round",
        entityId: round.id,
        summary: `Money Round settings updated: ${updatedRound.name}.`,
        oldValue: round,
        newValue: updatedRound,
      });
      await fetchRounds();
      setIsSaving(false);
      return;
    }

    const { data, error: insertError } = await supabase
      .from("money_rounds")
      .insert(payload)
      .select("*")
      .single();

    if (insertError || !data) {
      setError(insertError?.message || "Could not create round.");
      setIsSaving(false);
      return;
    }

    setMessage("Round created.");
    await logAuditEvent({
      actionType: "money_round_created",
      entityType: "money_round",
      entityId: (data as MoneyRound).id,
      summary: `Money Round created: ${(data as MoneyRound).name}.`,
      newValue: data,
    });
    setSelectedRoundId((data as MoneyRound).id);
    await fetchRounds();
    setIsSaving(false);
  }

  async function handleCreateTeam() {
    if (!round) {
      setError("Select or create a round first.");
      return;
    }

    const selectedPlayers = selectedPlayerIds
      .map((playerId) => playersById.get(playerId))
      .filter((player): player is MoneyPlayer => Boolean(player));
    const finalTeamName =
      teamName.trim() || selectedPlayers.map((player) => player.last_name).join(" / ");

    if (!finalTeamName || selectedPlayers.length === 0) {
      setError("Team name and at least one player are required.");
      return;
    }

    const { error: insertError } = await supabase.from("money_round_teams").insert({
      money_round_id: round.id,
      name: finalTeamName,
      player_ids: selectedPlayers.map((player) => player.id),
      player_names: selectedPlayers.map((player) => player.display_name),
    });

    if (insertError) {
      setError(insertError.message || "Could not create team.");
      return;
    }

    setTeamName("");
    setSelectedPlayerIds([]);
    setMessage("Team created.");
    await fetchRoundState(round.id);
  }

  async function handleImportDraftTeams() {
    if (!round || !selectedDraftSessionId) {
      setError("Select a draft session to import.");
      return;
    }

    const selectedDraftSession = draftSessions.find(
      (session) => session.id === selectedDraftSessionId,
    );

    setMessage("");
    setError("");

    if (teams.length > 0) {
      const shouldContinue = window.confirm(
        "Teams already exist for this round. Importing may add duplicate teams. Continue?",
      );

      if (!shouldContinue) {
        setError("Teams already exist for this round.");
        return;
      }
    }

    const [
      { data: draftTeams, error: draftTeamsError },
      { data: draftPicks, error: draftPicksError },
    ] = await Promise.all([
      supabase
        .from("draft_teams")
        .select("id, name, captain_player_id")
        .eq("draft_session_id", selectedDraftSessionId),
      supabase
        .from("draft_picks")
        .select("draft_team_id, player_id, pick_number")
        .eq("draft_session_id", selectedDraftSessionId)
        .order("pick_number", { ascending: true }),
    ]);

    if (draftTeamsError || draftPicksError) {
      setError(
        draftTeamsError?.message ||
          draftPicksError?.message ||
          "Could not load draft teams.",
      );
      return;
    }

    const picksByTeam = ((draftPicks as DraftPick[]) || []).reduce<
      Record<string, string[]>
    >((groups, pick) => {
      groups[pick.draft_team_id] = [...(groups[pick.draft_team_id] || []), pick.player_id];
      return groups;
    }, {});
    const draftTeamRows = (draftTeams as DraftTeam[]) || [];
    const allDraftPlayerIds = Array.from(
      new Set(
        draftTeamRows.flatMap((team) =>
          [
            team.captain_player_id,
            ...(picksByTeam[team.id] || []),
          ].filter((playerId): playerId is string => Boolean(playerId)),
        ),
      ),
    );
    const { data: draftPlayers } =
      allDraftPlayerIds.length > 0
        ? await supabase
            .from("players")
            .select("id, first_name, last_name, display_name")
            .in("id", allDraftPlayerIds)
        : { data: [] };
    const draftPlayersById = new Map(
      ((draftPlayers as MoneyPlayer[]) || []).map((player) => [
        player.id,
        player,
      ]),
    );
    const existingTeamNames = new Set(teams.map((team) => team.name));
    const payload = draftTeamRows
      .filter((team) => !existingTeamNames.has(team.name))
      .map((team) => {
        const playerIds = [
          team.captain_player_id,
          ...(picksByTeam[team.id] || []),
        ].filter((playerId): playerId is string => Boolean(playerId));
      const playerNames = playerIds
        .map((playerId) => draftPlayersById.get(playerId)?.display_name)
        .filter((name): name is string => Boolean(name));

      return {
        money_round_id: round.id,
        name: team.name,
        player_ids: playerIds,
        player_names: playerNames,
      };
      });

    if (payload.length === 0) {
      setError(
        draftTeamRows.length === 0
          ? "No draft teams found to import."
          : "Teams already exist for this round.",
      );
      return;
    }

    const { error: insertError } = await supabase
      .from("money_round_teams")
      .insert(payload);

    if (insertError) {
      setError(insertError.message || "Could not import draft teams.");
      return;
    }

    setMessage(
      `Imported ${payload.length} teams from ${
        selectedDraftSession?.name || "selected draft"
      }.`,
    );
    await fetchRoundState(round.id);
  }

  async function handleScoreChange(team: MoneyTeam, hole: number, value: string) {
    if (!round) {
      return false;
    }

    const { data: fetchedExistingScore, error: existingScoreError } =
      await supabase
        .from("money_round_scores")
        .select("id, money_round_id, money_round_team_id, hole_number, score")
        .eq("money_round_id", round.id)
        .eq("money_round_team_id", team.id)
        .eq("hole_number", hole)
        .maybeSingle();
    console.log("money_round existing score lookup:", {
      team: team.name,
      hole,
      data: fetchedExistingScore,
      error: existingScoreError,
    });

    if (existingScoreError) {
      setError(existingScoreError.message || "Could not inspect existing score.");
      return false;
    }

    const existingScore =
      savedScoreByTeamHole[team.id]?.[hole] ||
      (fetchedExistingScore as MoneyScore | null);
    setMessage("");
    setError("");

    if (!value) {
      if (existingScore) {
        const { data, error: deleteError } = await supabase
          .from("money_round_scores")
          .delete()
          .eq("id", existingScore.id)
          .select("*");
        console.log("money_round score save response:", {
          action: "delete",
          team: team.name,
          hole,
          value,
          data,
          error: deleteError,
        });

        if (deleteError) {
          setError(deleteError.message || "Could not clear score.");
          return false;
        }

        await logAuditEvent({
          actionType: "money_round_score_edited",
          entityType: "money_round_score",
          entityId: existingScore.id,
          summary: `${team.name} hole ${hole} score cleared.`,
          oldValue: existingScore,
          metadata: { money_round_id: round.id, team_id: team.id, hole },
        });
        setScores((current) => current.filter((score) => score.id !== existingScore.id));
      }
      return true;
    }

    const parsedScore = Number(value);

    if (!Number.isInteger(parsedScore)) {
      setError("Scores must be whole numbers.");
      return false;
    }

    const payload = {
      money_round_id: round.id,
      money_round_team_id: team.id,
      hole_number: hole,
      score: parsedScore,
      score_label: `Hole ${hole}`,
      updated_at: new Date().toISOString(),
    };
    console.log("money_round score save payload:", payload);

    const { data, error: saveError } = existingScore
      ? await supabase
          .from("money_round_scores")
          .update(payload)
          .eq("id", existingScore.id)
          .select("id, money_round_id, money_round_team_id, hole_number, score")
          .single()
      : await supabase
          .from("money_round_scores")
          .insert(payload)
          .select("id, money_round_id, money_round_team_id, hole_number, score")
          .single();

    console.log("money_round score save response:", {
      action: existingScore ? "update" : "insert",
      team: team.name,
      hole,
      value,
      data,
      error: saveError,
    });

    if (saveError) {
      setError(saveError.message || "Could not save score.");
      return false;
    }

    let savedScore = data as MoneyScore | undefined;

    if (!savedScore) {
      const { data: refreshedScore, error: refreshError } = await supabase
        .from("money_round_scores")
        .select("id, money_round_id, money_round_team_id, hole_number, score")
        .eq("money_round_id", round.id)
        .eq("money_round_team_id", team.id)
        .eq("hole_number", hole)
        .single();
      console.log("money_round score refresh response:", {
        team: team.name,
        hole,
        data: refreshedScore,
        error: refreshError,
      });
      savedScore = refreshedScore as MoneyScore | undefined;
    }

    if (savedScore) {
      setScores((current) => {
        const withoutCurrent = current.filter(
          (score) =>
            !(
              score.money_round_team_id === team.id &&
              score.hole_number === hole
            ),
        );
        return [...withoutCurrent, savedScore];
      });
      await logAuditEvent({
        actionType: "money_round_score_edited",
        entityType: "money_round_score",
        entityId: savedScore.id,
        summary: `${team.name} hole ${hole} score saved as ${parsedScore}.`,
        oldValue: existingScore || null,
        newValue: savedScore,
        metadata: { money_round_id: round.id, team_id: team.id, hole },
      });
    }

    return true;
  }

  async function persistAllScoreDrafts() {
    if (!round) {
      return false;
    }

    setMessage("");
    setError("");

    for (const team of teams) {
      for (const hole of holes) {
        const draftValue = scoreDrafts[team.id]?.[hole] ?? "";
        const hasPersistedScore = Boolean(savedScoreByTeamHole[team.id]?.[hole]);

        if (!draftValue.trim() && !hasPersistedScore) {
          continue;
        }

        const didSave = await handleScoreChange(team, hole, draftValue);

        if (!didSave) {
          return false;
        }
      }
    }

    const { data: persistedScores, error: scoreFetchError } = await supabase
      .from("money_round_scores")
      .select("id, money_round_id, money_round_team_id, hole_number, score")
      .eq("money_round_id", round.id)
      .order("hole_number", { ascending: true });

    console.log("money_round persisted score confirmation:", {
      roundId: round.id,
      scoreCount: persistedScores?.length || 0,
      sampleScore: persistedScores?.[0] || null,
      error: scoreFetchError,
    });

    if (scoreFetchError) {
      setError(scoreFetchError.message || "Could not confirm persisted scores.");
      return false;
    }

    setScores((persistedScores as MoneyScore[]) || []);
    setScoreDrafts(buildScoreDrafts((persistedScores as MoneyScore[]) || []));
    return true;
  }

  async function handleSaveScores() {
    setIsSaving(true);
    const didPersist = await persistAllScoreDrafts();

    if (didPersist) {
      await markPendingTeamsSubmitted();
    }

    setIsSaving(false);

    if (didPersist) {
      setMessage("Scores saved.");
    }
  }

  async function handleSetTeamScoreStatus(
    team: MoneyTeam,
    scoreStatus: TeamScoreStatus,
  ) {
    setMessage("");
    setError("");
    setIsSaving(true);

    const { data, error: updateError } = await supabase
      .from("money_round_teams")
      .update({
        score_status: scoreStatus,
        updated_at: new Date().toISOString(),
      })
      .eq("id", team.id)
      .select("*")
      .single();

    console.log("money_round team score status update:", {
      team: team.name,
      scoreStatus,
      data,
      error: updateError,
    });

    setIsSaving(false);

    if (updateError) {
      setError(updateError.message || "Could not update scorecard status.");
      return false;
    }

    const updatedTeam = data as MoneyTeam;
    setTeams((current) =>
      current.map((currentTeam) =>
        currentTeam.id === updatedTeam.id ? updatedTeam : currentTeam,
      ),
    );
    if (round && scoreStatus === "verified") {
      await logActivityFeedItem({
        type: "money_round_score_verified",
        source: "Money Rounds",
        sourceId: round.id,
        linkUrl: `/money-rounds/${round.id}`,
        message: `${team.name} verified in ${round.name}.`,
      });
    }
    if (round) {
      await logAuditEvent({
        actionType:
          scoreStatus === "verified"
            ? "money_round_score_verified"
            : "money_round_score_unverified",
        entityType: "money_round_team",
        entityId: team.id,
        summary:
          scoreStatus === "verified"
            ? `${team.name} scorecard verified in ${round.name}.`
            : `${team.name} scorecard marked ${scoreStatus} in ${round.name}.`,
        oldValue: { score_status: team.score_status },
        newValue: { score_status: scoreStatus },
        metadata: { money_round_id: round.id },
      });
    }
    setMessage(
      scoreStatus === "verified"
        ? `${team.name} verified.`
        : scoreStatus === "submitted"
          ? `${team.name} marked unofficial.`
          : `${team.name} reset to pending.`,
    );
    return true;
  }

  async function markPendingTeamsSubmitted() {
    if (!round) {
      return;
    }

    const teamsWithScores = new Set(
      buildCurrentScoreRows(scores, scoreDrafts, round.id).map(
        (score) => score.money_round_team_id,
      ),
    );
    const pendingTeamIds = teams
      .filter(
        (team) =>
          teamsWithScores.has(team.id) && getTeamScoreStatus(team) === "pending",
      )
      .map((team) => team.id);

    if (pendingTeamIds.length === 0) {
      return;
    }

    const { data, error: updateError } = await supabase
      .from("money_round_teams")
      .update({
        score_status: "submitted",
        updated_at: new Date().toISOString(),
      })
      .in("id", pendingTeamIds)
      .select("*");

    console.log("money_round pending teams submitted:", {
      pendingTeamIds,
      data,
      error: updateError,
    });

    if (updateError) {
      setError(updateError.message || "Could not mark submitted scorecards.");
      return;
    }

    const updatedTeams = (data as MoneyTeam[]) || [];
    setTeams((current) =>
      current.map(
        (team) =>
          updatedTeams.find((updatedTeam) => updatedTeam.id === team.id) || team,
      ),
    );
  }

  async function handleMarkFinal() {
    if (!round || !window.confirm("Mark this Money Round final?")) {
      return;
    }

    setMessage("");
    setError("");
    setIsSaving(true);

    const { data, error: updateError } = await supabase
      .from("money_rounds")
      .update({ status: "final", updated_at: new Date().toISOString() })
      .eq("id", round.id)
      .select("*")
      .single();

    console.log("money_round mark final response:", { data, error: updateError });

    if (updateError) {
      setError(updateError.message || "Could not mark final.");
      setIsSaving(false);
      return;
    }

    if (data) {
      setRound(data as MoneyRound);
      setRoundForm((current) => ({ ...current, status: "final" }));
    }

    await fetchRounds();
    await fetchRoundState(round.id);
    await logActivityFeedItem({
      type: "money_round_finalized",
      source: "Money Rounds",
      sourceId: round.id,
      linkUrl: `/money-rounds/${round.id}`,
      message: `${round.name} finalized.`,
    });
    await logAuditEvent({
      actionType: "money_round_finalized",
      entityType: "money_round",
      entityId: round.id,
      summary: `${round.name} marked final.`,
      oldValue: { status: round.status },
      newValue: data,
    });
    setMessage("Round marked final.");
    setIsSaving(false);
  }

  async function handleDeleteRound() {
    if (!round) {
      return;
    }

    const shouldDelete = window.confirm(
      `Delete ${round.name}? This removes the round and related teams, scores, and payouts.`,
    );

    if (!shouldDelete) {
      return;
    }

    setMessage("");
    setError("");
    setIsSaving(true);

    const { data, error: deleteError } = await supabase
      .from("money_rounds")
      .delete()
      .eq("id", round.id)
      .select("*");

    console.log("money_round delete response:", {
      roundId: round.id,
      data,
      error: deleteError,
    });

    if (deleteError) {
      setError(deleteError.message || "Could not delete money round.");
      setIsSaving(false);
      return;
    }

    setRound(null);
    setTeams([]);
    setScores([]);
    setScoreDrafts({});
    setSelectedRoundId("");
    setRoundForm(defaultRound);
    setMessage("Money Round deleted.");
    await fetchRounds();
    setIsSaving(false);
  }

  return (
    <main className="min-h-screen bg-black p-6 text-[#f5f5f5]">
      <Link href="/admin" className="gc-back-link gc-floating-back gc-back-money">
        ← BACK
      </Link>
      <div className="mx-auto w-full max-w-md space-y-8 py-8">
        <div className="space-y-2">
          <p className="text-sm uppercase tracking-[0.35em] text-[#a3a3a3]">
            Admin
          </p>
          <h1 className="text-4xl font-bold tracking-tight">Money Rounds</h1>
          <p className="text-[#a3a3a3]">
            Team scoring, skins, payouts, and round bank preview.
          </p>
        </div>

        <section className="space-y-4 rounded-2xl border border-[#242424] bg-[#111111] p-5">
          <div>
            <p className="font-mono text-[10px] font-black uppercase tracking-[0.24em] text-[#16a34a]">
              Round Setup
            </p>
            <h2 className="mt-2 text-xl font-bold">Create or Configure Round</h2>
          </div>

          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-[#16a34a]">
              Select Round
            </label>
            <select
              value={selectedRoundId}
              onChange={(event) => {
                setSelectedRoundId(event.target.value);
                if (!event.target.value) {
                  setRound(null);
                  setTeams([]);
                  setScores([]);
                  setScoreDrafts({});
                  setRoundForm(defaultRound);
                }
              }}
              className="w-full rounded-xl border border-[#242424] bg-black px-4 py-3 outline-none focus:border-[#16a34a]"
            >
              <option value="">New money round</option>
              {rounds.map((moneyRound) => (
                <option key={moneyRound.id} value={moneyRound.id}>
                  {moneyRound.name} ({moneyRound.status})
                </option>
              ))}
            </select>
          </div>

          <div className="grid gap-3">
            <label className="block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-[#a3a3a3]">
                Round Name
              </span>
              <input
                value={roundForm.name}
                onChange={(event) => updateRoundForm("name", event.target.value)}
                className="w-full rounded-xl border border-[#242424] bg-black px-4 py-3 outline-none focus:border-[#16a34a]"
                placeholder="Wednesday Money Round"
              />
            </label>

            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-[#a3a3a3]">
                  Round Date
                </span>
                <input
                  type="date"
                  value={roundForm.round_date}
                  onChange={(event) =>
                    updateRoundForm("round_date", event.target.value)
                  }
                  className="w-full rounded-xl border border-[#242424] bg-black px-4 py-3 outline-none focus:border-[#16a34a]"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-[#a3a3a3]">
                  Status
                </span>
                <select
                  value={roundForm.status}
                  onChange={(event) => updateRoundForm("status", event.target.value)}
                  className="w-full rounded-xl border border-[#242424] bg-black px-4 py-3 outline-none focus:border-[#16a34a]"
                >
                  {["pending", "active", "scored", "final"].map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          <div className="space-y-3 rounded-2xl border border-[#166534]/60 bg-black/40 p-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#16a34a]">
                Money Setup
              </p>
              <p className="mt-1 text-sm text-[#a3a3a3]">
                Configure buy-ins, pot splits, and payout targets.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {[
                ["buy_in_per_player", "Buy-In Per Player", "$50"],
                ["main_pot_per_player", "Main Pot Per Player", "$40"],
                ["skins_pot_per_player", "Skins Pot Per Player", "$10"],
                ["skins_pot", "Total Skins Pot", "$0"],
                ["first_place_payout", "1st Place", "$0"],
                ["second_place_payout", "2nd Place", "$0"],
                ["third_place_payout", "3rd Place", "$0"],
              ].map(([field, label, placeholder]) => (
                <label key={field} className="block">
                  <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.16em] text-[#a3a3a3]">
                    {label}
                  </span>
                  <input
                    type="number"
                    value={roundForm[field as keyof typeof defaultRound]}
                    onChange={(event) =>
                      updateRoundForm(
                        field as keyof typeof defaultRound,
                        event.target.value,
                      )
                    }
                    className="w-full rounded-xl border border-[#242424] bg-black px-4 py-3 outline-none focus:border-[#16a34a]"
                    placeholder={placeholder}
                  />
                </label>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={handleSaveRound}
            disabled={isSaving || isLoading}
            className="w-full rounded-xl bg-[#16a34a] px-4 py-3 font-bold text-black transition hover:bg-[#15803d] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSaving ? "Saving..." : round ? "Save Round" : "Create Round"}
          </button>
        </section>

        {message && <p className="text-center text-sm">{message}</p>}
        {error && <p className="text-center text-sm text-[#ff8a8a]">{error}</p>}

        {round && (
          <>
            <section className="rounded-2xl border border-[#242424] bg-[#111111] p-5">
              <p className="font-mono text-[10px] font-black uppercase tracking-[0.24em] text-[#16a34a]">
                Commissioner Flow
              </p>
              <div className="mt-4 grid grid-cols-4 gap-2 text-center text-[11px]">
                {["Teams", "Scores", "Verify", "Finalize"].map((step, index) => (
                  <div
                    key={step}
                    className="rounded-xl border border-[#315f48]/60 bg-black/45 px-2 py-3"
                  >
                    <p className="font-black text-[#8ee6a7]">{index + 1}</p>
                    <p className="mt-1 text-[#a3a3a3]">{step}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-2xl border border-[#242424] bg-[#111111] p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#a3a3a3]">
                    Selected Round
                  </p>
                  <h2 className="mt-1 text-xl font-bold">{round.name}</h2>
                </div>
                <span
                  className={`rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] ${
                    round.status === "final"
                      ? "border-[#16a34a] text-[#16a34a]"
                      : "border-[#242424] text-[#a3a3a3]"
                  }`}
                >
                  {round.status}
                </span>
              </div>
              {round.status === "final" && (
                <p className="mt-3 text-sm text-[#a3a3a3]">
                  Final status is an indicator. Commissioner corrections remain available.
                </p>
              )}
              {canPresentRound && (
                <>
                  <Link
                    href={`/money-rounds/${round.id}/results`}
                    className="mt-4 block w-full rounded-xl border border-[#16a34a] px-4 py-3 text-center text-sm font-bold text-[#16a34a] transition hover:bg-[#0f1f16]"
                  >
                    Open TV Results
                  </Link>
                  <Link
                    href={`/admin/money-rounds/${round.id}/present`}
                    className="mt-3 block w-full rounded-xl border border-[#242424] px-4 py-3 text-center text-sm font-bold text-[#f5f5f5] transition hover:border-[#16a34a]"
                  >
                    Control Presentation
                  </Link>
                </>
              )}
              <button
                type="button"
                onClick={handleDeleteRound}
                disabled={isSaving}
                className="mt-4 w-full rounded-xl border border-[#3a1f1f] px-4 py-3 text-sm font-bold text-[#ff8a8a] transition hover:border-[#ff8a8a] disabled:cursor-not-allowed disabled:opacity-50"
              >
                Delete Money Round
              </button>
            </section>

            <section className="space-y-4 rounded-2xl border border-[#242424] bg-[#111111] p-5">
              <div>
                <p className="font-mono text-[10px] font-black uppercase tracking-[0.24em] text-[#16a34a]">
                  Team Setup
                </p>
                <h2 className="mt-2 text-xl font-bold">Teams</h2>
              </div>

              <div className="space-y-3 rounded-2xl border border-[#166534]/60 bg-black/40 p-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#16a34a]">
                    Import Teams from Draft
                  </p>
                  <p className="mt-1 text-sm text-[#a3a3a3]">
                    Pull captain teams and drafted players into this Money Round.
                  </p>
                </div>

                {draftSessions.length === 0 && (
                  <p className="rounded-xl border border-[#242424] bg-black p-3 text-sm text-[#a3a3a3]">
                    No completed/final draft sessions found. Active drafts are
                    included for testing when available.
                  </p>
                )}

                {draftSessions.length > 0 && (
                  <>
                    <label className="block">
                      <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-[#a3a3a3]">
                        Select Draft Session
                      </span>
                      <select
                        value={selectedDraftSessionId}
                        onChange={(event) =>
                          setSelectedDraftSessionId(event.target.value)
                        }
                        className="w-full rounded-xl border border-[#242424] bg-black px-4 py-3 outline-none focus:border-[#16a34a]"
                      >
                        <option value="">Select Draft Session</option>
                        {draftSessions.map((session) => (
                          <option key={session.id} value={session.id}>
                            {session.name} ({session.status || "unknown"})
                          </option>
                        ))}
                      </select>
                    </label>

                    <button
                      type="button"
                      onClick={handleImportDraftTeams}
                      className="w-full rounded-xl border border-[#242424] px-4 py-3 font-bold hover:border-[#16a34a]"
                    >
                      Add All Teams from Selected Draft
                    </button>
                  </>
                )}
              </div>

              <div className="space-y-3 border-t border-[#242424] pt-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#a3a3a3]">
                    Manual Team Creation
                  </p>
                  <p className="mt-1 text-sm text-[#a3a3a3]">
                    Build or adjust teams by hand when needed.
                  </p>
                </div>

                <input
                  value={teamName}
                  onChange={(event) => setTeamName(event.target.value)}
                  className="w-full rounded-xl border border-[#242424] bg-black px-4 py-3 outline-none focus:border-[#16a34a]"
                  placeholder="Team name"
                />
                <div className="grid max-h-60 grid-cols-2 gap-2 overflow-y-auto rounded-xl border border-[#242424] bg-black/30 p-2">
                  {players.map((player) => (
                  <button
                    key={player.id}
                    type="button"
                    onClick={() => togglePlayer(player.id)}
                    className={`rounded-xl border p-3 text-left text-sm font-semibold ${
                      selectedPlayerIds.includes(player.id)
                        ? "border-[#16a34a] bg-[#16a34a] text-black"
                        : "border-[#242424] bg-black text-[#f5f5f5]"
                    }`}
                  >
                    {player.display_name}
                  </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={handleCreateTeam}
                  className="w-full rounded-xl border border-[#242424] px-4 py-3 font-bold hover:border-[#16a34a]"
                >
                  Add Team
                </button>
              </div>

              <div className="space-y-2">
                {teams.map((team) => (
                  <div key={team.id} className="rounded-xl border border-[#242424] bg-black p-3">
                    <p className="font-bold">{team.name}</p>
                    <p className="mt-1 text-sm text-[#a3a3a3]">
                      {team.player_names.join(", ") || "No players"}
                    </p>
                  </div>
                ))}
              </div>
            </section>

            <section className="space-y-4 rounded-2xl border border-[#242424] bg-[#111111] p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-mono text-[10px] font-black uppercase tracking-[0.24em] text-[#16a34a]">
                    Score Review
                  </p>
                  <h2 className="mt-2 text-xl font-bold">Score Entry</h2>
                        <p className="mt-1 text-sm text-[#a3a3a3]">
                    Nick can edit any team scorecard at any time. Scores
                    autosave on blur; use Save Scores to persist every current
                    scorecard value.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleSaveScores}
                  disabled={isSaving}
                  className="rounded-xl border border-[#16a34a] px-4 py-3 text-sm font-bold text-[#16a34a] transition hover:bg-[#0f1f16] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Save Scores
                </button>
              </div>
              {teams.map((team) => {
                const outTotal = sumDraftScores(scoreDrafts, team.id, frontNine);
                const inTotal = sumDraftScores(scoreDrafts, team.id, backNine);
                const total = outTotal + inTotal;
                const scoreStatus = getTeamScoreStatus(team);
                const draftedScoresByHole = Object.fromEntries(
                  Object.entries(scoreDrafts[team.id] || {})
                    .filter(([, value]) => value.trim() !== "")
                    .map(([hole, value]) => [Number(hole), Number(value)])
                    .filter(([, value]) => Number.isFinite(value)),
                ) as Record<number, number>;

                return (
                  <div
                    key={team.id}
                    className={`space-y-3 rounded-xl border bg-black p-4 ${
                      scoreStatus === "verified"
                        ? "border-[#166534]"
                        : scoreStatus === "submitted"
                          ? "border-[#365f3d]"
                          : "border-[#242424]"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-bold">{team.name}</h3>
                          <span
                            className={`rounded-full border px-2 py-1 text-[10px] font-bold uppercase tracking-[0.18em] ${scoreStatusClasses(
                              scoreStatus,
                            )}`}
                          >
                            {teamScoreStatusLabel(team)}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-[#a3a3a3]">
                          {team.player_names.join(", ") || "No players"}
                        </p>
                      </div>
                      <div className="shrink-0 rounded-xl border border-[#16a34a] bg-[#111111] px-4 py-2 text-center">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#a3a3a3]">
                          Total
                        </p>
                        <p className="text-lg font-bold text-[#16a34a]">
                          {formatScoreToCompletedPar(total, draftedScoresByHole)}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <span className="rounded-lg border border-[#242424] px-3 py-2 text-xs font-bold text-[#a3a3a3]">
                        Edit Scores
                      </span>
                      {scoreStatus === "pending" && (
                        <button
                          type="button"
                          onClick={() => handleSetTeamScoreStatus(team, "submitted")}
                          disabled={isSaving}
                          className="rounded-lg border border-[#365f3d] px-3 py-2 text-xs font-bold text-[#d8f5df] transition hover:bg-[#111b14] disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Mark Submitted
                        </button>
                      )}
                      {scoreStatus !== "verified" && (
                        <button
                          type="button"
                          onClick={() => handleSetTeamScoreStatus(team, "verified")}
                          disabled={isSaving}
                          className="rounded-lg border border-[#16a34a] px-3 py-2 text-xs font-bold text-[#16a34a] transition hover:bg-[#0f1f16] disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Verify Scores
                        </button>
                      )}
                      {scoreStatus === "verified" && (
                        <button
                          type="button"
                          onClick={() => handleSetTeamScoreStatus(team, "submitted")}
                          disabled={isSaving}
                          className="rounded-lg border border-[#242424] px-3 py-2 text-xs font-bold text-[#a3a3a3] transition hover:border-[#16a34a] disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Mark Unverified
                        </button>
                      )}
                    </div>

                    <div className="space-y-4">
                      <div className="rounded-xl border border-[#242424] bg-[#111111] p-3">
                        <div className="mb-3 flex items-center justify-between">
                          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#a3a3a3]">
                            Front 9
                          </p>
                          <p className="text-sm font-bold text-[#16a34a]">
                            OUT{" "}
                            {formatScoreToCompletedParForHoles(
                              outTotal,
                              draftedScoresByHole,
                              frontNine,
                            )}
                          </p>
                        </div>
                        <div className="grid grid-cols-5 gap-2 sm:grid-cols-10">
                          {frontNine.map((hole) => {
                            const metadata = scorecardByHole.get(hole);

                            return (
                              <label
                                key={`${team.id}-${hole}`}
                                className="block text-center"
                              >
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
                                  value={scoreDrafts[team.id]?.[hole] ?? ""}
                                  onChange={(event) =>
                                    setScoreDrafts((current) => ({
                                      ...current,
                                      [team.id]: {
                                        ...(current[team.id] || {}),
                                        [hole]: event.target.value,
                                      },
                                    }))
                                  }
                                  onBlur={(event) =>
                                    handleScoreChange(team, hole, event.target.value)
                                  }
                                  className="h-12 w-full rounded-lg border border-[#242424] bg-black px-1 text-center text-base font-semibold [appearance:textfield] outline-none focus:border-[#16a34a] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                                  aria-label={`${team.name} hole ${hole} score`}
                                />
                              </label>
                            );
                          })}
                          <div className="text-center">
                            <span className="mb-1 block text-[11px] font-semibold text-[#16a34a]">
                              OUT
                            </span>
                            <div className="flex h-12 items-center justify-center rounded-lg border border-[#166534]/70 bg-black text-base font-bold text-[#16a34a]">
                              {formatScoreToCompletedParForHoles(
                                outTotal,
                                draftedScoresByHole,
                                frontNine,
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="rounded-xl border border-[#242424] bg-[#111111] p-3">
                        <div className="mb-3 flex items-center justify-between">
                          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#a3a3a3]">
                            Back 9
                          </p>
                          <p className="text-sm font-bold text-[#16a34a]">
                            IN{" "}
                            {formatScoreToCompletedParForHoles(
                              inTotal,
                              draftedScoresByHole,
                              backNine,
                            )}
                          </p>
                        </div>
                        <div className="grid grid-cols-5 gap-2 sm:grid-cols-10">
                          {backNine.map((hole) => {
                            const metadata = scorecardByHole.get(hole);

                            return (
                              <label
                                key={`${team.id}-${hole}`}
                                className="block text-center"
                              >
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
                                  value={scoreDrafts[team.id]?.[hole] ?? ""}
                                  onChange={(event) =>
                                    setScoreDrafts((current) => ({
                                      ...current,
                                      [team.id]: {
                                        ...(current[team.id] || {}),
                                        [hole]: event.target.value,
                                      },
                                    }))
                                  }
                                  onBlur={(event) =>
                                    handleScoreChange(team, hole, event.target.value)
                                  }
                                  className="h-12 w-full rounded-lg border border-[#242424] bg-black px-1 text-center text-base font-semibold [appearance:textfield] outline-none focus:border-[#16a34a] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                                  aria-label={`${team.name} hole ${hole} score`}
                                />
                              </label>
                            );
                          })}
                          <div className="text-center">
                            <span className="mb-1 block text-[11px] font-semibold text-[#16a34a]">
                              IN
                            </span>
                            <div className="flex h-12 items-center justify-center rounded-lg border border-[#166534]/70 bg-black text-base font-bold text-[#16a34a]">
                              {formatScoreToCompletedParForHoles(
                                inTotal,
                                draftedScoresByHole,
                                backNine,
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </section>

            <section className="space-y-4">
              <div className="rounded-2xl border border-[#242424] bg-[#111111] p-5">
                <p className="font-mono text-[10px] font-black uppercase tracking-[0.24em] text-[#16a34a]">
                  Payout Preview
                </p>
                <h2 className="mt-2 text-xl font-bold">Calculate Preview</h2>
                <p className="mt-2 text-sm text-[#a3a3a3]">
                  Tie breaker by hole handicap coming soon.
                </p>
                {payoutNotice && (
                  <p className="mt-3 rounded-xl border border-[#242424] bg-black p-3 text-sm text-[#a3a3a3]">
                    {payoutNotice}
                  </p>
                )}
                <div className="mt-4 space-y-3">
                  {standings.slice(0, 3).map((standing) => (
                    <div key={standing.team.id} className="flex justify-between">
                      <span>
                        {standing.position}. {standing.team.name}
                        {standing.isTied ? " (Tied)" : ""}
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
              </div>

              <div className="rounded-2xl border border-[#242424] bg-[#111111] p-5">
                <h2 className="text-xl font-bold">Skins</h2>
                <p className="mt-2 text-sm text-[#a3a3a3]">
                  A skin only pays when exactly one team has the low score on a
                  completed hole. Tied lows produce no skin and there are no
                  carryovers.
                </p>
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
              </div>

              <div className="rounded-2xl border border-[#242424] bg-[#111111] p-5">
                <h2 className="text-xl font-bold">Money Rounds Bank</h2>
                <div className="mt-4 space-y-3 text-sm">
                  {bankRows.length === 0 && (
                    <p className="text-[#a3a3a3]">
                      Add teams and scores to preview player payouts.
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
              </div>

              <button
                type="button"
                onClick={handleMarkFinal}
                className="w-full rounded-2xl border border-[#16a34a] bg-[#16a34a] px-5 py-4 font-bold text-black hover:bg-[#15803d]"
              >
                {round.status === "final" ? "Round Final - Reconfirm" : "Mark Final"}
              </button>
            </section>
          </>
        )}
      </div>
    </main>
  );
}
