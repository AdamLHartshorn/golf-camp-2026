"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { logActivityFeedItem } from "@/lib/activityFeed";
import { logAuditEvent } from "@/lib/auditLog";
import { getPlayerSession, PlayerSession } from "@/lib/playerSession";
import { supabase } from "@/lib/supabase";
import { ActivePlayer, useActivePlayers } from "@/lib/useActivePlayers";
import {
  formatScoreToCompletedPar,
  formatScoreToCompletedParForHoles,
  getParForHoles,
  holes,
  moneyRoundScorecard,
} from "@/app/money-rounds/_lib/moneyRoundUtils";

type AfternoonRound = {
  id: string;
  name: string;
  round_date: string | null;
  status: string | null;
  owner_player_id: string | null;
  owner_name: string | null;
  buy_in_per_player: number | null;
  skins_buy_in_per_player: number | null;
  first_place_payout: number | null;
  second_place_payout: number | null;
  third_place_payout: number | null;
  payout_notes: string | null;
  created_at: string | null;
  finalized_at: string | null;
};

type AfternoonRoundPlayer = {
  id: string;
  afternoon_round_id: string;
  player_id: string;
  player_name: string;
};

type AfternoonRoundTeam = {
  id: string;
  afternoon_round_id: string;
  name: string;
  player_ids: string[];
  player_names: string[];
  created_at: string | null;
};

type AfternoonRoundScore = {
  id: string;
  afternoon_round_id: string;
  afternoon_round_team_id: string;
  hole_number: number | null;
  score: number;
};

type AfternoonSkinResult = {
  hole: number;
  team: AfternoonRoundTeam;
  score: number;
  value: number;
};

type AfternoonSettlementRow = {
  playerName: string;
  teamName: string;
  placementWinnings: number;
  skinsWinnings: number;
  buyIn: number;
  net: number;
};

type AfternoonPaymentRow = {
  payer: string;
  receiver: string;
  amount: number;
};

type ScoreDrafts = Record<string, Record<number, string>>;

type RoundForm = {
  name: string;
  round_date: string;
  buy_in_per_player: string;
  skins_buy_in_per_player: string;
  first_place_payout: string;
  second_place_payout: string;
  third_place_payout: string;
  payout_notes: string;
};

const frontNine = holes.slice(0, 9);
const backNine = holes.slice(9);
const scorecardByHole = new Map<number, (typeof moneyRoundScorecard)[number]>(
  moneyRoundScorecard.map((item) => [item.hole, item]),
);

function roundToForm(round: AfternoonRound): RoundForm {
  return {
    name: round.name || "",
    round_date: round.round_date || "",
    buy_in_per_player:
      typeof round.buy_in_per_player === "number" ? String(round.buy_in_per_player) : "",
    skins_buy_in_per_player:
      typeof round.skins_buy_in_per_player === "number"
        ? String(round.skins_buy_in_per_player)
        : "",
    first_place_payout:
      typeof round.first_place_payout === "number" ? String(round.first_place_payout) : "",
    second_place_payout:
      typeof round.second_place_payout === "number" ? String(round.second_place_payout) : "",
    third_place_payout:
      typeof round.third_place_payout === "number" ? String(round.third_place_payout) : "",
    payout_notes: round.payout_notes || "",
  };
}

