export const holes = Array.from({ length: 18 }, (_, index) => index + 1);

export const moneyRoundScorecard = [
  { hole: 1, par: 4, handicap: 7 },
  { hole: 2, par: 4, handicap: 1 },
  { hole: 3, par: 4, handicap: 15 },
  { hole: 4, par: 3, handicap: 9 },
  { hole: 5, par: 5, handicap: 17 },
  { hole: 6, par: 4, handicap: 11 },
  { hole: 7, par: 4, handicap: 3 },
  { hole: 8, par: 3, handicap: 5 },
  { hole: 9, par: 4, handicap: 13 },
  { hole: 10, par: 4, handicap: 10 },
  { hole: 11, par: 5, handicap: 8 },
  { hole: 12, par: 5, handicap: 14 },
  { hole: 13, par: 4, handicap: 18 },
  { hole: 14, par: 4, handicap: 2 },
  { hole: 15, par: 3, handicap: 6 },
  { hole: 16, par: 5, handicap: 16 },
  { hole: 17, par: 3, handicap: 4 },
  { hole: 18, par: 4, handicap: 12 },
] as const;

export const frontNinePar = 35;
export const backNinePar = 37;
export const totalPar = 72;

export type MoneyRoundStatus = "pending" | "active" | "scored" | "final";
export type TeamScoreStatus = "pending" | "submitted" | "verified";

export type MoneyRound = {
  id: string;
  name: string;
  round_date: string | null;
  format: string | null;
  status: MoneyRoundStatus | string;
  buy_in: number | null;
  buy_in_per_player: number | null;
  main_pot_per_player: number | null;
  skins_pot_per_player: number | null;
  first_place_payout: number | null;
  second_place_payout: number | null;
  third_place_payout: number | null;
  skins_pot: number | null;
  created_at: string | null;
};

export type MoneyTeam = {
  id: string;
  money_round_id: string;
  name: string;
  player_names: string[];
  player_ids: string[];
  score_status?: TeamScoreStatus | string | null;
};

export type MoneyScore = {
  id: string;
  money_round_id: string;
  money_round_team_id: string;
  hole_number: number | null;
  score: number;
};

export type MoneyPlayer = {
  id: string;
  first_name: string;
  last_name: string;
  display_name: string;
  photo_url?: string | null;
};

export type HoleInOnePlayer = {
  id?: string | null;
  name: string;
  photoUrl?: string | null;
};

export type HoleInOneHighlight = {
  id: string;
  roundId?: string | null;
  roundName?: string;
  team: MoneyTeam;
  hole: number;
  par: number;
  handicap: number | null;
  averageScore: number | null;
  averageRelativeToPar: number | null;
  players: HoleInOnePlayer[];
};

export type TeamStanding = {
  team: MoneyTeam;
  total: number;
  position: number;
  isTied: boolean;
  scoresByHole: Record<number, number>;
  completedHoleCount: number;
  completedPar: number;
  relativeToPar: number | null;
};

export type SkinResult = {
  hole: number;
  team: MoneyTeam;
  score: number;
  value: number;
};

export type PlayerBankRow = {
  playerName: string;
  teamName: string;
  placementLabel: string;
  placementWinnings: number;
  skinsWinnings: number;
  totalWinnings: number;
  buyIn: number;
  net: number;
};

export type RoundCalculation = {
  standings: TeamStanding[];
  skins: SkinResult[];
  bankRows: PlayerBankRow[];
  scoresByTeam: Record<string, Record<number, number>>;
  hasScores: boolean;
};

export type YearlyMoneyBankRow = {
  playerName: string;
  placementWinnings: number;
  skinsWinnings: number;
  buyIns: number;
  net: number;
};

