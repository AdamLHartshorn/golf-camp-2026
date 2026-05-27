"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { logActivityFeedItem } from "@/lib/activityFeed";
import { getPlayerSession, PlayerSession } from "@/lib/playerSession";
import { supabase } from "@/lib/supabase";

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

type AfternoonRoundPlayer = {
  id: string;
  afternoon_round_id: string;
  player_id: string;
  player_name: string;
};

type AfternoonRoundTeam = {
  id: string;
  afternoon_round_id: string;
  name: string;
  player_ids: string[];
  player_names: string[];
  created_at: string | null;
};

export default function AfternoonRoundDetailPage() {
  const params = useParams<{ id: string }>();
  const [session] = useState<PlayerSession | null>(() => getPlayerSession());
  const [round, setRound] = useState<AfternoonRound | null>(null);
  const [participants, setParticipants] = useState<AfternoonRoundPlayer[]>([]);
  const [teams, setTeams] = useState<AfternoonRoundTeam[]>([]);
  const [teamName, setTeamName] = useState("");
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const canManage = Boolean(
    session && (session.is_admin || session.id === round?.owner_player_id),
  );
  const participantById = useMemo(
    () => new Map(participants.map((player) => [player.player_id, player])),
    [participants],
  );

  async function fetchRoundState() {
    setIsLoading(true);

    const [
      { data: roundData, error: roundError },
      { data: playerData, error: playerError },
      { data: teamData, error: teamError },
    ] = await Promise.all([
      supabase.from("afternoon_rounds").select("*").eq("id", params.id).single(),
      supabase
        .from("afternoon_round_players")
        .select("*")
        .eq("afternoon_round_id", params.id)
        .order("player_name", { ascending: true }),
      supabase
        .from("afternoon_round_teams")
        .select("*")
        .eq("afternoon_round_id", params.id)
        .order("created_at", { ascending: true }),
    ]);

    if (roundError || playerError || teamError) {
      setError(
        roundError?.message ||
          playerError?.message ||
          teamError?.message ||
          "Could not load Afternoon Round.",
      );
      setIsLoading(false);
      return;
    }

    setRound(roundData as AfternoonRound);
    setParticipants((playerData as AfternoonRoundPlayer[]) || []);
    setTeams((teamData as AfternoonRoundTeam[]) || []);
    setIsLoading(false);
  }

  useEffect(() => {
    let isCurrent = true;

    async function loadRoundState() {
      const [
        { data: roundData, error: roundError },
        { data: playerData, error: playerError },
        { data: teamData, error: teamError },
      ] = await Promise.all([
        supabase.from("afternoon_rounds").select("*").eq("id", params.id).single(),
        supabase
          .from("afternoon_round_players")
          .select("*")
          .eq("afternoon_round_id", params.id)
          .order("player_name", { ascending: true }),
        supabase
          .from("afternoon_round_teams")
          .select("*")
          .eq("afternoon_round_id", params.id)
          .order("created_at", { ascending: true }),
      ]);

      if (!isCurrent) {
        return;
      }

      if (roundError || playerError || teamError) {
        setError(
          roundError?.message ||
            playerError?.message ||
            teamError?.message ||
            "Could not load Afternoon Round.",
        );
        setIsLoading(false);
        return;
      }

      setRound(roundData as AfternoonRound);
      setParticipants((playerData as AfternoonRoundPlayer[]) || []);
      setTeams((teamData as AfternoonRoundTeam[]) || []);
      setIsLoading(false);
    }

    loadRoundState();

    return () => {
      isCurrent = false;
    };
  }, [params.id]);

  function togglePlayer(playerId: string) {
    setSelectedPlayerIds((current) =>
      current.includes(playerId)
        ? current.filter((id) => id !== playerId)
        : [...current, playerId],
    );
  }

  async function handleCreateTeam() {
    if (!round || !canManage) {
      return;
    }

    const selectedPlayers = selectedPlayerIds
      .map((playerId) => participantById.get(playerId))
      .filter((player): player is AfternoonRoundPlayer => Boolean(player));
    const finalTeamName =
      teamName.trim() ||
      selectedPlayers.map((player) => player.player_name.split(" ").at(-1)).join(" / ");

    setMessage("");
    setError("");

    if (selectedPlayers.length === 0 || !finalTeamName) {
      setError("Select players and name the team.");
      return;
    }

    setIsSaving(true);

    const { error: insertError } = await supabase.from("afternoon_round_teams").insert({
      afternoon_round_id: round.id,
      name: finalTeamName,
      player_ids: selectedPlayers.map((player) => player.player_id),
      player_names: selectedPlayers.map((player) => player.player_name),
    });

    if (insertError) {
      setError(insertError.message || "Could not create team.");
      setIsSaving(false);
      return;
    }

    setTeamName("");
    setSelectedPlayerIds([]);
    setMessage("Team added.");
    await fetchRoundState();
    setIsSaving(false);
  }

  async function handleFinalizeRound() {
    if (!round || !canManage || !window.confirm(`Finalize ${round.name}?`)) {
      return;
    }

    setMessage("");
    setError("");
    setIsSaving(true);

    const { data, error: updateError } = await supabase
      .from("afternoon_rounds")
      .update({
        status: "final",
        finalized_at: new Date().toISOString(),
      })
      .eq("id", round.id)
      .select("*")
      .single();

    if (updateError) {
      setError(updateError.message || "Could not finalize round.");
      setIsSaving(false);
      return;
    }

    setRound(data as AfternoonRound);
    await logActivityFeedItem({
      type: "afternoon_round_finalized",
      source: "Afternoon Rounds",
      sourceId: round.id,
      createdByPlayerId: session?.id || null,
      linkUrl: `/afternoon-rounds/${round.id}`,
      message: `${round.name} finalized.`,
    });
    setMessage("Afternoon Round finalized.");
    setIsSaving(false);
  }

  async function handleDeleteTeam(team: AfternoonRoundTeam) {
    if (
      !round ||
      !canManage ||
      !window.confirm(`Remove ${team.name} from ${round.name}?`)
    ) {
      return;
    }

    setMessage("");
    setError("");
    setIsSaving(true);

    const { error: deleteError } = await supabase
      .from("afternoon_round_teams")
      .delete()
      .eq("id", team.id);

    if (deleteError) {
      setError(deleteError.message || "Could not remove team.");
      setIsSaving(false);
      return;
    }

    setMessage("Team removed.");
    await fetchRoundState();
    setIsSaving(false);
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(214,168,79,0.13),transparent_34%),#050505] p-5 text-[#f5f5f5]">
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center space-y-5 py-6">
        <div className="flex items-center justify-between gap-4">
          <Link href="/afternoon-rounds" className="text-2xl text-[#a3a3a3]">
            ‹
          </Link>
          <p className="font-mono text-sm uppercase tracking-[0.22em] text-[#f5f5f5]">
            Afternoon Round
          </p>
          <span className="rounded-full border border-[#6f4d16] bg-[#21180b] px-3 py-1 text-xs font-black text-[#d6a84f]">
            {round?.status || "open"}
          </span>
        </div>

        {isLoading && (
          <div className="rounded-2xl border border-[#242424] bg-[#111111] p-5 text-sm text-[#a3a3a3]">
            Loading round...
          </div>
        )}

        {!isLoading && error && (
          <div className="rounded-2xl border border-[#242424] bg-[#111111] p-5 text-sm text-[#f5c56f]">
            {error}
          </div>
        )}

        {!isLoading && round && (
          <>
            <section className="overflow-hidden rounded-2xl border border-[#6f4d16]/70 bg-[#0d0d0b]/95 shadow-[0_28px_80px_rgba(0,0,0,0.45)]">
              <div className="border-b border-[#2a2925] bg-[#21180b] px-5 py-5">
                <p className="font-mono text-[10px] font-black uppercase tracking-[0.24em] text-[#d6a84f]">
                  {round.owner_name || "Player-created round"}
                </p>
                <h1 className="mt-2 text-3xl font-black tracking-tight">
                  {round.name}
                </h1>
                <p className="mt-2 text-sm text-[#b8b0a1]">
                  {round.round_date || "Date TBD"} · {participants.length} participants
                </p>
              </div>

              <div className="p-5">
                <p className="text-sm leading-6 text-[#a3a3a3]">
                  Afternoon Rounds are optional player-created games. They do not
                  affect official Money Rounds totals.
                </p>
              </div>
            </section>

            {!canManage && (
              <p className="rounded-2xl border border-[#242424] bg-[#111111] p-4 text-sm text-[#a3a3a3]">
                Only the round owner can manage teams. Admins can manage all rounds.
              </p>
            )}

            {canManage && String(round.status).toLowerCase() !== "final" && (
              <section className="space-y-4 rounded-2xl border border-[#242424] bg-[#111111] p-5">
                <div>
                  <p className="font-mono text-[10px] font-black uppercase tracking-[0.24em] text-[#d6a84f]">
                    Team Builder
                  </p>
                  <h2 className="mt-2 text-xl font-bold">Manual Teams</h2>
                </div>

                <input
                  value={teamName}
                  onChange={(event) => setTeamName(event.target.value)}
                  placeholder="Team name"
                  className="w-full rounded-xl border border-[#242424] bg-black px-4 py-3 outline-none focus:border-[#d6a84f]"
                />

                <div className="flex max-h-40 flex-wrap gap-2 overflow-y-auto rounded-xl border border-[#242424] bg-black/35 p-2">
                  {participants.map((player) => {
                    const isSelected = selectedPlayerIds.includes(player.player_id);

                    return (
                      <button
                        key={player.id}
                        type="button"
                        onClick={() => togglePlayer(player.player_id)}
                        className={`rounded-full border px-3 py-1.5 text-xs font-bold transition ${
                          isSelected
                            ? "border-[#d6a84f] bg-[#d6a84f] text-black"
                            : "border-[#242424] bg-[#111111] text-[#d4d4d4] hover:border-[#d6a84f]"
                        }`}
                      >
                        {player.player_name}
                      </button>
                    );
                  })}
                </div>

                <button
                  type="button"
                  onClick={handleCreateTeam}
                  disabled={isSaving || selectedPlayerIds.length === 0}
                  className="w-full rounded-xl border border-[#d6a84f] px-4 py-3 font-bold text-[#d6a84f] transition hover:bg-[#21180b] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Add Team
                </button>
              </section>
            )}

            <section className="overflow-hidden rounded-2xl border border-[#2b2b27] bg-[#0d0d0b]">
              <div className="border-b border-[#2a2925] bg-[#11110f] px-5 py-4">
                <p className="font-mono text-[10px] font-black uppercase tracking-[0.24em] text-[#d6a84f]">
                  Teams
                </p>
                <h2 className="mt-2 text-xl font-black">Round Groups</h2>
              </div>

              {teams.length === 0 ? (
                <p className="p-5 text-sm text-[#a3a3a3]">
                  No teams created yet.
                </p>
              ) : (
                teams.map((team) => (
                  <div
                    key={team.id}
                    className="flex items-start justify-between gap-4 border-b border-[#2a2925] px-5 py-4 last:border-b-0"
                  >
                    <div className="min-w-0">
                      <h3 className="font-bold">{team.name}</h3>
                      <p className="mt-1 text-sm text-[#a3a3a3]">
                        {team.player_names.join(", ") || "No players"}
                      </p>
                    </div>
                    {canManage && String(round.status).toLowerCase() !== "final" && (
                      <button
                        type="button"
                        onClick={() => handleDeleteTeam(team)}
                        disabled={isSaving}
                        className="shrink-0 text-xs font-bold text-[#d6a84f] disabled:opacity-50"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                ))
              )}
            </section>

            <section className="overflow-hidden rounded-2xl border border-[#2b2b27] bg-[#0d0d0b]">
              <div className="border-b border-[#2a2925] bg-[#11110f] px-5 py-4">
                <p className="font-mono text-[10px] font-black uppercase tracking-[0.24em] text-[#d6a84f]">
                  Participants
                </p>
              </div>
              <div className="flex flex-wrap gap-2 p-5">
                {participants.map((player) => (
                  <span
                    key={player.id}
                    className="rounded-full border border-[#3a2a12] bg-black/45 px-3 py-1.5 text-xs font-bold text-[#f5f5f5]"
                  >
                    {player.player_name}
                  </span>
                ))}
              </div>
            </section>

            {message && <p className="text-center text-sm">{message}</p>}
            {error && <p className="text-center text-sm text-[#f5c56f]">{error}</p>}

            {canManage && String(round.status).toLowerCase() !== "final" && (
              <button
                type="button"
                onClick={handleFinalizeRound}
                disabled={isSaving}
                className="rounded-2xl border border-[#d6a84f] bg-[#d6a84f] px-5 py-4 font-bold text-black transition hover:bg-[#b8872d] disabled:cursor-not-allowed disabled:opacity-50"
              >
                Finalize Afternoon Round
              </button>
            )}
          </>
        )}

        <Link
          href="/afternoon-rounds"
          className="block text-center text-sm text-[#a3a3a3]"
        >
          ← Back to Afternoon Rounds
        </Link>
      </div>
    </main>
  );
}
