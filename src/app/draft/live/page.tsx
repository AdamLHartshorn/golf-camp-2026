"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { PlayerSilhouette } from "@/components/PlayerSilhouette";
import { supabase } from "@/lib/supabase";
import { getPublicDisplayRank } from "@/lib/playerRanks";
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
const draftClockSeconds = 60;
const draftCompleteDelayMs = 8000;
const pickRevealDurationMs = 5000;

type PickReveal = {
  pickId: string;
  playerId: string;
  teamId: string;
};

export default function DraftLivePage() {
  const router = useRouter();
  const [session, setSession] = useState<DraftSession | null>(null);
  const [players, setPlayers] = useState<DraftPlayer[]>([]);
  const [teams, setTeams] = useState<DraftTeam[]>([]);
  const [picks, setPicks] = useState<DraftPick[]>([]);
  const [now, setNow] = useState(() => Date.now());
  const [completeReadySessionId, setCompleteReadySessionId] = useState<string | null>(null);
  const [activePickReveal, setActivePickReveal] = useState<PickReveal | null>(null);
  const [timerDelayPickId, setTimerDelayPickId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const hasObservedInitialPickRef = useRef(false);
  const lastObservedPickIdRef = useRef<string | null>(null);
  const revealTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    const root = document.documentElement;
    const previousTheme = root.dataset.theme;

    root.dataset.theme = "dark";

    return () => {
      if (previousTheme) {
        root.dataset.theme = previousTheme;
      } else {
        delete root.dataset.theme;
      }
    };
  }, []);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        router.push("/draft");
        return;
      }

      if (event.key.toLowerCase() === "f") {
        document.documentElement.requestFullscreen?.();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [router]);

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
        .select("id, first_name, last_name, display_name, rank, display_rank, internal_rank_order, photo_url")
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

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setNow(Date.now());
    }, 250);

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
  const isCompleteDraft =
    session && completedDraftStatuses.includes(String(session.status));
  const currentTeam = useMemo(
    () => getCurrentDraftTeam(orderedTeams, picks.length, session?.draft_type),
    [orderedTeams, picks.length, session?.draft_type],
  );
  const onDeckTeam = useMemo(() => {
    if (availablePlayers.length <= 1 || isCompleteDraft) {
      return null;
    }

    return getCurrentDraftTeam(orderedTeams, picks.length + 1, session?.draft_type);
  }, [
    availablePlayers.length,
    isCompleteDraft,
    orderedTeams,
    picks.length,
    session?.draft_type,
  ]);
  const playersById = useMemo(
    () => new Map(players.map((player) => [player.id, player])),
    [players],
  );
  const teamsById = useMemo(
    () => new Map(teams.map((team) => [team.id, team])),
    [teams],
  );
  const pickedPlayersById = useMemo(
    () => new Map(picks.map((pick) => [pick.player_id, pick])),
    [picks],
  );
  const boardPlayers = useMemo(() => {
    const captainIds = new Set(
      teams
        .map((team) => team.captain_player_id)
        .filter((playerId): playerId is string => Boolean(playerId)),
    );

    return players
      .filter((player) => !captainIds.has(player.id))
      .sort(comparePlayersForDraft);
  }, [players, teams]);
  const boardPlayersByRank = useMemo(
    () => groupPlayersByRank(boardPlayers),
    [boardPlayers],
  );
  const recentPick = picks[picks.length - 1] || null;
  const recentPickPlayer = recentPick ? playersById.get(recentPick.player_id) : null;
  const recentPickTeam = recentPick
    ? teamsById.get(recentPick.draft_team_id)
    : null;
  const pickRevealPlayer = activePickReveal
    ? playersById.get(activePickReveal.playerId)
    : null;
  const pickRevealTeam = activePickReveal
    ? teamsById.get(activePickReveal.teamId)
    : null;
  const pickStartedAt =
    session?.current_pick_started_at ||
    recentPick?.created_at ||
    session?.started_at ||
    null;
  const pickStartedTime =
    (pickStartedAt ? new Date(pickStartedAt).getTime() : now) +
    (recentPick?.id && timerDelayPickId === recentPick.id
      ? pickRevealDurationMs
      : 0);
  const elapsedSeconds = Math.max(
    0,
    Math.floor((now - pickStartedTime) / 1000),
  );
  const remainingSeconds = isCompleteDraft
    ? 0
    : Math.max(0, draftClockSeconds - elapsedSeconds);
  const clockPercent = isCompleteDraft
    ? 0
    : Math.max(0, Math.min(100, (remainingSeconds / draftClockSeconds) * 100));
  const isClockExpired = !isCompleteDraft && elapsedSeconds >= draftClockSeconds;
  const hasFinalPick =
    Boolean(session) &&
    !isLoading &&
    orderedTeams.length > 0 &&
    picks.length > 0 &&
    availablePlayers.length === 0;
  const shouldStartCompletePresentation = Boolean(isCompleteDraft || hasFinalPick);
  const shouldShowCompletePresentation =
    shouldStartCompletePresentation && completeReadySessionId === session?.id;
  const teamRailLoopTeams = useMemo(
    () => [...orderedTeams, ...orderedTeams],
    [orderedTeams],
  );
  const teamRailDurationSeconds = Math.max(orderedTeams.length * 6.5, 32);

  useEffect(() => {
    const latestPick = picks[picks.length - 1] || null;
    const latestPickId = latestPick?.id || null;

    if (!hasObservedInitialPickRef.current) {
      hasObservedInitialPickRef.current = true;
      lastObservedPickIdRef.current = latestPickId;
      return;
    }

    if (!latestPickId || latestPickId === lastObservedPickIdRef.current) {
      return;
    }

    lastObservedPickIdRef.current = latestPickId;
    setActivePickReveal({
      pickId: latestPick.id,
      playerId: latestPick.player_id,
      teamId: latestPick.draft_team_id,
    });
    setTimerDelayPickId(latestPick.id);

    if (revealTimeoutRef.current) {
      window.clearTimeout(revealTimeoutRef.current);
    }

    revealTimeoutRef.current = window.setTimeout(() => {
      setActivePickReveal((currentReveal) =>
        currentReveal?.pickId === latestPick.id ? null : currentReveal,
      );
    }, pickRevealDurationMs);
  }, [picks]);

  useEffect(() => {
    return () => {
      if (revealTimeoutRef.current) {
        window.clearTimeout(revealTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!session?.id || !shouldStartCompletePresentation) {
      return;
    }

    if (completeReadySessionId === session.id) {
      return;
    }

    const completedAtTime = session.completed_at
      ? new Date(session.completed_at).getTime()
      : null;
    const elapsedSinceCompletion = completedAtTime
      ? Date.now() - completedAtTime
      : 0;
    const remainingDelay = Math.max(
      0,
      draftCompleteDelayMs - elapsedSinceCompletion,
    );

    const timeoutId = window.setTimeout(() => {
      setCompleteReadySessionId(session.id);
    }, remainingDelay);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [
    completeReadySessionId,
    session?.completed_at,
    session?.id,
    shouldStartCompletePresentation,
  ]);

  if (shouldShowCompletePresentation) {
    return (
      <main className="draft-tv-shell draft-complete-shell h-screen overflow-hidden bg-[#02040a] p-4 text-[#f5f5f5]">
        <div className="grid h-full grid-rows-[auto_minmax(0,1fr)] gap-4">
          <section className="draft-complete-hero draft-board-panel rounded-[0.6rem] border border-[#1e40af]/45 bg-[#050915] px-6 py-5">
            <div className="grid grid-cols-[1fr_auto] items-end gap-6">
              <div className="min-w-0">
                <p className="draft-electric-label text-[clamp(0.9rem,1.2vw,1.2rem)] font-black uppercase tracking-[0.28em] text-[#7dd3fc]">
                  Golf Camp 2026
                </p>
                <h1 className="draft-complete-headline mt-2 text-[clamp(4.5rem,8vw,8.5rem)] font-black uppercase leading-[0.78] tracking-[-0.075em]">
                  Draft Complete
                </h1>
              </div>

              <div className="draft-complete-callout rounded-[0.5rem] border border-[#746a91]/55 bg-[#14111f] px-5 py-4 text-right">
                <p className="text-[clamp(1.3rem,2vw,2.25rem)] font-black uppercase leading-none tracking-[-0.04em] text-[#f8fbff]">
                  Parimutuel Betting Now Open
                </p>
                <p className="mt-2 text-[clamp(0.82rem,1vw,1rem)] font-bold uppercase tracking-[0.16em] text-[#d8d0ea]">
                  Betting closes at tee-off.
                </p>
              </div>
            </div>
          </section>

          <section className="draft-board-panel min-h-0 overflow-hidden rounded-[0.6rem] border border-[#1e40af]/45 bg-[#050915] p-4">
            <div className="flex items-center justify-between border-b border-[#1e40af]/35 pb-3">
              <div>
                <p className="draft-electric-label text-[clamp(0.82rem,1vw,1.05rem)] font-semibold uppercase tracking-[0.24em] text-[#93c5fd]">
                  Final Teams
                </p>
                <p className="mt-1 text-[clamp(0.68rem,0.85vw,0.82rem)] font-semibold uppercase tracking-[0.16em] text-[#516985]">
                  Draft board locked · Parimutuel markets next
                </p>
              </div>
              <span className="draft-pick-pill rounded-full border border-[#1e40af]/70 bg-[#071123] px-3 py-1.5 text-xs font-black uppercase tracking-[0.16em] text-[#bfdbfe]">
                {orderedTeams.length} Teams
              </span>
            </div>

            <div className="mt-4 grid h-[calc(100%-4.7rem)] grid-cols-5 grid-rows-2 gap-3 overflow-hidden">
              {orderedTeams.map((team) => {
                const captain = team.captain_player_id
                  ? playersById.get(team.captain_player_id)
                  : null;

                return (
                  <div
                    key={team.id}
                    className="draft-team-card draft-complete-team-card min-h-0 overflow-hidden rounded-[0.42rem] border border-[#1e40af]/30 bg-[#080e1f] p-3"
                  >
                    <h2 className="truncate text-[clamp(1rem,1.22vw,1.28rem)] font-black uppercase tracking-[-0.04em] text-[#f8fbff]">
                      {team.name}
                    </h2>
                    <p className="mt-1 truncate text-[clamp(0.66rem,0.78vw,0.8rem)] font-bold uppercase tracking-[0.1em] text-[#7dd3fc]">
                      Captain · {captain?.display_name || "TBD"}{" "}
                      {getPublicDisplayRank(captain?.display_rank, captain?.rank)}
                    </p>

                    <div className="mt-3 space-y-1">
                      {(picksByTeam[team.id] || []).map((pick) => {
                        const player = playersById.get(pick.player_id);

                        return (
                          <p
                            key={pick.id}
                            className="draft-pick-row flex items-center justify-between gap-2 truncate rounded-[0.28rem] border border-[#38bdf8]/15 bg-[#030712] px-2 py-1 text-[clamp(0.64rem,0.82vw,0.86rem)] font-semibold leading-tight text-[#edf8ff]"
                          >
                            <span className="truncate">
                              {player?.display_name || "Unknown"}
                            </span>
                            <span className="shrink-0 text-[0.66rem] font-black text-[#7dd3fc]">
                              {getPublicDisplayRank(
                                player?.display_rank,
                                player?.rank,
                              )}
                            </span>
                          </p>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </div>
        <style>{draftTvStyles}</style>
      </main>
    );
  }

  return (
    <main className="draft-tv-shell draft-whiteboard-mode h-screen overflow-hidden bg-[#e8ecdf] p-2 text-[#f5f5f5]">
      <div className="grid h-full grid-rows-[clamp(6.2rem,13vh,7.7rem)_minmax(0,1fr)_clamp(7.5rem,13vh,9rem)] gap-2">
        <section className="grid min-h-0 grid-cols-[0.42fr_1fr_0.52fr] gap-2">
          <div className="draft-brand-panel flex h-full flex-col justify-center overflow-hidden rounded-[0.55rem] border border-[#2563eb]/45 bg-[#050915] px-3 py-2 shadow-[0_18px_60px_rgba(0,0,0,0.42)]">
            <div className="flex items-center justify-between gap-2">
              <p className="font-mono text-[clamp(0.58rem,0.76vw,0.78rem)] font-black uppercase leading-none tracking-[0.16em] text-[#dbeafe] drop-shadow-[0_0_20px_rgba(147,197,253,0.2)]">
                Golf Camp 2026
              </p>
              <span className="draft-live-badge rounded-full border px-2 py-0.5 font-mono text-[8px] font-black uppercase tracking-[0.16em]">
                Live
              </span>
            </div>
            <h1 className="draft-title-glow mt-1 text-[clamp(1.35rem,2vw,2.15rem)] font-black uppercase leading-[0.82] tracking-[-0.055em]">
              Live Draft
            </h1>
            <p className="mt-0.5 truncate text-[clamp(0.58rem,0.74vw,0.74rem)] font-bold text-[#c7d2fe]">
              {session?.name || "No active draft"}
              {isCompleteDraft ? " · Complete" : ""}
            </p>
          </div>

          <div className="min-h-0">
            <div
              key={currentTeam?.id || "clock"}
              className="draft-clock-panel h-full rounded-[0.55rem] border border-[#60a5fa]/75 bg-[#050915] px-4 py-2 shadow-[0_0_40px_rgba(50,77,112,0.14)]"
            >
              <div className="grid h-full grid-cols-[1fr_auto] items-center gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-3">
                    <p className="draft-electric-label text-[clamp(0.58rem,0.76vw,0.8rem)] font-black uppercase tracking-[0.22em] text-[#93c5fd]">
                      On The Clock
                    </p>
                    <span className="draft-pick-pill rounded-full border border-[#2563eb]/70 bg-[#071123] px-2.5 py-0.5 text-[10px] font-black uppercase tracking-[0.16em] text-[#bfdbfe]">
                      Pick {picks.length + 1}
                    </span>
                  </div>
                  <h2 className="draft-current-team mt-1 truncate text-[clamp(2.35rem,4vw,4.35rem)] font-black uppercase leading-[0.82] tracking-[-0.065em]">
                    {isLoading
                      ? "Loading"
                      : error
                        ? "Error"
                        : isCompleteDraft
                          ? "Draft Complete"
                          : currentTeam?.name || "Complete"}
                  </h2>
                </div>

                <div
                  className={`draft-countdown-ring relative flex h-[clamp(4.3rem,6.4vw,5.5rem)] w-[clamp(4.3rem,6.4vw,5.5rem)] items-center justify-center rounded-full ${
                    isClockExpired ? "is-expired" : ""
                  }`}
                  style={{
                    background: `conic-gradient(${isClockExpired ? "#ef4444" : "#1f5136"} ${clockPercent}%, rgba(31,81,54,0.18) ${clockPercent}% 100%)`,
                  }}
                  aria-label={
                    isClockExpired
                      ? "Draft clock expired"
                      : `${remainingSeconds} seconds remaining`
                  }
                >
                  <div className="absolute inset-2 rounded-full border border-[#38bdf8]/35 bg-[#02040a]" />
                  <div className="relative text-center">
                    <p
                      className={`font-mono text-[clamp(1.6rem,2.45vw,2.35rem)] font-black leading-none ${
                        isClockExpired ? "text-[#fca5a5]" : "text-[#e0f2fe]"
                      }`}
                    >
                      {isCompleteDraft
                        ? "--"
                        : String(remainingSeconds).padStart(2, "0")}
                    </p>
                    <p className="mt-0.5 font-mono text-[8px] font-black uppercase tracking-[0.18em] text-[#7dd3fc]">
                      Sec
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid min-h-0 grid-rows-2 gap-2">
            <div className="draft-side-panel flex h-full items-center rounded-[0.55rem] border border-[#324d70]/55 bg-[#050915] px-3 py-1.5 shadow-[0_18px_60px_rgba(0,0,0,0.34)]">
              <div className="grid grid-cols-[auto_1fr] items-center gap-2">
                <p className="draft-electric-label font-mono text-[8px] font-black uppercase tracking-[0.2em] text-[#9aacbf]">
                  On Deck
                </p>
                <p className="truncate text-[clamp(0.9rem,1.35vw,1.42rem)] font-black leading-none tracking-[-0.045em] text-[#dbeafe]">
                  {isCompleteDraft
                    ? "Draft Complete"
                    : onDeckTeam?.name || "Final Pick"}
                </p>
              </div>
            </div>

            <div
              key={recentPick?.id || "last-pick-empty"}
              className="recent-pick-strip draft-side-panel flex h-full items-center rounded-[0.55rem] border border-[#324d70]/60 bg-[#050915] px-3 py-1.5 shadow-[0_18px_60px_rgba(0,0,0,0.38),0_0_28px_rgba(50,77,112,0.1)]"
            >
              <div className="grid w-full grid-cols-[auto_1fr] items-center gap-2">
                <p className="draft-electric-label font-mono text-[8px] font-black uppercase tracking-[0.2em] text-[#9aacbf]">
                  Last Pick
                </p>
                <div className="min-w-0">
                  <p className="truncate text-[clamp(0.58rem,0.74vw,0.76rem)] font-semibold text-[#dbeafe]">
                    {recentPickTeam ? `${recentPickTeam.name} selected` : "Awaiting first pick"}
                  </p>
                  <p className="truncate text-[clamp(0.9rem,1.35vw,1.42rem)] font-black leading-none tracking-[-0.04em]">
                    {recentPickPlayer?.display_name || "Draft ready"}
                  </p>
                </div>
              </div>
              {error && <p className="mt-1 text-xs text-[#ff8a8a]">{error}</p>}
            </div>
          </div>
        </section>

        <section className="draft-main-pool draft-board-panel min-h-0 overflow-hidden rounded-[0.6rem] border border-[#1e40af]/45 bg-[#050915] p-3 shadow-[0_24px_80px_rgba(0,0,0,0.42)]">
          <div className="flex items-center justify-between gap-4 border-b border-[#1e40af]/35 pb-2">
            <div className="min-w-0">
              <p className="draft-pool-title draft-title-glow text-[clamp(1.18rem,1.55vw,1.72rem)] font-black uppercase tracking-[0.15em] text-[#f8fbff]">
                Available Player Pool
              </p>
            </div>
            <span className="draft-pick-pill rounded-full border border-[#1e40af]/70 bg-[#071123] px-3 py-1.5 text-xs font-black text-[#bfdbfe]">
              A-D
            </span>
          </div>

          <div className="mt-2 grid h-[calc(100%-3.35rem)] grid-cols-4 gap-1.5 overflow-hidden">
            {["A", "B", "C", "D"].map((rank) => (
              <div
                key={rank}
                className="draft-rank-card min-h-0 overflow-hidden rounded-[0.45rem] border border-[#1e40af]/45 bg-[#080e1f] p-2.5"
              >
                <div className="flex items-center justify-between gap-3">
                  <h3 className="draft-rank-title text-[clamp(1.45rem,2.05vw,2.35rem)] font-black uppercase tracking-[-0.05em] text-[#e0f2fe]">
                    Rank {rank}
                  </h3>
                  <span className="draft-rank-count rounded-full border border-[#38bdf8]/35 bg-[#082f49]/35 px-2.5 py-1 font-mono text-[10px] font-black text-[#7dd3fc]">
                    {(availableByRank[rank] || []).length}/
                    {(boardPlayersByRank[rank] || []).length}
                  </span>
                </div>
                <div className="mt-1 grid grid-cols-1 gap-0.5">
                  {(boardPlayersByRank[rank] || []).slice(0, 18).map((player) => {
                    const pickedPlayer = pickedPlayersById.get(player.id);
                    const pickedTeam = pickedPlayer
                      ? teamsById.get(pickedPlayer.draft_team_id)
                      : null;

                    return (
                      <div
                        key={player.id}
                        className={`draft-available-row draft-whiteboard-player-row flex items-center justify-between gap-2 rounded-[0.4rem] border border-[#1e40af]/25 bg-[#030712] px-3 py-0.5 ${
                          pickedPlayer ? "is-drafted" : ""
                        }`}
                      >
                        <span className="draft-whiteboard-name min-w-0 flex-1 truncate text-[clamp(1.08rem,1.45vw,1.52rem)] font-bold leading-tight">
                          {player.display_name}
                        </span>
                        <span className="draft-whiteboard-picked-note hidden shrink-0 truncate text-[clamp(0.58rem,0.75vw,0.76rem)] font-black uppercase tracking-[0.1em]">
                          {pickedTeam?.name || "Picked"}
                        </span>
                        <span className="draft-whiteboard-rank text-[clamp(1.08rem,1.45vw,1.52rem)] font-black leading-tight text-[#93c5fd]">
                          {getPublicDisplayRank(player.display_rank, player.rank)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="draft-team-rail draft-board-panel min-h-0 overflow-hidden rounded-[0.6rem] border border-[#1e40af]/45 bg-[#050915] p-3 shadow-[0_24px_80px_rgba(0,0,0,0.42)]">
          <div className="flex h-full min-h-0 gap-2">
            <div className="flex w-[clamp(6.5rem,8vw,8.5rem)] shrink-0 flex-col justify-between border-r border-[#1e40af]/35 pr-3">
              <p className="draft-electric-label text-[10px] font-semibold uppercase tracking-[0.24em] text-[#93c5fd]">
                Teams
              </p>
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#516985]">
                Reference Rail
              </p>
            </div>

            <div className="draft-team-marquee-window min-h-0 flex-1 overflow-hidden">
              <div
                className="draft-team-marquee flex h-full min-w-max gap-2"
                style={{
                  animationDuration: `${teamRailDurationSeconds}s`,
                }}
              >
              {teamRailLoopTeams.map((team, index) => {
                const captain = playersById.get(team.captain_player_id || "");
                const teamPicks = picksByTeam[team.id] || [];

                return (
                  <div
                    key={`${team.id}-${index}`}
                    className={`draft-team-card draft-team-rail-card grid min-h-0 w-[clamp(22rem,28vw,34rem)] shrink-0 grid-cols-[1.08fr_1.2fr] gap-3 overflow-hidden rounded-[0.38rem] border p-2.5 ${
                      currentTeam?.id === team.id
                        ? "is-current border-[#60a5fa] bg-[#071123] shadow-[0_0_28px_rgba(50,77,112,0.14)]"
                        : "border-[#1e40af]/30 bg-[#080e1f]"
                    }`}
                  >
                    <div className="min-w-0 border-r border-[#1e40af]/25 pr-3">
                      <h3 className="truncate text-[clamp(1.2rem,1.55vw,1.72rem)] font-black leading-none tracking-[-0.045em]">
                        {team.name}
                      </h3>
                      <p className="mt-1 truncate text-[clamp(0.98rem,1.18vw,1.24rem)] font-bold leading-tight text-[#93c5fd]">
                        {captain?.display_name || "Captain"}
                      </p>
                      <p className="mt-1 font-mono text-[clamp(0.9rem,1.04vw,1.08rem)] font-black uppercase tracking-[0.14em] text-[#7dd3fc]">
                        {getPublicDisplayRank(captain?.display_rank, captain?.rank)}
                      </p>
                    </div>

                    <div className="flex min-w-0 flex-col justify-center gap-1">
                      {teamPicks.slice(0, 3).map((pick) => {
                        const player = playersById.get(pick.player_id);

                        return (
                          <p
                            key={pick.id}
                            className="draft-pick-row grid min-w-0 grid-cols-[1fr_auto] gap-2 truncate text-[clamp(0.98rem,1.18vw,1.24rem)] font-bold leading-tight"
                          >
                            <span className="truncate">
                              {player?.display_name || "Unknown"}
                            </span>
                            <span className="text-[clamp(0.9rem,1.04vw,1.08rem)] font-black text-[#7dd3fc]">
                              {getPublicDisplayRank(
                                player?.display_rank,
                                player?.rank,
                              )}
                            </span>
                          </p>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
              </div>
            </div>
          </div>
        </section>
      </div>

      {activePickReveal && pickRevealPlayer && pickRevealTeam && (
        <div className="draft-pick-reveal-overlay" aria-live="polite">
          <section className="draft-pick-reveal-card">
            <div className="draft-pick-reveal-photo-wrap">
              {pickRevealPlayer.photo_url ? (
                <div
                  className="draft-pick-reveal-photo"
                  role="img"
                  aria-label={`${pickRevealPlayer.display_name} profile photo`}
                  style={{
                    backgroundImage: `url(${pickRevealPlayer.photo_url})`,
                  }}
                />
              ) : (
                <PlayerSilhouette
                  className="draft-pick-reveal-photo"
                  label={`${pickRevealPlayer.display_name} profile placeholder`}
                />
              )}
            </div>

            <div className="min-w-0 text-center">
              <p className="draft-reveal-kicker">Selection Is In</p>
              <p className="draft-reveal-team">
                {pickRevealTeam.name} Selects
              </p>
              <h2 className="draft-reveal-player">
                {pickRevealPlayer.display_name}
              </h2>
              <p className="draft-reveal-rank">
                {getPublicDisplayRank(
                  pickRevealPlayer.display_rank,
                  pickRevealPlayer.rank,
                )}
              </p>
            </div>
          </section>
        </div>
      )}
      <style>{draftTvStyles}</style>
    </main>
  );
}

const draftTvStyles = `
        .draft-tv-shell {
          --draft-electric: #38bdf8;
          --draft-electric-strong: #60a5fa;
          --draft-electric-deep: #2563eb;
          --draft-midnight: #020617;
          position: relative;
          isolation: isolate;
        }

        html[data-theme="light"] .draft-tv-shell {
          background: #02040a !important;
          color: #f5f5f5 !important;
        }

        html[data-theme="light"] .draft-tv-shell p,
        html[data-theme="light"] .draft-tv-shell h1,
        html[data-theme="light"] .draft-tv-shell h2,
        html[data-theme="light"] .draft-tv-shell h3,
        html[data-theme="light"] .draft-tv-shell span {
          color: inherit;
        }

        html[data-theme="light"] .draft-tv-shell .draft-electric-label {
          color: #7dd3fc !important;
        }

        html[data-theme="light"] .draft-tv-shell .draft-title-glow,
        html[data-theme="light"] .draft-tv-shell .draft-current-team {
          color: #f8fbff !important;
        }

        html[data-theme="light"] .draft-tv-shell .draft-pick-pill {
          color: #e0f2fe !important;
        }

        html[data-theme="light"] .draft-tv-shell .draft-brand-panel,
        html[data-theme="light"] .draft-tv-shell .draft-clock-panel,
        html[data-theme="light"] .draft-tv-shell .draft-side-panel,
        html[data-theme="light"] .draft-tv-shell .draft-board-panel {
          background: #050915 !important;
          border-color: rgba(56, 189, 248, 0.42) !important;
        }

        html[data-theme="light"] .draft-tv-shell .draft-rank-card,
        html[data-theme="light"] .draft-tv-shell .draft-team-card {
          background: #080e1f !important;
        }

        html[data-theme="light"] .draft-tv-shell .draft-team-card.is-current {
          background: #071123 !important;
          border-color: rgba(125, 211, 252, 0.9) !important;
        }

        html[data-theme="light"] .draft-tv-shell .draft-available-row {
          background: #030712 !important;
          border-color: rgba(56, 189, 248, 0.24) !important;
        }

        .draft-tv-shell::before {
          content: "";
          position: fixed;
          inset: -18%;
          pointer-events: none;
          z-index: -1;
          background:
            radial-gradient(circle at 22% 14%, rgba(56, 189, 248, 0.2), transparent 28rem),
            radial-gradient(circle at 82% 70%, rgba(37, 99, 235, 0.16), transparent 30rem),
            radial-gradient(circle at 48% 44%, rgba(14, 165, 233, 0.08), transparent 34rem);
          animation: draftAmbientDrift 13s ease-in-out infinite alternate;
        }

        .draft-tv-shell::after {
          content: "";
          position: fixed;
          inset: 0;
          pointer-events: none;
          z-index: -1;
          background:
            linear-gradient(180deg, rgba(125, 211, 252, 0.035) 0 1px, transparent 1px 6px),
            radial-gradient(circle at center, transparent 48%, rgba(0, 0, 0, 0.42) 100%);
          opacity: 0.9;
        }

        .draft-complete-shell {
          animation: draftCompleteReveal 900ms ease both;
        }

        .draft-complete-headline {
          color: #f8fbff;
          text-shadow:
            0 0 28px rgba(56, 189, 248, 0.32),
            0 0 82px rgba(37, 99, 235, 0.24);
        }

        .draft-complete-hero {
          box-shadow:
            inset 0 0 0 1px rgba(125, 211, 252, 0.12),
            inset 0 0 28px rgba(56, 189, 248, 0.07),
            0 30px 100px rgba(0, 0, 0, 0.62),
            0 0 70px rgba(56, 189, 248, 0.22);
        }

        .draft-complete-callout {
          background:
            radial-gradient(circle at 0% 50%, rgba(116, 106, 145, 0.22), transparent 62%),
            #14111f;
          border-color: rgba(116, 106, 145, 0.62);
          position: relative;
          overflow: hidden;
          animation: parimutuelCalloutPulse 2.8s ease-in-out infinite alternate;
          box-shadow:
            inset 0 0 0 1px rgba(216, 208, 234, 0.12),
            inset 0 0 22px rgba(116, 106, 145, 0.12),
            0 0 36px rgba(116, 106, 145, 0.28),
            0 0 72px rgba(116, 106, 145, 0.12);
        }

        .draft-complete-callout::before {
          content: "";
          position: absolute;
          inset: -2px;
          pointer-events: none;
          border-radius: inherit;
          background:
            linear-gradient(
              115deg,
              transparent 0%,
              transparent 31%,
              rgba(216, 208, 234, 0.28) 45%,
              rgba(116, 106, 145, 0.34) 52%,
              transparent 68%,
              transparent 100%
            );
          opacity: 0.58;
          transform: translateX(-42%);
          animation: parimutuelCalloutSweep 4.6s ease-in-out infinite;
        }

        .draft-complete-callout::after {
          content: "";
          position: absolute;
          inset: 0;
          pointer-events: none;
          border-radius: inherit;
          box-shadow:
            inset 0 1px 0 rgba(245, 245, 245, 0.16),
            inset 0 -1px 0 rgba(116, 106, 145, 0.28);
        }

        .draft-complete-callout p:first-child {
          position: relative;
          z-index: 1;
          text-shadow:
            0 0 18px rgba(216, 208, 234, 0.18),
            0 0 42px rgba(116, 106, 145, 0.18);
        }

        .draft-complete-callout p:last-child {
          position: relative;
          z-index: 1;
        }

        .draft-complete-team-card {
          box-shadow:
            inset 0 0 0 1px rgba(125, 211, 252, 0.08),
            inset 0 0 20px rgba(56, 189, 248, 0.05),
            0 0 22px rgba(56, 189, 248, 0.12);
        }

        .draft-brand-panel,
        .draft-clock-panel,
        .draft-side-panel,
        .draft-board-panel,
        .draft-rank-card,
        .draft-team-card {
          position: relative;
          overflow: hidden;
          background: #050915;
          border-color: rgba(56, 189, 248, 0.5);
          box-shadow:
            inset 0 0 0 1px rgba(125, 211, 252, 0.08),
            inset 0 0 22px rgba(56, 189, 248, 0.055),
            0 20px 70px rgba(0, 0, 0, 0.52),
            0 0 32px rgba(56, 189, 248, 0.14);
        }

        .draft-brand-panel::before,
        .draft-clock-panel::before,
        .draft-side-panel::before,
        .draft-board-panel::before,
        .draft-rank-card::before,
        .draft-team-card::before {
          content: "";
          position: absolute;
          inset: -1px;
          pointer-events: none;
          border-radius: inherit;
          background:
            linear-gradient(90deg, rgba(56, 189, 248, 0.24), transparent 8%, transparent 92%, rgba(96, 165, 250, 0.2)),
            linear-gradient(180deg, rgba(125, 211, 252, 0.14), transparent 15%, transparent 85%, rgba(37, 99, 235, 0.12));
          opacity: 0.72;
          animation: draftEdgeBreathe 4.8s ease-in-out infinite alternate;
        }

        .draft-brand-panel::after,
        .draft-clock-panel::after,
        .draft-side-panel::after,
        .draft-board-panel::after,
        .draft-rank-card::after,
        .draft-team-card::after {
          content: "";
          position: absolute;
          inset: 0;
          pointer-events: none;
          border-radius: inherit;
          box-shadow:
            inset 0 1px 0 rgba(224, 242, 254, 0.14),
            inset 0 -1px 0 rgba(56, 189, 248, 0.13);
        }

        .draft-clock-panel,
        .draft-board-panel {
          border-color: rgba(125, 211, 252, 0.68);
          box-shadow:
            inset 0 0 0 1px rgba(125, 211, 252, 0.12),
            inset 0 0 24px rgba(56, 189, 248, 0.06),
            0 24px 90px rgba(0, 0, 0, 0.58),
            0 0 50px rgba(56, 189, 248, 0.24),
            0 0 88px rgba(37, 99, 235, 0.16);
        }

        .draft-main-pool {
          animation: draftMainPoolPulse 5.8s ease-in-out infinite alternate;
        }

        .draft-main-pool::before {
          background:
            linear-gradient(90deg, rgba(56, 189, 248, 0.36), transparent 9%, transparent 91%, rgba(96, 165, 250, 0.3)),
            linear-gradient(180deg, rgba(125, 211, 252, 0.2), transparent 13%, transparent 86%, rgba(37, 99, 235, 0.18));
        }

        .draft-rank-card,
        .draft-team-card {
          background: #080e1f;
          border-color: rgba(56, 189, 248, 0.44);
          box-shadow:
            inset 0 0 0 1px rgba(125, 211, 252, 0.06),
            inset 0 0 18px rgba(56, 189, 248, 0.045),
            0 14px 36px rgba(0, 0, 0, 0.42),
            0 0 18px rgba(56, 189, 248, 0.1);
        }

        .draft-team-card.is-current {
          border-color: rgba(125, 211, 252, 0.9);
          background: #071123;
          box-shadow:
            inset 0 0 0 1px rgba(224, 242, 254, 0.16),
            inset 0 0 22px rgba(56, 189, 248, 0.09),
            0 0 34px rgba(56, 189, 248, 0.28),
            0 14px 38px rgba(0, 0, 0, 0.44);
        }

        .draft-team-card h3 {
          color: #f8fbff !important;
          text-shadow: 0 0 14px rgba(56, 189, 248, 0.16);
        }

        .draft-team-card p {
          color: #93c5fd !important;
        }

        .draft-team-card .draft-pick-row {
          color: #edf8ff !important;
        }

        .draft-team-card .draft-pick-row span {
          color: #7dd3fc !important;
        }

        .draft-title-glow,
        .draft-current-team {
          color: #f8fbff;
          text-shadow:
            0 0 18px rgba(56, 189, 248, 0.2),
            0 0 42px rgba(37, 99, 235, 0.14);
        }

        .draft-current-team {
          animation: draftNameGlow 4.8s ease-in-out infinite alternate;
        }

        .draft-live-badge {
          border-color: rgba(56, 189, 248, 0.58);
          background: rgba(8, 47, 73, 0.58);
          color: #e0f2fe;
          box-shadow:
            0 0 18px rgba(56, 189, 248, 0.14),
            inset 0 0 12px rgba(56, 189, 248, 0.08);
          animation: draftLivePulse 1.9s ease-in-out infinite alternate;
        }

        .draft-pool-title {
          text-shadow:
            0 0 16px rgba(125, 211, 252, 0.24),
            0 0 46px rgba(37, 99, 235, 0.2);
        }

        .draft-rank-title {
          text-shadow:
            0 0 14px rgba(56, 189, 248, 0.2),
            0 0 34px rgba(37, 99, 235, 0.14);
        }

        .draft-rank-count {
          box-shadow:
            0 0 16px rgba(56, 189, 248, 0.1),
            inset 0 0 12px rgba(56, 189, 248, 0.08);
        }

        .draft-electric-label {
          color: #7dd3fc;
          text-shadow: 0 0 18px rgba(56, 189, 248, 0.26);
        }

        .draft-pick-pill {
          border-color: rgba(56, 189, 248, 0.55);
          background: rgba(8, 47, 73, 0.62);
          color: #e0f2fe;
          box-shadow: 0 0 20px rgba(56, 189, 248, 0.1), inset 0 0 14px rgba(56, 189, 248, 0.06);
        }

        .draft-clock-panel {
          animation: draftClockSettle 700ms ease both, draftClockGlow 3.8s ease-in-out infinite alternate;
        }

        .draft-countdown-ring {
          box-shadow:
            0 0 30px rgba(56, 189, 248, 0.22),
            0 0 58px rgba(37, 99, 235, 0.16),
            inset 0 0 24px rgba(56, 189, 248, 0.05);
          transition: background 220ms ease, box-shadow 220ms ease;
          animation: draftRingBreathe 3.2s ease-in-out infinite alternate;
        }

        .draft-countdown-ring.is-expired {
          animation: draftExpiredPulse 1.75s ease-in-out infinite alternate;
          box-shadow: 0 0 42px rgba(127, 29, 29, 0.2), inset 0 0 24px rgba(127, 29, 29, 0.08);
        }

        .recent-pick-strip {
          animation: recentPickReveal 680ms ease both;
        }

        .draft-available-row {
          animation: draftRowSettle 520ms ease both, draftRowEnergy 7.4s ease-in-out infinite alternate;
          border-color: rgba(56, 189, 248, 0.32);
          background:
            linear-gradient(90deg, rgba(8, 47, 73, 0.34), rgba(3, 7, 18, 0.98) 42%, rgba(3, 7, 18, 0.96)),
            #030712;
          box-shadow:
            inset 0 1px 0 rgba(224, 242, 254, 0.08),
            0 0 14px rgba(56, 189, 248, 0.075);
          transition: border-color 220ms ease, background-color 220ms ease, opacity 220ms ease, box-shadow 220ms ease;
        }

        .draft-available-row:hover {
          border-color: rgba(125, 211, 252, 0.6);
          box-shadow:
            inset 0 1px 0 rgba(224, 242, 254, 0.08),
            0 0 18px rgba(56, 189, 248, 0.08);
        }

        .draft-pick-row {
          animation: draftedPlayerSettle 640ms ease both;
        }

        .draft-team-marquee-window {
          position: relative;
          mask-image: linear-gradient(90deg, transparent 0%, #000 4%, #000 96%, transparent 100%);
        }

        .draft-team-marquee {
          animation: draftTeamRailMarquee linear infinite;
          will-change: transform;
        }

        .draft-team-rail:hover .draft-team-marquee {
          animation-play-state: paused;
        }

        .draft-whiteboard-mode {
          --draft-marker-blue: #1f5136;
          --draft-marker-green: #1f5136;
          --draft-marker-green-soft: #315f48;
          --draft-marker-red: #c81e1e;
          --draft-marker-black: #172033;
          background:
            radial-gradient(circle at 18% 12%, rgba(255, 255, 255, 0.44), transparent 18rem),
            radial-gradient(circle at 86% 70%, rgba(31, 81, 54, 0.1), transparent 26rem),
            repeating-linear-gradient(-2deg, rgba(23, 32, 51, 0.018) 0 1px, transparent 1px 11px),
            #e8ecdf !important;
          color: #172033 !important;
        }

        .draft-whiteboard-mode::before {
          background:
            radial-gradient(circle at 20% 14%, rgba(31, 81, 54, 0.08), transparent 28rem),
            radial-gradient(circle at 84% 72%, rgba(200, 30, 30, 0.055), transparent 26rem),
            linear-gradient(135deg, rgba(255, 255, 255, 0.18), transparent 34%);
          animation: draftAmbientDrift 18s ease-in-out infinite alternate;
        }

        .draft-whiteboard-mode::after {
          background:
            repeating-linear-gradient(0deg, rgba(17, 24, 39, 0.018) 0 1px, transparent 1px 8px),
            radial-gradient(circle at center, transparent 62%, rgba(17, 24, 39, 0.18) 100%);
          opacity: 0.8;
        }

        .draft-whiteboard-mode .draft-brand-panel,
        .draft-whiteboard-mode .draft-clock-panel,
        .draft-whiteboard-mode .draft-side-panel,
        .draft-whiteboard-mode .draft-board-panel,
        .draft-whiteboard-mode .draft-rank-card,
        .draft-whiteboard-mode .draft-team-card {
          border-width: 3px !important;
          border-color: rgba(23, 32, 51, 0.76) !important;
          background:
            radial-gradient(circle at 16% 0%, rgba(255, 255, 255, 0.82), transparent 14rem),
            repeating-linear-gradient(-2deg, rgba(23, 32, 51, 0.035) 0 1px, transparent 1px 10px),
            linear-gradient(180deg, #f8faf4, #e8ecdf) !important;
          color: #172033 !important;
          box-shadow:
            inset 0 0 0 2px rgba(255, 255, 255, 0.62),
            inset 0 0 34px rgba(31, 81, 54, 0.045),
            0 20px 70px rgba(0, 0, 0, 0.42),
            0 0 0 1px rgba(17, 24, 39, 0.38) !important;
        }

        .draft-whiteboard-mode .draft-brand-panel::before,
        .draft-whiteboard-mode .draft-clock-panel::before,
        .draft-whiteboard-mode .draft-side-panel::before,
        .draft-whiteboard-mode .draft-board-panel::before,
        .draft-whiteboard-mode .draft-rank-card::before,
        .draft-whiteboard-mode .draft-team-card::before {
          background:
            linear-gradient(90deg, rgba(31, 81, 54, 0.18), transparent 9%, transparent 91%, rgba(200, 30, 30, 0.11)),
            repeating-linear-gradient(90deg, transparent 0 20px, rgba(23, 32, 51, 0.03) 20px 21px);
          opacity: 0.72;
          animation: none;
        }

        .draft-whiteboard-mode .draft-brand-panel::after,
        .draft-whiteboard-mode .draft-clock-panel::after,
        .draft-whiteboard-mode .draft-side-panel::after,
        .draft-whiteboard-mode .draft-board-panel::after,
        .draft-whiteboard-mode .draft-rank-card::after,
        .draft-whiteboard-mode .draft-team-card::after {
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.74),
            inset 0 -2px 0 rgba(23, 32, 51, 0.08);
        }

        .draft-whiteboard-mode .draft-title-glow,
        .draft-whiteboard-mode .draft-current-team,
        .draft-whiteboard-mode .draft-pool-title,
        .draft-whiteboard-mode .draft-rank-title {
          color: var(--draft-marker-black) !important;
          text-shadow:
            0.035em 0.025em 0 rgba(31, 81, 54, 0.12),
            -0.02em 0.02em 0 rgba(200, 30, 30, 0.06) !important;
        }

        .draft-whiteboard-mode .draft-current-team {
          position: relative;
          display: inline-block;
          overflow: visible !important;
          isolation: isolate;
        }

        .draft-whiteboard-mode .draft-current-team::before {
          content: "";
          position: absolute;
          left: 0.04em;
          right: -0.04em;
          bottom: -0.12em;
          z-index: -1;
          height: 0.08em;
          border-radius: 999px;
          background: rgba(31, 81, 54, 0.58);
          transform: rotate(-1.2deg);
          opacity: 0.84;
        }

        .draft-whiteboard-mode .draft-brand-panel .draft-title-glow {
          color: var(--draft-marker-black) !important;
          text-shadow:
            0.035em 0.025em 0 rgba(31, 81, 54, 0.12),
            0.035em 0.025em 0 rgba(200, 30, 30, 0.18) !important;
        }

        .draft-whiteboard-mode .draft-electric-label {
          color: var(--draft-marker-blue) !important;
          text-shadow: none !important;
        }

        .draft-whiteboard-mode .draft-pick-pill,
        .draft-whiteboard-mode .draft-live-badge,
        .draft-whiteboard-mode .draft-rank-count {
          border-color: rgba(31, 81, 54, 0.52) !important;
          background: rgba(220, 238, 226, 0.76) !important;
          color: #1f5136 !important;
          box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.38) !important;
        }

        .draft-whiteboard-mode .draft-live-badge {
          background: rgba(31, 81, 54, 0.12) !important;
          color: #1f5136 !important;
          border-color: rgba(31, 81, 54, 0.46) !important;
        }

        .draft-whiteboard-mode .draft-brand-panel p {
          color: #172033 !important;
          text-shadow: none !important;
        }

        .draft-whiteboard-mode .draft-brand-panel p:first-child {
          color: #1f5136 !important;
        }

        .draft-whiteboard-mode .draft-brand-panel h1 {
          color: #172033 !important;
        }

        .draft-whiteboard-mode .draft-side-panel p,
        .draft-whiteboard-mode .draft-team-card p,
        .draft-whiteboard-mode .draft-team-card h3,
        .draft-whiteboard-mode .draft-team-card .draft-pick-row,
        .draft-whiteboard-mode .draft-team-card .draft-pick-row span {
          color: #172033 !important;
          text-shadow: none !important;
        }

        .draft-whiteboard-mode .draft-countdown-ring {
          position: relative;
          box-shadow:
            0 0 0 4px rgba(23, 32, 51, 0.09),
            0 0 28px rgba(31, 81, 54, 0.16) !important;
          animation: draftRingBreathe 4.2s ease-in-out infinite alternate;
        }

        .draft-whiteboard-mode .draft-countdown-ring::before,
        .draft-whiteboard-mode .draft-countdown-ring::after {
          content: "";
          position: absolute;
          inset: -0.18rem;
          pointer-events: none;
          border-radius: 999px;
          border: 0.16rem solid rgba(31, 81, 54, 0.56);
          transform: rotate(-4deg);
          opacity: 0.82;
          z-index: 1;
        }

        .draft-whiteboard-mode .draft-countdown-ring::after {
          inset: -0.02rem;
          border-color: rgba(23, 32, 51, 0.18);
          border-width: 0.08rem;
          transform: rotate(5deg);
          opacity: 0.74;
        }

        .draft-whiteboard-mode .draft-countdown-ring > div:first-child {
          background: #f8faf4 !important;
          border-color: rgba(23, 32, 51, 0.24) !important;
        }

        .draft-whiteboard-mode .draft-countdown-ring p {
          color: var(--draft-marker-green) !important;
        }

        .draft-whiteboard-mode .draft-rank-card {
          border-width: 3px !important;
          border-style: solid;
          border-color: rgba(23, 32, 51, 0.72) !important;
        }

        .draft-whiteboard-mode .draft-rank-card:nth-child(1) {
          box-shadow:
            inset 0 0 0 2px rgba(31, 81, 54, 0.1),
            0 18px 44px rgba(0, 0, 0, 0.28) !important;
        }

        .draft-whiteboard-mode .draft-rank-card:nth-child(2) {
          box-shadow:
            inset 0 0 0 2px rgba(22, 101, 52, 0.08),
            0 18px 44px rgba(0, 0, 0, 0.28) !important;
        }

        .draft-whiteboard-mode .draft-rank-card:nth-child(3) {
          box-shadow:
            inset 0 0 0 2px rgba(180, 83, 9, 0.09),
            0 18px 44px rgba(0, 0, 0, 0.28) !important;
        }

        .draft-whiteboard-mode .draft-rank-card:nth-child(4) {
          box-shadow:
            inset 0 0 0 2px rgba(200, 30, 30, 0.08),
            0 18px 44px rgba(0, 0, 0, 0.28) !important;
        }

        .draft-whiteboard-mode .draft-whiteboard-player-row {
          position: relative;
          overflow: hidden;
          border: 0 !important;
          border-bottom: 2px solid rgba(23, 32, 51, 0.16) !important;
          border-radius: 0.1rem !important;
          background:
            linear-gradient(90deg, rgba(255, 255, 255, 0.6), rgba(238, 242, 231, 0.68)) !important;
          box-shadow: none !important;
          animation: none !important;
        }

        .draft-whiteboard-mode .draft-whiteboard-player-row::before {
          content: "";
          position: absolute;
          left: 0.45rem;
          right: 0.45rem;
          top: 50%;
          height: 0.24rem;
          border-radius: 999px;
          background:
            linear-gradient(90deg, transparent, rgba(200, 30, 30, 0.95) 8%, rgba(200, 30, 30, 0.84) 88%, transparent);
          transform: translateY(-50%) rotate(-2deg) scaleX(0);
          transform-origin: left center;
          opacity: 0;
          box-shadow:
            0 0 0 1px rgba(127, 29, 29, 0.18),
            0 0 10px rgba(200, 30, 30, 0.22);
          transition: transform 320ms ease, opacity 220ms ease;
          z-index: 2;
        }

        .draft-whiteboard-mode .draft-whiteboard-player-row.is-drafted {
          opacity: 0.78;
          background:
            linear-gradient(90deg, rgba(255, 255, 255, 0.52), rgba(238, 242, 231, 0.55)) !important;
        }

        .draft-whiteboard-mode .draft-whiteboard-player-row.is-drafted::before {
          opacity: 1;
          transform: translateY(-50%) rotate(-2deg) scaleX(1);
        }

        .draft-whiteboard-mode .draft-whiteboard-name,
        .draft-whiteboard-mode .draft-whiteboard-rank {
          color: var(--draft-marker-black) !important;
          text-shadow:
            0.03em 0.02em 0 rgba(31, 81, 54, 0.08);
          position: relative;
          z-index: 1;
        }

        .draft-whiteboard-mode .draft-whiteboard-rank {
          color: var(--draft-marker-blue) !important;
        }

        .draft-whiteboard-mode .draft-whiteboard-player-row.is-drafted .draft-whiteboard-name,
        .draft-whiteboard-mode .draft-whiteboard-player-row.is-drafted .draft-whiteboard-rank {
          color: rgba(23, 32, 51, 0.58) !important;
        }

        .draft-whiteboard-mode .draft-whiteboard-player-row.is-drafted .draft-whiteboard-picked-note {
          display: block;
          color: #991b1b !important;
          position: relative;
          z-index: 3;
          max-width: 38%;
        }

        .draft-whiteboard-mode .draft-team-rail-card {
          background:
            linear-gradient(180deg, #f8faf4, #e8ecdf) !important;
          border-width: 3px !important;
          border-color: rgba(23, 32, 51, 0.7) !important;
          box-shadow:
            inset 0 0 0 2px rgba(255, 255, 255, 0.52),
            0 18px 44px rgba(0, 0, 0, 0.28) !important;
        }

        .draft-pick-reveal-overlay {
          position: fixed;
          inset: 0;
          z-index: 30;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 4rem;
          pointer-events: none;
          background:
            radial-gradient(circle at 50% 42%, rgba(23, 32, 51, 0.14), transparent 26rem),
            radial-gradient(circle at 50% 50%, rgba(31, 81, 54, 0.14), transparent 34rem),
            rgba(232, 236, 223, 0.2);
          backdrop-filter: blur(2px);
          animation: draftRevealOverlay 5s ease both;
        }

        .draft-pick-reveal-card {
          position: relative;
          display: grid;
          grid-template-columns: minmax(10rem, 16vw) minmax(0, 1fr);
          align-items: center;
          gap: clamp(1.5rem, 3vw, 3rem);
          width: min(76vw, 78rem);
          min-height: clamp(20rem, 42vh, 30rem);
          border: clamp(0.22rem, 0.36vw, 0.34rem) solid rgba(23, 32, 51, 0.82);
          border-radius: 1.15rem;
          padding: clamp(1.6rem, 3.2vw, 3.2rem);
          overflow: hidden;
          color: #172033;
          background:
            radial-gradient(circle at 18% 0%, rgba(255, 255, 255, 0.9), transparent 18rem),
            radial-gradient(circle at 100% 100%, rgba(31, 81, 54, 0.18), transparent 25rem),
            repeating-linear-gradient(-2deg, rgba(23, 32, 51, 0.036) 0 1px, transparent 1px 10px),
            linear-gradient(180deg, #fbfcf5, #e8ecdf);
          box-shadow:
            inset 0 0 0 0.18rem rgba(255, 255, 255, 0.68),
            inset 0 0 4rem rgba(31, 81, 54, 0.06),
            0 3rem 8rem rgba(0, 0, 0, 0.5),
            0 0 0 0.08rem rgba(23, 32, 51, 0.42);
          animation: draftRevealCard 5s cubic-bezier(0.16, 1, 0.3, 1) both;
        }

        .draft-pick-reveal-card::before {
          content: "";
          position: absolute;
          inset: 0;
          pointer-events: none;
          background:
            linear-gradient(90deg, rgba(31, 81, 54, 0.18), transparent 16%, transparent 84%, rgba(200, 30, 30, 0.11)),
            linear-gradient(180deg, rgba(255, 255, 255, 0.48), transparent 38%);
          opacity: 0.8;
        }

        .draft-pick-reveal-card::after {
          content: "";
          position: absolute;
          left: 6%;
          right: 6%;
          bottom: 13%;
          height: clamp(0.28rem, 0.5vw, 0.48rem);
          border-radius: 999px;
          background:
            linear-gradient(90deg, transparent, rgba(31, 81, 54, 0.86) 9%, rgba(31, 81, 54, 0.72) 91%, transparent);
          transform: rotate(-1.1deg);
          opacity: 0.78;
          box-shadow: 0 0 1.4rem rgba(31, 81, 54, 0.22);
        }

        .draft-pick-reveal-photo-wrap {
          position: relative;
          z-index: 1;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .draft-pick-reveal-photo-wrap::before {
          content: "";
          position: absolute;
          inset: -0.75rem;
          border-radius: 999px;
          border: 0.22rem solid rgba(31, 81, 54, 0.5);
          transform: rotate(-4deg);
          box-shadow:
            0 0 2rem rgba(31, 81, 54, 0.18),
            inset 0 0 1.5rem rgba(255, 255, 255, 0.18);
        }

        .draft-pick-reveal-photo {
          position: relative;
          z-index: 1;
          width: clamp(10rem, 16vw, 17rem);
          height: clamp(10rem, 16vw, 17rem);
          border: 0.28rem solid rgba(23, 32, 51, 0.86) !important;
          border-radius: 999px;
          background-color: #172033 !important;
          background-position: center;
          background-size: cover;
          color: #f8faf4 !important;
          box-shadow:
            inset 0 0 0 0.16rem rgba(255, 255, 255, 0.68),
            0 1.5rem 3.5rem rgba(0, 0, 0, 0.36),
            0 0 2.5rem rgba(31, 81, 54, 0.22);
        }

        .draft-reveal-kicker,
        .draft-reveal-team,
        .draft-reveal-player,
        .draft-reveal-rank {
          position: relative;
          z-index: 1;
        }

        .draft-reveal-kicker {
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
          font-size: clamp(0.9rem, 1.15vw, 1.2rem);
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: 0.26em;
          color: #1f5136;
        }

        .draft-reveal-team {
          margin-top: 0.7rem;
          font-size: clamp(2.2rem, 4.5vw, 5rem);
          font-weight: 950;
          text-transform: uppercase;
          line-height: 0.82;
          letter-spacing: -0.07em;
          color: #172033;
          text-shadow:
            0.035em 0.025em 0 rgba(31, 81, 54, 0.1),
            -0.018em 0.018em 0 rgba(200, 30, 30, 0.08);
        }

        .draft-reveal-player {
          margin-top: 0.8rem;
          font-size: clamp(4.2rem, 8.4vw, 9.4rem);
          font-weight: 950;
          text-transform: uppercase;
          line-height: 0.78;
          letter-spacing: -0.085em;
          color: #172033;
          text-shadow:
            0.035em 0.025em 0 rgba(31, 81, 54, 0.13),
            -0.018em 0.018em 0 rgba(200, 30, 30, 0.09);
        }

        .draft-reveal-rank {
          display: inline-flex;
          margin-top: 1.1rem;
          border: 0.18rem solid rgba(31, 81, 54, 0.54);
          border-radius: 0.45rem;
          background: rgba(31, 81, 54, 0.1);
          padding: 0.35rem 0.85rem;
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
          font-size: clamp(1rem, 1.45vw, 1.6rem);
          font-weight: 950;
          color: #1f5136;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          box-shadow:
            inset 0 0 0 1px rgba(255, 255, 255, 0.42),
            0 0 1.4rem rgba(31, 81, 54, 0.13);
        }

        @keyframes draftAmbientDrift {
          from {
            transform: translate3d(-0.7%, -0.5%, 0) scale(1);
            opacity: 0.82;
          }
          to {
            transform: translate3d(0.8%, 0.6%, 0) scale(1.025);
            opacity: 1;
          }
        }

        @keyframes draftEdgeBreathe {
          from {
            opacity: 0.56;
            filter: saturate(1);
          }
          to {
            opacity: 0.92;
            filter: saturate(1.18);
          }
        }

        @keyframes draftMainPoolPulse {
          from {
            border-color: rgba(125, 211, 252, 0.58);
            box-shadow:
              inset 0 0 0 1px rgba(125, 211, 252, 0.1),
              inset 0 0 24px rgba(56, 189, 248, 0.06),
              0 24px 90px rgba(0, 0, 0, 0.58),
              0 0 44px rgba(56, 189, 248, 0.2),
              0 0 84px rgba(37, 99, 235, 0.12);
          }
          to {
            border-color: rgba(125, 211, 252, 0.82);
            box-shadow:
              inset 0 0 0 1px rgba(125, 211, 252, 0.15),
              inset 0 0 30px rgba(56, 189, 248, 0.09),
              0 24px 94px rgba(0, 0, 0, 0.62),
              0 0 62px rgba(56, 189, 248, 0.28),
              0 0 104px rgba(37, 99, 235, 0.18);
          }
        }

        @keyframes draftLivePulse {
          from {
            opacity: 0.78;
            transform: translateY(0);
          }
          to {
            opacity: 1;
            transform: translateY(-1px);
          }
        }

        @keyframes draftCompleteReveal {
          from {
            opacity: 0;
            transform: scale(0.99);
            filter: blur(8px);
          }
          to {
            opacity: 1;
            transform: scale(1);
            filter: blur(0);
          }
        }

        @keyframes parimutuelCalloutPulse {
          from {
            border-color: rgba(116, 106, 145, 0.58);
            box-shadow:
              inset 0 0 0 1px rgba(216, 208, 234, 0.1),
              inset 0 0 20px rgba(116, 106, 145, 0.1),
              0 0 30px rgba(116, 106, 145, 0.22),
              0 0 60px rgba(116, 106, 145, 0.1);
          }
          to {
            border-color: rgba(216, 208, 234, 0.78);
            box-shadow:
              inset 0 0 0 1px rgba(216, 208, 234, 0.16),
              inset 0 0 26px rgba(116, 106, 145, 0.15),
              0 0 44px rgba(116, 106, 145, 0.34),
              0 0 86px rgba(116, 106, 145, 0.18);
          }
        }

        @keyframes parimutuelCalloutSweep {
          0%, 22% {
            transform: translateX(-58%);
            opacity: 0;
          }
          42% {
            opacity: 0.62;
          }
          64%, 100% {
            transform: translateX(58%);
            opacity: 0;
          }
        }

        @keyframes draftClockGlow {
          from {
            box-shadow:
              inset 0 0 0 1px rgba(125, 211, 252, 0.1),
              inset 0 0 22px rgba(56, 189, 248, 0.052),
              0 24px 90px rgba(0, 0, 0, 0.58),
              0 0 32px rgba(56, 189, 248, 0.16),
              0 0 66px rgba(37, 99, 235, 0.1);
          }
          to {
            box-shadow:
              inset 0 0 0 1px rgba(125, 211, 252, 0.15),
              inset 0 0 26px rgba(56, 189, 248, 0.072),
              0 24px 90px rgba(0, 0, 0, 0.62),
              0 0 50px rgba(56, 189, 248, 0.24),
              0 0 88px rgba(37, 99, 235, 0.16);
          }
        }

        @keyframes draftNameGlow {
          from {
            text-shadow:
              0 0 18px rgba(56, 189, 248, 0.2),
              0 0 42px rgba(37, 99, 235, 0.14);
          }
          to {
            text-shadow:
              0 0 24px rgba(56, 189, 248, 0.34),
              0 0 56px rgba(37, 99, 235, 0.22);
          }
        }

        @keyframes draftRingBreathe {
          from {
            filter: saturate(1);
            transform: scale(1);
          }
          to {
            filter: saturate(1.16);
            transform: scale(1.012);
          }
        }

        @keyframes draftClockSettle {
          from {
            opacity: 0.72;
            transform: translateY(8px) scale(0.992);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        @keyframes recentPickReveal {
          0% {
            opacity: 0;
            transform: translateY(10px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes draftRowSettle {
          from {
            opacity: 0;
            transform: translateY(4px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes draftRowEnergy {
          from {
            border-color: rgba(56, 189, 248, 0.24);
            box-shadow:
              inset 0 1px 0 rgba(224, 242, 254, 0.06),
              0 0 12px rgba(56, 189, 248, 0.05);
          }
          to {
            border-color: rgba(125, 211, 252, 0.42);
            box-shadow:
              inset 0 1px 0 rgba(224, 242, 254, 0.1),
              0 0 18px rgba(56, 189, 248, 0.1);
          }
        }

        @keyframes draftedPlayerSettle {
          from {
            opacity: 0;
            transform: translateX(-8px);
            filter: blur(4px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
            filter: blur(0);
          }
        }

        @keyframes draftTeamRailMarquee {
          from {
            transform: translate3d(0, 0, 0);
          }
          to {
            transform: translate3d(calc(-50% - 0.375rem), 0, 0);
          }
        }

        @keyframes draftRevealOverlay {
          0% {
            opacity: 0;
          }
          8%, 86% {
            opacity: 1;
          }
          100% {
            opacity: 0;
          }
        }

        @keyframes draftRevealCard {
          0% {
            opacity: 0;
            transform: translateY(2rem) scale(0.94) rotate(-0.4deg);
            filter: blur(0.45rem);
          }
          11% {
            opacity: 1;
            transform: translateY(0) scale(1) rotate(-0.2deg);
            filter: blur(0);
          }
          80% {
            opacity: 1;
            transform: translateY(0) scale(1) rotate(-0.2deg);
            filter: blur(0);
          }
          100% {
            opacity: 0;
            transform: translateY(-0.9rem) scale(0.985) rotate(-0.2deg);
            filter: blur(0.2rem);
          }
        }

        @keyframes draftExpiredPulse {
          from {
            transform: scale(1);
            filter: saturate(0.95);
          }
          to {
            transform: scale(1.018);
            filter: saturate(1.08);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .draft-tv-shell::before,
          .draft-clock-panel,
          .draft-countdown-ring,
          .recent-pick-strip,
          .draft-complete-callout,
          .draft-complete-callout::before,
          .draft-live-badge,
          .draft-main-pool,
          .draft-team-marquee,
          .draft-available-row,
          .draft-pick-row,
          .draft-pick-reveal-overlay,
          .draft-pick-reveal-card {
            animation: none;
          }
        }
      `;
