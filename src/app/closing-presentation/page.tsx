"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  buildYearlyMoneyBank,
  calculateRoundMoney,
  compareTeamStandingsBestFirst,
  formatScoreToCompletedPar,
  isCurrentYearRound,
  isScoredOrFinalRound,
  money,
  MoneyRound,
  MoneyScore,
  MoneyTeam,
} from "@/app/money-rounds/_lib/moneyRoundUtils";
import {
  aggregateParimutuelStandings,
  calculateParimutuelSettlements,
  createParimutuelPaymentRows,
  ParimutuelBetLike,
  ParimutuelResultLike,
} from "@/lib/parimutuelSettlement";
import {
  CampYear,
  currentCampYear,
  getCampYear,
  isCampYearFinalized,
} from "@/lib/campYear";
import { getPlayerSession, PlayerSession } from "@/lib/playerSession";
import { supabase } from "@/lib/supabase";

type EveningBet = {
  id: string;
  betting_night: string | null;
  money_round_day: string | null;
  market: string;
  selection: string;
  amount: number | string;
  bettor_player_id: string;
  bettor_name: string;
  status: string | null;
  created_at: string | null;
  parimutuel_market_id?: string | null;
};

type EveningResult = {
  id: string;
  parimutuel_market_id: string;
  betting_night: string | null;
  money_round_day: string | null;
  market: string;
  winning_selections: string[] | unknown;
  resolved_at: string | null;
  resolved_by_player_id: string | null;
};

type ShenanigansEvent = {
  id: string;
  player_name: string;
  event_type: string | null;
  description: string | null;
  points: number | string | null;
  created_at: string | null;
};

type ActivityFeedRow = {
  id: string;
  source: string | null;
  message: string;
  created_at: string | null;
};

type PresentationSlide =
  | "opening"
  | "money_bank"
  | "parimutuel_summary"
  | "parimutuel_settlement"
  | "money_rounds"
  | "skins"
  | "shenanigans"
  | "settlement"
  | "closing";

const slides: { id: PresentationSlide; label: string }[] = [
  { id: "opening", label: "Opening" },
  { id: "money_bank", label: "Money Bank" },
  { id: "parimutuel_summary", label: "Parimutuel Summary" },
  { id: "parimutuel_settlement", label: "Parimutuel Settlement" },
  { id: "money_rounds", label: "Money Rounds" },
  { id: "skins", label: "Skins" },
  { id: "shenanigans", label: "Shenanigans" },
  { id: "settlement", label: "Settlement" },
  { id: "closing", label: "Closing" },
];