function safeNumber(value: number | string | null | undefined) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function validScoreNumber(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function money(value: number) {
  const safeValue = safeNumber(value);
  return `$${Math.round(safeValue * 100) / 100}`;
}

export function signedMoney(value: number) {
  const prefix = value > 0 ? "+" : value < 0 ? "-" : "";
  return `${prefix}${money(Math.abs(value))}`;
}

export function getTeamScoreStatus(team: MoneyTeam): TeamScoreStatus {
  if (
    team.score_status === "submitted" ||
    team.score_status === "verified" ||
    team.score_status === "pending"
  ) {
    return team.score_status;
  }

  return "pending";
}

export function teamScoreStatusLabel(team: MoneyTeam) {
  const status = getTeamScoreStatus(team);

  if (status === "verified") {
    return "OFFICIAL";
  }

  if (status === "submitted") {
    return "UNOFFICIAL";
  }

  return "Awaiting Verification";
}

export function teamHasAnyScores(team: MoneyTeam, scores: MoneyScore[]) {
  return scores.some((score) => score.money_round_team_id === team.id);
}

export function teamHasCompleteScores(team: MoneyTeam, scores: MoneyScore[]) {
  const scoredHoles = new Set(
    scores
      .filter((score) => score.money_round_team_id === team.id)
      .map((score) => Number(score.hole_number))
      .filter((hole) => hole >= 1 && hole <= 18),
  );

  return holes.every((hole) => scoredHoles.has(hole));
}

export function isRoundPresentationReady(
  round: MoneyRound | null,
  teams: MoneyTeam[],
  scores: MoneyScore[],
) {
  if (!round) {
    return false;
  }

  if (isScoredOrFinalRound(round)) {
    return true;
  }

  return (
    teams.length > 0 &&
    teams.every(
      (team) =>
        getTeamScoreStatus(team) !== "pending" &&
        teamHasCompleteScores(team, scores),
    )
  );
}

function placementLabel(position: number) {
  if (position === 1) {
    return "1st Place";
  }

  if (position === 2) {
    return "2nd Place";
  }

  if (position === 3) {
    return "3rd Place";
  }

  return "Placement";
}

export function getScoresByTeam(scores: MoneyScore[]) {
  return scores.reduce<Record<string, Record<number, number>>>(
    (groups, score) => {
      const hole = Number(score.hole_number);
      const value = validScoreNumber(score.score);

      if (!hole || value === null) {
        return groups;
      }

      groups[score.money_round_team_id] = {
        ...(groups[score.money_round_team_id] || {}),
        [hole]: value,
      };
      return groups;
    },
    {},
  );
}

export function sumHoleScores(
  scoresByHole: Record<number, number>,
  selectedHoles: number[],
) {
  return selectedHoles.reduce(
    (total, hole) => total + (scoresByHole[hole] ?? 0),
    0,
  );
}

export function getParForHoles(selectedHoles: number[]) {
  return selectedHoles.reduce((total, hole) => {
    const metadata = moneyRoundScorecard.find((item) => item.hole === hole);
    return total + (metadata?.par || 0);
  }, 0);
}

export function getCompletedHoles(scoresByHole: Record<number, number>) {
  return holes.filter((hole) => typeof scoresByHole[hole] === "number");
}

export function getCompletedPar(scoresByHole: Record<number, number>) {
  return getParForHoles(getCompletedHoles(scoresByHole));
}

export function formatRelativeToPar(score: number, par: number) {
  const relative = score - par;

  if (relative === 0) {
    return "E";
  }

  return relative > 0 ? `+${relative}` : String(relative);
}

export function formatScoreToPar(score: number, par: number) {
  return `${score} (${formatRelativeToPar(score, par)})`;
}

export function formatScoreToCompletedPar(
  score: number,
  scoresByHole: Record<number, number>,
) {
  const completedPar = getCompletedPar(scoresByHole);

  if (completedPar === 0) {
    return `${score} (-)`;
  }

  return formatScoreToPar(score, completedPar);
}

export function formatScoreToCompletedParForHoles(
  score: number,
  scoresByHole: Record<number, number>,
  selectedHoles: number[],
) {
  const completedHoles = selectedHoles.filter(
    (hole) => typeof scoresByHole[hole] === "number",
  );
  const completedPar = getParForHoles(completedHoles);

  if (completedPar === 0) {
    return `${score} (-)`;
  }

  return formatScoreToPar(score, completedPar);
}

export function compareTeamStandingsBestFirst(
  a: Pick<
    TeamStanding,
    "completedHoleCount" | "relativeToPar" | "team" | "total"
  >,
  b: Pick<
    TeamStanding,
    "completedHoleCount" | "relativeToPar" | "team" | "total"
  >,
) {
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
}

export function compareTeamStandingsWorstFirst(
  a: Pick<
    TeamStanding,
    "completedHoleCount" | "relativeToPar" | "team" | "total"
  >,
  b: Pick<
    TeamStanding,
    "completedHoleCount" | "relativeToPar" | "team" | "total"
  >,
) {
  const aHasScores = a.completedHoleCount > 0;
  const bHasScores = b.completedHoleCount > 0;

  if (aHasScores !== bHasScores) {
    return aHasScores ? -1 : 1;
  }

  return compareTeamStandingsBestFirst(b, a);
}

export function calculateStandings(teams: MoneyTeam[], scores: MoneyScore[]) {
  const scoresByTeam = getScoresByTeam(scores);
  const sortedTeams = teams
    .map((team) => {
      const teamScores = scoresByTeam[team.id] || {};
      const total = Object.values(teamScores).reduce(
        (sum, score) => sum + Number(score || 0),
        0,
      );
      const completedHoleCount = getCompletedHoles(teamScores).length;
      const completedPar = getCompletedPar(teamScores);
      const relativeToPar =
        completedPar > 0 ? total - completedPar : null;

      return {
        team,
        total,
        scoresByHole: teamScores,
        completedHoleCount,
        completedPar,
        relativeToPar,
      };
    })
    .sort(compareTeamStandingsBestFirst);

  return sortedTeams.map((standing, index): TeamStanding => {
    const previousRelative = sortedTeams[index - 1]?.relativeToPar;
    const nextRelative = sortedTeams[index + 1]?.relativeToPar;
    const hasScores = standing.completedHoleCount > 0;

    return {
      ...standing,
      position: index + 1,
      isTied:
        hasScores &&
        (standing.relativeToPar === previousRelative ||
          standing.relativeToPar === nextRelative),
    };
  });
}

export function calculateSkins(
  teams: MoneyTeam[],
  scores: MoneyScore[],
  skinsPot: number,
) {
  const scoresByTeam = getScoresByTeam(scores);
  const safeSkinsPot = Math.max(safeNumber(skinsPot), 0);
  const skinWinners: Omit<SkinResult, "value">[] = [];

  holes.forEach((hole) => {
    const scoredTeams = teams
      .map((team) => ({
        team,
        score: scoresByTeam[team.id]?.[hole],
      }))
      .filter(
        (entry): entry is { team: MoneyTeam; score: number } =>
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

export function buildPlayerBank(
  round: MoneyRound | null,
  standings: TeamStanding[],
  skins: SkinResult[],
) {
  if (!round) {
    return [];
  }

  const placementByPosition: Record<number, number> = {
    1: safeNumber(round.first_place_payout),
    2: safeNumber(round.second_place_payout),
    3: safeNumber(round.third_place_payout),
  };
  const skinsByTeam = skins.reduce<Record<string, number>>((groups, skin) => {
    groups[skin.team.id] = (groups[skin.team.id] || 0) + skin.value;
    return groups;
  }, {});
  const buyIn = safeNumber(round.buy_in_per_player ?? round.buy_in);

  return standings.flatMap((standing) => {
    const playerNames =
      standing.team.player_names?.length > 0
        ? standing.team.player_names
        : [`${standing.team.name} (No players)`];
    const playerCount = Math.max(playerNames.length, 1);
    const placementWinnings =
      (placementByPosition[standing.position] || 0) / playerCount;
    const skinsWinnings = (skinsByTeam[standing.team.id] || 0) / playerCount;

    return playerNames.map((playerName) => {
      const totalWinnings = placementWinnings + skinsWinnings;

      return {
        playerName,
        teamName: standing.team.name,
        placementLabel: placementLabel(standing.position),
        placementWinnings,
        skinsWinnings,
        totalWinnings,
        buyIn,
        net: totalWinnings - buyIn,
      };
    });
  });
}

export function calculateRoundMoney(round: MoneyRound | null, teams: MoneyTeam[], scores: MoneyScore[]): RoundCalculation {
  const scoresByTeam = getScoresByTeam(scores);
  const standings = calculateStandings(teams, scores);
  const skins = calculateSkins(teams, scores, Number(round?.skins_pot || 0));
  const bankRows = buildPlayerBank(round, standings, skins);

  return {
    standings,
    skins,
    bankRows,
    scoresByTeam,
    hasScores: Object.values(scoresByTeam).some(
      (teamScores) => Object.keys(teamScores).length > 0,
    ),
  };
}

export function getHoleAverage(scores: MoneyScore[], hole: number) {
  const holeScores = scores
    .filter((score) => Number(score.hole_number) === hole)
    .map((score) => validScoreNumber(score.score))
    .filter((score): score is number => score !== null);

  if (holeScores.length === 0) {
    return null;
  }

  return holeScores.reduce((total, score) => total + score, 0) / holeScores.length;
}

export function buildHoleInOneHighlights(
  teams: MoneyTeam[],
  scores: MoneyScore[],
  players: MoneyPlayer[] = [],
  round?: Pick<MoneyRound, "id" | "name"> | null,
) {
  const playersById = new Map(players.map((player) => [player.id, player]));
  const playersByName = new Map(
    players.map((player) => [player.display_name.toLowerCase(), player]),
  );
  const teamsById = new Map(teams.map((team) => [team.id, team]));

  return scores
    .filter((score) => Number(score.score) === 1)
    .map((score): HoleInOneHighlight | null => {
      const hole = Number(score.hole_number);
      const team = teamsById.get(score.money_round_team_id);
      const metadata = moneyRoundScorecard.find((item) => item.hole === hole);

      if (!team || !metadata) {
        return null;
      }

      const averageScore = getHoleAverage(scores, hole);
      const teamPlayers =
        team.player_ids?.length > 0
          ? team.player_ids.map((playerId, index) => {
              const matchedPlayer = playersById.get(playerId);
              const fallbackName = team.player_names?.[index] || matchedPlayer?.display_name;

              return {
                id: playerId,
                name: matchedPlayer?.display_name || fallbackName || "Unknown Player",
                photoUrl: matchedPlayer?.photo_url || null,
              };
            })
          : (team.player_names || []).map((playerName) => {
              const matchedPlayer = playersByName.get(playerName.toLowerCase());

              return {
                id: matchedPlayer?.id || null,
                name: matchedPlayer?.display_name || playerName,
                photoUrl: matchedPlayer?.photo_url || null,
              };
            });

      return {
        id: `${round?.id || score.money_round_id || "round"}-${team.id}-${hole}`,
        roundId: round?.id || score.money_round_id || null,
        roundName: round?.name,
        team,
        hole,
        par: metadata.par,
        handicap: metadata.handicap,
        averageScore,
        averageRelativeToPar:
          averageScore === null ? null : averageScore - metadata.par,
        players: teamPlayers,
      };
    })
    .filter((highlight): highlight is HoleInOneHighlight => Boolean(highlight));
}

export function isScoredOrFinalRound(round: MoneyRound) {
  const status = String(round.status || "").trim().toLowerCase();
  return status === "scored" || status === "final";
}

export function isCurrentYearRound(round: MoneyRound, currentYear = new Date().getFullYear()) {
  if (!round.round_date) {
    return true;
  }

  const explicitYear = String(round.round_date).match(/\b(20\d{2})\b/)?.[1];

  if (explicitYear) {
    return Number(explicitYear) === currentYear;
  }

  return true;
}

export function buildYearlyMoneyBank(
  rounds: MoneyRound[],
  teams: MoneyTeam[],
  scores: MoneyScore[],
) {
  const teamsByRound = teams.reduce<Record<string, MoneyTeam[]>>((groups, team) => {
    groups[team.money_round_id] = [...(groups[team.money_round_id] || []), team];
    return groups;
  }, {});
  const scoresByRound = scores.reduce<Record<string, MoneyScore[]>>((groups, score) => {
    groups[score.money_round_id] = [...(groups[score.money_round_id] || []), score];
    return groups;
  }, {});
  const bankTotals = new Map<string, YearlyMoneyBankRow>();

  rounds
    .filter((round) => isScoredOrFinalRound(round) && isCurrentYearRound(round))
    .forEach((round) => {
      const roundTeams = teamsByRound[round.id] || [];
      const roundScores = scoresByRound[round.id] || [];
      const calculation = calculateRoundMoney(round, roundTeams, roundScores);

      if (roundTeams.length === 0 || !calculation.hasScores) {
        return;
      }

      calculation.bankRows.forEach((row) => {
        const current = bankTotals.get(row.playerName) || {
          playerName: row.playerName,
          placementWinnings: 0,
          skinsWinnings: 0,
          buyIns: 0,
          net: 0,
        };

        bankTotals.set(row.playerName, {
          playerName: row.playerName,
          placementWinnings: current.placementWinnings + row.placementWinnings,
          skinsWinnings: current.skinsWinnings + row.skinsWinnings,
          buyIns: current.buyIns + row.buyIn,
          net: current.net + row.net,
        });
      });
    });

  return Array.from(bankTotals.values()).sort(
    (a, b) => b.net - a.net || a.playerName.localeCompare(b.playerName),
  );
}
