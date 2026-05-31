"use client";

import Link from "next/link";
import type { CSSProperties } from "react";
import { useEffect, useMemo, useState } from "react";
import { GolfCampIcon } from "@/components/GolfCampIcons";
import { logActivityFeedItem } from "@/lib/activityFeed";
import { logAuditEvent } from "@/lib/auditLog";
import { getPlayerSession, PlayerSession } from "@/lib/playerSession";
import { supabase } from "@/lib/supabase";
import { ActivePlayer, useActivePlayers } from "@/lib/useActivePlayers";

type AfternoonRound = {
  id: string;
  name: string;
  round_date: string | null;
  status: string | null;
  owner_player_id: string | null;
  owner_name: string | null;
  created_at: string | null;
  finalized_at: string | null;
};

function isActiveRound(round: AfternoonRound) {
  const status = String(round.status || "").toLowerCase();
  return status === "active" || status === "pending";
}

function isRecentRound(round: AfternoonRound) {
  const status = String(round.status || "").toLowerCase();
  return status === "final" || status === "complete" || status === "completed";
}

function formatDate(value: string | null) {
  if (!value) {
    return "Date TBD";
  }

  return value;
}

function PlayerChips({
  players,
  selectedIds,
  onChange,
  isLoading,
}: {
  players: ActivePlayer[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  isLoading: boolean;
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const filteredPlayers = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    if (!normalizedSearch) {
      return players;
    }

    return players.filter((player) =>
      player.display_name.toLowerCase().includes(normalizedSearch),
    );
  }, [players, searchTerm]);

  function togglePlayer(playerId: string) {
    onChange(
      selectedSet.has(playerId)
        ? selectedIds.filter((id) => id !== playerId)
        : [...selectedIds, playerId],
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-[#a3a3a3]">Participants</p>
        <span className="text-xs font-bold uppercase tracking-[0.16em] text-[#737373]">
          {selectedIds.length} selected
        </span>
      </div>

      {isLoading && <p className="text-sm text-[#a3a3a3]">Loading players...</p>}

      {!isLoading && (
        <>
          <input
            type="search"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search players"
            className="w-full rounded-xl border border-[#242424] bg-black px-4 py-3 text-sm outline-none placeholder:text-[#737373] focus:border-[#ffda03]"
          />
          <div className="flex max-h-40 flex-wrap gap-2 overflow-y-auto rounded-xl border border-[#242424] bg-black/35 p-2">
            {filteredPlayers.map((player) => {
              const isSelected = selectedSet.has(player.id);

              return (
                <button
                  key={player.id}
                  type="button"
                  onClick={() => togglePlayer(player.id)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-bold transition ${
                    isSelected
                      ? "border-[#ffda03] bg-[#ffda03] text-black"
                      : "border-[#242424] bg-[#111111] text-[#d4d4d4] hover:border-[#ffda03]"
                  }`}
                >
                  {player.display_name}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

export default function AfternoonRoundsPage() {
  const { players, isLoading: isLoadingPlayers, error: playersError } =
    useActivePlayers();
  const [session] = useState<PlayerSession | null>(() => getPlayerSession());
  const [rounds, setRounds] = useState<AfternoonRound[]>([]);
  const [name, setName] = useState("Afternoon Round");
  const [roundDate, setRoundDate] = useState("");
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>(() =>
    session ? [session.id] : [],
  );
  const [isLoadingRounds, setIsLoadingRounds] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function fetchRounds() {
    setIsLoadingRounds(true);

    const { data, error: fetchError } = await supabase
      .from("afternoon_rounds")
      .select("*")
      .order("round_date", { ascending: false })
      .order("created_at", { ascending: false });

    if (fetchError) {
      setRounds([]);
      setError(fetchError.message || "Could not load Afternoon Rounds.");
      setIsLoadingRounds(false);
      return;
    }

    setRounds((data as AfternoonRound[]) || []);
    setIsLoadingRounds(false);
  }

  useEffect(() => {
    let isCurrent = true;

    async function loadRounds() {
      const { data, error: fetchError } = await supabase
        .from("afternoon_rounds")
        .select("*")
        .order("round_date", { ascending: false })
        .order("created_at", { ascending: false });

      if (!isCurrent) {
        return;
      }

      if (fetchError) {
        setRounds([]);
        setError(fetchError.message || "Could not load Afternoon Rounds.");
        setIsLoadingRounds(false);
        return;
      }

      setRounds((data as AfternoonRound[]) || []);
      setIsLoadingRounds(false);
    }

    loadRounds();

    return () => {
      isCurrent = false;
    };
  }, []);

  async function handleCreateRound() {
    const trimmedName = name.trim();
    const selectedPlayers = players.filter((player) =>
      selectedPlayerIds.includes(player.id),
    );

    setMessage("");
    setError("");

    if (!session) {
      setError("Log in with your player PIN to create an Afternoon Round.");
      return;
    }

    if (!trimmedName) {
      setError("Round name is required.");
      return;
    }

    if (selectedPlayers.length < 2) {
      setError("Select at least two participants.");
      return;
    }

    setIsCreating(true);

    const { data: roundData, error: roundError } = await supabase
      .from("afternoon_rounds")
      .insert({
        name: trimmedName,
        round_date: roundDate || null,
        status: "active",
        owner_player_id: session.id,
        owner_name: session.display_name,
      })
      .select("*")
      .single();

    if (roundError || !roundData) {
      setError(roundError?.message || "Could not create Afternoon Round.");
      setIsCreating(false);
      return;
    }

    const participantRows = selectedPlayers.map((player) => ({
      afternoon_round_id: roundData.id,
      player_id: player.id,
      player_name: player.display_name,
    }));
    const { error: playersInsertError } = await supabase
      .from("afternoon_round_players")
      .insert(participantRows);

    if (playersInsertError) {
      setError(playersInsertError.message || "Round created, but participants failed.");
      setIsCreating(false);
      return;
    }

    setMessage("Afternoon Round created.");
    await logActivityFeedItem({
      type: "afternoon_round_created",
      source: "Afternoon Rounds",
      sourceId: roundData.id,
      createdByPlayerId: session.id,
      linkUrl: `/afternoon-rounds/${roundData.id}`,
      message: `Afternoon Round created by ${session.display_name}.`,
    });
    await logAuditEvent({
      actionType: "afternoon_round_created",
      entityType: "afternoon_round",
      entityId: roundData.id,
      summary: `${session.display_name} created Afternoon Round: ${trimmedName}.`,
      newValue: roundData,
      metadata: { participant_count: selectedPlayers.length },
    });
    setName("Afternoon Round");
    setRoundDate("");
    setSelectedPlayerIds(session ? [session.id] : []);
    await fetchRounds();
    setIsCreating(false);
  }

  const activeRounds = rounds.filter(isActiveRound);
  const recentRounds = rounds.filter(isRecentRound);

  return (
    <main className="gc-mobile-shell" style={{ "--page-accent": "#ffda03" } as CSSProperties}>
      <div className="gc-mobile-stage">
        <div className="gc-topbar">
          <Link href="/home" className="gc-back-link">
            ‹
          </Link>
          <p className="gc-topbar-title">
            Afternoon Rounds
          </p>
          <span className="gc-top-icon">
            <GolfCampIcon name="p2p" className="h-4 w-4" />
          </span>
        </div>

        <section className="gc-edge-card">
          <div className="gc-section-head">
            <p className="gc-card-kicker">
              Create Afternoon Round
            </p>
            <h1 className="gc-card-title">
              Optional Round
            </h1>
            <p className="gc-card-copy">
              Player-created teams and casual afternoon action.
            </p>
          </div>

          <div className="space-y-4 p-5">
            {!session && (
              <p className="rounded-xl border border-[#3a2a12] bg-black/45 p-3 text-sm text-[#f5c56f]">
                Log in with your player PIN to create and own an Afternoon Round.
              </p>
            )}

            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Round name"
              className="gc-input"
            />

            <input
              type="date"
              value={roundDate}
              onChange={(event) => setRoundDate(event.target.value)}
              className="gc-input"
            />

            <PlayerChips
              players={players}
              selectedIds={selectedPlayerIds}
              onChange={setSelectedPlayerIds}
              isLoading={isLoadingPlayers}
            />

            {playersError && <p className="text-sm text-[#f5c56f]">{playersError}</p>}

            <button
              type="button"
              onClick={handleCreateRound}
              disabled={
                isCreating ||
                isLoadingPlayers ||
                !session ||
                selectedPlayerIds.length < 2
              }
              className="gc-primary-button transition disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isCreating ? "Creating..." : "Create Round"}
            </button>
          </div>
        </section>

        {message && <p className="text-center text-sm">{message}</p>}
        {error && <p className="text-center text-sm text-[#f5c56f]">{error}</p>}

        <section className="gc-edge-card">
          <div className="gc-section-head">
            <p className="gc-card-kicker">
              Active Afternoon Rounds
            </p>
            <h2 className="gc-card-title">Open Games</h2>
          </div>
          <RoundList
            rounds={activeRounds}
            isLoading={isLoadingRounds}
            emptyText="No active Afternoon Rounds yet."
          />
        </section>

        <section className="gc-edge-card">
          <div className="gc-section-head">
            <p className="gc-card-kicker">
              Recent Afternoon Rounds
            </p>
            <h2 className="gc-card-title">Finalized Games</h2>
          </div>
          <RoundList
            rounds={recentRounds}
            isLoading={isLoadingRounds}
            emptyText="No finalized Afternoon Rounds yet."
          />
        </section>

        <Link href="/home" className="text-center text-sm text-[#a3a3a3]">
          ← Back to Camp Dashboard
        </Link>
      </div>
    </main>
  );
}

function RoundList({
  rounds,
  isLoading,
  emptyText,
}: {
  rounds: AfternoonRound[];
  isLoading: boolean;
  emptyText: string;
}) {
  if (isLoading) {
    return <p className="p-5 text-sm text-[#a3a3a3]">Loading rounds...</p>;
  }

  if (rounds.length === 0) {
    return <p className="p-5 text-sm text-[#a3a3a3]">{emptyText}</p>;
  }

  return (
    <div>
      {rounds.map((round) => (
        <Link
          key={round.id}
          href={`/afternoon-rounds/${round.id}`}
          className="block border-b border-[#2a2925] px-5 py-4 transition hover:bg-[#15150f] last:border-b-0"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#ffda03]">
                {round.status || "active"}
              </p>
              <h3 className="mt-1 truncate text-lg font-black">{round.name}</h3>
              <p className="mt-1 text-sm text-[#a3a3a3]">
                {formatDate(round.round_date)} · Owner {round.owner_name || "Unknown"}
              </p>
            </div>
            <span className="font-mono text-xl font-black text-[#82786a]">→</span>
          </div>
        </Link>
      ))}
    </div>
  );
}
