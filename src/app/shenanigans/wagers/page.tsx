"use client";

import Link from "next/link";
import type { CSSProperties } from "react";
import { useEffect, useMemo, useState } from "react";
import { logActivityFeedItem } from "@/lib/activityFeed";
import { logAuditEvent } from "@/lib/auditLog";
import { supabase } from "@/lib/supabase";
import {
  CompactPlayerMultiSelect,
  NoShenanigansGamePrompt,
  ShenanigansGameBar,
  useShenanigansGame,
} from "@/lib/shenanigansGame";

const wagerRules = [
  "Verbal agreement locks in a wager.",
  "Wagers can involve 2, 3, or 4 players.",
  "Wagers can be placed on observable activity within the group.",
  "Winner gains the wagered points.",
  "Loser loses the wagered points.",
  "Odds may be used for handicap differences.",
  "On the back nine, the leader must accept at least 3 offered wagers.",
];
const pointOptions = [1, 2, 3, 5, 10];

type WagerRow = {
  id: string;
  description: string;
  points: number;
  status: string | null;
  player_names: string[];
  winner_name: string | null;
  loser_names: string[] | null;
  created_at: string | null;
  settled_at: string | null;
  game_id: string | null;
};

function formatDate(value: string | null) {
  if (!value) {
    return "Pending";
  }

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export default function ShenanigansWagersPage() {
  const {
    games,
    selectedGame,
    selectedGameId,
    selectablePlayers,
    isLoadingGame,
    gameError,
    switchGame,
    endGame,
  } = useShenanigansGame();
  const [wagers, setWagers] = useState<WagerRow[]>([]);
  const [isLoadingWagers, setIsLoadingWagers] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [settlingId, setSettlingId] = useState("");
  const [expandedWagers, setExpandedWagers] = useState<Record<string, boolean>>(
    {},
  );
  const [description, setDescription] = useState("");
  const [points, setPoints] = useState("3");
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([]);
  const [selectedWinners, setSelectedWinners] = useState<Record<string, string>>(
    {},
  );
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const activeWagers = useMemo(
    () => wagers.filter((wager) => wager.status !== "settled"),
    [wagers],
  );
  const settledWagers = useMemo(
    () => wagers.filter((wager) => wager.status === "settled"),
    [wagers],
  );
  const validSelectedPlayers = useMemo(() => {
    const allowedNames = new Set(
      selectablePlayers.map((player) => player.display_name),
    );

    return selectedPlayers.filter((playerName) => allowedNames.has(playerName));
  }, [selectablePlayers, selectedPlayers]);

  async function fetchWagers() {
    if (!selectedGameId) {
      setWagers([]);
      setIsLoadingWagers(false);
      return;
    }

    setIsLoadingWagers(true);

    const { data, error: fetchError } = await supabase
      .from("shenanigans_wagers")
      .select("*")
      .eq("game_id", selectedGameId)
      .order("created_at", { ascending: false });

    console.log("shenanigans_wagers fetched rows:", {
      selectedGameId,
      data,
      error: fetchError,
    });

    if (fetchError) {
      setWagers([]);
      setError(fetchError.message || "Could not load wagers.");
      setIsLoadingWagers(false);
      return;
    }

    setWagers((data as WagerRow[]) || []);
    setIsLoadingWagers(false);
  }

  useEffect(() => {
    let isCurrent = true;

    async function fetchInitialWagers() {
      if (!selectedGameId) {
        setWagers([]);
        setIsLoadingWagers(false);
        return;
      }

      setIsLoadingWagers(true);

      const { data, error: fetchError } = await supabase
        .from("shenanigans_wagers")
        .select("*")
        .eq("game_id", selectedGameId)
        .order("created_at", { ascending: false });

      console.log("shenanigans_wagers fetched rows:", {
        selectedGameId,
        data,
        error: fetchError,
      });

      if (!isCurrent) {
        return;
      }

      if (fetchError) {
        setWagers([]);
        setError(fetchError.message || "Could not load wagers.");
        setIsLoadingWagers(false);
        return;
      }

      setWagers((data as WagerRow[]) || []);
      setIsLoadingWagers(false);
    }

    fetchInitialWagers();

    return () => {
      isCurrent = false;
    };
  }, [selectedGameId]);

  async function handleCreateWager() {
    const trimmedDescription = description.trim();
    const parsedPoints = Number(points);

    setMessage("");
    setError("");

    if (!trimmedDescription) {
      setError("Description is required.");
      return;
    }

    if (!selectedGameId) {
      setError("Select or start a Shenanigans game first.");
      return;
    }

    if (!Number.isInteger(parsedPoints) || parsedPoints <= 0) {
      setError("Enter a positive whole-number point value.");
      return;
    }

    if (validSelectedPlayers.length < 2) {
      setError("Select at least two players.");
      return;
    }

    setIsCreating(true);

    const payload = {
      description: trimmedDescription,
      points: parsedPoints,
      status: "active",
      player_names: validSelectedPlayers,
      game_id: selectedGameId,
    };

    console.log("Submitting shenanigans_wagers payload:", payload);

    try {
      const { data, error: insertError } = await supabase
        .from("shenanigans_wagers")
        .insert(payload)
        .select();

      console.log("shenanigans_wagers insert result:", {
        data,
        error: insertError,
      });

      if (insertError) {
        setError(insertError.message || "Could not create wager.");
        return;
      }

      setDescription("");
      setPoints("3");
      setSelectedPlayers([]);
      setMessage("Wager created.");
      await logAuditEvent({
        actionType: "shenanigans_wager_created",
        entityType: "shenanigans_wager",
        entityId: Array.isArray(data) ? data[0]?.id || null : null,
        summary: `Shenanigans wager created: ${trimmedDescription}.`,
        newValue: Array.isArray(data) ? data[0] : payload,
        metadata: { game_id: selectedGameId },
      });
      await fetchWagers();
    } catch (createError) {
      console.error("shenanigans_wagers insert failed:", createError);
      setError(
        createError instanceof Error
          ? createError.message
          : "Could not create wager.",
      );
    } finally {
      setIsCreating(false);
    }
  }

  async function handleSettleWager(wager: WagerRow) {
    const winnerName = selectedWinners[wager.id] || "";
    const loserNames = wager.player_names.filter((name) => name !== winnerName);

    setMessage("");
    setError("");

    if (!winnerName) {
      setError("Select a winner before settling.");
      return;
    }

    if (loserNames.length === 0) {
      setError("A wager needs at least one loser.");
      return;
    }

    setSettlingId(wager.id);

    const settledAt = new Date().toISOString();
    const updatePayload = {
      status: "settled",
      winner_name: winnerName,
      loser_names: loserNames,
      settled_at: settledAt,
    };
    const ledgerEvents = [
      {
        player_name: winnerName,
        event_type: "Wager",
        description: `Settled wager: ${wager.description}`,
        points: wager.points * loserNames.length,
        game_id: wager.game_id,
      },
      ...loserNames.map((loserName) => ({
        player_name: loserName,
        event_type: "Wager",
        description: `Lost wager: ${wager.description}`,
        points: -wager.points,
        game_id: wager.game_id,
      })),
    ];

    console.log("Settling shenanigans_wager:", {
      wagerId: wager.id,
      updatePayload,
      ledgerEvents,
    });

    try {
      const { data: updateData, error: updateError } = await supabase
        .from("shenanigans_wagers")
        .update(updatePayload)
        .eq("id", wager.id)
        .select();

      console.log("shenanigans_wagers settle result:", {
        data: updateData,
        error: updateError,
      });

      if (updateError) {
        setError(updateError.message || "Could not settle wager.");
        return;
      }

      const { data: eventData, error: eventError } = await supabase
        .from("shenanigans_events")
        .insert(ledgerEvents)
        .select();

      console.log("shenanigans_events wager settlement insert result:", {
        data: eventData,
        error: eventError,
      });

      if (eventError) {
        setError(eventError.message || "Wager settled, but ledger insert failed.");
        return;
      }

      setSelectedWinners((currentWinners) => {
        const nextWinners = { ...currentWinners };
        delete nextWinners[wager.id];
        return nextWinners;
      });
      setExpandedWagers((currentWagers) => {
        const nextWagers = { ...currentWagers };
        delete nextWagers[wager.id];
        return nextWagers;
      });
      setMessage("Wager settled and ledger updated.");
      await logActivityFeedItem({
        type: "shenanigans_wager_settled",
        source: "shenanigans",
        sourceId: wager.id,
        linkUrl: "/shenanigans/wagers",
        message: `Shenanigans wager settled: ${winnerName} wins ${wager.points} pts.`,
      });
      await logAuditEvent({
        actionType: "shenanigans_wager_settled",
        entityType: "shenanigans_wager",
        entityId: wager.id,
        summary: `Shenanigans wager settled: ${winnerName} won ${wager.description}.`,
        oldValue: wager,
        newValue: updateData?.[0] || updatePayload,
        metadata: { game_id: wager.game_id, ledger_events: eventData },
      });
      await fetchWagers();
    } catch (settleError) {
      console.error("shenanigans_wagers settle failed:", settleError);
      setError(
        settleError instanceof Error
          ? settleError.message
          : "Could not settle wager.",
      );
    } finally {
      setSettlingId("");
    }
  }

  return (
    <main
      className="gc-mobile-shell text-[#f5f5f5]"
      style={{ "--page-accent": "#EB9C5C" } as CSSProperties}
    >
      <Link href="/shenanigans" className="gc-back-link gc-floating-back">
        ← BACK
      </Link>
      <div className="gc-mobile-stage w-full max-w-md justify-center space-y-8">
        <div className="gc-section-head">
          <p className="gc-card-kicker text-[#EB9C5C]">
            Shenanigans
          </p>

          <h1 className="gc-card-title">Wagers</h1>

          <p className="gc-card-copy">Track player-to-player action.</p>
        </div>

        <ShenanigansGameBar
          selectedGame={selectedGame}
          games={games}
          selectedGameId={selectedGameId}
          isLoadingGame={isLoadingGame}
          gameError={gameError}
          onSwitchGame={switchGame}
          onEndGame={endGame}
        />

        {!selectedGameId && !isLoadingGame && <NoShenanigansGamePrompt />}

        <section className="gc-edge-card p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#b91c1c]">
            Wager Rules
          </p>

          <h2 className="mt-2 text-xl font-bold">House Terms</h2>

          <div className="mt-4 space-y-3">
            {wagerRules.map((rule) => (
              <div key={rule} className="flex gap-3">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#b91c1c]" />

                <p className="text-sm leading-6 text-[#a3a3a3]">{rule}</p>
              </div>
            ))}
          </div>
        </section>

        {selectedGameId && (
        <section className="gc-edge-card p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#b91c1c]">
            Log New Wager
          </p>

          <div className="mt-4 space-y-4">
            <div>
              <label
                htmlFor="wager-description"
                className="mb-2 block text-sm text-[#a3a3a3]"
              >
                Description
              </label>

              <input
                id="wager-description"
                type="text"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="What is the action?"
                className="w-full rounded-xl border border-[#242424] bg-black px-4 py-4 text-[#f5f5f5] outline-none transition-colors duration-200 placeholder:text-[#737373] focus:border-[#b91c1c]"
              />
            </div>

            <div>
              <label
                htmlFor="wager-points"
                className="mb-2 block text-sm text-[#a3a3a3]"
              >
                Points
              </label>

              <div className="mb-3 grid grid-cols-5 gap-2">
                {pointOptions.map((pointOption) => {
                  const isSelected = Number(points) === pointOption;

                  return (
                    <button
                      key={pointOption}
                      type="button"
                      onClick={() => setPoints(String(pointOption))}
                      className={`rounded-xl border px-2 py-3 text-sm font-bold transition-colors duration-200 ${
                        isSelected
                          ? "border-[#b91c1c] bg-[#b91c1c] text-[#f5f5f5]"
                          : "border-[#242424] bg-black text-[#a3a3a3] hover:border-[#b91c1c]"
                      }`}
                    >
                      {pointOption}
                    </button>
                  );
                })}
              </div>

              <input
                id="wager-points"
                type="number"
                min="1"
                step="1"
                value={points}
                onChange={(event) => setPoints(event.target.value)}
                placeholder="Custom point amount"
                className="w-full rounded-xl border border-[#242424] bg-black px-4 py-4 text-[#f5f5f5] outline-none transition-colors duration-200 focus:border-[#b91c1c]"
              />
            </div>

            <div className="space-y-3">
              <CompactPlayerMultiSelect
                players={selectablePlayers}
                selectedNames={validSelectedPlayers}
                onChange={setSelectedPlayers}
                isLoading={isLoadingGame}
                label="Players Involved"
                minSelected={2}
                maxSelected={4}
              />
            </div>

            <button
              type="button"
              onClick={handleCreateWager}
              disabled={
                isCreating ||
                isLoadingGame ||
                selectablePlayers.length === 0
              }
              className="gc-primary-button w-full px-5 py-4 text-center text-base font-bold transition disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isCreating ? "Creating..." : "Create Wager"}
            </button>
          </div>
        </section>
        )}

        {message && (
          <p className="text-center text-sm text-[#f5f5f5]">{message}</p>
        )}

        {error && (
          <p className="text-center text-sm text-[#fca5a5]">{error}</p>
        )}

        {selectedGameId && (
        <section className="space-y-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#b91c1c]">
              Active Wagers
            </p>

            <h2 className="mt-2 text-xl font-bold">Open Action</h2>
          </div>

          <div className="space-y-3">
            {isLoadingWagers && (
              <div className="gc-edge-card p-5 text-sm text-[#a3a3a3]">
                Loading wagers...
              </div>
            )}

            {!isLoadingWagers && activeWagers.length === 0 && (
              <div className="gc-edge-card p-5 text-sm text-[#a3a3a3]">
                No active wagers yet.
              </div>
            )}

            {!isLoadingWagers &&
              activeWagers.map((wager) => {
                const isExpanded = Boolean(expandedWagers[wager.id]);

                return (
                  <div
                    key={wager.id}
                    role="button"
                    tabIndex={0}
                    onClick={() =>
                      setExpandedWagers((currentWagers) => ({
                        ...currentWagers,
                        [wager.id]: !currentWagers[wager.id],
                      }))
                    }
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        setExpandedWagers((currentWagers) => ({
                          ...currentWagers,
                          [wager.id]: !currentWagers[wager.id],
                        }));
                      }
                    }}
                    className="gc-edge-card cursor-pointer p-5 transition-colors duration-200 hover:border-[#EB9C5C]"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-lg font-bold">
                            {wager.player_names.join(" vs ")}
                          </h3>

                          <span className="rounded-full border border-[#b91c1c]/70 px-2 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-[#f5f5f5]">
                            Open
                          </span>
                        </div>

                        <p className="mt-2 line-clamp-2 text-sm leading-6 text-[#a3a3a3]">
                          {wager.description}
                        </p>
                      </div>

                      <span className="shrink-0 text-lg font-bold text-[#b91c1c]">
                        {wager.points} pts
                      </span>
                    </div>

                    <div className="mt-4 flex items-center justify-between border-t border-[#3a1717] pt-4">
                      <span className="text-xs text-[#a3a3a3]">
                        Created {formatDate(wager.created_at)}
                      </span>

                      <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[#b91c1c]">
                        {isExpanded ? "Hide" : "Tap to settle"}
                      </span>
                    </div>

                    {isExpanded && (
                      <div
                        className="mt-4 space-y-3 border-t border-[#3a1717] pt-4"
                        onClick={(event) => event.stopPropagation()}
                      >
                        <div className="rounded-xl border border-[#242424] bg-black/40 p-4">
                          <p className="text-xs uppercase tracking-[0.2em] text-[#737373]">
                            Details
                          </p>

                          <p className="mt-2 text-sm leading-6 text-[#a3a3a3]">
                            {wager.description}
                          </p>

                          <p className="mt-3 text-sm text-[#f5f5f5]">
                            {wager.player_names.join(" / ")}
                          </p>
                        </div>

                        <p className="text-xs uppercase tracking-[0.2em] text-[#737373]">
                          Settle Winner
                        </p>

                        <div className="grid grid-cols-2 gap-3">
                          {wager.player_names.map((playerName) => {
                            const isSelected =
                              selectedWinners[wager.id] === playerName;

                            return (
                              <button
                                key={`${wager.id}-${playerName}`}
                                type="button"
                                onClick={() =>
                                  setSelectedWinners((currentWinners) => ({
                                    ...currentWinners,
                                    [wager.id]: playerName,
                                  }))
                                }
                                className={`rounded-xl border px-3 py-3 text-left text-sm font-semibold transition-colors duration-200 ${
                                  isSelected
                                    ? "border-[#b91c1c] bg-[#b91c1c] text-[#f5f5f5]"
                                    : "border-[#242424] bg-black text-[#f5f5f5] hover:border-[#b91c1c]"
                                }`}
                              >
                                {playerName}
                              </button>
                            );
                          })}
                        </div>

                        <button
                          type="button"
                          onClick={() => handleSettleWager(wager)}
                          disabled={settlingId === wager.id}
                          className="w-full rounded-2xl border border-[#242424] bg-black px-5 py-4 text-center text-sm font-bold text-[#f5f5f5] transition-colors duration-200 hover:border-[#b91c1c] disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {settlingId === wager.id
                            ? "Settling..."
                            : "Confirm Settlement"}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        </section>
        )}

        {selectedGameId && (
        <section className="space-y-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#b91c1c]">
              Settled Wagers
            </p>

            <h2 className="mt-2 text-xl font-bold">Booked Results</h2>
          </div>

          <div className="space-y-3">
            {isLoadingWagers && (
              <div className="gc-edge-card p-5 text-sm text-[#a3a3a3]">
                Loading settled wagers...
              </div>
            )}

            {!isLoadingWagers && settledWagers.length === 0 && (
              <div className="gc-edge-card p-5 text-sm text-[#a3a3a3]">
                No settled wagers yet.
              </div>
            )}

            {!isLoadingWagers &&
              settledWagers.map((wager) => (
                <div
                  key={wager.id}
                  className="gc-edge-card p-5 opacity-85"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <h3 className="text-lg font-bold">
                        {wager.winner_name || "Winner"} beat{" "}
                        {(wager.loser_names || []).join(", ") || "the field"}
                      </h3>

                      <p className="mt-2 text-sm leading-6 text-[#a3a3a3]">
                        {wager.description}
                      </p>
                    </div>

                    <span className="rounded-full border border-[#242424] px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-[#a3a3a3]">
                      Settled
                    </span>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3 border-t border-[#242424] pt-4">
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-[#737373]">
                        Net Move
                      </p>

                      <p className="mt-1 text-sm font-bold text-[#f5f5f5]">
                        +{wager.points * (wager.loser_names?.length || 0)} / -
                        {wager.points}
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="text-xs uppercase tracking-[0.2em] text-[#737373]">
                        Settled
                      </p>

                      <p className="mt-1 text-sm font-semibold text-[#a3a3a3]">
                        {formatDate(wager.settled_at)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </section>
        )}
      </div>
    </main>
  );
}
