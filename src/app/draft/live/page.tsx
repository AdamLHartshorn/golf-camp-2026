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
const draftClockSeconds = 30;

export default function DraftLivePage() {
  const [session, setSession] = useState<DraftSession | null>(null);
  const [players, setPlayers] = useState<DraftPlayer[]>([]);
  const [teams, setTeams] = useState<DraftTeam[]>([]);
  const [picks, setPicks] = useState<DraftPick[]>([]);
  const [now, setNow] = useState(() => Date.now());
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

  return (
    <main className="draft-tv-shell h-screen overflow-hidden bg-[radial-gradient(circle_at_18%_10%,rgba(50,77,112,0.22),transparent_28%),radial-gradient(circle_at_86%_78%,rgba(36,54,79,0.18),transparent_34%),linear-gradient(135deg,#02040a_0%,#05070d_45%,#000_100%)] p-3 text-[#f5f5f5]">
      <div className="grid h-full grid-rows-[auto_minmax(0,1fr)] gap-3">
        <section className="grid min-h-0 grid-cols-[0.48fr_1.18fr_0.58fr_0.72fr] gap-3">
          <div className="overflow-hidden rounded-[1.1rem] border border-[#2563eb]/45 bg-[linear-gradient(180deg,rgba(8,17,35,0.92),rgba(2,4,10,0.96))] px-4 py-3 shadow-[0_18px_60px_rgba(0,0,0,0.42)]">
            <p className="font-mono text-[clamp(1rem,1.45vw,1.55rem)] font-black uppercase leading-none tracking-[0.2em] text-[#dbeafe] drop-shadow-[0_0_20px_rgba(147,197,253,0.2)]">
              Golf Camp 2026
            </p>
            <h1 className="mt-1.5 text-[clamp(2rem,3.6vw,3.7rem)] font-black leading-[0.86] tracking-[-0.06em]">
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
              className="draft-clock-panel h-full rounded-[1.1rem] border border-[#60a5fa]/75 bg-[radial-gradient(circle_at_top,rgba(50,77,112,0.16),transparent_62%),#02040a] p-3.5 shadow-[0_0_40px_rgba(50,77,112,0.14)]"
            >
              <div className="grid grid-cols-[1fr_auto] items-center gap-4">
                <div>
                  <div className="flex items-center justify-between gap-4">
                    <p className="text-[clamp(0.7rem,0.9vw,0.9rem)] font-semibold uppercase tracking-[0.24em] text-[#93c5fd]">
                      On The Clock
                    </p>
                    <span className="rounded-full border border-[#2563eb]/70 bg-[#071123] px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-[#bfdbfe]">
                      Pick {picks.length + 1}
                    </span>
                  </div>
                  <h2 className="mt-3 text-[clamp(3rem,5.2vw,5.6rem)] font-black leading-[0.82] tracking-[-0.07em]">
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
                    background: `conic-gradient(${isClockExpired ? "#7f1d1d" : "#9aacbf"} ${clockPercent}%, rgba(50,77,112,0.22) ${clockPercent}% 100%)`,
                  }}
                  aria-label={
                    isClockExpired
                      ? "Draft clock expired"
                      : `${remainingSeconds} seconds remaining`
                  }
                >
                  <div className="absolute inset-2 rounded-full border border-[#324d70]/55 bg-[#02040a]" />
                  <div className="relative text-center">
                    <p
                      className={`font-mono text-[clamp(2.4rem,3.4vw,3.4rem)] font-black leading-none ${
                        isClockExpired ? "text-[#fca5a5]" : "text-[#dbeafe]"
                      }`}
                    >
                      {isCompleteDraft
                        ? "--"
                        : String(remainingSeconds).padStart(2, "0")}
                    </p>
                    <p className="mt-1 font-mono text-[10px] font-black uppercase tracking-[0.2em] text-[#9aacbf]">
                      Sec
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="min-h-0">
            <div className="h-full rounded-[1.1rem] border border-[#324d70]/55 bg-black/40 px-4 py-3 shadow-[0_18px_60px_rgba(0,0,0,0.34)]">
              <p className="font-mono text-[10px] font-black uppercase tracking-[0.24em] text-[#9aacbf]">
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
              className="recent-pick-strip h-full rounded-[1.1rem] border border-[#324d70]/60 bg-black/45 px-4 py-3 shadow-[0_18px_60px_rgba(0,0,0,0.38),0_0_28px_rgba(50,77,112,0.1)]"
            >
              <p className="font-mono text-[10px] font-black uppercase tracking-[0.24em] text-[#9aacbf]">
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

        <section className="grid min-h-0 grid-cols-[1.36fr_0.84fr] gap-3">
          <div className="min-h-0 overflow-hidden rounded-[1.2rem] border border-[#1e40af]/45 bg-[linear-gradient(180deg,rgba(8,11,18,0.94),rgba(2,4,10,0.98))] p-4 shadow-[0_24px_80px_rgba(0,0,0,0.42)]">
          <div className="flex items-end justify-between gap-4 border-b border-[#1e40af]/35 pb-2.5">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#93c5fd]">
                Available Pool
              </p>
            </div>
            <span className="rounded-full border border-[#1e40af]/70 bg-[#071123] px-3 py-1.5 text-xs font-black text-[#bfdbfe]">
              A-D
            </span>
          </div>

          <div className="mt-3 grid h-[calc(100%-4.9rem)] grid-cols-2 gap-3 overflow-hidden">
            {["A", "B", "C", "D"].map((rank) => (
              <div
                key={rank}
                className="min-h-0 overflow-hidden rounded-[0.9rem] border border-[#1e40af]/45 bg-[linear-gradient(180deg,rgba(15,23,42,0.7),rgba(0,0,0,0.42))] p-3"
              >
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-[clamp(1.25rem,1.8vw,2rem)] font-black tracking-[-0.04em] text-[#dbeafe]">
                    Rank {rank}
                  </h3>
                  <span className="rounded-full border border-[#324d70]/70 px-2.5 py-1 font-mono text-[10px] font-black text-[#9aacbf]">
                    {(availableByRank[rank] || []).length}
                  </span>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-1.5">
                  {(availableByRank[rank] || []).slice(0, 14).map((player) => (
                    <div
                      key={player.id}
                      className="draft-available-row flex items-center justify-between gap-2 rounded-lg border border-[#1e40af]/25 bg-black/45 px-2.5 py-1.5"
                    >
                      <span className="truncate text-[clamp(0.82rem,1.05vw,1.12rem)] font-semibold">
                        {player.display_name}
                      </span>
                      <span className="text-xs font-bold text-[#93c5fd]">
                        {player.rank}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          </div>

          <div className="min-h-0 overflow-hidden rounded-[1.2rem] border border-[#1e40af]/45 bg-[linear-gradient(180deg,rgba(8,11,18,0.94),rgba(2,4,10,0.98))] p-3 shadow-[0_24px_80px_rgba(0,0,0,0.42)]">
          <div className="border-b border-[#1e40af]/35 pb-2.5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#93c5fd]">
              Teams
            </p>
          </div>
          <div className="mt-2.5 grid h-[calc(100%-4.2rem)] grid-cols-2 auto-rows-fr gap-2 overflow-hidden">
            {orderedTeams.map((team) => (
              <div
                key={team.id}
                className={`min-h-0 overflow-hidden rounded-[0.75rem] border p-2.5 ${
                  currentTeam?.id === team.id
                    ? "border-[#60a5fa] bg-[#071123] shadow-[0_0_28px_rgba(50,77,112,0.14)]"
                    : "border-[#1e40af]/30 bg-black/45"
                }`}
              >
                <h3 className="truncate text-[clamp(0.92rem,1.18vw,1.2rem)] font-black tracking-[-0.04em]">
                  {team.name}
                </h3>
                <p className="mt-0.5 text-[11px] text-[#93c5fd]">
                  Captain ·{" "}
                  {playersById.get(team.captain_player_id || "")?.rank || "-"}
                </p>
                <div className="mt-1.5 space-y-0.5">
                  {(picksByTeam[team.id] || []).slice(0, 4).map((pick) => {
                    const player = playersById.get(pick.player_id);

                    return (
                      <p key={pick.id} className="draft-pick-row truncate text-[clamp(0.68rem,0.86vw,0.82rem)] leading-tight">
                        {player?.display_name || "Unknown"}{" "}
                        <span className="text-[10px] text-[#a3a3a3]">
                          {player?.rank || ""}
                        </span>
                      </p>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
          </div>
        </section>
      </div>
      <style>{`
        .draft-tv-shell {
          position: relative;
          isolation: isolate;
        }

        .draft-tv-shell::before {
          content: "";
          position: fixed;
          inset: -18%;
          pointer-events: none;
          z-index: -1;
          background:
            radial-gradient(circle at 24% 18%, rgba(154, 172, 191, 0.075), transparent 28rem),
            radial-gradient(circle at 82% 70%, rgba(50, 77, 112, 0.08), transparent 30rem);
          animation: draftAmbientDrift 18s ease-in-out infinite alternate;
        }

        .draft-tv-shell::after {
          content: "";
          position: fixed;
          inset: 0;
          pointer-events: none;
          z-index: -1;
          background: radial-gradient(circle at center, transparent 42%, rgba(0, 0, 0, 0.34) 100%);
        }

        .draft-clock-panel {
          animation: draftClockSettle 700ms ease both, draftClockGlow 5.5s ease-in-out infinite alternate;
        }

        .draft-countdown-ring {
          box-shadow: 0 0 36px rgba(50, 77, 112, 0.14), inset 0 0 24px rgba(154, 172, 191, 0.035);
          transition: background 220ms ease, box-shadow 220ms ease;
        }

        .draft-countdown-ring.is-expired {
          animation: draftExpiredPulse 1.75s ease-in-out infinite alternate;
          box-shadow: 0 0 42px rgba(127, 29, 29, 0.2), inset 0 0 24px rgba(127, 29, 29, 0.08);
        }

        .recent-pick-strip {
          animation: recentPickReveal 680ms ease both;
        }

        .draft-available-row {
          animation: draftRowSettle 520ms ease both;
          transition: border-color 220ms ease, background-color 220ms ease, opacity 220ms ease;
        }

        .draft-pick-row {
          animation: draftedPlayerSettle 640ms ease both;
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

        @keyframes draftClockGlow {
          from {
            box-shadow: 0 0 34px rgba(50, 77, 112, 0.14), inset 0 1px 0 rgba(245, 245, 245, 0.08);
          }
          to {
            box-shadow: 0 0 48px rgba(50, 77, 112, 0.22), inset 0 1px 0 rgba(245, 245, 245, 0.1);
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
          .draft-available-row,
          .draft-pick-row {
            animation: none;
          }
        }
      `}</style>
    </main>
  );
}
