"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { logActivityFeedItem } from "@/lib/activityFeed";
import { logAuditEvent } from "@/lib/auditLog";
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

const ranks = ["A", "B", "C", "D"] as const;

function getCaptainTeamName(captain: DraftPlayer) {
  const lastName = captain.last_name?.trim();

  return lastName ? `Team ${lastName}` : captain.display_name;
}

function normalizeTeamName(name: string) {
  return name.trim().replace(/\s+/g, " ").toLowerCase();
}

function getUniqueTeamName(baseName: string, existingNames: Iterable<string>) {
  const cleanBaseName = baseName.trim().replace(/\s+/g, " ") || "Team";
  const usedNames = new Set(
    Array.from(existingNames)
      .map(normalizeTeamName)
      .filter(Boolean),
  );

  if (!usedNames.has(normalizeTeamName(cleanBaseName))) {
    return cleanBaseName;
  }

  let suffix = 2;
  let candidate = `${cleanBaseName} ${suffix}`;

  while (usedNames.has(normalizeTeamName(candidate))) {
    suffix += 1;
    candidate = `${cleanBaseName} ${suffix}`;
  }

  return candidate;
}

function getUniqueTeamNameForTeams(
  baseName: string,
  teams: DraftTeam[],
  currentTeamId?: string,
) {
  return getUniqueTeamName(
    baseName,
    teams
      .filter((team) => team.id !== currentTeamId)
      .map((team) => team.name),
  );
}

function getDraftTeamErrorMessage(errorMessage: string | undefined) {
  if (
    errorMessage?.includes("draft_teams_draft_session_id_name_key") ||
    errorMessage?.toLowerCase().includes("duplicate key")
  ) {
    return "That draft already has a team with this name. Try saving again or use a slightly different team name.";
  }

  return errorMessage;
}

