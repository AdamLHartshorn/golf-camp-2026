import {
  calculateHoleDifficultyHighlights,
  calculateStandings,
  getScoresByTeam,
  holes,
  isScoredOrFinalRound,
  MoneyRound,
  MoneyScore,
  MoneyTeam,
  TeamStanding,
  moneyRoundScorecard,
} from "@/app/money-rounds/_lib/moneyRoundUtils";
import { logActivityFeedItem } from "@/lib/activityFeed";
import { logAuditEvent } from "@/lib/auditLog";
import { ParimutuelMarket } from "@/lib/parimutuelAutomation";
import { parimutuelMarkets } from "@/lib/parimutuelSettlement";
import { supabase } from "@/lib/supabase";

export type ParimutuelResolutionProposal = {
  market: string;
  winningSelections: string[];
  note: string;
};

type ResolutionResult = {
  savedCount: number;
  skipped: boolean;
  message: string;
  proposals: ParimutuelResolutionProposal[];
  market: ParimutuelMarket | null;
  error?: string;
};

function uniqueNames(names: string[]) {
  return names.filter(
    (name, index, currentNames) => name && currentNames.indexOf(name) === index,
  );
}

function namesForPosition(standings: TeamStanding[], position: number) {
  const target = standings[position - 1];

  if (!target || target.completedHoleCount === 0) {
    return [];
  }

  return uniqueNames(
    standings
      .filter(
        (standing) =>
          standing.completedHoleCount > 0 &&
          standing.relativeToPar === target.relativeToPar,
      )
      .map((standing) => standing.team.name),
  );
}

function topThreeNames(standings: TeamStanding[]) {
  return uniqueNames(
    standings
      .filter((standing) => standing.completedHoleCount > 0)
      .slice(0, 3)
      .map((standing) => standing.team.name),
  );
}

function secondToLastNames(standings: TeamStanding[]) {
  const scoredStandings = standings.filter(
    (standing) => standing.completedHoleCount > 0,
  );

  if (scoredStandings.length < 2) {
    return [];
  }

  const worstToBest = scoredStandings.slice().reverse();
  const target = worstToBest[1];

  return uniqueNames(
    scoredStandings
      .filter((standing) => standing.relativeToPar === target.relativeToPar)
      .map((standing) => standing.team.name),
  );
}

function mostBirdiesNames(teams: MoneyTeam[], scores: MoneyScore[]) {
  const scoresByTeam = getScoresByTeam(scores);
  const parByHole = new Map<number, number>(
    moneyRoundScorecard.map((hole) => [hole.hole, hole.par]),
  );
  const birdieRows = teams.map((team) => {
    const teamScores = scoresByTeam[team.id] || {};
    const birdies = holes.reduce((count, hole) => {
      const score = teamScores[hole];
      const par = parByHole.get(hole);

      return typeof score === "number" && typeof par === "number" && score < par
        ? count + 1
        : count;
    }, 0);

    return { team, birdies };
  });
  const maxBirdies = Math.max(...birdieRows.map((row) => row.birdies), 0);

  if (maxBirdies <= 0) {
    return [];
  }

  return uniqueNames(
    birdieRows
      .filter((row) => row.birdies === maxBirdies)
      .map((row) => row.team.name),
  );
}

export function buildParimutuelResolutionProposals(
  round: MoneyRound,
  teams: MoneyTeam[],
  scores: MoneyScore[],
) {
  const standings = calculateStandings(teams, scores);
  const { hardest, easiest } = calculateHoleDifficultyHighlights(teams, scores);
  const winnerNames = namesForPosition(standings, 1);
  const proposals: ParimutuelResolutionProposal[] = [
    {
      market: "Money Round Winner",
      winningSelections: winnerNames,
      note: "Derived from 1st place official Money Round standings.",
    },
    {
      market: "Most Birdies",
      winningSelections: mostBirdiesNames(teams, scores),
      note: "Derived from team scorecards by counting holes scored under par.",
    },
    {
      market: "Show or Better (Top 3)",
      winningSelections: topThreeNames(standings),
      note: "Derived from the top three teams in official standings.",
    },
    {
      market: "2nd to Last Place",
      winningSelections: secondToLastNames(standings),
      note: "Derived from official standings, second from the bottom.",
    },
    {
      market: "Hardest Hole",
      winningSelections: hardest ? [`Hole ${hardest.hole}`] : [],
      note: "Derived from highest average team score relative to par.",
    },
    {
      market: "Easiest Hole",
      winningSelections: easiest ? [`Hole ${easiest.hole}`] : [],
      note: "Derived from lowest average team score relative to par.",
    },
    {
      market: "Tiebreaker or Outright Winner",
      winningSelections: winnerNames,
      note: "Defaults to the official winner for MVP resolution.",
    },
  ];

  return proposals.filter((proposal) =>
    parimutuelMarkets.includes(
      proposal.market as (typeof parimutuelMarkets)[number],
    ),
  );
}

