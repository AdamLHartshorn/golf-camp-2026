"use client";

import Link from "next/link";
import type { CSSProperties } from "react";
import { useEffect, useState } from "react";
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
          <h2 className="gc-card-title">Evening Parimutuel</h2>
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
  const [selectedNight, setSelectedNight] = useState(nights[0].value);
  const [selectedMarket, setSelectedMarket] = useState(markets[0]);
  const [selectedPlayerId, setSelectedPlayerId] = useState(
    () => getPlayerSession()?.id || "",
  );
  const [selection, setSelection] = useState("");
  const [amount, setAmount] = useState("5");
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
            ? "Evening Parimutuel needs the Supabase setup SQL before bets can be saved."
            : fetchError.message || "Could not load Evening Parimutuel bets.",
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
  const marketBetsForPlayer = bets.filter(
    (bet) =>
      bet.bettor_player_id === selectedPlayerId &&
      bet.betting_night === selectedNight &&
      bet.market === selectedMarket,
  );
  const currentMarketTotal = marketBetsForPlayer.reduce(
    (total, bet) => total + normalizeAmount(bet.amount),
    0,
  );
  const remainingForMarket = Math.max(0, 20 - currentMarketTotal);

  const visibleBets = bets.filter((bet) => bet.betting_night === selectedNight);
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

  function closeRules() {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(rulesSeenKey, "true");
    }
    setShowRules(false);
  }

  async function handleSubmitBet() {
    const parsedAmount = Number(amount);
    const trimmedSelection = selection.trim();

    setMessage("");
    setError("");

    if (!selectedPlayer) {
      setError("Choose a player before placing a bet.");
      return;
    }

    if (!trimmedSelection) {
      setError("Enter a pick for this market.");
      return;
    }

    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setError("Bet amount must be greater than $0.");
      return;
    }

    if (parsedAmount > remainingForMarket) {
      setError(`This player has ${formatMoney(remainingForMarket)} left for this market tonight.`);
      return;
    }

    setIsSaving(true);

    const { data, error: insertError } = await supabase
      .from("evening_parimutuel_bets")
      .insert({
        betting_night: selectedNight,
        money_round_day: selectedNightMeta.roundDay,
        market: selectedMarket,
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
    setSelection("");
    setAmount("5");
    setMessage("Bet logged.");
  }

  return (
    <main className="gc-mobile-shell" style={{ "--page-accent": "#9c91ba" } as CSSProperties}>
      {showRules && <RulesModal onClose={closeRules} />}

      <div className="gc-mobile-stage justify-start">
        <header className="gc-topbar">
          <Link href="/home" className="gc-back-link">
            ‹
          </Link>
          <p className="gc-topbar-title">Evening Parimutuel</p>
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
        <section className="gc-edge-card">
          <div className="gc-section-head">
            <p className="gc-card-kicker">Place Bet</p>
            <h2 className="gc-card-title">Market Card</h2>
            <p className="gc-card-copy">
              Max {formatMoney(20)} per player, per market, per night.
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

            <label className="block">
              <span className="mb-2 block font-mono text-[10px] font-black uppercase tracking-[0.18em] text-[#9c91ba]">
                Market
              </span>
              <select
                value={selectedMarket}
                onChange={(event) => {
                  setSelectedMarket(event.target.value);
                  setSelection("");
                  setMessage("");
                  setError("");
                }}
                className="gc-input"
              >
                {markets.map((market) => (
                  <option key={market} value={market}>
                    {market}
                  </option>
                ))}
              </select>
            </label>

            {holeMarkets.has(selectedMarket) ? (
              <label className="block">
                <span className="mb-2 block font-mono text-[10px] font-black uppercase tracking-[0.18em] text-[#9c91ba]">
                  Hole
                </span>
                <select
                  value={selection}
                  onChange={(event) => setSelection(event.target.value)}
                  className="gc-input"
                >
                  <option value="">Select hole</option>
                  {Array.from({ length: 18 }, (_, index) => index + 1).map(
                    (hole) => (
                      <option key={hole} value={`Hole ${hole}`}>
                        Hole {hole}
                      </option>
                    ),
                  )}
                </select>
              </label>
            ) : (
              <label className="block">
                <span className="mb-2 block font-mono text-[10px] font-black uppercase tracking-[0.18em] text-[#9c91ba]">
                  Pick
                </span>
                <input
                  value={selection}
                  onChange={(event) => setSelection(event.target.value)}
                  placeholder="Team Hartshorn, Hole 14, etc."
                  className="gc-input"
                />
              </label>
            )}

            <div className="grid grid-cols-[1fr_auto] gap-3">
              <label className="block">
                <span className="mb-2 block font-mono text-[10px] font-black uppercase tracking-[0.18em] text-[#9c91ba]">
                  Amount
                </span>
                <input
                  type="number"
                  min={1}
                  max={remainingForMarket || 20}
                  step={1}
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  className="gc-input"
                />
              </label>
              <div className="self-end rounded-lg border border-[#34312a] bg-black/30 px-4 py-3 text-right">
                <p className="font-mono text-[10px] font-black uppercase tracking-[0.16em] text-[#9c91ba]">
                  Left
                </p>
                <p className="mt-1 font-mono text-lg font-black text-[#f4f1ea]">
                  {formatMoney(remainingForMarket)}
                </p>
              </div>
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

            <button
              type="button"
              onClick={handleSubmitBet}
              disabled={isSaving || isLoadingPlayers || !selectedPlayerId}
              className="gc-primary-button disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSaving ? "Logging Bet..." : "Log Bet"}
            </button>
          </div>
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
                  No Evening Parimutuel ledger activity yet.
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