export default function AdminDraftPage() {
  const [players, setPlayers] = useState<DraftPlayer[]>([]);
  const [sessions, setSessions] = useState<DraftSession[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState("");
  const [selectedSession, setSelectedSession] = useState<DraftSession | null>(
    null,
  );
  const [teams, setTeams] = useState<DraftTeam[]>([]);
  const [picks, setPicks] = useState<DraftPick[]>([]);
  const [sessionName, setSessionName] = useState("Wednesday Morning Draft");
  const [captainRank, setCaptainRank] = useState<"A" | "B" | "C" | "D">("A");
  const [manualCaptainPlayerId, setManualCaptainPlayerId] = useState("");
  const [teamNameEdits, setTeamNameEdits] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function fetchPlayers() {
    const { data, error: fetchError } = await supabase
      .from("players")
      .select("id, first_name, last_name, display_name, rank, display_rank, internal_rank_order")
      .eq("active", true);

    console.log("draft active players:", { data, error: fetchError });

    if (fetchError) {
      setPlayers([]);
      setError(fetchError.message || "Could not load active players.");
      return;
    }

    setPlayers(((data as DraftPlayer[]) || []).sort(comparePlayersForDraft));
  }

  async function fetchSessions() {
    const { data, error: fetchError } = await supabase
      .from("draft_sessions")
      .select("*")
      .order("created_at", { ascending: false });

    console.log("draft sessions:", { data, error: fetchError });

    if (fetchError) {
      setSessions([]);
      setError(fetchError.message || "Could not load draft sessions.");
      return;
    }

    const nextSessions = (data as DraftSession[]) || [];
    setSessions(nextSessions);

    if (!selectedSessionId && nextSessions.length > 0) {
      setSelectedSessionId(nextSessions[0].id);
    }
  }

  async function fetchDraftState(sessionId: string) {
    const [
      { data: sessionData, error: sessionError },
      { data: teamData, error: teamError },
      { data: pickData, error: pickError },
    ] = await Promise.all([
      supabase.from("draft_sessions").select("*").eq("id", sessionId).single(),
      supabase
        .from("draft_teams")
        .select("*")
        .eq("draft_session_id", sessionId)
        .order("draft_position", { ascending: true }),
      supabase
        .from("draft_picks")
        .select("*")
        .eq("draft_session_id", sessionId)
        .order("pick_number", { ascending: true }),
    ]);

    console.log("draft state:", {
      sessionData,
      sessionError,
      teamData,
      teamError,
      pickData,
      pickError,
    });

    if (sessionError || teamError || pickError) {
      setSelectedSession(null);
      setTeams([]);
      setPicks([]);
      setError(
        sessionError?.message ||
          teamError?.message ||
          pickError?.message ||
          "Could not load draft state.",
      );
      return;
    }

    setSelectedSession(sessionData as DraftSession);
    setTeams((teamData as DraftTeam[]) || []);
    setPicks((pickData as DraftPick[]) || []);
  }

  useEffect(() => {
    async function loadInitialData() {
      setIsLoading(true);
      await Promise.all([fetchPlayers(), fetchSessions()]);
      setIsLoading(false);
    }

    loadInitialData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (selectedSessionId) {
      window.setTimeout(() => {
        fetchDraftState(selectedSessionId);
      }, 0);
    }
  }, [selectedSessionId]);

  const orderedTeams = useMemo(
    () => getOrderedTeams(teams, selectedSession?.draft_order),
    [selectedSession?.draft_order, teams],
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
  const isPendingDraft = selectedSession?.status === "pending";
  const captainPlayerIds = useMemo(
    () =>
      new Set(
        teams
          .map((team) => team.captain_player_id)
          .filter((playerId): playerId is string => Boolean(playerId)),
      ),
    [teams],
  );

  async function handleCreateSession() {
    const trimmedName = sessionName.trim();
    const captains = players.filter((player) => player.rank === captainRank);

    setMessage("");
    setError("");

    if (!trimmedName) {
      setError("Draft name is required.");
      return;
    }

    if (captains.length === 0) {
      setError(`No active ${captainRank} players found for captains.`);
      return;
    }

    setIsSaving(true);

    const { data: sessionData, error: sessionError } = await supabase
      .from("draft_sessions")
      .insert({
        name: trimmedName,
        captain_rank: captainRank,
        draft_type: "snake",
        status: "pending",
        current_pick_number: 1,
      })
      .select("*")
      .single();

    if (sessionError || !sessionData) {
      setError(sessionError?.message || "Could not create draft session.");
      setIsSaving(false);
      return;
    }

    const session = sessionData as DraftSession;
    const usedTeamNames = new Set<string>();
    const teamPayload = captains.map((captain, index) => {
      const teamName = getUniqueTeamName(
        getCaptainTeamName(captain),
        usedTeamNames,
      );
      usedTeamNames.add(teamName);

      return {
        draft_session_id: session.id,
        name: teamName,
        captain_player_id: captain.id,
        draft_position: index + 1,
      };
    });
    const { data: teamData, error: teamError } = await supabase
      .from("draft_teams")
      .insert(teamPayload)
      .select("*");

    if (teamError) {
      setError(
        getDraftTeamErrorMessage(teamError.message) ||
          "Could not create captain teams.",
      );
      setIsSaving(false);
      return;
    }

    const createdTeams = (teamData as DraftTeam[]) || [];
    const draftOrder = createdTeams
      .sort((a, b) => (a.draft_position || 999) - (b.draft_position || 999))
      .map((team) => team.id);
    await supabase
      .from("draft_sessions")
      .update({ draft_order: draftOrder, updated_at: new Date().toISOString() })
      .eq("id", session.id);

    setMessage("Draft session created.");
    await logAuditEvent({
      actionType: "draft_session_created",
      entityType: "draft_session",
      entityId: session.id,
      summary: `Draft session created: ${session.name}.`,
      newValue: { session, teams: createdTeams },
    });
    setSelectedSessionId(session.id);
    await fetchSessions();
    await fetchDraftState(session.id);
    setIsSaving(false);
  }

  async function moveTeam(teamId: string, direction: -1 | 1) {
    const currentIndex = orderedTeams.findIndex((team) => team.id === teamId);
    const nextIndex = currentIndex + direction;

    if (currentIndex < 0 || nextIndex < 0 || nextIndex >= orderedTeams.length) {
      return;
    }

    const nextTeams = [...orderedTeams];
    const [movedTeam] = nextTeams.splice(currentIndex, 1);
    nextTeams.splice(nextIndex, 0, movedTeam);
    await persistDraftOrder(nextTeams);
  }

  async function persistDraftOrder(nextTeams: DraftTeam[]) {
    if (!selectedSession) {
      return;
    }

    setError("");
    const draftOrder = nextTeams.map((team) => team.id);
    const updates = nextTeams.map((team, index) =>
      supabase
        .from("draft_teams")
        .update({
          draft_position: index + 1,
          updated_at: new Date().toISOString(),
        })
        .eq("id", team.id),
    );
    await Promise.all(updates);
    const { error: updateError } = await supabase
      .from("draft_sessions")
      .update({ draft_order: draftOrder, updated_at: new Date().toISOString() })
      .eq("id", selectedSession.id);

    if (updateError) {
      setError(updateError.message || "Could not update draft order.");
      return;
    }

    await fetchDraftState(selectedSession.id);
  }

  async function handleAddCaptainTeam() {
    if (!selectedSession || !manualCaptainPlayerId || !isPendingDraft) {
      return;
    }

    const captain = playersById.get(manualCaptainPlayerId);

    if (!captain) {
      setError("Select an active player to add as captain.");
      return;
    }

    const isKnownDuplicateCaptain = captainPlayerIds.has(captain.id);

    if (isKnownDuplicateCaptain) {
      const shouldContinue = window.confirm(
        `${captain.display_name} is already assigned as a captain. Add anyway?`,
      );

      if (!shouldContinue) {
        return;
      }
    }

    setMessage("");
    setError("");

    const { data: existingTeamData, error: existingTeamsError } = await supabase
      .from("draft_teams")
      .select("*")
      .eq("draft_session_id", selectedSession.id)
      .order("draft_position", { ascending: true });

    if (existingTeamsError) {
      setError(existingTeamsError.message || "Could not check existing teams.");
      return;
    }

    const currentTeams = ((existingTeamData as DraftTeam[]) || []).sort(
      (a, b) => (a.draft_position || 999) - (b.draft_position || 999),
    );
    const existingCaptainTeam = currentTeams.find(
      (team) => team.captain_player_id === captain.id,
    );

    if (existingCaptainTeam && !isKnownDuplicateCaptain) {
      await fetchDraftState(selectedSession.id);
      setMessage(`${captain.display_name} is already assigned as captain.`);
      setManualCaptainPlayerId("");
      return;
    }

    const nextPosition = currentTeams.length + 1;
    const nextTeamName = getUniqueTeamNameForTeams(
      getCaptainTeamName(captain),
      currentTeams,
    );
    const { data, error: insertError } = await supabase
      .from("draft_teams")
      .insert({
        draft_session_id: selectedSession.id,
        name: nextTeamName,
        captain_player_id: captain.id,
        draft_position: nextPosition,
      })
      .select("*")
      .single();

    if (insertError || !data) {
      setError(
        getDraftTeamErrorMessage(insertError?.message) ||
          "Could not add captain team.",
      );
      return;
    }

    const newTeam = data as DraftTeam;
    const nextTeams = [...currentTeams, newTeam];
    await persistDraftOrder(nextTeams);
    setManualCaptainPlayerId("");
    setMessage(`${captain.display_name} added as captain.`);
    await logAuditEvent({
      actionType: "draft_captain_team_added",
      entityType: "draft_team",
      entityId: newTeam.id,
      summary: `${captain.display_name} added as draft captain.`,
      newValue: newTeam,
      metadata: { draft_session_id: selectedSession.id },
    });
  }

  async function handleRemoveCaptainTeam(team: DraftTeam) {
    if (!selectedSession || !isPendingDraft) {
      return;
    }

    const shouldRemove = window.confirm(`Remove ${team.name} from this draft?`);

    if (!shouldRemove) {
      return;
    }

    setMessage("");
    setError("");

    const { error: deleteError } = await supabase
      .from("draft_teams")
      .delete()
      .eq("id", team.id);

    if (deleteError) {
      setError(deleteError.message || "Could not remove captain team.");
      return;
    }

    const nextTeams = orderedTeams.filter((item) => item.id !== team.id);
    await persistDraftOrder(nextTeams);
    setMessage(`${team.name} removed.`);
    await logAuditEvent({
      actionType: "draft_captain_team_removed",
      entityType: "draft_team",
      entityId: team.id,
      summary: `${team.name} removed from draft captains.`,
      oldValue: team,
      metadata: { draft_session_id: selectedSession.id },
    });
  }

  async function handleChangeCaptain(team: DraftTeam, nextCaptainId: string) {
    if (!selectedSession || !isPendingDraft || !nextCaptainId) {
      return;
    }

    const nextCaptain = playersById.get(nextCaptainId);
    const currentCaptain = team.captain_player_id
      ? playersById.get(team.captain_player_id)
      : null;

    if (!nextCaptain) {
      setError("Selected captain could not be found.");
      return;
    }

    const isDuplicateCaptain = teams.some(
      (item) => item.id !== team.id && item.captain_player_id === nextCaptain.id,
    );

    if (isDuplicateCaptain) {
      const shouldContinue = window.confirm(
        `${nextCaptain.display_name} is already a captain on another team. Continue?`,
      );

      if (!shouldContinue) {
        return;
      }
    }

    const currentDefaultName = currentCaptain
      ? getCaptainTeamName(currentCaptain)
      : "";
    const nextDefaultName = getCaptainTeamName(nextCaptain);
    const shouldUseDefaultName =
      !team.name.trim() || team.name.trim() === currentDefaultName;
    const nextTeamName = shouldUseDefaultName
      ? getUniqueTeamNameForTeams(nextDefaultName, teams, team.id)
      : team.name;

    const { error: updateError } = await supabase
      .from("draft_teams")
      .update({
        captain_player_id: nextCaptain.id,
        name: nextTeamName,
        updated_at: new Date().toISOString(),
      })
      .eq("id", team.id);

    if (updateError) {
      setError(
        getDraftTeamErrorMessage(updateError.message) ||
          "Could not change captain.",
      );
      return;
    }

    setMessage(`${team.name} captain updated.`);
    await logAuditEvent({
      actionType: "draft_captain_changed",
      entityType: "draft_team",
      entityId: team.id,
      summary: `${team.name} captain changed to ${nextCaptain.display_name}.`,
      oldValue: {
        captain_player_id: team.captain_player_id,
        name: team.name,
      },
      newValue: {
        captain_player_id: nextCaptain.id,
        name: nextTeamName,
      },
      metadata: { draft_session_id: selectedSession.id },
    });
    await fetchDraftState(selectedSession.id);
  }

  async function handleRenameTeam(team: DraftTeam) {
    if (!selectedSession || !isPendingDraft) {
      return;
    }

    const nextName = (teamNameEdits[team.id] || "").trim();

    if (!nextName) {
      setError("Team name cannot be blank.");
      return;
    }

    const safeTeamName = getUniqueTeamNameForTeams(nextName, teams, team.id);
    const { error: updateError } = await supabase
      .from("draft_teams")
      .update({
        name: safeTeamName,
        updated_at: new Date().toISOString(),
      })
      .eq("id", team.id);

    if (updateError) {
      setError(
        getDraftTeamErrorMessage(updateError.message) || "Could not rename team.",
      );
      return;
    }

    setMessage(
      safeTeamName === nextName
        ? "Team name updated."
        : `Team name updated to ${safeTeamName}.`,
    );
    await logAuditEvent({
      actionType: "draft_team_renamed",
      entityType: "draft_team",
      entityId: team.id,
      summary: `${team.name} renamed to ${safeTeamName}.`,
      oldValue: { name: team.name },
      newValue: { name: safeTeamName },
      metadata: { draft_session_id: selectedSession.id },
    });
    await fetchDraftState(selectedSession.id);
  }

  async function handleStartDraft() {
    if (!selectedSession || orderedTeams.length === 0) {
      return;
    }

    setMessage("");
    setError("");

    const { error: updateError } = await supabase
      .from("draft_sessions")
      .update({
        status: "active",
        draft_type: "snake",
        draft_order: orderedTeams.map((team) => team.id),
        current_pick_number: picks.length + 1,
        current_pick_started_at: new Date().toISOString(),
        started_at: selectedSession.started_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", selectedSession.id);

    if (updateError) {
      setError(updateError.message || "Could not start draft.");
      return;
    }

    setMessage("Draft started.");
    await logActivityFeedItem({
      type: "draft_started",
      source: "Live Draft",
      sourceId: selectedSession.id,
      linkUrl: "/draft/live",
      message: `${selectedSession.name} started.`,
    });
    await logAuditEvent({
      actionType: "draft_started",
      entityType: "draft_session",
      entityId: selectedSession.id,
      summary: `${selectedSession.name} started.`,
      metadata: { team_count: orderedTeams.length },
    });
    await fetchDraftState(selectedSession.id);
  }

  async function handleDraftPlayer(player: DraftPlayer) {
    if (!selectedSession || !currentTeam) {
      return;
    }

    if (picks.some((pick) => pick.player_id === player.id)) {
      setError(`${player.display_name} has already been drafted.`);
      return;
    }

    const nextPickNumber = picks.length + 1;
    const roundNumber = Math.floor(picks.length / Math.max(orderedTeams.length, 1)) + 1;

    setMessage("");
    setError("");

    const { error: insertError } = await supabase.from("draft_picks").insert({
      draft_session_id: selectedSession.id,
      draft_team_id: currentTeam.id,
      player_id: player.id,
      pick_number: nextPickNumber,
      round_number: roundNumber,
    });

    if (insertError) {
      setError(insertError.message || "Could not draft player.");
      return;
    }

    const remainingAfterPick = availablePlayers.length - 1;
    await supabase
      .from("draft_sessions")
      .update({
        current_pick_number: nextPickNumber + 1,
        current_pick_started_at: new Date().toISOString(),
        status: remainingAfterPick <= 0 ? "complete" : "active",
        completed_at:
          remainingAfterPick <= 0 ? new Date().toISOString() : selectedSession.completed_at,
        updated_at: new Date().toISOString(),
      })
      .eq("id", selectedSession.id);

    setMessage(`${player.display_name} drafted by ${currentTeam.name}.`);
    await logAuditEvent({
      actionType: "draft_pick_made",
      entityType: "draft_pick",
      summary: `${currentTeam.name} drafted ${player.display_name}.`,
      newValue: {
        draft_session_id: selectedSession.id,
        draft_team_id: currentTeam.id,
        player_id: player.id,
        pick_number: nextPickNumber,
        round_number: roundNumber,
      },
    });
    if (remainingAfterPick <= 0) {
      await logActivityFeedItem({
        type: "draft_completed",
        source: "Live Draft",
        sourceId: selectedSession.id,
        linkUrl: "/draft/live",
        message: `${selectedSession.name} completed.`,
      });
      await logAuditEvent({
        actionType: "draft_completed",
        entityType: "draft_session",
        entityId: selectedSession.id,
        summary: `${selectedSession.name} completed.`,
      });
    }
    await fetchDraftState(selectedSession.id);
  }

  async function handleUndoLastPick() {
    if (!selectedSession || picks.length === 0) {
      return;
    }

    const lastPick = picks[picks.length - 1];

    setMessage("");
    setError("");

    const { error: deleteError } = await supabase
      .from("draft_picks")
      .delete()
      .eq("id", lastPick.id);

    if (deleteError) {
      setError(deleteError.message || "Could not undo pick.");
      return;
    }

    await supabase
      .from("draft_sessions")
      .update({
        status: "active",
        completed_at: null,
        current_pick_number: Math.max(1, lastPick.pick_number),
        current_pick_started_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", selectedSession.id);

    setMessage("Last pick undone.");
    await logAuditEvent({
      actionType: "draft_pick_undone",
      entityType: "draft_pick",
      entityId: lastPick.id,
      summary: `Last draft pick undone in ${selectedSession.name}.`,
      oldValue: lastPick,
    });
    await fetchDraftState(selectedSession.id);
  }

  async function handleDeleteSession() {
    if (!selectedSession) {
      return;
    }

    const shouldDelete = window.confirm(
      `Delete ${selectedSession.name}? This removes the draft session and related teams/picks.`,
    );

    if (!shouldDelete) {
      return;
    }

    setMessage("");
    setError("");
    setIsSaving(true);

    const { data, error: deleteError } = await supabase
      .from("draft_sessions")
      .delete()
      .eq("id", selectedSession.id)
      .select("*");

    console.log("draft session delete:", {
      sessionId: selectedSession.id,
      data,
      error: deleteError,
    });

    if (deleteError) {
      setError(deleteError.message || "Could not delete draft session.");
      setIsSaving(false);
      return;
    }

    setSelectedSessionId("");
    setSelectedSession(null);
    setTeams([]);
    setPicks([]);
    setMessage("Draft session deleted.");
    await fetchSessions();
    setIsSaving(false);
  }

  return (
    <main className="min-h-screen bg-black p-6 text-[#f5f5f5]">
      <div className="mx-auto w-full max-w-md space-y-8 py-8">
        <div className="space-y-2">
          <p className="text-sm uppercase tracking-[0.35em] text-[#a3a3a3]">
            Admin
          </p>
          <h1 className="text-4xl font-bold tracking-tight">Live Draft</h1>
          <p className="text-[#a3a3a3]">
            Commissioner control for draft night.
          </p>
        </div>

        <section className="space-y-4 rounded-2xl border border-[#242424] bg-[#111111] p-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#a3a3a3]">
              Session
            </p>
            <h2 className="mt-2 text-xl font-bold">Create or Select</h2>
          </div>

          <select
            value={selectedSessionId}
            onChange={(event) => {
              const nextSessionId = event.target.value;
              setSelectedSessionId(nextSessionId);

              if (!nextSessionId) {
                setSelectedSession(null);
                setTeams([]);
                setPicks([]);
              }
            }}
            className="w-full rounded-xl border border-[#242424] bg-black px-4 py-3 outline-none focus:border-[#f5f5f5]"
          >
            <option value="">New draft session</option>
            {sessions.map((session) => (
              <option key={session.id} value={session.id}>
                {session.name} ({session.status})
              </option>
            ))}
          </select>

          <input
            type="text"
            value={sessionName}
            onChange={(event) => setSessionName(event.target.value)}
            placeholder="Draft session name"
            className="w-full rounded-xl border border-[#242424] bg-black px-4 py-3 outline-none focus:border-[#f5f5f5]"
          />

          <div className="space-y-3 rounded-xl border border-[#242424] bg-black/40 p-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#a3a3a3]">
                Auto Captains
              </p>
              <p className="mt-1 text-xs text-[#737373]">
                Choose a rank to generate the first captain teams. You can adjust everything afterward.
              </p>
            </div>

            <div className="grid grid-cols-4 gap-2">
              {ranks.map((rank) => (
                <button
                  key={rank}
                  type="button"
                  onClick={() => setCaptainRank(rank)}
                  className={`rounded-xl border px-3 py-3 text-sm font-bold transition ${
                    captainRank === rank
                      ? "border-[#f5f5f5] bg-[#f5f5f5] text-black"
                      : "border-[#242424] bg-black text-[#a3a3a3] hover:border-[#f5f5f5]"
                  }`}
                >
                  {rank}
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={handleCreateSession}
            disabled={isSaving || isLoading}
            className="w-full rounded-xl bg-[#f5f5f5] px-4 py-3 font-bold text-black transition hover:bg-[#d4d4d4] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSaving ? "Creating..." : "Create Draft + Auto Captains"}
          </button>
        </section>

        {message && <p className="text-center text-sm">{message}</p>}
        {error && <p className="text-center text-sm text-[#ff8a8a]">{error}</p>}

        {selectedSession && (
          <>
            <section className="space-y-3 rounded-2xl border border-[#242424] bg-[#111111] p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#a3a3a3]">
                    {selectedSession.status}
                  </p>
                  <h2 className="mt-2 text-xl font-bold">
                    {selectedSession.name}
                  </h2>
                  <p className="mt-1 text-sm text-[#a3a3a3]">
                    Captains: {selectedSession.captain_rank || "-"} · Snake
                  </p>
                </div>

                <Link
                  href="/draft/live"
                  className="rounded-xl border border-[#242424] px-3 py-2 text-xs font-bold text-[#f5f5f5] transition hover:border-[#f5f5f5]"
                >
                  TV
                </Link>
                <Link
                  href="/draft/mobile"
                  className="rounded-xl border border-[#242424] px-3 py-2 text-xs font-bold text-[#f5f5f5] transition hover:border-[#f5f5f5]"
                >
                  Mobile
                </Link>
              </div>

              <button
                type="button"
                onClick={handleDeleteSession}
                disabled={isSaving}
                className="w-full rounded-xl border border-[#3a1f1f] px-4 py-3 text-sm font-bold text-[#ff8a8a] transition hover:border-[#ff8a8a] disabled:cursor-not-allowed disabled:opacity-50"
              >
                Delete Draft Session
              </button>
            </section>

            <section className="space-y-4 rounded-2xl border border-[#242424] bg-[#111111] p-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#a3a3a3]">
                  Captain Teams
                </p>
                <h2 className="mt-2 text-xl font-bold">
                  Draft Order & Captains
                </h2>
                <p className="mt-1 text-xs leading-5 text-[#737373]">
                  Auto-generated and manually added captain teams live here together.
                  {isPendingDraft
                    ? " Reorder, rename, remove, or change captains before the draft starts."
                    : ""}
                </p>
              </div>

              {isPendingDraft && (
                <div className="space-y-3 rounded-xl border border-[#242424] bg-black/40 p-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#a3a3a3]">
                      Add Captain Team
                    </p>
                    <p className="mt-1 text-xs leading-5 text-[#737373]">
                      Use this for exceptions. Captain rank is guidance, not a lock.
                    </p>
                  </div>

                  <select
                    value={manualCaptainPlayerId}
                    onChange={(event) =>
                      setManualCaptainPlayerId(event.target.value)
                    }
                    className="w-full rounded-xl border border-[#242424] bg-black px-4 py-3 outline-none focus:border-[#f5f5f5]"
                  >
                    <option value="">Select player to add</option>
                    {players.map((player) => (
                      <option key={player.id} value={player.id}>
                        {player.display_name} ({player.rank || "Unranked"})
                      </option>
                    ))}
                  </select>

                  <button
                    type="button"
                    onClick={handleAddCaptainTeam}
                    disabled={!manualCaptainPlayerId}
                    className="w-full rounded-xl border border-[#242424] px-4 py-3 font-bold text-[#f5f5f5] transition hover:border-[#f5f5f5] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Add Captain / Team
                  </button>
                </div>
              )}

              {orderedTeams.length === 0 && (
                <div className="rounded-2xl border border-[#242424] bg-black/40 p-4 text-sm text-[#a3a3a3]">
                  No captain teams yet. Create a draft with auto captains or add
                  one manually.
                </div>
              )}

              {orderedTeams.map((team, index) => (
                <div
                  key={team.id}
                  className="rounded-2xl border border-[#242424] bg-[#111111] p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs uppercase tracking-[0.2em] text-[#737373]">
                        Pick slot {index + 1}
                      </p>
                      <h3 className="truncate text-lg font-bold">{team.name}</h3>
                      <p className="mt-1 text-sm text-[#a3a3a3]">
                        Captain:{" "}
                        {playersById.get(team.captain_player_id || "")?.display_name ||
                          "Unassigned"}
                      </p>
                    </div>
                    {isPendingDraft && (
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => moveTeam(team.id, -1)}
                          className="rounded-lg border border-[#242424] px-3 py-2 text-sm hover:border-[#f5f5f5]"
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          onClick={() => moveTeam(team.id, 1)}
                          className="rounded-lg border border-[#242424] px-3 py-2 text-sm hover:border-[#f5f5f5]"
                        >
                          ↓
                        </button>
                      </div>
                    )}
                  </div>

                  {isPendingDraft && (
                    <div className="mt-4 space-y-3 border-t border-[#242424] pt-4">
                      <div className="grid gap-3">
                        <label className="space-y-2">
                          <span className="block text-xs font-semibold uppercase tracking-[0.18em] text-[#a3a3a3]">
                            Team Name
                          </span>
                          <div className="grid grid-cols-[1fr_auto] gap-2">
                            <input
                              type="text"
                              value={teamNameEdits[team.id] ?? team.name}
                              onChange={(event) =>
                                setTeamNameEdits((current) => ({
                                  ...current,
                                  [team.id]: event.target.value,
                                }))
                              }
                              className="w-full rounded-xl border border-[#242424] bg-black px-4 py-3 outline-none focus:border-[#f5f5f5]"
                            />
                            <button
                              type="button"
                              onClick={() => handleRenameTeam(team)}
                              className="rounded-xl border border-[#242424] px-3 py-2 text-sm font-bold hover:border-[#f5f5f5]"
                            >
                              Save
                            </button>
                          </div>
                        </label>

                        <label className="space-y-2">
                          <span className="block text-xs font-semibold uppercase tracking-[0.18em] text-[#a3a3a3]">
                            Captain
                          </span>
                          <select
                            value={team.captain_player_id || ""}
                            onChange={(event) =>
                              handleChangeCaptain(team, event.target.value)
                            }
                            className="w-full rounded-xl border border-[#242424] bg-black px-4 py-3 outline-none focus:border-[#f5f5f5]"
                          >
                            <option value="">Unassigned</option>
                            {players.map((player) => (
                              <option key={player.id} value={player.id}>
                                {player.display_name} ({player.rank || "Unranked"})
                              </option>
                            ))}
                          </select>
                        </label>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveCaptainTeam(team)}
                        className="w-full rounded-xl border border-[#3a1f1f] px-4 py-3 text-sm font-bold text-[#ff8a8a] transition hover:border-[#ff8a8a]"
                      >
                        Remove Captain Team
                      </button>
                    </div>
                  )}
                </div>
              ))}

              {selectedSession.status === "pending" && (
                <button
                  type="button"
                  onClick={handleStartDraft}
                  className="w-full rounded-2xl border border-[#f5f5f5] bg-[#f5f5f5] px-5 py-4 font-bold text-black transition hover:bg-[#d4d4d4]"
                >
                  Start Draft
                </button>
              )}
            </section>

            {selectedSession.status !== "pending" && (
              <section className="space-y-4">
                <div className="rounded-2xl border border-[#f5f5f5] bg-[#111111] p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#a3a3a3]">
                    On The Clock
                  </p>
                  <h2 className="mt-2 text-3xl font-bold">
                    {currentTeam?.name || "Draft complete"}
                  </h2>
                  <p className="mt-1 text-sm text-[#a3a3a3]">
                    Pick {picks.length + 1}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleUndoLastPick}
                  disabled={picks.length === 0}
                  className="w-full rounded-xl border border-[#242424] px-4 py-3 font-bold text-[#f5f5f5] transition hover:border-[#f5f5f5] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Undo Last Pick
                </button>

                <div className="space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#a3a3a3]">
                    Available Players
                  </p>
                  {Object.entries(availableByRank).map(([rank, rankPlayers]) => (
                    <div key={rank} className="space-y-2">
                      <h3 className="text-sm font-bold text-[#f5f5f5]">
                        Rank {rank}
                      </h3>
                      <div className="grid grid-cols-2 gap-2">
                        {rankPlayers.map((player) => (
                          <button
                            key={player.id}
                            type="button"
                            onClick={() => handleDraftPlayer(player)}
                            disabled={!currentTeam || selectedSession.status === "complete"}
                            className="rounded-xl border border-[#242424] bg-[#111111] p-3 text-left text-sm font-semibold transition hover:border-[#f5f5f5] disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {player.display_name}
                            <span className="ml-2 text-xs text-[#737373]">
                              {player.rank}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            <section className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#a3a3a3]">
                Teams
              </p>
              {orderedTeams.map((team) => (
                <div
                  key={team.id}
                  className="rounded-2xl border border-[#242424] bg-[#111111] p-4"
                >
                  <h3 className="text-lg font-bold">{team.name}</h3>
                  <div className="mt-3 space-y-2 text-sm text-[#a3a3a3]">
                    <p>
                      Captain:{" "}
                      {playersById.get(team.captain_player_id || "")?.display_name ||
                        team.name}
                    </p>
                    {(picksByTeam[team.id] || []).map((pick) => (
                      <p key={pick.id}>
                        {pick.pick_number}.{" "}
                        {playersById.get(pick.player_id)?.display_name || "Unknown"}
                      </p>
                    ))}
                  </div>
                </div>
              ))}
            </section>
          </>
        )}

        <Link href="/admin" className="block text-center text-sm text-[#a3a3a3]">
          ← Back to Admin
        </Link>
      </div>
    </main>
  );
}