function numberOrNull(value: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

function money(value: number | null | undefined) {
  return `$${Number(value || 0).toLocaleString()}`;
}

function getScoresByTeam(scores: AfternoonRoundScore[]) {
  return scores.reduce<Record<string, Record<number, number>>>((groups, score) => {
    const hole = Number(score.hole_number);

    if (!hole || !Number.isFinite(Number(score.score))) {
      return groups;
    }

    groups[score.afternoon_round_team_id] = {
      ...(groups[score.afternoon_round_team_id] || {}),
      [hole]: Number(score.score),
    };
    return groups;
  }, {});
}

function buildScoreDrafts(scores: AfternoonRoundScore[]) {
  return scores.reduce<ScoreDrafts>((drafts, score) => {
    const hole = Number(score.hole_number);

    if (!hole) {
      return drafts;
    }

    drafts[score.afternoon_round_team_id] = {
      ...(drafts[score.afternoon_round_team_id] || {}),
      [hole]: String(score.score),
    };
    return drafts;
  }, {});
}

function sumScores(scoresByHole: Record<number, number>, selectedHoles = holes) {
  return selectedHoles.reduce((total, hole) => total + (scoresByHole[hole] || 0), 0);
}

function completedHoles(scoresByHole: Record<number, number>) {
  return holes.filter((hole) => typeof scoresByHole[hole] === "number");
}

function getStandingMetrics(team: AfternoonRoundTeam, scoresByTeam: Record<string, Record<number, number>>) {
  const scoresByHole = scoresByTeam[team.id] || {};
  const scoredHoles = completedHoles(scoresByHole);
  const total = sumScores(scoresByHole);
  const completedPar = getParForHoles(scoredHoles);
  const relativeToPar = completedPar > 0 ? total - completedPar : null;

  return {
    team,
    scoresByHole,
    total,
    completedHoleCount: scoredHoles.length,
    completedPar,
    relativeToPar,
  };
}

function formatRelative(relative: number | null) {
  if (relative === null) {
    return "-";
  }

  if (relative === 0) {
    return "E";
  }

  return relative > 0 ? `+${relative}` : String(relative);
}

function sortStandings(
  teams: AfternoonRoundTeam[],
  scoresByTeam: Record<string, Record<number, number>>,
) {
  return teams
    .map((team) => getStandingMetrics(team, scoresByTeam))
    .sort((a, b) => {
      const aHasScores = a.completedHoleCount > 0;
      const bHasScores = b.completedHoleCount > 0;

      if (aHasScores !== bHasScores) {
        return aHasScores ? -1 : 1;
      }

      if (!aHasScores && !bHasScores) {
        return a.team.name.localeCompare(b.team.name);
      }

      if (a.completedHoleCount === 18 && b.completedHoleCount === 18) {
        return a.total - b.total || a.team.name.localeCompare(b.team.name);
      }

      return (
        Number(a.relativeToPar ?? Number.POSITIVE_INFINITY) -
          Number(b.relativeToPar ?? Number.POSITIVE_INFINITY) ||
        a.team.name.localeCompare(b.team.name)
      );
    });
}

function calculateAfternoonSkins(
  teams: AfternoonRoundTeam[],
  scoresByTeam: Record<string, Record<number, number>>,
  skinsPot: number,
) {
  const safeSkinsPot = Math.max(Number(skinsPot || 0), 0);
  const skinWinners: Omit<AfternoonSkinResult, "value">[] = [];

  holes.forEach((hole) => {
    const scoredTeams = teams
      .map((team) => ({
        team,
        score: scoresByTeam[team.id]?.[hole],
      }))
      .filter(
        (entry): entry is { team: AfternoonRoundTeam; score: number } =>
          typeof entry.score === "number",
      );

    if (scoredTeams.length === 0 || scoredTeams.length < teams.length) {
      return;
    }

    const lowestScore = Math.min(...scoredTeams.map((entry) => entry.score));
    const lowTeams = scoredTeams.filter((entry) => entry.score === lowestScore);

    if (lowTeams.length === 1) {
      skinWinners.push({
        hole,
        team: lowTeams[0].team,
        score: lowestScore,
      });
    }
  });

  const skinValue = skinWinners.length > 0 ? safeSkinsPot / skinWinners.length : 0;

  return skinWinners.map((skin) => ({
    ...skin,
    value: skinValue,
  }));
}

function calculateAfternoonSettlement(
  standings: ReturnType<typeof sortStandings>,
  skins: AfternoonSkinResult[],
  round: AfternoonRound | null,
) {
  if (!round) {
    return { settlementRows: [], paymentRows: [] };
  }

  const placementByPosition: Record<number, number> = {
    1: Number(round.first_place_payout || 0),
    2: Number(round.second_place_payout || 0),
    3: Number(round.third_place_payout || 0),
  };
  const skinsByTeam = skins.reduce<Record<string, number>>((groups, skin) => {
    groups[skin.team.id] = (groups[skin.team.id] || 0) + skin.value;
    return groups;
  }, {});
  const buyIn =
    Number(round.buy_in_per_player || 0) +
    Number(round.skins_buy_in_per_player || 0);
  const settlementRows = standings.flatMap<AfternoonSettlementRow>(
    (standing, index) => {
      const playerNames =
        standing.team.player_names?.length > 0 ? standing.team.player_names : [];

      if (playerNames.length === 0) {
        return [];
      }

      const playerCount = playerNames.length;
      const placementWinnings =
        (placementByPosition[standing.completedHoleCount > 0 ? index + 1 : 0] || 0) /
        playerCount;
      const skinsWinnings = (skinsByTeam[standing.team.id] || 0) / playerCount;

      return playerNames.map((playerName) => ({
        playerName,
        teamName: standing.team.name,
        placementWinnings,
        skinsWinnings,
        buyIn,
        net: placementWinnings + skinsWinnings - buyIn,
      }));
    },
  );
  const receivers = settlementRows
    .filter((row) => row.net > 0.005)
    .map((row) => ({ name: row.playerName, remaining: row.net }))
    .sort((a, b) => b.remaining - a.remaining);
  const payers = settlementRows
    .filter((row) => row.net < -0.005)
    .map((row) => ({ name: row.playerName, remaining: Math.abs(row.net) }))
    .sort((a, b) => b.remaining - a.remaining);
  const paymentRows: AfternoonPaymentRow[] = [];
  let payerIndex = 0;
  let receiverIndex = 0;

  while (payerIndex < payers.length && receiverIndex < receivers.length) {
    const payer = payers[payerIndex];
    const receiver = receivers[receiverIndex];
    const amount = Math.min(payer.remaining, receiver.remaining);

    if (amount > 0.005) {
      paymentRows.push({
        payer: payer.name,
        receiver: receiver.name,
        amount,
      });
    }

    payer.remaining -= amount;
    receiver.remaining -= amount;

    if (payer.remaining <= 0.005) {
      payerIndex += 1;
    }

    if (receiver.remaining <= 0.005) {
      receiverIndex += 1;
    }
  }

  return { settlementRows, paymentRows };
}

function PlayerSelector({
  players,
  selectedIds,
  onChange,
  disabledIds = [],
}: {
  players: ActivePlayer[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  disabledIds?: string[];
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const disabledSet = useMemo(() => new Set(disabledIds), [disabledIds]);
  const filteredPlayers = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return players.filter((player) => {
      if (disabledSet.has(player.id)) {
        return false;
      }

      if (!normalizedSearch) {
        return true;
      }

      return player.display_name.toLowerCase().includes(normalizedSearch);
    });
  }, [disabledSet, players, searchTerm]);

  function togglePlayer(playerId: string) {
    onChange(
      selectedSet.has(playerId)
        ? selectedIds.filter((id) => id !== playerId)
        : [...selectedIds, playerId],
    );
  }

  return (
    <div className="space-y-3">
      <input
        type="search"
        value={searchTerm}
        onChange={(event) => setSearchTerm(event.target.value)}
        placeholder="Search players"
        className="w-full rounded-xl border border-[#242424] bg-black px-4 py-3 text-sm outline-none placeholder:text-[#737373] focus:border-[#ffda03]"
      />
      <div className="flex max-h-44 flex-wrap gap-2 overflow-y-auto rounded-xl border border-[#242424] bg-black/35 p-2">
        {filteredPlayers.map((player) => {
          const isSelected = selectedSet.has(player.id);

          return (
            <button
              key={player.id}
              type="button"
              onClick={() => togglePlayer(player.id)}
              className={`rounded-full border px-3 py-1.5 text-xs font-bold transition ${
                isSelected
                  ? "border-[#ffda03] bg-[#ffda03] text-black"
                  : "border-[#242424] bg-[#111111] text-[#d4d4d4] hover:border-[#ffda03]"
              }`}
            >
              {player.display_name}
            </button>
          );
        })}
        {filteredPlayers.length === 0 && (
          <p className="px-2 py-2 text-sm text-[#737373]">No players found.</p>
        )}
      </div>
    </div>
  );
}

export default function AfternoonRoundDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { players: activePlayers, isLoading: isLoadingPlayers } = useActivePlayers();
  const [session] = useState<PlayerSession | null>(() => getPlayerSession());
  const [round, setRound] = useState<AfternoonRound | null>(null);
  const [participants, setParticipants] = useState<AfternoonRoundPlayer[]>([]);
  const [teams, setTeams] = useState<AfternoonRoundTeam[]>([]);
  const [scores, setScores] = useState<AfternoonRoundScore[]>([]);
  const [roundForm, setRoundForm] = useState<RoundForm | null>(null);
  const [teamName, setTeamName] = useState("");
  const [editingTeamId, setEditingTeamId] = useState<string | null>(null);
  const [selectedTeamPlayerIds, setSelectedTeamPlayerIds] = useState<string[]>([]);
  const [selectedParticipantIds, setSelectedParticipantIds] = useState<string[]>([]);
  const [scoreDrafts, setScoreDrafts] = useState<ScoreDrafts>({});
  const [payoutSettingsUnlocked, setPayoutSettingsUnlocked] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const canManage = Boolean(
    session && (session.is_admin || session.id === round?.owner_player_id),
  );
  const isFinal = String(round?.status || "").toLowerCase() === "final";
  const participantById = useMemo(
    () => new Map(participants.map((player) => [player.player_id, player])),
    [participants],
  );
  const participantIds = useMemo(
    () => participants.map((participant) => participant.player_id),
    [participants],
  );
  const scoresByTeam = useMemo(() => getScoresByTeam(scores), [scores]);
  const standings = useMemo(() => sortStandings(teams, scoresByTeam), [scoresByTeam, teams]);
  const totalSkinsPot =
    participants.length * Number(round?.skins_buy_in_per_player || 0);
  const skins = useMemo(
    () => calculateAfternoonSkins(teams, scoresByTeam, totalSkinsPot),
    [scoresByTeam, teams, totalSkinsPot],
  );
  const { paymentRows, settlementRows } = useMemo(
    () => calculateAfternoonSettlement(standings, skins, round),
    [round, skins, standings],
  );
  const totalBuyIn =
    participants.length * Number(round?.buy_in_per_player || 0) +
    totalSkinsPot;
  const assignedPlayerIds = useMemo(
    () => new Set(teams.flatMap((team) => team.player_ids || [])),
    [teams],
  );

  async function fetchRoundState() {
    setIsLoading(true);

    const [
      { data: roundData, error: roundError },
      { data: playerData, error: playerError },
      { data: teamData, error: teamError },
      { data: scoreData, error: scoreError },
    ] = await Promise.all([
      supabase.from("afternoon_rounds").select("*").eq("id", params.id).single(),
      supabase
        .from("afternoon_round_players")
        .select("*")
        .eq("afternoon_round_id", params.id)
        .order("player_name", { ascending: true }),
      supabase
        .from("afternoon_round_teams")
        .select("*")
        .eq("afternoon_round_id", params.id)
        .order("created_at", { ascending: true }),
      supabase
        .from("afternoon_round_scores")
        .select("*")
        .eq("afternoon_round_id", params.id)
        .order("hole_number", { ascending: true }),
    ]);

    if (roundError || playerError || teamError || scoreError) {
      setError(
        roundError?.message ||
          playerError?.message ||
          teamError?.message ||
          scoreError?.message ||
          "Could not load Afternoon Round.",
      );
      setIsLoading(false);
      return;
    }

    const nextRound = roundData as AfternoonRound;
    const nextScores = (scoreData as AfternoonRoundScore[]) || [];
    setRound(nextRound);
    setRoundForm(roundToForm(nextRound));
    setParticipants((playerData as AfternoonRoundPlayer[]) || []);
    setTeams((teamData as AfternoonRoundTeam[]) || []);
    setScores(nextScores);
    setScoreDrafts(buildScoreDrafts(nextScores));
    setPayoutSettingsUnlocked(false);
    setIsLoading(false);
  }

  useEffect(() => {
    window.setTimeout(() => {
      fetchRoundState();
    }, 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  function updateRoundForm(field: keyof RoundForm, value: string) {
    setRoundForm((current) => (current ? { ...current, [field]: value } : current));
    setMessage("");
    setError("");
  }

  function resetTeamForm() {
    setTeamName("");
    setEditingTeamId(null);
    setSelectedTeamPlayerIds([]);
  }

  function handleEditTeam(team: AfternoonRoundTeam) {
    setEditingTeamId(team.id);
    setTeamName(team.name);
    setSelectedTeamPlayerIds(team.player_ids || []);
    setMessage("");
    setError("");
  }

  function handleUnlockPayoutSettings() {
    if (
      !window.confirm(
        "Changing pay-in or payout settings may affect settlement totals. Continue?",
      )
    ) {
      return;
    }

    setPayoutSettingsUnlocked(true);
    setMessage("Pay-in and payout settings unlocked.");
    setError("");
  }

  async function handleSaveRoundSettings() {
    if (!round || !roundForm || !canManage) {
      return;
    }

    const payload = {
      name: roundForm.name.trim(),
      round_date: roundForm.round_date || null,
      buy_in_per_player: payoutSettingsUnlocked
        ? numberOrNull(roundForm.buy_in_per_player)
        : round.buy_in_per_player,
      skins_buy_in_per_player: payoutSettingsUnlocked
        ? numberOrNull(roundForm.skins_buy_in_per_player)
        : round.skins_buy_in_per_player,
      first_place_payout: payoutSettingsUnlocked
        ? numberOrNull(roundForm.first_place_payout)
        : round.first_place_payout,
      second_place_payout: payoutSettingsUnlocked
        ? numberOrNull(roundForm.second_place_payout)
        : round.second_place_payout,
      third_place_payout: payoutSettingsUnlocked
        ? numberOrNull(roundForm.third_place_payout)
        : round.third_place_payout,
      payout_notes: payoutSettingsUnlocked
        ? roundForm.payout_notes.trim() || null
        : round.payout_notes,
      updated_at: new Date().toISOString(),
    };

    setMessage("");
    setError("");

    if (!payload.name) {
      setError("Round name is required.");
      return;
    }

    setIsSaving(true);

    const { data, error: updateError } = await supabase
      .from("afternoon_rounds")
      .update(payload)
      .eq("id", round.id)
      .select("*")
      .single();

    setIsSaving(false);

    if (updateError) {
      setError(updateError.message || "Could not update round.");
      return;
    }

    setRound(data as AfternoonRound);
    setRoundForm(roundToForm(data as AfternoonRound));
    setPayoutSettingsUnlocked(false);
    setMessage("Round settings updated.");
    await logAuditEvent({
      actionType: "afternoon_round_updated",
      entityType: "afternoon_round",
      entityId: round.id,
      summary: `${round.name} settings updated.`,
      oldValue: round,
      newValue: data,
    });
  }

  async function handleAddParticipants() {
    if (!round || !canManage || selectedParticipantIds.length === 0) {
      return;
    }

    const selectedPlayers = activePlayers.filter((player) =>
      selectedParticipantIds.includes(player.id),
    );

    if (selectedPlayers.length === 0) {
      return;
    }

    setMessage("");
    setError("");
    setIsSaving(true);

    const rows = selectedPlayers.map((player) => ({
      afternoon_round_id: round.id,
      player_id: player.id,
      player_name: player.display_name,
    }));
    const { error: insertError } = await supabase
      .from("afternoon_round_players")
      .insert(rows);

    setIsSaving(false);

    if (insertError) {
      setError(insertError.message || "Could not add participants.");
      return;
    }

    setSelectedParticipantIds([]);
    setMessage("Participants added.");
    await logAuditEvent({
      actionType: "afternoon_round_participants_added",
      entityType: "afternoon_round",
      entityId: round.id,
      summary: `Participants added to ${round.name}.`,
      newValue: rows,
    });
    await fetchRoundState();
  }

  async function handleRemoveParticipant(participant: AfternoonRoundPlayer) {
    if (!round || !canManage) {
      return;
    }

    if (!window.confirm(`Remove ${participant.player_name} from ${round.name}?`)) {
      return;
    }

    setMessage("");
    setError("");
    setIsSaving(true);

    const updatedTeams = teams
      .filter((team) => team.player_ids.includes(participant.player_id))
      .map((team) => {
        const nextPlayerIds = team.player_ids.filter(
          (playerId) => playerId !== participant.player_id,
        );
        const nextPlayerNames = team.player_names.filter(
          (playerName) => playerName !== participant.player_name,
        );
        return supabase
          .from("afternoon_round_teams")
          .update({ player_ids: nextPlayerIds, player_names: nextPlayerNames })
          .eq("id", team.id);
      });

    await Promise.all(updatedTeams);

    const { error: deleteError } = await supabase
      .from("afternoon_round_players")
      .delete()
      .eq("id", participant.id);

    setIsSaving(false);

    if (deleteError) {
      setError(deleteError.message || "Could not remove participant.");
      return;
    }

    setMessage("Participant removed.");
    await logAuditEvent({
      actionType: "afternoon_round_participant_removed",
      entityType: "afternoon_round_player",
      entityId: participant.id,
      summary: `${participant.player_name} removed from ${round.name}.`,
      oldValue: participant,
    });
    await fetchRoundState();
  }

  async function handleSaveTeam() {
    if (!round || !canManage) {
      return;
    }

    const selectedPlayers = selectedTeamPlayerIds
      .map((playerId) => participantById.get(playerId))
      .filter((player): player is AfternoonRoundPlayer => Boolean(player));
    const finalTeamName =
      teamName.trim() ||
      selectedPlayers.map((player) => player.player_name.split(" ").at(-1)).join(" / ");

    setMessage("");
    setError("");

    if (selectedPlayers.length === 0 || !finalTeamName) {
      setError("Select players and name the team.");
      return;
    }

    setIsSaving(true);

    const payload = {
      afternoon_round_id: round.id,
      name: finalTeamName,
      player_ids: selectedPlayers.map((player) => player.player_id),
      player_names: selectedPlayers.map((player) => player.player_name),
    };

    if (editingTeamId) {
      const existingTeam = teams.find((team) => team.id === editingTeamId) || null;
      const { data, error: updateError } = await supabase
        .from("afternoon_round_teams")
        .update(payload)
        .eq("id", editingTeamId)
        .select("*")
        .single();

      setIsSaving(false);

      if (updateError) {
        setError(updateError.message || "Could not update team.");
        return;
      }

      resetTeamForm();
      setMessage("Team updated.");
      await logAuditEvent({
        actionType: "afternoon_round_team_updated",
        entityType: "afternoon_round_team",
        entityId: editingTeamId,
        summary: `${finalTeamName} updated in ${round.name}.`,
        oldValue: existingTeam,
        newValue: data,
      });
      await fetchRoundState();
      return;
    }

    const { data, error: insertError } = await supabase
      .from("afternoon_round_teams")
      .insert(payload)
      .select("*")
      .single();

    setIsSaving(false);

    if (insertError) {
      setError(insertError.message || "Could not create team.");
      return;
    }

    resetTeamForm();
    setMessage("Team added.");
    await logAuditEvent({
      actionType: "afternoon_round_team_created",
      entityType: "afternoon_round_team",
      entityId: (data as AfternoonRoundTeam).id,
      summary: `${finalTeamName} added to ${round.name}.`,
      newValue: data,
    });
    await fetchRoundState();
  }

  async function handleDeleteTeam(team: AfternoonRoundTeam) {
    if (!round || !canManage || !window.confirm(`Remove ${team.name} from ${round.name}?`)) {
      return;
    }

    setMessage("");
    setError("");
    setIsSaving(true);

    const { error: scoreDeleteError } = await supabase
      .from("afternoon_round_scores")
      .delete()
      .eq("afternoon_round_team_id", team.id);

    if (scoreDeleteError) {
      setError(scoreDeleteError.message || "Could not remove team scores.");
      setIsSaving(false);
      return;
    }

    const { error: deleteError } = await supabase
      .from("afternoon_round_teams")
      .delete()
      .eq("id", team.id);

    setIsSaving(false);

    if (deleteError) {
      setError(deleteError.message || "Could not remove team.");
      return;
    }

    setMessage("Team removed.");
    await logAuditEvent({
      actionType: "afternoon_round_team_deleted",
      entityType: "afternoon_round_team",
      entityId: team.id,
      summary: `${team.name} removed from ${round.name}.`,
      oldValue: team,
    });
    await fetchRoundState();
  }

  async function handleSaveTeamScores(team: AfternoonRoundTeam) {
    if (!round || !canManage) {
      return;
    }

    const drafts = scoreDrafts[team.id] || {};
    setMessage("");
    setError("");
    setIsSaving(true);

    for (const hole of holes) {
      const value = drafts[hole]?.trim() || "";
      const existingScore = scores.find(
        (score) =>
          score.afternoon_round_team_id === team.id && score.hole_number === hole,
      );

      if (!value && !existingScore) {
        continue;
      }

      if (!value && existingScore) {
        const { error: deleteError } = await supabase
          .from("afternoon_round_scores")
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
        afternoon_round_id: round.id,
        afternoon_round_team_id: team.id,
        hole_number: hole,
        score: parsedScore,
        updated_at: new Date().toISOString(),
      };
      const response = existingScore
        ? await supabase
            .from("afternoon_round_scores")
            .update(payload)
            .eq("id", existingScore.id)
        : await supabase.from("afternoon_round_scores").insert(payload);

      if (response.error) {
        setError(response.error.message || "Could not save score.");
        setIsSaving(false);
        return;
      }
    }

    setIsSaving(false);
    await logActivityFeedItem({
      type: "afternoon_round_score_submitted",
      source: "Afternoon Rounds",
      sourceId: round.id,
      createdByPlayerId: session?.id || null,
      message: `${team.name} posts a score in ${round.name}.`,
    });
    await logAuditEvent({
      actionType: "afternoon_round_score_edited",
      entityType: "afternoon_round_team",
      entityId: team.id,
      summary: `${team.name} scores edited in ${round.name}.`,
      metadata: { afternoon_round_id: round.id, scores: drafts },
    });
    setMessage(`${team.name} scores saved.`);
    await fetchRoundState();
  }

  async function handleFinalizeRound(nextStatus: "final" | "active") {
    if (!round || !canManage) {
      return;
    }

    const isFinalizing = nextStatus === "final";
    const confirmText = isFinalizing
      ? `Finalize ${round.name}?`
      : `Reopen ${round.name}?`;

    if (!window.confirm(confirmText)) {
      return;
    }

    setMessage("");
    setError("");
    setIsSaving(true);

    const payload = {
      status: nextStatus,
      finalized_at: isFinalizing ? new Date().toISOString() : null,
    };
    const { data, error: updateError } = await supabase
      .from("afternoon_rounds")
      .update(payload)
      .eq("id", round.id)
      .select("*")
      .single();

    setIsSaving(false);

    if (updateError) {
      setError(updateError.message || "Could not update round status.");
      return;
    }

    setRound(data as AfternoonRound);
    setRoundForm(roundToForm(data as AfternoonRound));

    if (isFinalizing) {
      await logActivityFeedItem({
        type: "afternoon_round_finalized",
        source: "Afternoon Rounds",
        sourceId: round.id,
        createdByPlayerId: session?.id || null,
        linkUrl: `/afternoon-rounds/${round.id}`,
        message: `${round.name} finalized.`,
      });
    }

    await logAuditEvent({
      actionType: isFinalizing ? "afternoon_round_finalized" : "afternoon_round_reopened",
      entityType: "afternoon_round",
      entityId: round.id,
      summary: isFinalizing ? `${round.name} finalized.` : `${round.name} reopened.`,
      oldValue: round,
      newValue: data,
    });
    setMessage(isFinalizing ? "Afternoon Round finalized." : "Afternoon Round reopened.");
    await fetchRoundState();
  }

  async function handleDeleteRound() {
    if (!round || !canManage || !window.confirm(`Delete ${round.name}?`)) {
      return;
    }

    setMessage("");
    setError("");
    setIsSaving(true);

    const { error: feedDeleteError } = await supabase
      .from("activity_feed")
      .delete()
      .eq("source", "Afternoon Rounds")
      .eq("source_id", round.id);

    if (feedDeleteError) {
      console.warn("Could not delete Afternoon Round feed rows:", feedDeleteError.message);
    }

    const { error: scoreDeleteError } = await supabase
      .from("afternoon_round_scores")
      .delete()
      .eq("afternoon_round_id", round.id);

    if (scoreDeleteError) {
      setError(scoreDeleteError.message || "Could not delete Afternoon Round scores.");
      setIsSaving(false);
      return;
    }

    const { error: teamDeleteError } = await supabase
      .from("afternoon_round_teams")
      .delete()
      .eq("afternoon_round_id", round.id);

    if (teamDeleteError) {
      setError(teamDeleteError.message || "Could not delete Afternoon Round teams.");
      setIsSaving(false);
      return;
    }

    const { error: playerDeleteError } = await supabase
      .from("afternoon_round_players")
      .delete()
      .eq("afternoon_round_id", round.id);

    if (playerDeleteError) {
      setError(playerDeleteError.message || "Could not delete Afternoon Round players.");
      setIsSaving(false);
      return;
    }

    const { data, error: deleteError } = await supabase
      .from("afternoon_rounds")
      .delete()
      .eq("id", round.id)
      .select("*");

    setIsSaving(false);

    if (deleteError) {
      setError(deleteError.message || "Could not delete Afternoon Round.");
      return;
    }

    await logAuditEvent({
      actionType: "afternoon_round_deleted",
      entityType: "afternoon_round",
      entityId: round.id,
      summary: `${round.name} deleted.`,
      oldValue: data?.[0] || round,
    });
    router.push("/afternoon-rounds");
  }

  function renderScorecard(team: AfternoonRoundTeam) {
    const drafts = scoreDrafts[team.id] || {};
    const draftedScoresByHole = Object.fromEntries(
      Object.entries(drafts)
        .filter(([, value]) => value.trim() !== "")
        .map(([hole, value]) => [Number(hole), Number(value)])
        .filter(([, value]) => Number.isFinite(value)),
    ) as Record<number, number>;
    const total = sumScores(draftedScoresByHole);

    function renderNine(label: string, selectedHoles: number[]) {
      const subtotal = sumScores(draftedScoresByHole, selectedHoles);
      const scoreToPar = formatScoreToCompletedParForHoles(
        subtotal,
        draftedScoresByHole,
        selectedHoles,
      );

      return (
        <div className="rounded-xl border border-[#242424] bg-[#111111] p-3">
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#a3a3a3]">
              {label}
            </p>
            <p className="text-sm font-bold text-[#ffda03]">
              {label === "Front 9" ? "OUT" : "IN"} {scoreToPar}
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
                  <input
                    type="number"
                    inputMode="numeric"
                    value={drafts[hole] ?? ""}
                    disabled={!canManage}
                    onChange={(event) =>
                      setScoreDrafts((current) => ({
                        ...current,
                        [team.id]: {
                          ...(current[team.id] || {}),
                          [hole]: event.target.value,
                        },
                      }))
                    }
                    className="mt-1 h-11 w-full rounded-lg border border-[#242424] bg-black px-1 text-center text-base font-semibold [appearance:textfield] outline-none focus:border-[#ffda03] disabled:cursor-not-allowed disabled:opacity-50 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                    aria-label={`${team.name} hole ${hole} score`}
                  />
                </label>
              );
            })}
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3 rounded-xl border border-[#3a2a12] bg-black/35 px-4 py-3">
          <p className="text-sm font-bold text-[#f5f5f5]">Total</p>
          <p className="font-mono text-sm font-black text-[#ffda03]">
            {formatScoreToCompletedPar(total, draftedScoresByHole)}
          </p>
        </div>
        {renderNine("Front 9", frontNine)}
        {renderNine("Back 9", backNine)}
        {canManage && (
          <button
            type="button"
            onClick={() => handleSaveTeamScores(team)}
            disabled={isSaving}
            className="w-full rounded-xl border border-[#ffda03] px-4 py-3 text-sm font-bold text-[#ffda03] transition hover:bg-[#1f1a05] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Save Scores
          </button>
        )}
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(255,218,3,0.13),transparent_34%),#050505] p-5 text-[#f5f5f5]">
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center space-y-5 py-6">
        <div className="flex items-center justify-between gap-4">
          <Link href="/afternoon-rounds" className="gc-back-link gc-back-afternoon">
            ← BACK
          </Link>
          <p className="font-mono text-sm uppercase tracking-[0.22em] text-[#f5f5f5]">
            Afternoon Round
          </p>
          <span className="rounded-full border border-[#9a8500] bg-[#1f1a05] px-3 py-1 text-xs font-black text-[#ffda03]">
            {round?.status || "open"}
          </span>
        </div>

        {isLoading && (
          <div className="rounded-2xl border border-[#242424] bg-[#111111] p-5 text-sm text-[#a3a3a3]">
            Loading round...
          </div>
        )}

        {!isLoading && error && (
          <div className="rounded-2xl border border-[#242424] bg-[#111111] p-5 text-sm text-[#f5c56f]">
            {error}
          </div>
        )}

        {!isLoading && round && (
          <>
            <section className="overflow-hidden rounded-2xl border border-[#9a8500]/70 bg-[#0d0d0b]/95 shadow-[0_28px_80px_rgba(0,0,0,0.45)]">
              <div className="border-b border-[#2a2925] bg-[#1f1a05] px-5 py-5">
                <p className="font-mono text-[10px] font-black uppercase tracking-[0.24em] text-[#ffda03]">
                  {round.owner_name || "Player-created round"}
                </p>
                <h1 className="mt-2 text-3xl font-black tracking-tight">
                  {round.name}
                </h1>
                <p className="mt-2 text-sm text-[#b8b0a1]">
                  {round.round_date || "Date TBD"} · {participants.length} participants
                </p>
              </div>

              <div className="grid grid-cols-2 divide-x divide-y divide-[#2a2925] text-sm">
                <div className="px-5 py-4">
                  <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#a3a3a3]">
                    Buy-In Pot
                  </p>
                  <p className="mt-1 text-lg font-black text-[#ffda03]">
                    {money(totalBuyIn)}
                  </p>
                </div>
                <div className="px-5 py-4">
                  <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#a3a3a3]">
                    Teams
                  </p>
                  <p className="mt-1 text-lg font-black">{teams.length}</p>
                </div>
              </div>
            </section>

            <section className="grid grid-cols-2 gap-3">
              {[
                {
                  label: "Participants",
                  value: `${participants.length}`,
                  done: participants.length >= 2,
                },
                {
                  label: "Teams",
                  value: `${teams.length}`,
                  done: teams.length > 0,
                },
                {
                  label: "Scores",
                  value: `${scores.length}`,
                  done: scores.length > 0,
                },
                {
                  label: "Status",
                  value: isFinal ? "Final" : "Open",
                  done: isFinal,
                },
              ].map((step) => (
                <div
                  key={step.label}
                  className={`rounded-2xl border px-4 py-3 ${
                    step.done
                      ? "border-[#9a8500] bg-[#1f1a05]/70"
                      : "border-[#242424] bg-[#111111]"
                  }`}
                >
                  <p className="font-mono text-[9px] font-black uppercase tracking-[0.18em] text-[#a3a3a3]">
                    {step.label}
                  </p>
                  <p className="mt-1 text-lg font-black text-[#f5f5f5]">
                    {step.value}
                  </p>
                </div>
              ))}
            </section>

            {canManage && roundForm && (
              <section className="space-y-4 rounded-2xl border border-[#242424] bg-[#111111] p-5">
                <div>
                  <p className="font-mono text-[10px] font-black uppercase tracking-[0.24em] text-[#ffda03]">
                    Round Setup
                  </p>
                  <h2 className="mt-2 text-xl font-bold">Edit Round</h2>
                </div>
                <input
                  value={roundForm.name}
                  onChange={(event) => updateRoundForm("name", event.target.value)}
                  placeholder="Round name"
                  className="w-full rounded-xl border border-[#242424] bg-black px-4 py-3 outline-none focus:border-[#ffda03]"
                />
                <input
                  type="date"
                  value={roundForm.round_date}
                  onChange={(event) => updateRoundForm("round_date", event.target.value)}
                  className="w-full rounded-xl border border-[#242424] bg-black px-4 py-3 outline-none focus:border-[#ffda03]"
                />

                <div className="rounded-2xl border border-[#9a8500]/45 bg-[#1f1a05]/45 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-mono text-[9px] font-black uppercase tracking-[0.2em] text-[#ffda03]">
                        Pay-In / Payout Terms
                      </p>
                      <p className="mt-2 text-sm leading-5 text-[#c8bfae]">
                        Locked after creation to prevent accidental settlement changes.
                      </p>
                    </div>

                    <span
                      className={`shrink-0 rounded-full border px-3 py-1 font-mono text-[9px] font-black uppercase tracking-[0.16em] ${
                        payoutSettingsUnlocked
                          ? "border-[#ffda03] text-[#ffda03]"
                          : "border-[#3d3620] text-[#a8a29a]"
                      }`}
                    >
                      {payoutSettingsUnlocked ? "Unlocked" : "Locked"}
                    </span>
                  </div>

                  {!payoutSettingsUnlocked && (
                    <button
                      type="button"
                      onClick={handleUnlockPayoutSettings}
                      className="mt-4 w-full rounded-xl border border-[#9a8500]/70 px-4 py-3 text-sm font-black text-[#ffda03] transition hover:bg-[#2a2307]"
                    >
                      Unlock Pay-In / Payout Settings
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {[
                    ["buy_in_per_player", "Buy-In Per Player"],
                    ["skins_buy_in_per_player", "Skins Buy-In"],
                    ["first_place_payout", "1st Place Payout"],
                    ["second_place_payout", "2nd Place Payout"],
                    ["third_place_payout", "3rd Place Payout"],
                  ].map(([field, label]) => (
                    <label key={field} className="space-y-2">
                      <span className="block text-[11px] font-bold uppercase tracking-[0.16em] text-[#a3a3a3]">
                        {label}
                      </span>
                      <input
                        type="number"
                        inputMode="decimal"
                        value={roundForm[field as keyof RoundForm]}
                        disabled={!payoutSettingsUnlocked}
                        onChange={(event) =>
                          updateRoundForm(field as keyof RoundForm, event.target.value)
                        }
                        placeholder="$0 optional"
                        className="w-full rounded-xl border border-[#242424] bg-black px-4 py-3 outline-none focus:border-[#ffda03] disabled:cursor-not-allowed disabled:border-[#242424] disabled:bg-[#080808] disabled:text-[#a8a29a] disabled:opacity-80"
                      />
                    </label>
                  ))}
                </div>
                <textarea
                  value={roundForm.payout_notes}
                  disabled={!payoutSettingsUnlocked}
                  onChange={(event) => updateRoundForm("payout_notes", event.target.value)}
                  placeholder="Optional payout notes"
                  rows={3}
                  className="w-full resize-none rounded-xl border border-[#242424] bg-black px-4 py-3 outline-none focus:border-[#ffda03] disabled:cursor-not-allowed disabled:border-[#242424] disabled:bg-[#080808] disabled:text-[#a8a29a] disabled:opacity-80"
                />
                <button
                  type="button"
                  onClick={handleSaveRoundSettings}
                  disabled={isSaving}
                  className="w-full rounded-xl border border-[#ffda03] px-4 py-3 font-bold text-[#ffda03] transition hover:bg-[#1f1a05] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Save Round Settings
                </button>
              </section>
            )}

            {canManage && (
              <section className="space-y-4 rounded-2xl border border-[#242424] bg-[#111111] p-5">
                <div>
                  <p className="font-mono text-[10px] font-black uppercase tracking-[0.24em] text-[#ffda03]">
                    Participants
                  </p>
                  <h2 className="mt-2 text-xl font-bold">Add / Remove Players</h2>
                </div>
                <PlayerSelector
                  players={activePlayers}
                  selectedIds={selectedParticipantIds}
                  onChange={setSelectedParticipantIds}
                  disabledIds={participantIds}
                />
                {isLoadingPlayers && <p className="text-sm text-[#a3a3a3]">Loading players...</p>}
                <button
                  type="button"
                  onClick={handleAddParticipants}
                  disabled={isSaving || selectedParticipantIds.length === 0}
                  className="w-full rounded-xl border border-[#ffda03] px-4 py-3 font-bold text-[#ffda03] transition hover:bg-[#1f1a05] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Add Participants
                </button>
              </section>
            )}

            {!canManage && (
              <p className="rounded-2xl border border-[#242424] bg-[#111111] p-4 text-sm text-[#a3a3a3]">
                Only the round owner can manage this round. Admins can manage all rounds.
              </p>
            )}

            <section className="overflow-hidden rounded-2xl border border-[#2b2b27] bg-[#0d0d0b]">
              <div className="border-b border-[#2a2925] bg-[#11110f] px-5 py-4">
                <p className="font-mono text-[10px] font-black uppercase tracking-[0.24em] text-[#ffda03]">
                  Leaderboard
                </p>
              </div>
              {standings.length === 0 ? (
                <p className="p-5 text-sm text-[#a3a3a3]">Build teams to start a leaderboard.</p>
              ) : (
                standings.map((standing, index) => (
                  <div
                    key={standing.team.id}
                    className="grid grid-cols-[2.5rem_1fr_auto] items-center gap-3 border-b border-[#2a2925] px-5 py-4 last:border-b-0"
                  >
                    <span className="font-mono text-sm font-black text-[#ffda03]">
                      {index + 1}
                    </span>
                    <div className="min-w-0">
                      <h3 className="font-bold">{standing.team.name}</h3>
                      <p className="mt-1 truncate text-xs text-[#a3a3a3]">
                        {standing.completedHoleCount} holes · {standing.team.player_names.join(", ")}
                      </p>
                    </div>
                    <span className="font-mono text-sm font-black text-[#f5f5f5]">
                      {standing.completedHoleCount > 0
                        ? `${standing.total} (${formatRelative(standing.relativeToPar)})`
                        : "-"}
                    </span>
                  </div>
                ))
              )}
            </section>

            <section className="overflow-hidden rounded-2xl border border-[#2b2b27] bg-[#0d0d0b]">
              <div className="border-b border-[#2a2925] bg-[#11110f] px-5 py-4">
                <p className="font-mono text-[10px] font-black uppercase tracking-[0.24em] text-[#ffda03]">
                  Skins
                </p>
                <h2 className="mt-2 text-xl font-black">Skins Board</h2>
                <p className="mt-2 text-sm leading-6 text-[#a3a3a3]">
                  Holes count only after every team has posted a score. Tied
                  low scores produce no skin.
                </p>
              </div>

              <div className="grid grid-cols-2 border-b border-[#2a2925] text-sm">
                <div className="border-r border-[#2a2925] px-5 py-4">
                  <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#a3a3a3]">
                    Skins Pot
                  </p>
                  <p className="mt-1 text-lg font-black text-[#ffda03]">
                    {money(totalSkinsPot)}
                  </p>
                </div>
                <div className="px-5 py-4">
                  <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#a3a3a3]">
                    Skin Value
                  </p>
                  <p className="mt-1 text-lg font-black text-[#f5f5f5]">
                    {skins.length > 0 ? money(skins[0].value) : "$0"}
                  </p>
                </div>
              </div>

              {teams.length === 0 ? (
                <p className="p-5 text-sm text-[#a3a3a3]">
                  Build teams to start tracking skins.
                </p>
              ) : skins.length === 0 ? (
                <div className="p-5">
                  <p className="font-semibold text-[#f5f5f5]">
                    No skins awarded yet.
                  </p>
                  <p className="mt-1 text-sm leading-6 text-[#a3a3a3]">
                    Skins will appear as soon as a completed hole has one unique
                    low team score.
                  </p>
                </div>
              ) : (
                skins.map((skin) => {
                  const metadata = scorecardByHole.get(skin.hole);

                  return (
                    <div
                      key={skin.hole}
                      className="grid grid-cols-[4.5rem_1fr_auto] items-center gap-3 border-b border-[#2a2925] px-5 py-4 last:border-b-0"
                    >
                      <div>
                        <p className="font-mono text-sm font-black text-[#ffda03]">
                          Hole {skin.hole}
                        </p>
                        <p className="mt-1 text-[10px] uppercase tracking-[0.16em] text-[#737373]">
                          Par {metadata?.par || "-"}
                        </p>
                      </div>
                      <div className="min-w-0">
                        <h3 className="truncate font-bold">{skin.team.name}</h3>
                        <p className="mt-1 truncate text-xs text-[#a3a3a3]">
                          {skin.team.player_names.join(", ") || "No players"}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-mono text-sm font-black text-[#f5f5f5]">
                          {skin.score}
                        </p>
                        <p className="mt-1 text-xs font-bold text-[#ffda03]">
                          {money(skin.value)}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </section>

            {canManage && (
              <section className="space-y-4 rounded-2xl border border-[#242424] bg-[#111111] p-5">
                <div>
                  <p className="font-mono text-[10px] font-black uppercase tracking-[0.24em] text-[#ffda03]">
                    Team Builder
                  </p>
                  <h2 className="mt-2 text-xl font-bold">
                    {editingTeamId ? "Edit Team" : "Manual Teams"}
                  </h2>
                </div>
                <input
                  value={teamName}
                  onChange={(event) => setTeamName(event.target.value)}
                  placeholder="Team name"
                  className="w-full rounded-xl border border-[#242424] bg-black px-4 py-3 outline-none focus:border-[#ffda03]"
                />
                <PlayerSelector
                  players={participants.map((participant) => ({
                    id: participant.player_id,
                    first_name: participant.player_name.split(" ")[0] || "",
                    last_name: participant.player_name.split(" ").slice(1).join(" "),
                    display_name: participant.player_name,
                  }))}
                  selectedIds={selectedTeamPlayerIds}
                  onChange={setSelectedTeamPlayerIds}
                />
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={resetTeamForm}
                    className="rounded-xl border border-[#242424] px-4 py-3 text-sm font-bold text-[#a3a3a3] transition hover:border-[#f5f5f5]"
                  >
                    Clear
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveTeam}
                    disabled={isSaving || selectedTeamPlayerIds.length === 0}
                    className="rounded-xl border border-[#ffda03] px-4 py-3 text-sm font-bold text-[#ffda03] transition hover:bg-[#1f1a05] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {editingTeamId ? "Update Team" : "Add Team"}
                  </button>
                </div>
              </section>
            )}

            <section className="overflow-hidden rounded-2xl border border-[#2b2b27] bg-[#0d0d0b]">
              <div className="border-b border-[#2a2925] bg-[#11110f] px-5 py-4">
                <p className="font-mono text-[10px] font-black uppercase tracking-[0.24em] text-[#ffda03]">
                  Teams / Scores
                </p>
                <h2 className="mt-2 text-xl font-black">Round Groups</h2>
              </div>

              {teams.length === 0 ? (
                <p className="p-5 text-sm text-[#a3a3a3]">No teams created yet.</p>
              ) : (
                teams.map((team) => (
                  <div key={team.id} className="space-y-4 border-b border-[#2a2925] p-5 last:border-b-0">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <h3 className="font-bold">{team.name}</h3>
                        <p className="mt-1 text-sm text-[#a3a3a3]">
                          {team.player_names.join(", ") || "No players"}
                        </p>
                      </div>
                      {canManage && (
                        <div className="flex shrink-0 gap-2">
                          <button
                            type="button"
                            onClick={() => handleEditTeam(team)}
                            className="text-xs font-bold text-[#ffda03]"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteTeam(team)}
                            disabled={isSaving}
                            className="text-xs font-bold text-[#f5c56f] disabled:opacity-50"
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                    {renderScorecard(team)}
                  </div>
                ))
              )}
            </section>

            <section className="overflow-hidden rounded-2xl border border-[#2b2b27] bg-[#0d0d0b]">
              <div className="border-b border-[#2a2925] bg-[#11110f] px-5 py-4">
                <p className="font-mono text-[10px] font-black uppercase tracking-[0.24em] text-[#ffda03]">
                  Participants
                </p>
              </div>
              <div className="space-y-2 p-5">
                {participants.map((player) => (
                  <div
                    key={player.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-[#3a2a12] bg-black/45 px-3 py-2"
                  >
                    <span className="text-xs font-bold text-[#f5f5f5]">
                      {player.player_name}
                      {assignedPlayerIds.has(player.player_id) ? "" : " · Unassigned"}
                    </span>
                    {canManage && (
                      <button
                        type="button"
                        onClick={() => handleRemoveParticipant(player)}
                        disabled={isSaving}
                        className="text-xs font-bold text-[#ffda03] disabled:opacity-50"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </section>

            {(round.first_place_payout ||
              round.second_place_payout ||
              round.third_place_payout ||
              round.payout_notes) && (
              <section className="rounded-2xl border border-[#242424] bg-[#111111] p-5">
                <p className="font-mono text-[10px] font-black uppercase tracking-[0.24em] text-[#ffda03]">
                  Payouts
                </p>
                <div className="mt-4 grid grid-cols-3 gap-2 text-center text-sm">
                  <div className="rounded-xl border border-[#3a2a12] bg-black/35 p-3">
                    <p className="text-xs text-[#a3a3a3]">1st</p>
                    <p className="mt-1 font-black">{money(round.first_place_payout)}</p>
                  </div>
                  <div className="rounded-xl border border-[#3a2a12] bg-black/35 p-3">
                    <p className="text-xs text-[#a3a3a3]">2nd</p>
                    <p className="mt-1 font-black">{money(round.second_place_payout)}</p>
                  </div>
                  <div className="rounded-xl border border-[#3a2a12] bg-black/35 p-3">
                    <p className="text-xs text-[#a3a3a3]">3rd</p>
                    <p className="mt-1 font-black">{money(round.third_place_payout)}</p>
                  </div>
                </div>
                {round.payout_notes && (
                  <p className="mt-4 text-sm leading-6 text-[#a3a3a3]">
                    {round.payout_notes}
                  </p>
                )}
              </section>
            )}

            {isFinal && (
              <section className="overflow-hidden rounded-2xl border border-[#3a2a12] bg-[#111111]">
                <div className="border-b border-[#2a2925] bg-[#11110f] px-5 py-4">
                  <p className="font-mono text-[10px] font-black uppercase tracking-[0.24em] text-[#ffda03]">
                    Settlement
                  </p>
                  <h2 className="mt-2 text-xl font-black">Settle Up</h2>
                  <p className="mt-2 text-sm leading-6 text-[#a3a3a3]">
                    Based on buy-ins, placement payouts, and skins. Players
                    settle directly.
                  </p>
                </div>

                <div className="border-b border-[#2a2925]">
                  {settlementRows.length === 0 ? (
                    <p className="p-5 text-sm text-[#a3a3a3]">
                      Add teams, players, and payout settings to calculate
                      settlement.
                    </p>
                  ) : (
                    settlementRows
                      .slice()
                      .sort((a, b) => b.net - a.net || a.playerName.localeCompare(b.playerName))
                      .map((row) => (
                        <div
                          key={`${row.teamName}-${row.playerName}`}
                          className="grid grid-cols-[1fr_auto] gap-3 border-b border-[#2a2925] px-5 py-4 last:border-b-0"
                        >
                          <div className="min-w-0">
                            <h3 className="truncate font-bold">{row.playerName}</h3>
                            <p className="mt-1 truncate text-xs text-[#a3a3a3]">
                              {row.teamName}
                            </p>
                            <p className="mt-2 text-xs leading-5 text-[#a3a3a3]">
                              Place {money(row.placementWinnings)} · Skins{" "}
                              {money(row.skinsWinnings)} · Buy-In{" "}
                              {money(row.buyIn)}
                            </p>
                          </div>
                          <span
                            className={`self-center font-mono text-lg font-black ${
                              row.net >= 0 ? "text-[#ffda03]" : "text-[#f5c56f]"
                            }`}
                          >
                            {row.net >= 0 ? "+" : "-"}
                            {money(Math.abs(row.net))}
                          </span>
                        </div>
                      ))
                  )}
                </div>

                <div className="p-5">
                  <p className="font-mono text-[10px] font-black uppercase tracking-[0.24em] text-[#ffda03]">
                    Who Pays Who
                  </p>

                  {paymentRows.length === 0 ? (
                    <p className="mt-3 text-sm leading-6 text-[#a3a3a3]">
                      No settlement payments needed yet.
                    </p>
                  ) : (
                    <div className="mt-4 space-y-3">
                      {paymentRows.map((payment, index) => (
                        <div
                          key={`${payment.payer}-${payment.receiver}-${index}`}
                          className="rounded-xl border border-[#3a2a12] bg-black/35 p-4"
                        >
                          <p className="text-sm font-bold text-[#f5f5f5]">
                            {payment.payer} pays {payment.receiver}
                          </p>
                          <p className="mt-1 font-mono text-xl font-black text-[#ffda03]">
                            {money(payment.amount)}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </section>
            )}

            {message && <p className="text-center text-sm">{message}</p>}
            {error && <p className="text-center text-sm text-[#f5c56f]">{error}</p>}

            {canManage && (
              <div className="grid grid-cols-1 gap-3">
                <button
                  type="button"
                  onClick={() => handleFinalizeRound(isFinal ? "active" : "final")}
                  disabled={isSaving}
                  className="rounded-2xl border border-[#ffda03] bg-[#ffda03] px-5 py-4 font-bold text-black transition hover:bg-[#d8b900] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isFinal ? "Reopen Afternoon Round" : "Finalize Afternoon Round"}
                </button>
                <button
                  type="button"
                  onClick={handleDeleteRound}
                  disabled={isSaving}
                  className="rounded-2xl border border-[#5a2b33] px-5 py-4 font-bold text-[#fca5a5] transition hover:bg-[#1a0d10] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Delete Afternoon Round
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}