export async function autoResolveParimutuelForMoneyRound(
  round: MoneyRound,
  teams: MoneyTeam[],
  scores: MoneyScore[],
  actorPlayerId?: string | null,
): Promise<ResolutionResult> {
  if (!isScoredOrFinalRound(round)) {
    return {
      savedCount: 0,
      skipped: true,
      message: "Money Round must be scored/final before Parimutuel can auto-resolve.",
      proposals: [],
      market: null,
    };
  }

  const { data: marketData, error: marketError } = await supabase
    .from("evening_parimutuel_markets")
    .select("*")
    .eq("money_round_id", round.id)
    .order("opened_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(1);

  if (marketError) {
    return {
      savedCount: 0,
      skipped: false,
      message: marketError.message || "Could not load linked Parimutuel market.",
      proposals: [],
      market: null,
      error: marketError.message,
    };
  }

  const market = ((marketData as ParimutuelMarket[]) || [])[0] || null;

  if (!market) {
    return {
      savedCount: 0,
      skipped: true,
      message: "No linked Parimutuel market found for this Money Round.",
      proposals: [],
      market: null,
    };
  }

  const proposals = buildParimutuelResolutionProposals(round, teams, scores);
  const savableProposals = proposals.filter(
    (proposal) => proposal.winningSelections.length > 0,
  );

  if (savableProposals.length === 0) {
    return {
      savedCount: 0,
      skipped: true,
      message: "No Parimutuel results could be derived from this Money Round yet.",
      proposals,
      market,
    };
  }

  const now = new Date().toISOString();
  const payload = savableProposals.map((proposal) => ({
    parimutuel_market_id: market.id,
    betting_night: market.betting_night,
    money_round_day: market.money_round_day,
    market: proposal.market,
    winning_selections: proposal.winningSelections,
    resolved_at: now,
    resolved_by_player_id: actorPlayerId || null,
    updated_at: now,
  }));

  const { error: resultError } = await supabase
    .from("evening_parimutuel_results")
    .upsert(payload, { onConflict: "parimutuel_market_id,market" });

  if (resultError) {
    return {
      savedCount: 0,
      skipped: false,
      message:
        ["42P01", "42703"].includes(resultError.code || "")
          ? "Run the Parimutuel resolution SQL before auto-resolving markets."
          : resultError.message || "Could not save Parimutuel results.",
      proposals,
      market,
      error: resultError.message,
    };
  }

  const nextStatus =
    savableProposals.length === parimutuelMarkets.length ? "settled" : market.status;
  let nextMarket = market;

  if (nextStatus !== market.status) {
    const { data: updatedMarket } = await supabase
      .from("evening_parimutuel_markets")
      .update({ status: nextStatus, updated_at: now })
      .eq("id", market.id)
      .select("*")
      .single();

    if (updatedMarket) {
      nextMarket = updatedMarket as ParimutuelMarket;
    }
  }

  await logActivityFeedItem({
    type: "parimutuel_resolved",
    source: "parimutuel",
    sourceId: market.id,
    linkUrl: "/evening-parimutuel",
    message: `${round.name} Parimutuel Bets resolved.`,
  });
  await logAuditEvent({
    actionType: "parimutuel_markets_auto_resolved",
    entityType: "evening_parimutuel_market",
    entityId: market.id,
    summary: `${round.name} Parimutuel markets auto-resolved from final Money Round results.`,
    newValue: payload,
    metadata: {
      money_round_id: round.id,
      saved_count: savableProposals.length,
    },
  });

  return {
    savedCount: savableProposals.length,
    skipped: false,
    message: `Auto-resolved ${savableProposals.length} Parimutuel markets.`,
    proposals,
    market: nextMarket,
  };
}
