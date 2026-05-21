export const holes = Array.from({ length: 18 }, (_, index) => index + 1);

export type MoneyRoundStatus = "pending" | "active" | "scored" | "final";

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
};

export type TeamStanding = {
  team: MoneyTeam;
  total: number;
  position: number;
  isTied: boolean;
  scoresByHole: Record<number, number>;
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

export function calculateStandings(teams: MoneyTeam[], scores: MoneyScore[]) {
  const scoresByTeam = getScoresByTeam(scores);
  const sortedTeams = teams
    .map((team) => {
      const teamScores = scoresByTeam[team.id] || {};
      const total = Object.values(teamScores).reduce(
        (sum, score) => sum + Number(score || 0),
        0,
      );

      return {
        team,
        total,
        scoresByHole: teamScores,
      };
    })
    .sort((a, b) => a.total - b.total || a.team.name.localeCompare(b.team.name));

  return sortedTeams.map((standing, index): TeamStanding => {
    const previousTotal = sortedTeams[index - 1]?.total;
    const nextTotal = sortedTeams[index + 1]?.total;

    return {
      ...standing,
      position: index + 1,
      isTied: standing.total === previousTotal || standing.total === nextTotal,
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
