import { getDisplayRankSortValue } from "@/lib/playerRanks";

export type DraftStatus = "pending" | "active" | "complete";

export type DraftSession = {
  id: string;
  name: string;
  status: DraftStatus | string;
  captain_rank: "A" | "B" | "C" | "D" | null;
  draft_type: string | null;
  draft_order: string[] | null;
  current_pick_number: number | null;
  current_pick_started_at?: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string | null;
};

export type DraftPlayer = {
  id: string;
  first_name: string;
  last_name: string;
  display_name: string;
  rank: "A" | "B" | "C" | "D" | null;
  display_rank: string | null;
  internal_rank_order: string | null;
};

export type DraftTeam = {
  id: string;
  draft_session_id: string;
  name: string;
  captain_player_id: string | null;
  draft_position: number | null;
};

export type DraftPick = {
  id: string;
  draft_session_id: string;
  draft_team_id: string;
  player_id: string;
  pick_number: number;
  round_number: number | null;
  created_at: string | null;
};

export function comparePlayersForDraft(a: DraftPlayer, b: DraftPlayer) {
  const rankCompare = (a.rank || "Z").localeCompare(b.rank || "Z");

  if (rankCompare !== 0) {
    return rankCompare;
  }

  const aOrder = parseInternalRankOrder(a.internal_rank_order);
  const bOrder = parseInternalRankOrder(b.internal_rank_order);

  if (aOrder !== bOrder) {
    return aOrder - bOrder;
  }

  const displayRankCompare =
    getDisplayRankSortValue(a.display_rank) - getDisplayRankSortValue(b.display_rank);

  if (displayRankCompare !== 0) {
    return displayRankCompare;
  }

  const lastNameCompare = a.last_name.localeCompare(b.last_name);

  if (lastNameCompare !== 0) {
    return lastNameCompare;
  }

  return a.first_name.localeCompare(b.first_name);
}

export function getOrderedTeams(teams: DraftTeam[], draftOrder?: string[] | null) {
  const teamsById = new Map(teams.map((team) => [team.id, team]));
  const orderedFromSession =
    draftOrder
      ?.map((teamId) => teamsById.get(teamId))
      .filter((team): team is DraftTeam => Boolean(team)) || [];
  const missingTeams = teams
    .filter((team) => !draftOrder?.includes(team.id))
    .sort((a, b) => (a.draft_position || 999) - (b.draft_position || 999));

  return [...orderedFromSession, ...missingTeams];
}

export function getCurrentDraftTeam(
  orderedTeams: DraftTeam[],
  completedPickCount: number,
) {
  if (orderedTeams.length === 0) {
    return null;
  }

  const roundIndex = Math.floor(completedPickCount / orderedTeams.length);
  const indexInRound = completedPickCount % orderedTeams.length;
  const teamIndex =
    roundIndex % 2 === 0
      ? indexInRound
      : orderedTeams.length - 1 - indexInRound;

  return orderedTeams[teamIndex] || null;
}

export function getAvailablePlayers(
  players: DraftPlayer[],
  teams: DraftTeam[],
  picks: DraftPick[],
) {
  const captainIds = new Set(
    teams
      .map((team) => team.captain_player_id)
      .filter((playerId): playerId is string => Boolean(playerId)),
  );
  const pickedPlayerIds = new Set(picks.map((pick) => pick.player_id));

  return players
    .filter(
      (player) => !captainIds.has(player.id) && !pickedPlayerIds.has(player.id),
    )
    .sort(comparePlayersForDraft);
}

export function groupPlayersByRank(players: DraftPlayer[]) {
  return players.reduce<Record<string, DraftPlayer[]>>((groups, player) => {
    const rank = player.rank || "Unranked";
    groups[rank] = [...(groups[rank] || []), player];
    return groups;
  }, {});
}

export function getPicksByTeam(picks: DraftPick[]) {
  return picks
    .slice()
    .sort((a, b) => a.pick_number - b.pick_number)
    .reduce<Record<string, DraftPick[]>>((groups, pick) => {
      groups[pick.draft_team_id] = [...(groups[pick.draft_team_id] || []), pick];
      return groups;
    }, {});
}

function parseInternalRankOrder(value: string | null) {
  const match = value?.match(/^[ABCD](\d+)$/);

  return match ? Number(match[1]) : 999;
}
