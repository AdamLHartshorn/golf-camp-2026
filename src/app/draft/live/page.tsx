"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  comparePlayersForDraft,
  DraftPick,
  DraftPlayer,
  DraftSession,
  DraftTeam,
  getAvailablePlayers,
  getCurrentDraftTeam,
  getOrderedTeams,
  getPicksByTeam,
  groupPlayersByRank,
} from "@/app/draft/_lib/draftUtils";

export default function DraftLivePage() {
  const [session, setSession] = useState<DraftSession | null>(null);
  const [players, setPlayers] = useState<DraftPlayer[]>([]);
  const [teams, setTeams] = useState<DraftTeam[]>([]);
  const [picks, setPicks] = useState<DraftPick[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  async function fetchLiveDraft() {
    const { data: sessionData, error: sessionError } = await supabase
      .from("draft_sessions")
      .select("*")
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (sessionError) {
      setError(sessionError.message || "Could not load draft.");
      setIsLoading(false);
      return;
    }

    if (!sessionData) {
      setSession(null);
      setTeams([]);
      setPicks([]);
      setIsLoading(false);
      return;
    }

    const draftSession = sessionData as DraftSession;
    const [
      { data: playerData, error: playerError },
      { data: teamData, error: teamError },
      { data: pickData, error: pickError },
    ] = await Promise.all([
      supabase
        .from("players")
        .select("id, first_name, last_name, display_name, rank, internal_rank_order")
        .eq("active", true),
      supabase
        .from("draft_teams")
        .select("*")
        .eq("draft_session_id", draftSession.id)
        .order("draft_position", { ascending: true }),
      supabase
        .from("draft_picks")
        .select("*")
        .eq("draft_session_id", draftSession.id)
        .order("pick_number", { ascending: true }),
    ]);

    console.log("draft live state:", {
      draftSession,
      playerError,
      teamError,
      pickError,
    });

    if (playerError || teamError || pickError) {
      setError(
        playerError?.message ||
          teamError?.message ||
          pickError?.message ||
          "Could not load live draft board.",
      );
      setIsLoading(false);
      return;
    }

    setSession(draftSession);
    setPlayers(((playerData as DraftPlayer[]) || []).sort(comparePlayersForDraft));
    setTeams((teamData as DraftTeam[]) || []);
    setPicks((pickData as DraftPick[]) || []);
    setError("");
    setIsLoading(false);
  }

  useEffect(() => {
    window.setTimeout(() => {
      fetchLiveDraft();
    }, 0);
    const intervalId = window.setInterval(fetchLiveDraft, 1500);

    return () => {
      window.clearInterval(intervalId);
    };
  }, []);

  const orderedTeams = useMemo(
    () => getOrderedTeams(teams, session?.draft_order),
    [session?.draft_order, teams],
  );
  const availablePlayers = useMemo(
    () => getAvailablePlayers(players, teams, picks),
    [picks, players, teams],
  );
  const availableByRank = useMemo(
    () => groupPlayersByRank(availablePlayers),
    [availablePlayers],
  );
  const picksByTeam = useMemo(() => getPicksByTeam(picks), [picks]);
  const currentTeam = useMemo(
    () => getCurrentDraftTeam(orderedTeams, picks.length),
    [orderedTeams, picks.length],
  );
  const playersById = useMemo(
    () => new Map(players.map((player) => [player.id, player])),
    [players],
  );

  return (
    <main className="h-screen overflow-hidden bg-black p-5 text-[#f5f5f5]">
      <div className="grid h-full grid-cols-[1.1fr_1.5fr_1.2fr] gap-5">
        <section className="flex min-h-0 flex-col rounded-2xl border border-[#1e40af]/70 bg-[#111111] p-5">
          <p className="text-sm uppercase tracking-[0.35em] text-[#a3a3a3]">
            Golf Camp 2026
          </p>
          <h1 className="mt-2 text-5xl font-bold tracking-tight">Live Draft</h1>
          <div className="mt-3 h-px w-24 bg-[#2563eb]" />
          <p className="mt-2 text-lg text-[#a3a3a3]">
            {session?.name || "No active draft"}
          </p>

          <div className="mt-8 rounded-2xl border border-[#2563eb] bg-black p-5 shadow-[0_0_24px_rgba(37,99,235,0.16)]">
            <p className="text-sm uppercase tracking-[0.3em] text-[#60a5fa]">
              On The Clock
            </p>
            <h2 className="mt-3 text-6xl font-black leading-none">
              {isLoading
                ? "Loading"
                : error
                  ? "Error"
                  : currentTeam?.name || "Complete"}
            </h2>
            <p className="mt-4 text-2xl text-[#a3a3a3]">
              Pick {picks.length + 1}
            </p>
          </div>

          {error && <p className="mt-4 text-lg text-[#ff8a8a]">{error}</p>}
        </section>

        <section className="min-h-0 rounded-2xl border border-[#1e40af]/60 bg-[#111111] p-5">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-[#a3a3a3]">
                Available Pool
              </p>
              <div className="mt-2 h-px w-20 bg-[#1d4ed8]" />
              <h2 className="mt-2 text-3xl font-bold">
                {availablePlayers.length} Players
              </h2>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-4">
            {["A", "B", "C", "D"].map((rank) => (
              <div key={rank} className="min-h-0 rounded-xl border border-[#1e40af]/45 bg-black p-4">
                <h3 className="text-2xl font-black">Rank {rank}</h3>
                <div className="mt-3 space-y-2">
                  {(availableByRank[rank] || []).slice(0, 12).map((player) => (
                    <div
                      key={player.id}
                      className="flex items-center justify-between gap-3 rounded-lg border border-[#242424] px-3 py-2"
                    >
                      <span className="truncate text-xl font-semibold">
                        {player.display_name}
                      </span>
                      <span className="text-sm font-bold text-[#a3a3a3]">
                        {player.rank}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="min-h-0 overflow-hidden rounded-2xl border border-[#1e40af]/60 bg-[#111111] p-5">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-[#a3a3a3]">
              Teams
            </p>
            <div className="mt-2 h-px w-16 bg-[#1d4ed8]" />
          </div>
          <div className="mt-4 grid max-h-[calc(100vh-7rem)] grid-cols-2 gap-3 overflow-hidden">
            {orderedTeams.map((team) => (
              <div
                key={team.id}
                className={`rounded-xl border p-4 ${
                  currentTeam?.id === team.id
                    ? "border-[#2563eb] bg-black shadow-[0_0_18px_rgba(37,99,235,0.12)]"
                    : "border-[#1e40af]/35 bg-black/50"
                }`}
              >
                <h3 className="truncate text-2xl font-black">{team.name}</h3>
                <p className="mt-1 text-sm text-[#a3a3a3]">
                  Captain ·{" "}
                  {playersById.get(team.captain_player_id || "")?.rank || "-"}
                </p>
                <div className="mt-3 space-y-1">
                  {(picksByTeam[team.id] || []).slice(0, 5).map((pick) => {
                    const player = playersById.get(pick.player_id);

                    return (
                      <p key={pick.id} className="truncate text-lg">
                        {player?.display_name || "Unknown"}{" "}
                        <span className="text-sm text-[#a3a3a3]">
                          {player?.rank || ""}
                        </span>
                      </p>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
