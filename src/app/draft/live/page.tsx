"use client";

import { useEffect, useMemo, useState } from "react";
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
const draftClockSeconds = 30;
const draftCompleteDelayMs = 8000;

export default function DraftLivePage() {
  const [session, setSession] = useState<DraftSession | null>(null);
  const [players, setPlayers] = useState<DraftPlayer[]>([]);
  const [teams, setTeams] = useState<DraftTeam[]>([]);
  const [picks, setPicks] = useState<DraftPick[]>([]);
  const [now, setNow] = useState(() => Date.now());
  const [completeReadySessionId, setCompleteReadySessionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

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
        .select("id, first_name, last_name, display_name, rank, display_rank, internal_rank_order")
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
    () => getCurrentDraftTeam(orderedTeams, picks.length),
    [orderedTeams, picks.length],
  );
  const onDeckTeam = useMemo(() => {
    if (availablePlayers.length <= 1 || isCompleteDraft) {
      return null;
    }

    return getCurrentDraftTeam(orderedTeams, picks.length + 1);
  }, [availablePlayers.length, isCompleteDraft, orderedTeams, picks.length]);
  const playersById = useMemo(
    () => new Map(players.map((player) => [player.id, player])),
    [players],
  );
  const teamsById = useMemo(
    () => new Map(teams.map((team) => [team.id, team])),
    [teams],
  );
  const recentPick = picks[picks.length - 1] || null;
  const recentPickPlayer = recentPick ? playersById.get(recentPick.player_id) : null;
  const recentPickTeam = recentPick
    ? teamsById.get(recentPick.draft_team_id)
    : null;
  const pickStartedAt =
    session?.current_pick_started_at ||
    recentPick?.created_at ||
    session?.started_at ||
    null;
  const pickStartedTime = pickStartedAt ? new Date(pickStartedAt).getTime() : now;
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
    <main className="draft-tv-shell h-screen overflow-hidden bg-[#02040a] p-3 text-[#f5f5f5]">
      <div className="grid h-full grid-rows-[auto_minmax(0,1fr)_clamp(7.5rem,13vh,9rem)] gap-3">
        <section className="grid min-h-0 grid-cols-[0.48fr_1.18fr_0.58fr_0.72fr] gap-3">
          <div className="draft-brand-panel overflow-hidden rounded-[0.55rem] border border-[#2563eb]/45 bg-[#050915] px-4 py-3 shadow-[0_18px_60px_rgba(0,0,0,0.42)]">
            <div className="flex items-center justify-between gap-3">
              <p className="font-mono text-[clamp(1rem,1.45vw,1.55rem)] font-black uppercase leading-none tracking-[0.2em] text-[#dbeafe] drop-shadow-[0_0_20px_rgba(147,197,253,0.2)]">
                Golf Camp 2026
              </p>
              <span className="draft-live-badge rounded-full border px-2.5 py-1 font-mono text-[10px] font-black uppercase tracking-[0.2em]">
                Live
              </span>
            </div>
            <h1 className="draft-title-glow mt-1.5 text-[clamp(2rem,3.6vw,3.7rem)] font-black uppercase leading-[0.86] tracking-[-0.055em]">
              Live Draft
            </h1>
            <p className="mt-1.5 truncate text-[clamp(0.75rem,1vw,0.98rem)] text-[#c7d2fe]">
              {session?.name || "No active draft"}
              {isCompleteDraft ? " · Complete" : ""}
            </p>
          </div>

          <div className="min-h-0">
            <div
              key={currentTeam?.id || "clock"}
              className="draft-clock-panel h-full rounded-[0.55rem] border border-[#60a5fa]/75 bg-[#050915] p-3.5 shadow-[0_0_40px_rgba(50,77,112,0.14)]"
            >
              <div className="grid grid-cols-[1fr_auto] items-center gap-4">
                <div>
                  <div className="flex items-center justify-between gap-4">
                    <p className="draft-electric-label text-[clamp(0.7rem,0.9vw,0.9rem)] font-semibold uppercase tracking-[0.24em] text-[#93c5fd]">
                      On The Clock
                    </p>
                    <span className="draft-pick-pill rounded-full border border-[#2563eb]/70 bg-[#071123] px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-[#bfdbfe]">
                      Pick {picks.length + 1}
                    </span>
                  </div>
                  <h2 className="draft-current-team mt-3 text-[clamp(3rem,5.2vw,5.6rem)] font-black uppercase leading-[0.82] tracking-[-0.065em]">
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
                  className={`draft-countdown-ring relative flex h-[clamp(6.6rem,8.4vw,8rem)] w-[clamp(6.6rem,8.4vw,8rem)] items-center justify-center rounded-full ${
                    isClockExpired ? "is-expired" : ""
                  }`}
                  style={{
                    background: `conic-gradient(${isClockExpired ? "#ef4444" : "#38bdf8"} ${clockPercent}%, rgba(37,99,235,0.2) ${clockPercent}% 100%)`,
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
                      className={`font-mono text-[clamp(2.4rem,3.4vw,3.4rem)] font-black leading-none ${
                        isClockExpired ? "text-[#fca5a5]" : "text-[#e0f2fe]"
                      }`}
                    >
                      {isCompleteDraft
                        ? "--"
                        : String(remainingSeconds).padStart(2, "0")}
                    </p>
                    <p className="mt-1 font-mono text-[10px] font-black uppercase tracking-[0.2em] text-[#7dd3fc]">
                      Sec
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="min-h-0">
            <div className="draft-side-panel h-full rounded-[0.55rem] border border-[#324d70]/55 bg-[#050915] px-4 py-3 shadow-[0_18px_60px_rgba(0,0,0,0.34)]">
              <p className="draft-electric-label font-mono text-[10px] font-black uppercase tracking-[0.24em] text-[#9aacbf]">
                On Deck
              </p>
              <p className="mt-2 line-clamp-2 text-[clamp(1.4rem,2.25vw,2.4rem)] font-black leading-[0.9] tracking-[-0.05em] text-[#dbeafe]">
                {isCompleteDraft
                  ? "Draft Complete"
                  : onDeckTeam?.name || "Final Pick"}
              </p>
            </div>
          </div>

          <div className="min-h-0">
            <div
              key={recentPick?.id || "last-pick-empty"}
              className="recent-pick-strip draft-side-panel h-full rounded-[0.55rem] border border-[#324d70]/60 bg-[#050915] px-4 py-3 shadow-[0_18px_60px_rgba(0,0,0,0.38),0_0_28px_rgba(50,77,112,0.1)]"
            >
              <p className="draft-electric-label font-mono text-[10px] font-black uppercase tracking-[0.24em] text-[#9aacbf]">
                Last Pick
              </p>
              <p className="mt-2 truncate text-[clamp(0.78rem,1vw,0.98rem)] font-semibold text-[#dbeafe]">
                {recentPickTeam ? `${recentPickTeam.name} selected` : "Awaiting first pick"}
              </p>
              <p className="mt-1 line-clamp-2 text-[clamp(1.35rem,2.15vw,2.35rem)] font-black leading-[0.92] tracking-[-0.04em]">
                {recentPickPlayer?.display_name || "Draft ready"}
              </p>
            </div>

            {error && <p className="mt-4 text-lg text-[#ff8a8a]">{error}</p>}
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

          <div className="mt-2 grid h-[calc(100%-3.35rem)] grid-cols-4 gap-2 overflow-hidden">
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
                    {(availableByRank[rank] || []).length}
                  </span>
                </div>
                <div className="mt-2 grid grid-cols-1 gap-1">
                  {(availableByRank[rank] || []).slice(0, 18).map((player) => (
                    <div
                      key={player.id}
                      className="draft-available-row flex items-center justify-between gap-2 rounded-[0.4rem] border border-[#1e40af]/25 bg-[#030712] px-3 py-1.5"
                    >
                      <span className="truncate text-[clamp(1.08rem,1.45vw,1.52rem)] font-bold leading-tight">
                        {player.display_name}
                      </span>
                      <span className="text-[clamp(1.08rem,1.45vw,1.52rem)] font-black leading-tight text-[#93c5fd]">
                        {getPublicDisplayRank(player.display_rank, player.rank)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="draft-team-rail draft-board-panel min-h-0 overflow-hidden rounded-[0.6rem] border border-[#1e40af]/45 bg-[#050915] p-3 shadow-[0_24px_80px_rgba(0,0,0,0.42)]">
          <div className="flex h-full min-h-0 gap-3">
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
                className="draft-team-marquee flex h-full min-w-max gap-3"
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
          .draft-pick-row {
            animation: none;
          }
        }
      `;
