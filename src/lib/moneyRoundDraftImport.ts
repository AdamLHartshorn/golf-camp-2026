import { supabase } from "@/lib/supabase";

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

type DraftPlayer = {
  id: string;
  display_name: string;
};

type MoneyRoundTeam = {
  name: string;
};

export async function importDraftTeamsToMoneyRound(
  draftSessionId: string,
  moneyRoundId: string,
  options: { skipIfTeamsExist?: boolean } = {},
) {
  const { skipIfTeamsExist = false } = options;

  const { data: existingTeams, error: existingTeamsError } = await supabase
    .from("money_round_teams")
    .select("name")
    .eq("money_round_id", moneyRoundId);

  if (existingTeamsError) {
    return {
      importedCount: 0,
      skipped: false,
      error: existingTeamsError,
    };
  }

  if (skipIfTeamsExist && ((existingTeams as MoneyRoundTeam[]) || []).length > 0) {
    return {
      importedCount: 0,
      skipped: true,
      error: null,
    };
  }

  const [
    { data: draftTeams, error: draftTeamsError },
    { data: draftPicks, error: draftPicksError },
  ] = await Promise.all([
    supabase
      .from("draft_teams")
      .select("id, name, captain_player_id")
      .eq("draft_session_id", draftSessionId),
    supabase
      .from("draft_picks")
      .select("draft_team_id, player_id, pick_number")
      .eq("draft_session_id", draftSessionId)
      .order("pick_number", { ascending: true }),
  ]);

  if (draftTeamsError || draftPicksError) {
    return {
      importedCount: 0,
      skipped: false,
      error: draftTeamsError || draftPicksError,
    };
  }

  const picksByTeam = ((draftPicks as DraftPick[]) || []).reduce<
    Record<string, string[]>
  >((groups, pick) => {
    groups[pick.draft_team_id] = [
      ...(groups[pick.draft_team_id] || []),
      pick.player_id,
    ];
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
  const { data: draftPlayers, error: playersError } =
    allDraftPlayerIds.length > 0
      ? await supabase
          .from("players")
          .select("id, display_name")
          .in("id", allDraftPlayerIds)
      : { data: [], error: null };

  if (playersError) {
    return {
      importedCount: 0,
      skipped: false,
      error: playersError,
    };
  }

  const draftPlayersById = new Map(
    ((draftPlayers as DraftPlayer[]) || []).map((player) => [
      player.id,
      player,
    ]),
  );
  const existingTeamNames = new Set(
    ((existingTeams as MoneyRoundTeam[]) || []).map((team) => team.name),
  );
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
        money_round_id: moneyRoundId,
        name: team.name,
        player_ids: playerIds,
        player_names: playerNames,
      };
    });

  if (payload.length === 0) {
    return {
      importedCount: 0,
      skipped: true,
      error: null,
    };
  }

  const { error: insertError } = await supabase
    .from("money_round_teams")
    .insert(payload);

  return {
    importedCount: insertError ? 0 : payload.length,
    skipped: false,
    error: insertError,
  };
}
