"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { getPublicRankBucket } from "@/lib/playerRanks";
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

export default function DraftMobilePage() {
  const [session, setSession] = useState<DraftSession | null>(null);
  const [players, setPlayers] = useState<DraftPlayer[]>([]);
  const [teams, setTeams] = useState<DraftTeam[]>([]);
  const [picks, setPicks] = useState<DraftPick[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  async function fetchDraft() {
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
          "Could not load draft board.",
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
    window.setTimeout(fetchDraft, 0);
    const intervalId = window.setInterval(fetchDraft, 1500);

    return () => window.clearInterval(intervalId);
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
  const recentPicks = picks.slice().reverse().slice(0, 6);
  const isCompleteDraft =
    session && completedDraftStatuses.includes(String(session.status));

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(50,77,112,0.13),transparent_34%),#050505] p-5 text-[#f5f5f5]">
      <div className="mx-auto w-full max-w-md space-y-5 py-6">
        <div className="flex items-center justify-between gap-4">
          <Link href="/draft" className="text-2xl text-[#a3a3a3]">
            ‹
          </Link>
          <p className="text-sm uppercase tracking-[0.22em] text-[#f5f5f5]">
            Mobile Draft
          </p>
          <span className="rounded-full border border-[#1e40af] bg-[#071123] px-3 py-1 text-xs font-black text-[#60a5fa]">
            {isCompleteDraft ? "Complete" : "Live"}
          </span>
        </div>

        {isLoading && (
          <section className="rounded-2xl border border-[#242424] bg-[#111111] p-5 text-sm text-[#a3a3a3]">
            Loading draft...
          </section>
        )}

        {!isLoading && error && (
          <section className="rounded-2xl border border-[#242424] bg-[#111111] p-5 text-sm text-[#ff8a8a]">
            {error}
          </section>
        )}

        {!isLoading && !error && !session && (
          <section className="overflow-hidden rounded-2xl border border-[#d8d1c4]/80 bg-[#efe9dc] text-[#17130e] shadow-[0_18px_55px_rgba(0,0,0,0.38)]">
            <div className="border-b border-[#c6d3e8] bg-[#dbe7fb] px-5 py-5">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#1d4ed8]">
                No Active Draft
              </p>
              <h1 className="mt-4 text-4xl font-black tracking-tight">
                Board Empty
              </h1>
            </div>
            <p className="px-5 py-4 text-sm leading-6 text-[#4f483f]">
              When a draft starts, the mobile board will update here.
            </p>
          </section>
        )}

        {!isLoading && !error && session && (
          <>
            <section className="overflow-hidden rounded-2xl border border-[#2563eb]/60 bg-[#071123] shadow-[0_0_36px_rgba(50,77,112,0.11)]">
              <div className="border-b border-[#1e40af]/60 px-5 py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#93c5fd]">
                  On The Clock
                </p>
                <h1 className="mt-3 text-4xl font-black tracking-[-0.05em]">
                  {isCompleteDraft ? "Draft Complete" : currentTeam?.name || "Complete"}
                </h1>
                <p className="mt-2 text-sm text-[#bfdbfe]">
                  {session.name} · Pick {picks.length + 1}
                </p>
              </div>
            </section>

            <section className="overflow-hidden rounded-2xl border border-[#2b2b27] bg-[#0d0d0b]">
              <div className="border-b border-[#2a2925] px-5 py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#60a5fa]">
                  Recent Picks
                </p>
              </div>
              {recentPicks.length === 0 ? (
                <p className="p-5 text-sm text-[#a3a3a3]">
                  No picks yet.
                </p>
              ) : (
                recentPicks.map((pick) => {
                  const player = playersById.get(pick.player_id);
                  const team = teams.find((item) => item.id === pick.draft_team_id);

                  return (
                    <div
                      key={pick.id}
                      className="grid grid-cols-[3rem_1fr] gap-3 border-b border-[#2a2925] px-5 py-3 last:border-b-0"
                    >
                      <span className="font-mono text-sm font-bold text-[#60a5fa]">
                        {pick.pick_number}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate font-semibold">
                          {player?.display_name || "Unknown"}
                        </p>
                        <p className="mt-1 truncate text-xs text-[#a3a3a3]">
                          {team?.name || "Team"} ·{" "}
                          {getPublicRankBucket(
                            player?.rank,
                            player?.internal_rank_order,
                          )}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </section>

            <section className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#a3a3a3]">
                Available Pool
              </p>
              {["A", "B", "C", "D"].map((rank) => (
                <div
                  key={rank}
                  className="overflow-hidden rounded-2xl border border-[#d8d1c4]/80 bg-[#efe9dc] text-[#17130e]"
                >
                  <div className="flex items-center justify-between border-b border-[#d2c8b8] px-4 py-3">
                    <p className="text-sm font-black text-[#1d4ed8]">
                      Rank {rank}
                    </p>
                    <p className="text-xs font-semibold text-[#5f574b]">
                      {(availableByRank[rank] || []).length} left
                    </p>
                  </div>
                  {(availableByRank[rank] || []).slice(0, 12).map((player) => (
                    <div
                      key={player.id}
                      className="flex items-center justify-between gap-3 border-b border-[#d2c8b8] px-4 py-3 last:border-b-0"
                    >
                      <span className="truncate font-semibold">
                        {player.display_name}
                      </span>
                      <span className="text-xs font-bold text-[#5f574b]">
                        {getPublicRankBucket(player.rank, player.internal_rank_order)}
                      </span>
                    </div>
                  ))}
                </div>
              ))}
            </section>

            <section className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#a3a3a3]">
                Teams
              </p>
              {orderedTeams.map((team) => (
                <div
                  key={team.id}
                  className={`rounded-2xl border p-4 ${
                    currentTeam?.id === team.id
                      ? "border-[#2563eb] bg-[#071123]"
                      : "border-[#242424] bg-[#111111]"
                  }`}
                >
                  <h2 className="text-lg font-bold">{team.name}</h2>
                  <div className="mt-3 space-y-1 text-sm text-[#a3a3a3]">
                    {(picksByTeam[team.id] || []).length === 0 && (
                      <p>No picks yet.</p>
                    )}
                    {(picksByTeam[team.id] || []).map((pick) => {
                      const player = playersById.get(pick.player_id);

                      return (
                        <p key={pick.id} className="truncate">
                          {pick.pick_number}. {player?.display_name || "Unknown"}{" "}
                          <span className="text-[#737373]">
                            {getPublicRankBucket(
                              player?.rank,
                              player?.internal_rank_order,
                            )}
                          </span>
                        </p>
                      );
                    })}
                  </div>
                </div>
              ))}
            </section>
          </>
        )}
      </div>
    </main>
  );
}
