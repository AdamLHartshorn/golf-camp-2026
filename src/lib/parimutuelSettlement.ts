export type ParimutuelBetLike = {
  id: string;
  betting_night: string;
  money_round_day: string;
  market: string;
  selection: string;
  amount: number | string;
  bettor_player_id: string;
  bettor_name: string;
  status: string | null;
  parimutuel_market_id?: string | null;
};

export type ParimutuelResultLike = {
  id?: string;
  parimutuel_market_id: string;
  betting_night: string | null;
  money_round_day: string | null;
  market: string;
  winning_selections: string[] | unknown;
  resolved_at?: string | null;
  resolved_by_player_id?: string | null;
};

export type ParimutuelPlayerStanding = {
  playerId: string;
  player: string;
  wagered: number;
  winnings: number;
  net: number;
  wins: number;
  bets: number;
};

export type ParimutuelMarketSettlement = {
  result: ParimutuelResultLike;
  pool: number;
  winningSelections: string[];
  winningBetTotal: number;
  noWinners: boolean;
  rows: Array<{
    betId: string;
    playerId: string;
    player: string;
    market: string;
    selection: string;
    amount: number;
    payout: number;
    net: number;
    won: boolean;
    refunded: boolean;
  }>;
};

export type ParimutuelPaymentRow = {
  from: string;
  to: string;
  amount: number;
};

export const parimutuelMarkets = [
  "Money Round Winner",
  "Most Birdies",
  "Show or Better (Top 3)",
  "2nd to Last Place",
  "Hardest Hole",
  "Easiest Hole",
  "Tiebreaker or Outright Winner",
] as const;

export function normalizeParimutuelAmount(value: number | string) {
  const amount = Number(value);
  return Number.isFinite(amount) ? amount : 0;
}

export function normalizeWinningSelections(value: string[] | unknown) {
  if (Array.isArray(value)) {
    return value
      .map((selection) => String(selection || "").trim())
      .filter(Boolean);
  }

  return [];
}

export function calculateParimutuelSettlements(
  bets: ParimutuelBetLike[],
  results: ParimutuelResultLike[],
) {
  const activeBets = bets.filter((bet) => (bet.status || "active") === "active");

  return results.map<ParimutuelMarketSettlement>((result) => {
    const winningSelections = normalizeWinningSelections(result.winning_selections);
    const winningSet = new Set(winningSelections);
    const marketBets = activeBets.filter(
      (bet) =>
        bet.parimutuel_market_id === result.parimutuel_market_id &&
        bet.market === result.market,
    );
    const pool = marketBets.reduce(
      (total, bet) => total + normalizeParimutuelAmount(bet.amount),
      0,
    );
    const winningBets = marketBets.filter((bet) => winningSet.has(bet.selection));
    const winningBetTotal = winningBets.reduce(
      (total, bet) => total + normalizeParimutuelAmount(bet.amount),
      0,
    );
    const noWinners = winningSelections.length > 0 && winningBetTotal === 0;

    return {
      result,
      pool,
      winningSelections,
      winningBetTotal,
      noWinners,
      rows: marketBets.map((bet) => {
        const amount = normalizeParimutuelAmount(bet.amount);
        const won = winningSet.has(bet.selection);
        const payout = noWinners
          ? amount
          : won && winningBetTotal > 0
            ? (pool * amount) / winningBetTotal
            : 0;

        return {
          betId: bet.id,
          playerId: bet.bettor_player_id,
          player: bet.bettor_name,
          market: bet.market,
          selection: bet.selection,
          amount,
          payout,
          net: payout - amount,
          won,
          refunded: noWinners,
        };
      }),
    };
  });
}

export function aggregateParimutuelStandings(
  settlements: ParimutuelMarketSettlement[],
) {
  const rows = settlements
    .flatMap((settlement) => settlement.rows)
    .reduce<Record<string, ParimutuelPlayerStanding>>((accumulator, row) => {
      if (!accumulator[row.playerId]) {
        accumulator[row.playerId] = {
          playerId: row.playerId,
          player: row.player,
          wagered: 0,
          winnings: 0,
          net: 0,
          wins: 0,
          bets: 0,
        };
      }

      accumulator[row.playerId].wagered += row.amount;
      accumulator[row.playerId].winnings += row.payout;
      accumulator[row.playerId].net += row.net;
      accumulator[row.playerId].wins += row.won ? 1 : 0;
      accumulator[row.playerId].bets += 1;
      return accumulator;
    }, {});

  return Object.values(rows).sort(
    (a, b) => b.net - a.net || b.winnings - a.winnings || a.player.localeCompare(b.player),
  );
}

export function createParimutuelPaymentRows(
  standings: ParimutuelPlayerStanding[],
) {
  const payers = standings
    .filter((row) => row.net < -0.005)
    .map((row) => ({ name: row.player, amount: Math.abs(row.net) }))
    .sort((a, b) => b.amount - a.amount);
  const receivers = standings
    .filter((row) => row.net > 0.005)
    .map((row) => ({ name: row.player, amount: row.net }))
    .sort((a, b) => b.amount - a.amount);
  const payments: ParimutuelPaymentRow[] = [];
  let payerIndex = 0;
  let receiverIndex = 0;

  while (payerIndex < payers.length && receiverIndex < receivers.length) {
    const payer = payers[payerIndex];
    const receiver = receivers[receiverIndex];
    const amount = Math.min(payer.amount, receiver.amount);

    if (amount > 0.005) {
      payments.push({
        from: payer.name,
        to: receiver.name,
        amount,
      });
    }

    payer.amount -= amount;
    receiver.amount -= amount;

    if (payer.amount <= 0.005) {
      payerIndex += 1;
    }

    if (receiver.amount <= 0.005) {
      receiverIndex += 1;
    }
  }

  return payments;
}
