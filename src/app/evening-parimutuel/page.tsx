"use client";

import Link from "next/link";
import type { CSSProperties } from "react";
import { useEffect, useMemo, useState } from "react";
import { GolfCampIcon } from "@/components/GolfCampIcons";
import { getPlayerSession, PlayerSession } from "@/lib/playerSession";
import { supabase } from "@/lib/supabase";
import { ActivePlayer, useActivePlayers } from "@/lib/useActivePlayers";

type EveningBet = {
  id: string;
  betting_night: string;
  money_round_day: string;
  market: string;
  selection: string;
  amount: number | string;
  bettor_player_id: string;
  bettor_name: string;
  status: string | null;
  created_at: string | null;
};

type EveningView = "hub" | "wagers" | "ledger";

type DraftSessionOption = {
  id: string;
  name: string;
  status: string | null;
  completed_at: string | null;
  created_at: string | null;
};

type DraftTeamOption = {
  id: string;
  draft_session_id: string;
  name: string;
  draft_position: number | null;
};

const rulesSeenKey = "eveningParimutuelRulesSeen";

const nights = [
  { value: "tuesday", label: "Tuesday Night", roundDay: "Wednesday" },
  { value: "wednesday", label: "Wednesday Night", roundDay: "Thursday" },
  { value: "thursday", label: "Thursday Night", roundDay: "Friday" },
  { value: "friday", label: "Friday Night", roundDay: "Saturday" },
];

const markets = [
  "Money Round Winner",
  "Most Birdies",
  "Show or Better (Top 3)",
  "2nd to Last Place",
  "Hardest Hole",
  "Easiest Hole",
  "Tiebreaker or Outright Winner",
];

const holeMarkets = new Set(["Hardest Hole", "Easiest Hole"]);
const quickBetAmounts = [5, 10, 15, 20];

const moneyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

function formatMoney(value: number) {
  return moneyFormatter.format(value);
}

function normalizeAmount(value: number | string) {
  const amount = Number(value);
  return Number.isFinite(amount) ? amount : 0;
}

function formatDateTime(value: string | null) {
  if (!value) {
    return "just now";
  }

  return new Date(value).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function getNightMeta(nightValue: string) {
  return nights.find((night) => night.value === nightValue) || nights[0];
}

function EveningActionCard({
  title,
  subtitle,
  label,
  isPrimary = false,
  onClick,
}: {
  title: string;
  subtitle: string;
  label: string;
  isPrimary?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`gc-edge-card grid w-full grid-cols-[3.35rem_1fr_auto] items-center gap-3 px-4 py-3.5 text-left transition hover:border-[#9c91ba]/60 ${
        isPrimary ? "bg-[#9c91ba]/[0.055]" : ""
      }`}
    >
      <span className="gc-edge-mark font-mono text-sm font-black">
        {label}
      </span>
      <span className="min-w-0">
        <span className="gc-edge-title block">{title}</span>
        <span className="gc-edge-meta block whitespace-normal">{subtitle}</span>
      </span>
      <span className="gc-edge-arrow">→</span>
    </button>
  );
}

function RulesModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/72 p-4 backdrop-blur-sm sm:items-center sm:justify-center">
      <section className="gc-edge-card max-h-[86vh] w-full max-w-md overflow-y-auto" style={{ "--page-accent": "#9c91ba" } as CSSProperties}>
        <div className="gc-section-head">
          <p className="gc-card-kicker">House Rules</p>
          <h2 className="gc-card-title">Parimutuel Bets</h2>
          <p className="gc-card-copy">
            A simple ledger for next-day Money Round pools. No banker, no pot,
            no sportsbook energy.
          </p>
        </div>

        <div className="space-y-3 p-5 text-sm leading-6 text-[#d8d0ea]">
          <p>No money is collected during camp. The app acts as the ledger.</p>
          <p>Every bet, payout, and balance is tracked for the group.</p>
          <p>
            At the end of camp, a public settlement report shows who owes and
            who collects.
          </p>
          <p>Players settle directly via cash, Venmo, or whatever works.</p>
          <p>There is no banker and no central pot.</p>
          <p>Bets lock at the first tee time for the next Money Round.</p>
          <p>
            Winning bettors split each market pool proportionally based on how
            much they backed the winning side.
          </p>
        </div>

        <div className="border-t border-[#34312a] p-5">
          <button
            type="button"
            onClick={onClose}
            className="gc-primary-button"
          >
            Got It
          </button>
        </div>
      </section>
    </div>
  );
}