function safeNumber(value: number | string | null | undefined) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatDate(value: string | null) {
  if (!value) {
    return "Date TBD";
  }

  return new Date(value).toLocaleDateString([], {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function EmptyState({ children }: { children: string }) {
  return (
    <div className="closing-card rounded-[0.8rem] border p-8 text-center text-2xl font-bold text-[#b8b0a1]">
      {children}
    </div>
  );
}

export default function ClosingPresentationPage() {
  const [session, setSession] = useState<PlayerSession | null>(null);
  const [campYear, setCampYear] = useState<CampYear | null>(null);
  const [rounds, setRounds] = useState<MoneyRound[]>([]);
  const [teams, setTeams] = useState<MoneyTeam[]>([]);
  const [scores, setScores] = useState<MoneyScore[]>([]);
  const [bets, setBets] = useState<EveningBet[]>([]);
  const [parimutuelResults, setParimutuelResults] = useState<EveningResult[]>(
    [],
  );
  const [shenanigansEvents, setShenanigansEvents] = useState<ShenanigansEvent[]>(
    [],
  );
  const [feedItems, setFeedItems] = useState<ActivityFeedRow[]>([]);
  const [currentSlide, setCurrentSlide] = useState<PresentationSlide>("opening");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [schemaMissing, setSchemaMissing] = useState(false);

  const slideIndex = slides.findIndex((slide) => slide.id === currentSlide);
  const slide = slides[slideIndex] || slides[0];
  const isAdminPreview = Boolean(session?.is_admin && !isCampYearFinalized(campYear));
  const canView = isCampYearFinalized(campYear) || Boolean(session?.is_admin);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setSession(getPlayerSession());
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

  useEffect(() => {
    let isCurrent = true;

    async function fetchPresentationData() {
      setIsLoading(true);

      const yearResult = await getCampYear(currentCampYear);

      if (!isCurrent) {
        return;
      }

      setCampYear(yearResult.campYear);
      setSchemaMissing(yearResult.schemaMissing);

      if (yearResult.error && !yearResult.schemaMissing) {
        setError(yearResult.error.message || "Could not load camp year status.");
        setIsLoading(false);
        return;
      }

      const [
        { data: roundData, error: roundError },
        { data: betData, error: betError },
        { data: resultData, error: resultError },
        { data: shenanigansData, error: shenanigansError },
        { data: feedData },
      ] = await Promise.all([
        supabase
          .from("money_rounds")
          .select("*")
          .in("status", ["scored", "final"])
          .order("round_date", { ascending: true }),
        supabase
          .from("evening_parimutuel_bets")
          .select("*")
          .order("created_at", { ascending: false }),
        supabase
          .from("evening_parimutuel_results")
          .select("*")
          .order("resolved_at", { ascending: false }),
        supabase
          .from("shenanigans_events")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(200),
        supabase
          .from("activity_feed")
          .select("id, source, message, created_at")
          .order("created_at", { ascending: false })
          .limit(10),
      ]);

      if (!isCurrent) {
        return;
      }

      if (roundError) {
        setError(roundError.message || "Could not load Money Rounds data.");
        setIsLoading(false);
        return;
      }

      const currentYearRounds = ((roundData as MoneyRound[]) || []).filter(
        (round) => isScoredOrFinalRound(round) && isCurrentYearRound(round, currentCampYear),
      );
      const roundIds = currentYearRounds.map((round) => round.id);
      let roundTeams: MoneyTeam[] = [];
      let roundScores: MoneyScore[] = [];

      if (roundIds.length > 0) {
        const [
          { data: teamData, error: teamError },
          { data: scoreData, error: scoreError },
        ] = await Promise.all([
          supabase.from("money_round_teams").select("*").in("money_round_id", roundIds),
          supabase.from("money_round_scores").select("*").in("money_round_id", roundIds),
        ]);

        if (!isCurrent) {
          return;
        }

        if (teamError || scoreError) {
          setError(
            teamError?.message ||
              scoreError?.message ||
              "Could not load Money Rounds scorecards.",
          );
          setIsLoading(false);
          return;
        }

        roundTeams = (teamData as MoneyTeam[]) || [];
        roundScores = (scoreData as MoneyScore[]) || [];
      }

      setRounds(currentYearRounds);
      setTeams(roundTeams);
      setScores(roundScores);
      setBets(betError ? [] : (betData as EveningBet[]) || []);
      setParimutuelResults(
        resultError ? [] : (resultData as EveningResult[]) || [],
      );
      setShenanigansEvents(
        shenanigansError ? [] : (shenanigansData as ShenanigansEvent[]) || [],
      );
      setFeedItems((feedData as ActivityFeedRow[]) || []);
      setIsLoading(false);
    }

    fetchPresentationData();

    return () => {
      isCurrent = false;
    };
  }, []);

  const moneyBankRows = useMemo(
    () => buildYearlyMoneyBank(rounds, teams, scores),
    [rounds, scores, teams],
  );
  const teamsByRound = useMemo(
    () =>
      teams.reduce<Record<string, MoneyTeam[]>>((groups, team) => {
        groups[team.money_round_id] = [...(groups[team.money_round_id] || []), team];
        return groups;
      }, {}),
    [teams],
  );
  const scoresByRound = useMemo(
    () =>
      scores.reduce<Record<string, MoneyScore[]>>((groups, score) => {
        groups[score.money_round_id] = [
          ...(groups[score.money_round_id] || []),
          score,
        ];
        return groups;
      }, {}),
    [scores],
  );
  const roundSummaries = useMemo(
    () =>
      rounds.map((round) => {
        const calculation = calculateRoundMoney(
          round,
          teamsByRound[round.id] || [],
          scoresByRound[round.id] || [],
        );
        const standings = calculation.standings
          .slice()
          .sort(compareTeamStandingsBestFirst);
        const winner = standings[0];

        return {
          round,
          winner,
          skins: calculation.skins,
          bankRows: calculation.bankRows,
          hasScores: calculation.hasScores,
        };
      }),
    [rounds, scoresByRound, teamsByRound],
  );
  const skinLeaders = useMemo(() => {
    const totals = new Map<string, { teamName: string; count: number; value: number }>();

    roundSummaries.forEach((summary) => {
      summary.skins.forEach((skin) => {
        const current = totals.get(skin.team.name) || {
          teamName: skin.team.name,
          count: 0,
          value: 0,
        };
        totals.set(skin.team.name, {
          ...current,
          count: current.count + 1,
          value: current.value + skin.value,
        });
      });
    });

    return Array.from(totals.values()).sort(
      (a, b) => b.count - a.count || b.value - a.value || a.teamName.localeCompare(b.teamName),
    );
  }, [roundSummaries]);
  const parimutuelTotals = useMemo(() => {
    const marketTotals = new Map<string, number>();
    const bettorTotals = new Map<string, number>();

    bets.forEach((bet) => {
      const amount = safeNumber(bet.amount);
      marketTotals.set(bet.market, (marketTotals.get(bet.market) || 0) + amount);
      bettorTotals.set(
        bet.bettor_name,
        (bettorTotals.get(bet.bettor_name) || 0) + amount,
      );
    });

    return {
      total: bets.reduce((sum, bet) => sum + safeNumber(bet.amount), 0),
      markets: Array.from(marketTotals.entries())
        .map(([market, total]) => ({ market, total }))
        .sort((a, b) => b.total - a.total || a.market.localeCompare(b.market)),
      bettors: Array.from(bettorTotals.entries())
        .map(([player, total]) => ({ player, total }))
        .sort((a, b) => b.total - a.total || a.player.localeCompare(b.player)),
    };
  }, [bets]);
  const parimutuelSettlements = useMemo(
    () =>
      calculateParimutuelSettlements(
        bets as ParimutuelBetLike[],
        parimutuelResults as ParimutuelResultLike[],
      ),
    [bets, parimutuelResults],
  );
  const parimutuelStandings = useMemo(
    () => aggregateParimutuelStandings(parimutuelSettlements),
    [parimutuelSettlements],
  );
  const parimutuelPaymentRows = useMemo(
    () => createParimutuelPaymentRows(parimutuelStandings),
    [parimutuelStandings],
  );
  const biggestParimutuelWinner = parimutuelStandings.find(
    (row) => row.net > 0,
  );
  const totalParimutuelWinnings = parimutuelStandings.reduce(
    (total, row) => total + row.winnings,
    0,
  );
  const resolvedParimutuelMarkets = parimutuelSettlements.filter(
    (settlement) => settlement.winningSelections.length > 0,
  );
  const topParimutuelStandings = parimutuelStandings
    .slice()
    .sort((a, b) => b.net - a.net || a.player.localeCompare(b.player));
  const shenanigansTotals = useMemo(() => {
    const playerTotals = new Map<string, number>();

    shenanigansEvents.forEach((event) => {
      const playerName = event.player_name || "Unknown";
      playerTotals.set(
        playerName,
        (playerTotals.get(playerName) || 0) + safeNumber(event.points),
      );
    });

    return Array.from(playerTotals.entries())
      .map(([player, points]) => ({ player, points }))
      .sort((a, b) => b.points - a.points || a.player.localeCompare(b.player));
  }, [shenanigansEvents]);

  function advance(direction: -1 | 1) {
    const nextIndex = Math.min(
      Math.max(slideIndex + direction, 0),
      slides.length - 1,
    );
    setCurrentSlide(slides[nextIndex].id);
  }

  async function enterTvMode() {
    await document.documentElement.requestFullscreen?.();
  }

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "ArrowRight") {
        advance(1);
      }

      if (event.key === "ArrowLeft") {
        advance(-1);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  });

  if (isLoading) {
    return (
      <main className="closing-shell flex min-h-screen items-center justify-center p-8 text-[#f4f1ea]">
        <p className="font-mono text-xl font-black uppercase tracking-[0.22em]">
          Loading Closing Presentation...
        </p>
      </main>
    );
  }

  if (schemaMissing) {
    return (
      <main className="closing-shell flex min-h-screen items-center justify-center p-6 text-[#f4f1ea]">
        <div className="closing-card max-w-xl rounded-[0.9rem] border p-8 text-center">
          <p className="font-mono text-xs font-black uppercase tracking-[0.22em] text-[#d7c8a4]">
            Setup Required
          </p>
          <h1 className="mt-3 text-4xl font-black">Camp Year Table Missing</h1>
          <p className="mt-4 text-[#b8b0a1]">
            Run <span className="font-mono">supabase/2026_camp_years.sql</span>{" "}
            in Supabase, then return here.
          </p>
          <Link
            href="/admin/system"
            className="mt-6 inline-flex rounded-[0.45rem] border border-[#d7c8a4]/45 px-5 py-3 font-bold text-[#d7c8a4]"
          >
            Back to System Tools
          </Link>
        </div>
      </main>
    );
  }

  if (!canView) {
    return (
      <main className="closing-shell flex min-h-screen items-center justify-center p-6 text-[#f4f1ea]">
        <div className="closing-card max-w-xl rounded-[0.9rem] border p-8 text-center">
          <p className="font-mono text-xs font-black uppercase tracking-[0.22em] text-[#d7c8a4]">
            Not Yet
          </p>
          <h1 className="mt-3 text-5xl font-black">Closing Presentation Locked</h1>
          <p className="mt-4 text-[#b8b0a1]">
            The Golf Camp {currentCampYear} Closing Presentation will appear
            after the year is finalized.
          </p>
          <Link
            href="/home"
            className="mt-6 inline-flex rounded-[0.45rem] border border-[#d7c8a4]/45 px-5 py-3 font-bold text-[#d7c8a4]"
          >
            Back Home
          </Link>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="closing-shell flex min-h-screen items-center justify-center p-6 text-[#f4f1ea]">
        <div className="closing-card max-w-xl rounded-[0.9rem] border p-8 text-center text-[#ff8a8a]">
          {error}
        </div>
      </main>
    );
  }

  return (
    <main className="closing-shell min-h-screen overflow-hidden p-8 text-[#f4f1ea] lg:p-12">
      <div className="flex min-h-[calc(100vh-4rem)] flex-col justify-between gap-8">
        <header className="closing-topbar flex items-center justify-between gap-5 rounded-[0.8rem] border px-5 py-4">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <p className="closing-kicker">Golf Camp {currentCampYear}</p>
              {isAdminPreview && (
                <span className="closing-pill">Admin Preview</span>
              )}
            </div>
            <p className="mt-1 text-sm text-[#9b958b]">
              {slide.label} · {slideIndex + 1}/{slides.length}
            </p>
          </div>

          <button
            type="button"
            onClick={enterTvMode}
            className="closing-button"
          >
            Enter TV Mode
          </button>
        </header>

        <section className="flex flex-1 items-center">
          <div key={currentSlide} className="closing-slide w-full">
            {currentSlide === "opening" && (
              <div className="mx-auto max-w-6xl text-center">
                <p className="closing-kicker closing-slide-kicker">The Final Chapter</p>
                <h1 className="closing-title mt-6 text-7xl font-black tracking-[-0.08em] lg:text-9xl">
                  Golf Camp {currentCampYear} Complete
                </h1>
              </div>
            )}

            {currentSlide === "money_bank" && (
              <div className="space-y-7">
                <div>
                  <p className="closing-kicker closing-slide-kicker">Final Money Rounds Bank</p>
                  <h1 className="closing-title mt-4 text-6xl font-black lg:text-8xl">
                    Biggest Winners
                  </h1>
                </div>

                {moneyBankRows.length === 0 ? (
                  <EmptyState>No Money Rounds bank activity yet.</EmptyState>
                ) : (
                  <div className="closing-card rounded-[0.9rem] border p-6">
                    <div className="grid gap-3 lg:grid-cols-2">
                      {moneyBankRows.slice(0, 8).map((row, index) => (
                        <div
                          key={row.playerName}
                          className="closing-stat-row grid grid-cols-[auto_1fr_auto] items-center gap-4 rounded-[0.6rem] border px-4 py-3"
                        >
                          <span className="font-mono text-xl font-black text-[#d7c8a4]">
                            {index + 1}
                          </span>
                          <div className="min-w-0">
                            <p className="truncate text-2xl font-black">
                              {row.playerName}
                            </p>
                            <p className="mt-1 font-mono text-[10px] font-black uppercase tracking-[0.16em] text-[#9b958b]">
                              Place {money(row.placementWinnings)} · Skins{" "}
                              {money(row.skinsWinnings)}
                            </p>
                          </div>
                          <p className="text-3xl font-black text-[#d7c8a4]">
                            {money(row.net)}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {currentSlide === "parimutuel_summary" && (
              <div className="grid gap-8 lg:grid-cols-[0.85fr_1.15fr] lg:items-end">
                <div>
                  <p className="closing-kicker closing-slide-kicker">Parimutuel Bets</p>
                  <h1 className="closing-title mt-4 text-6xl font-black lg:text-8xl">
                    Week Summary
                  </h1>
                  <p className="mt-6 text-3xl font-black text-[#d7c8a4]">
                    {money(parimutuelTotals.total)} backed
                  </p>
                  <p className="mt-3 text-xl text-[#b8b0a1]">
                    One camp-wide ledger. One final settlement.
                  </p>
                </div>

                {bets.length === 0 ? (
                  <EmptyState>No Parimutuel Bets ledger activity yet.</EmptyState>
                ) : (
                  <div className="grid gap-4">
                    <div className="grid gap-4 sm:grid-cols-3">
                      <div className="closing-card rounded-[0.9rem] border p-5">
                        <p className="closing-kicker text-[10px]">Markets</p>
                        <p className="mt-3 text-4xl font-black text-[#d7c8a4]">
                          {resolvedParimutuelMarkets.length}
                        </p>
                        <p className="mt-2 text-sm font-semibold text-[#9b958b]">
                          resolved
                        </p>
                      </div>

                      <div className="closing-card rounded-[0.9rem] border p-5">
                        <p className="closing-kicker text-[10px]">Paid Out</p>
                        <p className="mt-3 text-4xl font-black text-[#d7c8a4]">
                          {money(totalParimutuelWinnings)}
                        </p>
                        <p className="mt-2 text-sm font-semibold text-[#9b958b]">
                          through pools
                        </p>
                      </div>

                      <div className="closing-card rounded-[0.9rem] border p-5">
                        <p className="closing-kicker text-[10px]">Top Net</p>
                        <p className="mt-3 truncate text-2xl font-black text-[#f4f1ea]">
                          {biggestParimutuelWinner?.player || "TBD"}
                        </p>
                        <p className="mt-1 text-3xl font-black text-[#d7c8a4]">
                          {biggestParimutuelWinner
                            ? money(biggestParimutuelWinner.net)
                            : money(0)}
                        </p>
                      </div>
                    </div>

                    <div className="closing-card rounded-[0.9rem] border p-6">
                      <p className="closing-kicker text-[11px]">Leaderboard</p>
                      <div className="mt-5 space-y-3">
                        {topParimutuelStandings.slice(0, 6).map((row, index) => (
                          <div
                            key={row.playerId}
                            className="closing-stat-row grid grid-cols-[auto_1fr_auto] items-center gap-4 rounded-[0.6rem] border px-4 py-3"
                          >
                            <span className="font-mono text-lg font-black text-[#d7c8a4]">
                              {index + 1}
                            </span>
                            <div className="min-w-0">
                              <p className="truncate text-xl font-black">
                                {row.player}
                              </p>
                              <p className="mt-1 font-mono text-[10px] font-black uppercase tracking-[0.16em] text-[#9b958b]">
                                Bet {money(row.wagered)} · Won{" "}
                                {money(row.winnings)}
                              </p>
                            </div>
                            <p
                              className={`text-2xl font-black ${
                                row.net >= 0
                                  ? "text-[#d7c8a4]"
                                  : "text-[#ff8a8a]"
                              }`}
                            >
                              {row.net >= 0 ? "+" : ""}
                              {money(row.net)}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="closing-card rounded-[0.9rem] border p-6">
                      <p className="closing-kicker text-[11px]">Top Markets</p>
                      <div className="mt-5 space-y-3">
                        {parimutuelTotals.markets.slice(0, 4).map((row) => (
                        <div
                          key={row.market}
                          className="closing-stat-row flex items-center justify-between gap-4 rounded-[0.6rem] border px-4 py-3"
                        >
                          <p className="text-xl font-black">{row.market}</p>
                          <p className="text-2xl font-black text-[#d7c8a4]">
                            {money(row.total)}
                          </p>
                        </div>
                      ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {currentSlide === "parimutuel_settlement" && (
              <div className="space-y-7">
                <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
                  <div>
                    <p className="closing-kicker closing-slide-kicker">Parimutuel Settlement</p>
                    <h1 className="closing-title mt-4 text-6xl font-black lg:text-8xl">
                      Who Pays Who
                    </h1>
                  </div>

                  <div className="closing-card max-w-md rounded-[0.9rem] border p-5 text-right">
                    <p className="closing-kicker text-[10px]">Action Item</p>
                    <p className="mt-2 text-2xl font-black text-[#d7c8a4]">
                      Take a picture of this.
                    </p>
                    <p className="mt-2 text-sm font-semibold text-[#b8b0a1]">
                      Make or collect payments after the presentation.
                    </p>
                  </div>
                </div>

                {parimutuelPaymentRows.length === 0 ? (
                  <EmptyState>No Parimutuel settlement payments yet.</EmptyState>
                ) : (
                  <div className="closing-card rounded-[0.9rem] border p-6">
                    <div className="grid gap-3 lg:grid-cols-2">
                      {parimutuelPaymentRows.map((row) => (
                        <div
                          key={`${row.from}-${row.to}-${row.amount}`}
                          className="closing-stat-row grid grid-cols-[1fr_auto] items-center gap-4 rounded-[0.6rem] border px-4 py-4"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-2xl font-black">
                              {row.from}
                            </p>
                            <p className="mt-1 font-mono text-[10px] font-black uppercase tracking-[0.16em] text-[#9b958b]">
                              pays {row.to}
                            </p>
                          </div>
                          <p className="text-3xl font-black text-[#d7c8a4]">
                            {money(row.amount)}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {currentSlide === "money_rounds" && (
              <div className="space-y-7">
                <div>
                  <p className="closing-kicker closing-slide-kicker">Money Rounds Summary</p>
                  <h1 className="closing-title mt-4 text-6xl font-black lg:text-8xl">
                    Official Winners
                  </h1>
                </div>

                {roundSummaries.length === 0 ? (
                  <EmptyState>No finalized Money Rounds yet.</EmptyState>
                ) : (
                  <div className="grid gap-4 lg:grid-cols-2">
                    {roundSummaries.map((summary) => (
                      <div
                        key={summary.round.id}
                        className="closing-card rounded-[0.9rem] border p-6"
                      >
                        <p className="closing-kicker text-[11px]">
                          {formatDate(summary.round.round_date)}
                        </p>
                        <h2 className="mt-3 text-3xl font-black">
                          {summary.round.name}
                        </h2>
                        {summary.winner ? (
                          <div className="mt-5 flex items-end justify-between gap-4">
                            <div>
                              <p className="text-2xl font-black text-[#d7c8a4]">
                                {summary.winner.team.name}
                              </p>
                              <p className="mt-1 text-sm text-[#9b958b]">
                                {summary.winner.team.player_names.join(", ")}
                              </p>
                            </div>
                            <p className="text-4xl font-black">
                              {formatScoreToCompletedPar(
                                summary.winner.total,
                                summary.winner.scoresByHole,
                              )}
                            </p>
                          </div>
                        ) : (
                          <p className="mt-5 text-[#b8b0a1]">
                            No scorecard data.
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {currentSlide === "skins" && (
              <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-end">
                <div>
                  <p className="closing-kicker closing-slide-kicker">Skins Highlights</p>
                  <h1 className="closing-title mt-4 text-6xl font-black lg:text-8xl">
                    Hole Winners
                  </h1>
                  <p className="mt-6 text-3xl font-black text-[#d7c8a4]">
                    {roundSummaries.reduce(
                      (total, summary) => total + summary.skins.length,
                      0,
                    )}{" "}
                    total skins
                  </p>
                </div>

                {skinLeaders.length === 0 ? (
                  <EmptyState>No skins awarded yet.</EmptyState>
                ) : (
                  <div className="closing-card rounded-[0.9rem] border p-6">
                    <div className="space-y-3">
                      {skinLeaders.slice(0, 7).map((row) => (
                        <div
                          key={row.teamName}
                          className="closing-stat-row grid grid-cols-[1fr_auto_auto] items-center gap-4 rounded-[0.6rem] border px-4 py-3"
                        >
                          <p className="truncate text-2xl font-black">
                            {row.teamName}
                          </p>
                          <p className="font-mono text-xl font-black text-[#d7c8a4]">
                            {row.count} skins
                          </p>
                          <p className="text-2xl font-black">
                            {money(row.value)}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {currentSlide === "shenanigans" && (
              <div className="grid gap-8 lg:grid-cols-[0.85fr_1.15fr] lg:items-end">
                <div>
                  <p className="closing-kicker closing-slide-kicker">Shenanigans</p>
                  <h1 className="closing-title mt-4 text-6xl font-black lg:text-8xl">
                    Shenanigans Points
                  </h1>
                  <p className="mt-6 text-3xl font-black text-[#d7c8a4]">
                    {shenanigansEvents.length} logged events
                  </p>
                </div>

                {shenanigansTotals.length === 0 ? (
                  <EmptyState>No Shenanigans events logged yet.</EmptyState>
                ) : (
                  <div className="closing-card rounded-[0.9rem] border p-6">
                    <div className="space-y-3">
                      {shenanigansTotals.slice(0, 7).map((row) => (
                        <div
                          key={row.player}
                          className="closing-stat-row flex items-center justify-between gap-4 rounded-[0.6rem] border px-4 py-3"
                        >
                          <p className="text-2xl font-black">{row.player}</p>
                          <p className="text-3xl font-black text-[#d7c8a4]">
                            {row.points > 0 ? "+" : ""}
                            {row.points}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {currentSlide === "settlement" && (
              <div className="space-y-7">
                <div>
                  <p className="closing-kicker closing-slide-kicker">Final Settlement</p>
                  <h1 className="closing-title mt-4 text-6xl font-black lg:text-8xl">
                    What We Know
                  </h1>
                </div>

                <div className="grid gap-4 lg:grid-cols-3">
                  <div className="closing-card rounded-[0.9rem] border p-6">
                    <p className="closing-kicker text-[11px]">Money Bank</p>
                    <p className="mt-4 text-5xl font-black text-[#d7c8a4]">
                      {money(
                        moneyBankRows.reduce((total, row) => total + row.net, 0),
                      )}
                    </p>
                    <p className="mt-3 text-[#b8b0a1]">
                      Net Money Rounds position across scored/final rounds.
                    </p>
                  </div>

                  <div className="closing-card rounded-[0.9rem] border p-6">
                    <p className="closing-kicker text-[11px]">Parimutuel</p>
                    <p className="mt-4 text-5xl font-black text-[#d7c8a4]">
                      {money(parimutuelTotals.total)}
                    </p>
                    <p className="mt-3 text-[#b8b0a1]">
                      Total ledgered bets tracked through the week.
                    </p>
                  </div>

                  <div className="closing-card rounded-[0.9rem] border p-6">
                    <p className="closing-kicker text-[11px]">Camp Feed</p>
                    <p className="mt-4 text-5xl font-black text-[#d7c8a4]">
                      {feedItems.length}
                    </p>
                    <p className="mt-3 text-[#b8b0a1]">
                      Recent camp-wide highlights available for the archive.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {currentSlide === "closing" && (
              <div className="mx-auto max-w-6xl text-center">
                <p className="closing-kicker closing-slide-kicker">Longview Invitational</p>
                <h1 className="closing-title mt-6 text-7xl font-black tracking-[-0.08em] lg:text-9xl">
                  See You Next Year
                </h1>
              </div>
            )}
          </div>
        </section>

        <footer className="closing-footer flex items-center justify-between gap-4 rounded-[0.75rem] border px-4 py-3">
          <button
            type="button"
            onClick={() => advance(-1)}
            disabled={slideIndex === 0}
            className="closing-button disabled:cursor-not-allowed disabled:opacity-40"
          >
            Previous
          </button>

          <div className="hidden items-center gap-2 sm:flex">
            {slides.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setCurrentSlide(item.id)}
                className={`h-2.5 rounded-full transition ${
                  item.id === currentSlide
                    ? "w-8 bg-[#d7c8a4]"
                    : "w-2.5 bg-[#4a4337]"
                }`}
                aria-label={`Go to ${item.label}`}
              />
            ))}
          </div>

          <button
            type="button"
            onClick={() => advance(1)}
            disabled={slideIndex === slides.length - 1}
            className="closing-button disabled:cursor-not-allowed disabled:opacity-40"
          >
            Next
          </button>
        </footer>
      </div>

      <style>{`
        .closing-shell {
          --closing-accent: #d7c8a4;
          --closing-accent-soft: #8fa66a;
          position: relative;
          isolation: isolate;
          background:
            radial-gradient(circle at 18% 10%, rgba(215, 200, 164, 0.13), transparent 30rem),
            radial-gradient(circle at 82% 78%, rgba(143, 166, 106, 0.1), transparent 32rem),
            linear-gradient(135deg, #020202 0%, #090806 52%, #000 100%);
        }

        .closing-shell::before {
          content: "";
          position: fixed;
          inset: -14%;
          z-index: -1;
          pointer-events: none;
          background:
            radial-gradient(circle at 50% 0%, rgba(244, 241, 234, 0.06), transparent 28rem),
            radial-gradient(circle at 6% 70%, rgba(215, 200, 164, 0.06), transparent 24rem);
          animation: closingAmbient 22s ease-in-out infinite alternate;
        }

        .closing-shell::after {
          content: "";
          position: fixed;
          inset: 0;
          z-index: -1;
          pointer-events: none;
          background:
            radial-gradient(circle at center, transparent 38%, rgba(0, 0, 0, 0.46) 100%),
            repeating-linear-gradient(
              0deg,
              rgba(244, 241, 234, 0.014) 0,
              rgba(244, 241, 234, 0.014) 1px,
              transparent 1px,
              transparent 8px
            );
          opacity: 0.45;
        }

        .closing-topbar,
        .closing-footer,
        .closing-card,
        .closing-stat-row {
          position: relative;
          overflow: hidden;
          border-color: color-mix(in srgb, var(--closing-accent) 40%, rgba(244, 241, 234, 0.12));
          background:
            radial-gradient(ellipse at 0% 50%, color-mix(in srgb, var(--closing-accent) 12%, transparent), transparent 16rem),
            radial-gradient(ellipse at 100% 50%, color-mix(in srgb, var(--closing-accent-soft) 7%, transparent), transparent 16rem),
            linear-gradient(180deg, rgba(19, 17, 13, 0.86), rgba(5, 5, 4, 0.76));
          box-shadow:
            inset 0 0 0 1px color-mix(in srgb, var(--closing-accent) 14%, transparent),
            inset 0 0 24px color-mix(in srgb, var(--closing-accent) 7%, transparent),
            0 22px 68px rgba(0, 0, 0, 0.42),
            0 0 42px color-mix(in srgb, var(--closing-accent) 9%, transparent);
          backdrop-filter: blur(18px);
        }

        .closing-card::before,
        .closing-stat-row::before {
          content: "";
          position: absolute;
          inset: 0;
          pointer-events: none;
          background:
            linear-gradient(90deg, color-mix(in srgb, var(--closing-accent) 13%, transparent), transparent 22%, transparent 78%, color-mix(in srgb, var(--closing-accent) 7%, transparent)),
            linear-gradient(180deg, rgba(255, 255, 255, 0.04), transparent 38%);
          opacity: 0.58;
        }

        .closing-card > *,
        .closing-stat-row > * {
          position: relative;
          z-index: 1;
        }

        .closing-kicker,
        .closing-pill,
        .closing-button {
          font-family:
            var(--font-geist-mono),
            ui-monospace,
            SFMono-Regular,
            Menlo,
            Monaco,
            Consolas,
            "Liberation Mono",
            "Courier New",
            monospace;
          text-transform: uppercase;
          letter-spacing: 0.16em;
          font-weight: 900;
        }

        .closing-kicker {
          color: var(--closing-accent);
          text-shadow: 0 0 24px color-mix(in srgb, var(--closing-accent) 18%, transparent);
        }

        .closing-slide-kicker {
          font-size: clamp(1.05rem, 1.4vw, 1.65rem);
          letter-spacing: 0.2em;
          line-height: 1;
        }

        .closing-pill {
          border: 1px solid color-mix(in srgb, var(--closing-accent) 42%, transparent);
          border-radius: 0.35rem;
          padding: 0.35rem 0.55rem;
          color: var(--closing-accent);
          font-size: 0.64rem;
          background: color-mix(in srgb, var(--closing-accent) 10%, transparent);
        }

        .closing-title {
          font-family:
            var(--font-geist-mono),
            ui-monospace,
            SFMono-Regular,
            Menlo,
            Monaco,
            Consolas,
            "Liberation Mono",
            "Courier New",
            monospace;
          text-transform: uppercase;
          color: #f4f1ea;
          text-shadow:
            0 0 24px color-mix(in srgb, var(--closing-accent) 15%, transparent),
            0 0 70px color-mix(in srgb, var(--closing-accent) 13%, transparent),
            0 8px 46px rgba(0, 0, 0, 0.5);
        }

        .closing-button {
          border: 1px solid color-mix(in srgb, var(--closing-accent) 42%, rgba(244, 241, 234, 0.1));
          border-radius: 0.45rem;
          padding: 0.75rem 1rem;
          color: var(--closing-accent);
          background:
            linear-gradient(180deg, color-mix(in srgb, var(--closing-accent) 12%, rgba(255, 255, 255, 0.03)), rgba(5, 5, 4, 0.72));
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.08),
            0 0 22px color-mix(in srgb, var(--closing-accent) 10%, transparent);
        }

        .closing-slide {
          animation: closingSlide 640ms ease both;
        }

        @keyframes closingAmbient {
          from {
            transform: translate3d(-0.4%, -0.3%, 0) scale(1);
            opacity: 0.8;
          }
          to {
            transform: translate3d(0.5%, 0.5%, 0) scale(1.02);
            opacity: 1;
          }
        }

        @keyframes closingSlide {
          from {
            opacity: 0;
            transform: translateY(14px) scale(0.996);
            filter: blur(5px);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
            filter: blur(0);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .closing-shell::before,
          .closing-slide {
            animation: none;
          }
        }
      `}</style>
    </main>
  );
}
