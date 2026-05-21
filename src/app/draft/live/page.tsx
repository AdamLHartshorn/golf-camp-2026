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

const completedDraftStatuses = ["complete", "completed", "final", "finalized"];

export default function DraftLivePage() {
  const [session, setSession] = useState<DraftSession | null>(null);
  const [players, setPlayers] = useState<DraftPlayer[]>([]);
  const [teams, setTeams] = useState<DraftTeam[]>([]);
  const [picks, setPicks] = useState<DraftPick[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  async function fetchLiveDraft() {
    const { data: activeSessionData, error: activeSessionError } = await supabase
      .from("draft_sessions")
      .select("*")
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (activeSessionError) {
      setError(activeSessionError.message || "Could not load draft.");
      setIsLoading(false);
      return;
    }

    let sessionData = activeSessionData;

    if (!sessionData) {
      const { data: completedSessionData, error: completedSessionError } =
        await supabase
          .from("draft_sessions")
          .select("*")
          .in("status", completedDraftStatuses)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

      if (completedSessionError) {
        setError(completedSessionError.message || "Could not load draft.");
        setIsLoading(false);
        return;
      }

      sessionData = completedSessionData;

      if (!sessionData) {
        setSession(null);
        setTeams([]);
        setPicks([]);
        setIsLoading(false);
        return;
      }
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
  const isCompleteDraft =
    session && completedDraftStatuses.includes(String(session.status));

  return (
    <main className="h-screen overflow-hidden bg-[radial-gradient(circle_at_18%_10%,rgba(37,99,235,0.34),transparent_28%),radial-gradient(circle_at_86%_78%,rgba(30,64,175,0.22),transparent_34%),linear-gradient(135deg,#02040a_0%,#05070d_45%,#000_100%)] p-5 text-[#f5f5f5]">
      <div className="grid h-full grid-cols-[1.05fr_1.55fr_1.2fr] gap-5">
        <section className="flex min-h-0 flex-col overflow-hidden rounded-[1.4rem] border border-[#2563eb]/55 bg-[linear-gradient(180deg,rgba(8,17,35,0.96),rgba(2,4,10,0.98))] shadow-[0_0_70px_rgba(37,99,235,0.18),0_28px_90px_rgba(0,0,0,0.55)]">
          <div className="border-b border-[#1e40af]/55 px-6 py-5">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#93c5fd]">
              Golf Camp 2026
            </p>
            <h1 className="mt-3 text-6xl font-black tracking-[-0.06em]">
              Live Draft
            </h1>
            <p className="mt-3 text-lg text-[#c7d2fe]">
              {session?.name || "No active draft"}
              {isCompleteDraft ? " · Complete" : ""}
            </p>
          </div>

          <div className="flex flex-1 flex-col justify-center p-6">
            <div className="rounded-[1.6rem] border border-[#60a5fa]/80 bg-[radial-gradient(circle_at_top,rgba(37,99,235,0.28),transparent_62%),#02040a] p-6 shadow-[0_0_55px_rgba(37,99,235,0.28)]">
              <div className="flex items-center justify-between gap-4">
                <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[#93c5fd]">
                  On The Clock
                </p>
                <span className="rounded-full border border-[#2563eb]/70 bg-[#071123] px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-[#bfdbfe]">
                  Pick {picks.length + 1}
                </span>
              </div>
              <h2 className="mt-7 text-7xl font-black leading-[0.85] tracking-[-0.07em]">
                {isLoading
                  ? "Loading"
                  : error
                    ? "Error"
                    : isCompleteDraft
                      ? "Draft Complete"
                      : currentTeam?.name || "Complete"}
              </h2>
            </div>

            {error && <p className="mt-4 text-lg text-[#ff8a8a]">{error}</p>}
          </div>
        </section>

        <section className="min-h-0 overflow-hidden rounded-[1.4rem] border border-[#1e40af]/45 bg-[linear-gradient(180deg,rgba(8,11,18,0.94),rgba(2,4,10,0.98))] p-5 shadow-[0_28px_90px_rgba(0,0,0,0.45)]">
          <div className="flex items-end justify-between gap-4 border-b border-[#1e40af]/35 pb-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#93c5fd]">
                Available Pool
              </p>
              <h2 className="mt-2 text-4xl font-black tracking-[-0.05em]">
                {availablePlayers.length} Players
              </h2>
            </div>
            <span className="rounded-full border border-[#1e40af]/70 bg-[#071123] px-4 py-2 text-sm font-black text-[#bfdbfe]">
              A-D
            </span>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-4">
            {["A", "B", "C", "D"].map((rank) => (
              <div
                key={rank}
                className="min-h-0 rounded-[1rem] border border-[#1e40af]/45 bg-[linear-gradient(180deg,rgba(15,23,42,0.7),rgba(0,0,0,0.42))] p-4"
              >
                <h3 className="text-2xl font-black tracking-[-0.04em] text-[#dbeafe]">
                  Rank {rank}
                </h3>
                <div className="mt-3 space-y-2">
                  {(availableByRank[rank] || []).slice(0, 12).map((player) => (
                    <div
                      key={player.id}
                      className="flex items-center justify-between gap-3 rounded-lg border border-[#1e40af]/25 bg-black/45 px-3 py-2"
                    >
                      <span className="truncate text-xl font-semibold">
                        {player.display_name}
                      </span>
                      <span className="text-sm font-bold text-[#93c5fd]">
                        {player.rank}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="min-h-0 overflow-hidden rounded-[1.4rem] border border-[#1e40af]/45 bg-[linear-gradient(180deg,rgba(8,11,18,0.94),rgba(2,4,10,0.98))] p-5 shadow-[0_28px_90px_rgba(0,0,0,0.45)]">
          <div className="border-b border-[#1e40af]/35 pb-4">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#93c5fd]">
              Teams
            </p>
            <h2 className="mt-2 text-4xl font-black tracking-[-0.05em]">
              Draft Board
            </h2>
          </div>
          <div className="mt-4 grid max-h-[calc(100vh-8.5rem)] grid-cols-2 gap-3 overflow-hidden">
            {orderedTeams.map((team) => (
              <div
                key={team.id}
                className={`rounded-[1rem] border p-4 ${
                  currentTeam?.id === team.id
                    ? "border-[#60a5fa] bg-[#071123] shadow-[0_0_35px_rgba(37,99,235,0.24)]"
                    : "border-[#1e40af]/30 bg-black/45"
                }`}
              >
                <h3 className="truncate text-2xl font-black tracking-[-0.04em]">
                  {team.name}
                </h3>
                <p className="mt-1 text-sm text-[#93c5fd]">
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