function PlayerSelect({
  players,
  selectedPlayerId,
  onChange,
  session,
}: {
  players: ActivePlayer[];
  selectedPlayerId: string;
  onChange: (playerId: string) => void;
  session: PlayerSession | null;
}) {
  if (session) {
    return (
      <div className="rounded-lg border border-[#34312a] bg-black/30 px-4 py-3">
        <p className="font-mono text-[10px] font-black uppercase tracking-[0.18em] text-[#9c91ba]">
          Betting As
        </p>
        <p className="mt-1 font-semibold text-[#f4f1ea]">
          {session.display_name}
        </p>
      </div>
    );
  }

  return (
    <label className="block">
      <span className="mb-2 block font-mono text-[10px] font-black uppercase tracking-[0.18em] text-[#9c91ba]">
        Player
      </span>
      <select
        value={selectedPlayerId}
        onChange={(event) => onChange(event.target.value)}
        className="gc-input"
      >
        <option value="">Select player</option>
        {players.map((player) => (
          <option key={player.id} value={player.id}>
            {player.display_name}
          </option>
        ))}
      </select>
    </label>
  );
}

export default function EveningParimutuelPage() {
  const { players, isLoading: isLoadingPlayers, error: playersError } =
    useActivePlayers();
  const [session] = useState<PlayerSession | null>(() => getPlayerSession());
  const [bets, setBets] = useState<EveningBet[]>([]);
  const [draftSession, setDraftSession] = useState<DraftSessionOption | null>(
    null,
  );
  const [draftTeams, setDraftTeams] = useState<DraftTeamOption[]>([]);
  const [isLoadingDraftTeams, setIsLoadingDraftTeams] = useState(true);
  const [draftTeamsError, setDraftTeamsError] = useState("");
  const [selectedNight, setSelectedNight] = useState(nights[0].value);
  const [selectedPlayerId, setSelectedPlayerId] = useState(
    () => getPlayerSession()?.id || "",
  );
  const [marketSelections, setMarketSelections] = useState<Record<string, string>>(
    {},
  );
  const [marketAmounts, setMarketAmounts] = useState<Record<string, number>>(
    () =>
      markets.reduce<Record<string, number>>((accumulator, market) => {
        accumulator[market] = 5;
        return accumulator;
      }, {}),
  );
  const [isLoadingBets, setIsLoadingBets] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [activeView, setActiveView] = useState<EveningView>("hub");
  const [showRules, setShowRules] = useState(false);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setShowRules(!window.localStorage.getItem(rulesSeenKey));
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

  useEffect(() => {
    let isCurrent = true;

    async function fetchBets() {
      setIsLoadingBets(true);

      const { data, error: fetchError } = await supabase
        .from("evening_parimutuel_bets")
        .select("*")
        .eq("status", "active")
        .order("created_at", { ascending: false });

      if (!isCurrent) {
        return;
      }

      if (fetchError) {
        setBets([]);
        setError(
          fetchError.code === "42P01"
            ? "Parimutuel Bets needs the Supabase setup SQL before bets can be saved."
            : fetchError.message || "Could not load Parimutuel Bets.",
        );
        setIsLoadingBets(false);
        return;
      }

      setBets((data as EveningBet[]) || []);
      setIsLoadingBets(false);
    }

    fetchBets();
    const intervalId = window.setInterval(fetchBets, 30000);

    return () => {
      isCurrent = false;
      window.clearInterval(intervalId);
    };
  }, []);

  useEffect(() => {
    let isCurrent = true;

    async function fetchDraftTeams() {
      setIsLoadingDraftTeams(true);
      setDraftTeamsError("");

      const { data: sessionData, error: sessionError } = await supabase
        .from("draft_sessions")
        .select("id, name, status, completed_at, created_at")
        .in("status", ["complete", "completed", "final", "finalized"])
        .order("completed_at", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false })
        .limit(1);

      if (!isCurrent) {
        return;
      }

      if (sessionError) {
        setDraftSession(null);
        setDraftTeams([]);
        setDraftTeamsError(
          sessionError.message || "Could not load completed draft teams.",
        );
        setIsLoadingDraftTeams(false);
        return;
      }

      const latestSession = ((sessionData as DraftSessionOption[]) || [])[0];

      if (!latestSession) {
        setDraftSession(null);
        setDraftTeams([]);
        setDraftTeamsError("No completed draft available yet.");
        setIsLoadingDraftTeams(false);
        return;
      }

      const { data: teamData, error: teamError } = await supabase
        .from("draft_teams")
        .select("id, draft_session_id, name, draft_position")
        .eq("draft_session_id", latestSession.id)
        .order("draft_position", { ascending: true });

      if (!isCurrent) {
        return;
      }

      if (teamError) {
        setDraftSession(latestSession);
        setDraftTeams([]);
        setDraftTeamsError(teamError.message || "Could not load draft teams.");
        setIsLoadingDraftTeams(false);
        return;
      }

      setDraftSession(latestSession);
      setDraftTeams((teamData as DraftTeamOption[]) || []);
      setIsLoadingDraftTeams(false);
    }

    fetchDraftTeams();

    return () => {
      isCurrent = false;
    };
  }, []);

  const selectedNightMeta = getNightMeta(selectedNight);
  const selectedPlayer =
    players.find((player) => player.id === selectedPlayerId) ||
    (session
      ? {
          id: session.id,
          first_name: "",
          last_name: "",
          display_name: session.display_name,
        }
      : null);

  const visibleBets = bets.filter((bet) => bet.betting_night === selectedNight);
  const teamOptions = useMemo(
    () =>
      draftTeams
        .map((team) => team.name)
        .filter((teamName, index, teamNames) => teamNames.indexOf(teamName) === index),
    [draftTeams],
  );
  const holeOptions = useMemo(
    () => Array.from({ length: 18 }, (_, index) => `Hole ${index + 1}`),
    [],
  );
  const cumulativeBetTotal = bets.reduce(
    (total, bet) => total + normalizeAmount(bet.amount),
    0,
  );
  const myBets = selectedPlayerId
    ? visibleBets.filter((bet) => bet.bettor_player_id === selectedPlayerId)
    : [];
  const groupedPoolRows = visibleBets.reduce<
    Record<string, { market: string; selection: string; total: number; count: number }>
  >((accumulator, bet) => {
    const key = `${bet.market}::${bet.selection}`;

    if (!accumulator[key]) {
      accumulator[key] = {
        market: bet.market,
        selection: bet.selection,
        total: 0,
        count: 0,
      };
    }

    accumulator[key].total += normalizeAmount(bet.amount);
    accumulator[key].count += 1;
    return accumulator;
  }, {});
  const poolRows = Object.values(groupedPoolRows).sort(
    (a, b) => b.total - a.total || a.market.localeCompare(b.market),
  );
  const cumulativePoolRows = Object.values(
    bets.reduce<
      Record<
        string,
        {
          night: string;
          market: string;
          selection: string;
          total: number;
          count: number;
        }
      >
    >((accumulator, bet) => {
      const key = `${bet.betting_night}::${bet.market}::${bet.selection}`;

      if (!accumulator[key]) {
        accumulator[key] = {
          night: getNightMeta(bet.betting_night).label,
          market: bet.market,
          selection: bet.selection,
          total: 0,
          count: 0,
        };
      }

      accumulator[key].total += normalizeAmount(bet.amount);
      accumulator[key].count += 1;
      return accumulator;
    }, {}),
  ).sort((a, b) => b.total - a.total || a.night.localeCompare(b.night));
  const playerLedgerRows = Object.values(
    bets.reduce<
      Record<string, { player: string; total: number; count: number }>
    >((accumulator, bet) => {
      if (!accumulator[bet.bettor_player_id]) {
        accumulator[bet.bettor_player_id] = {
          player: bet.bettor_name,
          total: 0,
          count: 0,
        };
      }

      accumulator[bet.bettor_player_id].total += normalizeAmount(bet.amount);
      accumulator[bet.bettor_player_id].count += 1;
      return accumulator;
    }, {}),
  ).sort((a, b) => b.total - a.total || a.player.localeCompare(b.player));

  function getMarketOptions(market: string) {
    return holeMarkets.has(market) ? holeOptions : teamOptions;
  }

  function getMarketPlayerTotal(market: string) {
    if (!selectedPlayerId) {
      return 0;
    }

    return visibleBets
      .filter(
        (bet) =>
          bet.bettor_player_id === selectedPlayerId && bet.market === market,
      )
      .reduce((total, bet) => total + normalizeAmount(bet.amount), 0);
  }

  function getMarketPoolRows(market: string) {
    return Object.values(
      visibleBets
        .filter((bet) => bet.market === market)
        .reduce<
          Record<string, { selection: string; total: number; count: number }>
        >((accumulator, bet) => {
          if (!accumulator[bet.selection]) {
            accumulator[bet.selection] = {
              selection: bet.selection,
              total: 0,
              count: 0,
            };
          }

          accumulator[bet.selection].total += normalizeAmount(bet.amount);
          accumulator[bet.selection].count += 1;
          return accumulator;
        }, {}),
    ).sort((a, b) => b.total - a.total || a.selection.localeCompare(b.selection));
  }

  function setMarketSelection(market: string, nextSelection: string) {
    setMarketSelections((currentSelections) => ({
      ...currentSelections,
      [market]: nextSelection,
    }));
    setMessage("");
    setError("");
  }

  function setMarketAmount(market: string, nextAmount: number) {
    setMarketAmounts((currentAmounts) => ({
      ...currentAmounts,
      [market]: nextAmount,
    }));
    setMessage("");
    setError("");
  }

  function closeRules() {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(rulesSeenKey, "true");
    }
    setShowRules(false);
  }

  async function handleSubmitBet(market: string) {
    const parsedAmount = Number(marketAmounts[market] || 0);
    const trimmedSelection = (marketSelections[market] || "").trim();
    const currentMarketTotal = getMarketPlayerTotal(market);

    setMessage("");
    setError("");

    if (!selectedPlayer) {
      setError("Choose a player before placing a bet.");
      return;
    }

    if (!trimmedSelection) {
      setError("Select an option for this market.");
      return;
    }

    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setError("Bet amount must be greater than $0.");
      return;
    }

    if (currentMarketTotal + parsedAmount > 20) {
      setError("Max $20 per market.");
      return;
    }

    setIsSaving(true);

    const { data, error: insertError } = await supabase
      .from("evening_parimutuel_bets")
      .insert({
        betting_night: selectedNight,
        money_round_day: selectedNightMeta.roundDay,
        market,
        selection: trimmedSelection,
        amount: parsedAmount,
        bettor_player_id: selectedPlayer.id,
        bettor_name: selectedPlayer.display_name,
      })
      .select("*")
      .single();

    setIsSaving(false);

    if (insertError) {
      setError(insertError.message || "Could not place bet.");
      return;
    }

    setBets((currentBets) => [data as EveningBet, ...currentBets]);
    setMessage(`${formatMoney(parsedAmount)} bet placed on ${trimmedSelection}.`);
  }

  return (
    <main className="gc-mobile-shell" style={{ "--page-accent": "#9c91ba" } as CSSProperties}>
      {showRules && <RulesModal onClose={closeRules} />}

      <div className="gc-mobile-stage justify-start">
        <header className="gc-topbar">
          <Link href="/home" className="gc-back-link">
            ‹
          </Link>
          <p className="gc-topbar-title">Parimutuel Bets</p>
          <span className="gc-top-icon">
            <GolfCampIcon name="calcutta" className="h-4 w-4" />
          </span>
        </header>

        <section className="space-y-3">
          <EveningActionCard
            title="Rules"
            subtitle="How the pool, payouts, and settlement work"
            label="01"
            isPrimary
            onClick={() => setShowRules(true)}
          />
          <EveningActionCard
            title="Place Wagers"
            subtitle="Pick markets and place tonight's bets"
            label="02"
            onClick={() => setActiveView("wagers")}
          />
          <EveningActionCard
            title="Ledger & Settlement"
            subtitle="Track weekly balances and final payments"
            label="03"
            onClick={() => setActiveView("ledger")}
          />
        </section>

        {activeView === "wagers" && (
          <>
        <section className="gc-edge-card overflow-hidden">
          <div className="gc-section-head">
            <p className="gc-card-kicker">Market Board</p>
            <h2 className="gc-card-title">Place Wagers</h2>
            <p className="gc-card-copy">
              Pick from drafted teams or hole numbers. Max {formatMoney(20)} per
              player, per market, per night.
            </p>
          </div>

          <div className="space-y-4 p-5">
            <label className="block">
              <span className="mb-2 block font-mono text-[10px] font-black uppercase tracking-[0.18em] text-[#9c91ba]">
                Betting Night
              </span>
              <select
                value={selectedNight}
                onChange={(event) => {
                  setSelectedNight(event.target.value);
                  setMessage("");
                  setError("");
                }}
                className="gc-input"
              >
                {nights.map((night) => (
                  <option key={night.value} value={night.value}>
                    {night.label} for {night.roundDay}
                  </option>
                ))}
              </select>
            </label>

            <PlayerSelect
              players={players}
              selectedPlayerId={selectedPlayerId}
              onChange={setSelectedPlayerId}
              session={session}
            />

            <div className="rounded-xl border border-[#746a91]/40 bg-[#746a91]/10 px-4 py-3">
              <p className="font-mono text-[10px] font-black uppercase tracking-[0.18em] text-[#9c91ba]">
                Draft Source
              </p>
              <p className="mt-1 text-sm font-semibold text-[#f4f1ea]">
                {isLoadingDraftTeams
                  ? "Loading completed draft..."
                  : draftSession
                    ? draftSession.name
                    : "No completed draft yet"}
              </p>
              {draftTeamsError && (
                <p className="mt-1 text-xs font-semibold text-[#fca5a5]">
                  {draftTeamsError}
                </p>
              )}
            </div>

            {playersError && (
              <p className="text-sm font-semibold text-[#fca5a5]">
                {playersError}
              </p>
            )}
            {isLoadingPlayers && (
              <p className="text-sm font-semibold text-[#a3a3a3]">
                Loading players...
              </p>
            )}
            {message && <p className="text-sm font-semibold text-[#d8d0ea]">{message}</p>}
            {error && <p className="text-sm font-semibold text-[#fca5a5]">{error}</p>}
          </div>
        </section>

        <section className="space-y-4">
          {markets.map((market) => {
            const options = getMarketOptions(market);
            const selectedOption = marketSelections[market] || "";
            const selectedAmount = marketAmounts[market] || 5;
            const playerTotal = getMarketPlayerTotal(market);
            const marketPoolRows = getMarketPoolRows(market);
            const totalPool = marketPoolRows.reduce(
              (total, row) => total + row.total,
              0,
            );
            const isHoleMarket = holeMarkets.has(market);
            const isDisabled =
              isSaving ||
              isLoadingPlayers ||
              isLoadingDraftTeams ||
              !selectedPlayerId ||
              !selectedOption ||
              options.length === 0;

            return (
              <article
                key={market}
                className="gc-edge-card overflow-hidden border-[#746a91]/45"
              >
                <div className="border-b border-[#746a91]/25 bg-[radial-gradient(circle_at_0%_0%,rgba(156,145,186,0.22),transparent_12rem)] px-5 py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="font-mono text-[10px] font-black uppercase tracking-[0.18em] text-[#9c91ba]">
                        Market
                      </p>
                      <h3 className="mt-1 text-xl font-black tracking-[-0.04em] text-[#f4f1ea]">
                        {market}
                      </h3>
                    </div>
                    <div className="shrink-0 rounded-xl border border-[#746a91]/45 bg-black/35 px-3 py-2 text-right">
                      <p className="font-mono text-[9px] font-black uppercase tracking-[0.16em] text-[#9c91ba]">
                        Pool
                      </p>
                      <p className="mt-1 font-mono text-lg font-black text-[#d8d0ea]">
                        {formatMoney(totalPool)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4 p-5">
                  {options.length === 0 ? (
                    <p className="rounded-xl border border-[#34312a] bg-black/30 px-4 py-3 text-sm font-semibold text-[#a3a3a3]">
                      {isHoleMarket
                        ? "No holes available."
                        : "Draft teams will appear here after the draft is complete."}
                    </p>
                  ) : isHoleMarket ? (
                    <div>
                      <p className="mb-2 font-mono text-[10px] font-black uppercase tracking-[0.18em] text-[#9c91ba]">
                        Select Hole
                      </p>
                      <div className="grid grid-cols-6 gap-2">
                        {options.map((option) => (
                          <button
                            key={option}
                            type="button"
                            onClick={() => setMarketSelection(market, option)}
                            className={`rounded-lg border px-2 py-2 text-xs font-black transition ${
                              selectedOption === option
                                ? "border-[#9c91ba] bg-[#9c91ba] text-[#050505]"
                                : "border-[#34312a] bg-black/30 text-[#f4f1ea] hover:border-[#9c91ba]"
                            }`}
                          >
                            {option.replace("Hole ", "")}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <label className="block">
                      <span className="mb-2 block font-mono text-[10px] font-black uppercase tracking-[0.18em] text-[#9c91ba]">
                        Select Draft Team
                      </span>
                      <select
                        value={selectedOption}
                        onChange={(event) =>
                          setMarketSelection(market, event.target.value)
                        }
                        className="gc-input"
                      >
                        <option value="">Choose team</option>
                        {options.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}

                  {marketPoolRows.length > 0 && (
                    <div className="overflow-hidden rounded-xl border border-[#34312a] bg-black/25">
                      {marketPoolRows.slice(0, 4).map((row) => (
                        <div
                          key={row.selection}
                          className="grid grid-cols-[1fr_auto] gap-3 border-b border-[#34312a] px-4 py-3 last:border-b-0"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm font-bold text-[#f4f1ea]">
                              {row.selection}
                            </p>
                            <p className="mt-0.5 text-xs text-[#a3a3a3]">
                              {row.count} bet{row.count === 1 ? "" : "s"}
                            </p>
                          </div>
                          <p className="font-mono text-sm font-black text-[#d8d0ea]">
                            {formatMoney(row.total)}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}

                  <div>
                    <p className="mb-2 font-mono text-[10px] font-black uppercase tracking-[0.18em] text-[#9c91ba]">
                      Quick Bet
                    </p>
                    <div className="grid grid-cols-4 gap-2">
                      {quickBetAmounts.map((quickAmount) => (
                        <button
                          key={quickAmount}
                          type="button"
                          onClick={() => setMarketAmount(market, quickAmount)}
                          className={`rounded-xl border px-2 py-3 font-mono text-sm font-black transition ${
                            selectedAmount === quickAmount
                              ? "border-[#d8d0ea] bg-[#d8d0ea] text-[#050505]"
                              : "border-[#746a91]/50 bg-black/30 text-[#d8d0ea] hover:border-[#d8d0ea]"
                          }`}
                        >
                          {formatMoney(quickAmount)}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-[1fr_auto] items-center gap-3">
                    <p className="min-w-0 text-xs font-semibold text-[#a3a3a3]">
                      {selectedOption
                        ? `${formatMoney(selectedAmount)} on ${selectedOption}`
                        : "Select an option to place a bet."}
                      {playerTotal > 0 ? ` ${formatMoney(playerTotal)} already backed.` : ""}
                    </p>
                    <button
                      type="button"
                      onClick={() => handleSubmitBet(market)}
                      disabled={isDisabled}
                      className="rounded-xl border border-[#9c91ba] bg-[#9c91ba] px-4 py-3 text-sm font-black text-[#050505] transition hover:border-[#d8d0ea] hover:bg-[#d8d0ea] disabled:cursor-not-allowed disabled:opacity-45"
                    >
                      {isSaving ? "Logging..." : "Place Bet"}
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </section>

        <section className="gc-edge-card">
          <div className="gc-section-head">
            <p className="gc-card-kicker">Pool Ledger</p>
            <h2 className="gc-card-title">{selectedNightMeta.label}</h2>
          </div>

          {isLoadingBets && (
            <p className="p-5 text-sm font-semibold text-[#a3a3a3]">
              Loading pools...
            </p>
          )}

          {!isLoadingBets && poolRows.length === 0 && (
            <p className="p-5 text-sm font-semibold text-[#a3a3a3]">
              No bets logged for this night yet.
            </p>
          )}

          {!isLoadingBets &&
            poolRows.slice(0, 12).map((row) => (
              <div
                key={`${row.market}-${row.selection}`}
                className="grid grid-cols-[1fr_auto] gap-3 border-b border-[#34312a] px-5 py-4 last:border-b-0"
              >
                <div className="min-w-0">
                  <p className="truncate font-mono text-[10px] font-black uppercase tracking-[0.16em] text-[#9c91ba]">
                    {row.market}
                  </p>
                  <h3 className="mt-1 truncate font-semibold text-[#f4f1ea]">
                    {row.selection}
                  </h3>
                  <p className="mt-1 text-xs text-[#a3a3a3]">
                    {row.count} bet{row.count === 1 ? "" : "s"}
                  </p>
                </div>
                <p className="self-center font-mono text-xl font-black text-[#d8d0ea]">
                  {formatMoney(row.total)}
                </p>
              </div>
            ))}
        </section>

        <section className="gc-edge-card">
          <div className="gc-section-head">
            <p className="gc-card-kicker">Player Ledger</p>
            <h2 className="gc-card-title">My Bets</h2>
          </div>

          {myBets.length === 0 ? (
            <p className="p-5 text-sm font-semibold text-[#a3a3a3]">
              No bets for the selected player and night.
            </p>
          ) : (
            myBets.slice(0, 8).map((bet) => (
              <div
                key={bet.id}
                className="border-b border-[#34312a] px-5 py-4 last:border-b-0"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-[#f4f1ea]">
                      {bet.selection}
                    </p>
                    <p className="mt-1 text-xs text-[#a3a3a3]">
                      {bet.market} · {formatDateTime(bet.created_at)}
                    </p>
                  </div>
                  <span className="font-mono text-sm font-black text-[#d8d0ea]">
                    {formatMoney(normalizeAmount(bet.amount))}
                  </span>
                </div>
              </div>
            ))
          )}
        </section>
          </>
        )}

        {activeView === "ledger" && (
          <>
            <section className="gc-edge-card">
              <div className="gc-section-head">
                <p className="gc-card-kicker">Ledger & Settlement</p>
                <h2 className="gc-card-title">Weekly Ledger</h2>
                <p className="gc-card-copy">
                  Settlement is public at the end of camp once markets are
                  resolved. For now, this tracks every active wager in the
                  ledger.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-px bg-[#746a91]/25">
                <div className="bg-[#0d0d0b]/75 px-4 py-4">
                  <p className="font-mono text-[10px] font-black uppercase tracking-[0.18em] text-[#9c91ba]">
                    Active Bets
                  </p>
                  <p className="mt-1 text-lg font-black text-[#f4f1ea]">
                    {bets.length}
                  </p>
                </div>
                <div className="bg-[#0d0d0b]/75 px-4 py-4">
                  <p className="font-mono text-[10px] font-black uppercase tracking-[0.18em] text-[#9c91ba]">
                    Ledger Total
                  </p>
                  <p className="mt-1 text-lg font-black text-[#f4f1ea]">
                    {formatMoney(cumulativeBetTotal)}
                  </p>
                </div>
              </div>
            </section>

            <section className="gc-edge-card">
              <div className="gc-section-head">
                <p className="gc-card-kicker">Player Balances</p>
                <h2 className="gc-card-title">Amount Backed</h2>
              </div>

              {playerLedgerRows.length === 0 ? (
                <p className="p-5 text-sm font-semibold text-[#a3a3a3]">
                  No Parimutuel Bets ledger activity yet.
                </p>
              ) : (
                playerLedgerRows.map((row) => (
                  <div
                    key={row.player}
                    className="grid grid-cols-[1fr_auto] gap-3 border-b border-[#34312a] px-5 py-4 last:border-b-0"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-[#f4f1ea]">
                        {row.player}
                      </p>
                      <p className="mt-1 text-xs text-[#a3a3a3]">
                        {row.count} bet{row.count === 1 ? "" : "s"}
                      </p>
                    </div>
                    <p className="self-center font-mono text-lg font-black text-[#d8d0ea]">
                      {formatMoney(row.total)}
                    </p>
                  </div>
                ))
              )}
            </section>

            <section className="gc-edge-card">
              <div className="gc-section-head">
                <p className="gc-card-kicker">Cumulative Pools</p>
                <h2 className="gc-card-title">All Nights</h2>
              </div>

              {isLoadingBets && (
                <p className="p-5 text-sm font-semibold text-[#a3a3a3]">
                  Loading ledger...
                </p>
              )}

              {!isLoadingBets && cumulativePoolRows.length === 0 && (
                <p className="p-5 text-sm font-semibold text-[#a3a3a3]">
                  No pools have formed yet.
                </p>
              )}

              {!isLoadingBets &&
                cumulativePoolRows.slice(0, 16).map((row) => (
                  <div
                    key={`${row.night}-${row.market}-${row.selection}`}
                    className="grid grid-cols-[1fr_auto] gap-3 border-b border-[#34312a] px-5 py-4 last:border-b-0"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-mono text-[10px] font-black uppercase tracking-[0.16em] text-[#9c91ba]">
                        {row.night} · {row.market}
                      </p>
                      <h3 className="mt-1 truncate font-semibold text-[#f4f1ea]">
                        {row.selection}
                      </h3>
                    </div>
                    <p className="self-center font-mono text-lg font-black text-[#d8d0ea]">
                      {formatMoney(row.total)}
                    </p>
                  </div>
                ))}
            </section>
          </>
        )}

        <Link href="/home" className="text-center text-sm text-[#a3a3a3]">
          ← Back to Home
        </Link>
      </div>
    </main>
  );
}
