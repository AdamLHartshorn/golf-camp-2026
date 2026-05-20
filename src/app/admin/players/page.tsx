"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";

const ranks = ["A", "B", "C", "D"];

type PlayerRow = {
  id: string;
  player_key: string | null;
  first_name: string;
  last_name: string;
  display_name: string;
  nickname: string | null;
  rank: string | null;
  internal_rank_order: string | null;
  room: string | null;
  arrival: string | null;
  phone: string | null;
  email: string | null;
  photo_url: string | null;
  deposit_paid: boolean | null;
  gambling_paid: boolean | null;
  active: boolean | null;
  created_at: string | null;
  updated_at: string | null;
};

type PlayerFormState = {
  first_name: string;
  last_name: string;
  display_name: string;
  nickname: string;
  rank: string;
  internal_rank_order: string;
  room: string;
  arrival: string;
  phone: string;
  email: string;
  deposit_paid: boolean;
  gambling_paid: boolean;
  active: boolean;
};

const emptyForm: PlayerFormState = {
  first_name: "",
  last_name: "",
  display_name: "",
  nickname: "",
  rank: "A",
  internal_rank_order: "",
  room: "",
  arrival: "",
  phone: "",
  email: "",
  deposit_paid: false,
  gambling_paid: false,
  active: true,
};

function createPlayerKey(displayName: string) {
  return displayName.trim().toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function playerToForm(player: PlayerRow): PlayerFormState {
  return {
    first_name: player.first_name || "",
    last_name: player.last_name || "",
    display_name: player.display_name || "",
    nickname: player.nickname || "",
    rank: player.rank || "A",
    internal_rank_order: player.internal_rank_order || "",
    room: player.room || "",
    arrival: player.arrival || "",
    phone: player.phone || "",
    email: player.email || "",
    deposit_paid: player.deposit_paid ?? false,
    gambling_paid: player.gambling_paid ?? false,
    active: player.active ?? true,
  };
}

function formToPayload(form: PlayerFormState) {
  const displayName = form.display_name.trim();
  const internalRankOrder = form.internal_rank_order.trim().toUpperCase();

  return {
    first_name: form.first_name.trim(),
    last_name: form.last_name.trim(),
    display_name: displayName,
    player_key: createPlayerKey(displayName),
    nickname: form.nickname.trim() || null,
    rank: form.rank,
    internal_rank_order: internalRankOrder || null,
    room: form.room.trim() || null,
    arrival: form.arrival.trim() || null,
    phone: form.phone.trim() || null,
    email: form.email.trim() || null,
    deposit_paid: form.deposit_paid,
    gambling_paid: form.gambling_paid,
    active: form.active,
    updated_at: new Date().toISOString(),
  };
}

export default function PlayersAdminPage() {
  const [players, setPlayers] = useState<PlayerRow[]>([]);
  const [form, setForm] = useState<PlayerFormState>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const formRef = useRef<HTMLElement | null>(null);

  const activePlayers = useMemo(
    () =>
      players
        .filter((player) => player.active !== false)
        .sort((a, b) => {
          const lastNameCompare = a.last_name.localeCompare(b.last_name);

          if (lastNameCompare !== 0) {
            return lastNameCompare;
          }

          return a.first_name.localeCompare(b.first_name);
        }),
    [players],
  );

  const inactivePlayers = useMemo(
    () =>
      players
        .filter((player) => player.active === false)
        .sort((a, b) => {
          const lastNameCompare = a.last_name.localeCompare(b.last_name);

          if (lastNameCompare !== 0) {
            return lastNameCompare;
          }

          return a.first_name.localeCompare(b.first_name);
        }),
    [players],
  );

  async function fetchPlayers() {
    const { data, error: fetchError } = await supabase
      .from("players")
      .select("*");

    console.log("Admin players fetch:", {
      data,
      error: fetchError,
    });

    if (fetchError) {
      setPlayers([]);
      setError(fetchError.message || "Could not load players.");
      setIsLoading(false);
      return;
    }

    setPlayers((data as PlayerRow[]) || []);
    setIsLoading(false);
  }

  useEffect(() => {
    let isCurrent = true;

    async function loadPlayers() {
      const { data, error: fetchError } = await supabase
        .from("players")
        .select("*");

      console.log("Admin players fetch:", {
        data,
        error: fetchError,
      });

      if (!isCurrent) {
        return;
      }

      if (fetchError) {
        setPlayers([]);
        setError(fetchError.message || "Could not load players.");
        setIsLoading(false);
        return;
      }

      setPlayers((data as PlayerRow[]) || []);
      setIsLoading(false);
    }

    loadPlayers();

    return () => {
      isCurrent = false;
    };
  }, []);

  function updateForm(field: keyof PlayerFormState, value: string | boolean) {
    setForm((currentForm) => ({
      ...currentForm,
      [field]: value,
    }));
  }

  function resetForm(options?: { preserveFeedback?: boolean }) {
    setForm(emptyForm);
    setEditingId(null);

    if (!options?.preserveFeedback) {
      setMessage("");
      setError("");
    }
  }

  function handleEdit(player: PlayerRow) {
    setEditingId(player.id);
    setForm(playerToForm(player));
    setMessage("");
    setError("");
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function handleSave() {
    const payload = formToPayload(form);

    setMessage("");
    setError("");

    if (!payload.display_name) {
      setError("Display name is required.");
      return;
    }

    if (!payload.first_name || !payload.last_name) {
      setError("First name and last name are required.");
      return;
    }

    if (!ranks.includes(payload.rank)) {
      setError("Rank must be A, B, C, or D.");
      return;
    }

    if (
      payload.internal_rank_order &&
      !/^[ABCD][0-9]+$/.test(payload.internal_rank_order)
    ) {
      setError("Internal rank order must look like A1, B2, or C11.");
      return;
    }

    setIsSaving(true);

    if (editingId) {
      const { data, error: updateError } = await supabase
        .from("players")
        .update(payload)
        .eq("id", editingId)
        .select("*")
        .single();

      console.log("Admin players update:", {
        id: editingId,
        payload,
        data,
        error: updateError,
      });

      setIsSaving(false);

      if (updateError) {
        setError(updateError.message || "Could not update player.");
        return;
      }

      setPlayers((currentPlayers) =>
        currentPlayers.map((player) =>
          player.id === editingId ? (data as PlayerRow) : player,
        ),
      );
      resetForm({ preserveFeedback: true });
      setMessage("Player updated.");
      return;
    }

    const { data, error: insertError } = await supabase
      .from("players")
      .insert(payload)
      .select("*")
      .single();

    console.log("Admin players insert:", {
      payload,
      data,
      error: insertError,
    });

    setIsSaving(false);

    if (insertError) {
      setError(insertError.message || "Could not create player.");
      return;
    }

    setPlayers((currentPlayers) => [...currentPlayers, data as PlayerRow]);
    resetForm({ preserveFeedback: true });
    setMessage("Player created.");
  }

  async function handleToggleActive(player: PlayerRow) {
    const nextActive = !(player.active ?? true);

    setMessage("");
    setError("");

    const { data, error: updateError } = await supabase
      .from("players")
      .update({
        active: nextActive,
        updated_at: new Date().toISOString(),
      })
      .eq("id", player.id)
      .select();

    console.log("Admin players active toggle:", {
      player,
      nextActive,
      data,
      error: updateError,
    });

    if (updateError) {
      setError(updateError.message || "Could not update active status.");
      return;
    }

    setMessage(nextActive ? "Player activated." : "Player deactivated.");
    setIsLoading(true);
    await fetchPlayers();
  }

  async function handleDelete(player: PlayerRow) {
    if (!window.confirm(`Delete ${player.display_name}?`)) {
      return;
    }

    setMessage("");
    setError("");

    const { data, error: deleteError } = await supabase
      .from("players")
      .delete()
      .eq("id", player.id)
      .select();

    console.log("Admin players delete:", {
      player,
      data,
      error: deleteError,
    });

    if (deleteError) {
      setError(deleteError.message || "Could not delete player.");
      return;
    }

    setMessage("Player deleted.");
    setIsLoading(true);
    await fetchPlayers();
  }

  function renderPlayerCard(player: PlayerRow) {
    return (
      <div
        key={player.id}
        className="rounded-2xl border border-[#242424] bg-[#111111] p-5"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="truncate text-xl font-bold">
                {player.display_name}
              </h3>

              <span className="rounded-full border border-[#242424] px-2 py-1 text-xs font-bold text-[#f5f5f5]">
                {player.rank || "-"}
              </span>
            </div>

            <p className="mt-2 text-sm text-[#a3a3a3]">
              Room {player.room || "-"} · {player.arrival || "Arrival TBD"}
            </p>

            <p className="mt-1 text-xs uppercase tracking-[0.2em] text-[#737373]">
              {player.active === false ? "Inactive" : "Active"}
            </p>

            <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold uppercase tracking-[0.16em]">
              <span className="rounded-full border border-[#242424] px-2 py-1 text-[#a3a3a3]">
                Internal {player.internal_rank_order || "-"}
              </span>

              <span className="rounded-full border border-[#242424] px-2 py-1 text-[#a3a3a3]">
                Deposit {player.deposit_paid ? "Paid" : "Open"}
              </span>

              <span className="rounded-full border border-[#242424] px-2 py-1 text-[#a3a3a3]">
                Gambling {player.gambling_paid ? "Paid" : "Open"}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => handleEdit(player)}
            className="shrink-0 rounded-xl border border-[#242424] px-3 py-2 text-xs font-bold text-[#f5f5f5] transition hover:border-[#f5f5f5]"
          >
            Edit
          </button>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 border-t border-[#242424] pt-4">
          <button
            type="button"
            onClick={() => handleToggleActive(player)}
            className="rounded-xl border border-[#242424] px-3 py-2 text-xs font-bold text-[#f5f5f5] transition hover:border-[#f5f5f5]"
          >
            {player.active === false ? "Activate" : "Deactivate"}
          </button>

          <button
            type="button"
            onClick={() => handleDelete(player)}
            className="rounded-xl border border-[#242424] px-3 py-2 text-xs font-bold text-[#ff8a8a] transition hover:border-[#ff8a8a]"
          >
            Delete
          </button>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-black p-6 text-[#f5f5f5]">
      <div className="mx-auto w-full max-w-md space-y-8 py-10">
        <div className="space-y-2">
          <p className="text-sm uppercase tracking-[0.35em] text-[#a3a3a3]">
            Admin
          </p>

          <h1 className="text-4xl font-bold tracking-tight">
            Player Database
          </h1>

          <p className="text-[#a3a3a3]">
            Create, edit, and manage roster players.
          </p>
        </div>

        <section
          ref={formRef}
          className="space-y-4 rounded-2xl border border-[#242424] bg-[#111111] p-5"
        >
          <div>
            <h2 className="text-xl font-bold">
              {editingId ? "Edit Player" : "Create Player"}
            </h2>

            <p className="mt-1 text-sm text-[#a3a3a3]">
              Player profile fields for Camp Office.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <input
              type="text"
              value={form.first_name}
              onChange={(event) => updateForm("first_name", event.target.value)}
              placeholder="First name"
              className="rounded-xl border border-[#242424] bg-black px-4 py-3 outline-none focus:border-[#f5f5f5]"
            />

            <input
              type="text"
              value={form.last_name}
              onChange={(event) => updateForm("last_name", event.target.value)}
              placeholder="Last name"
              className="rounded-xl border border-[#242424] bg-black px-4 py-3 outline-none focus:border-[#f5f5f5]"
            />
          </div>

          <input
            type="text"
            value={form.display_name}
            onChange={(event) => updateForm("display_name", event.target.value)}
            placeholder="Display name"
            className="w-full rounded-xl border border-[#242424] bg-black px-4 py-3 outline-none focus:border-[#f5f5f5]"
          />

          <input
            type="text"
            value={form.nickname}
            onChange={(event) => updateForm("nickname", event.target.value)}
            placeholder="Nickname"
            className="w-full rounded-xl border border-[#242424] bg-black px-4 py-3 outline-none focus:border-[#f5f5f5]"
          />

          <div className="grid grid-cols-3 gap-3">
            <select
              value={form.rank}
              onChange={(event) => updateForm("rank", event.target.value)}
              className="rounded-xl border border-[#242424] bg-black px-4 py-3 outline-none focus:border-[#f5f5f5]"
            >
              {ranks.map((rank) => (
                <option key={rank} value={rank}>
                  Rank {rank}
                </option>
              ))}
            </select>

            <input
              type="text"
              value={form.internal_rank_order}
              onChange={(event) =>
                updateForm("internal_rank_order", event.target.value)
              }
              placeholder="A1"
              className="rounded-xl border border-[#242424] bg-black px-4 py-3 outline-none focus:border-[#f5f5f5]"
            />

            <input
              type="text"
              value={form.room}
              onChange={(event) => updateForm("room", event.target.value)}
              placeholder="Room"
              className="rounded-xl border border-[#242424] bg-black px-4 py-3 outline-none focus:border-[#f5f5f5]"
            />
          </div>

          <input
            type="text"
            value={form.arrival}
            onChange={(event) => updateForm("arrival", event.target.value)}
            placeholder="Arrival"
            className="w-full rounded-xl border border-[#242424] bg-black px-4 py-3 outline-none focus:border-[#f5f5f5]"
          />

          <div className="grid grid-cols-2 gap-3">
            <label className="flex items-center gap-3 rounded-xl border border-[#242424] bg-black px-4 py-3 text-sm text-[#a3a3a3]">
              <input
                type="checkbox"
                checked={form.deposit_paid}
                onChange={(event) =>
                  updateForm("deposit_paid", event.target.checked)
                }
                className="h-4 w-4"
              />
              Deposit paid
            </label>

            <label className="flex items-center gap-3 rounded-xl border border-[#242424] bg-black px-4 py-3 text-sm text-[#a3a3a3]">
              <input
                type="checkbox"
                checked={form.gambling_paid}
                onChange={(event) =>
                  updateForm("gambling_paid", event.target.checked)
                }
                className="h-4 w-4"
              />
              Gambling paid
            </label>
          </div>

          <input
            type="tel"
            value={form.phone}
            onChange={(event) => updateForm("phone", event.target.value)}
            placeholder="Phone"
            className="w-full rounded-xl border border-[#242424] bg-black px-4 py-3 outline-none focus:border-[#f5f5f5]"
          />

          <input
            type="email"
            value={form.email}
            onChange={(event) => updateForm("email", event.target.value)}
            placeholder="Email"
            className="w-full rounded-xl border border-[#242424] bg-black px-4 py-3 outline-none focus:border-[#f5f5f5]"
          />

          <label className="flex items-center gap-3 text-sm text-[#a3a3a3]">
            <input
              type="checkbox"
              checked={form.active}
              onChange={(event) => updateForm("active", event.target.checked)}
              className="h-4 w-4"
            />
            Active player
          </label>

          {message && (
            <p className="text-center text-sm text-[#f5f5f5]">{message}</p>
          )}

          {error && (
            <p className="text-center text-sm text-[#ff8a8a]">{error}</p>
          )}

          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="rounded-xl bg-[#f5f5f5] px-4 py-3 font-bold text-black transition hover:bg-[#d4d4d4] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSaving ? "Saving..." : editingId ? "Save Player" : "Create Player"}
            </button>

            <button
              type="button"
              onClick={() => resetForm()}
              className="rounded-xl border border-[#242424] px-4 py-3 font-bold text-[#f5f5f5] transition hover:border-[#f5f5f5]"
            >
              Clear
            </button>
          </div>
        </section>

        <section className="space-y-3">
          <div>
            <h2 className="text-xl font-bold">Active Players</h2>

            <p className="mt-1 text-sm text-[#a3a3a3]">
              Sorted by last name.
            </p>
          </div>

          {isLoading && (
            <div className="rounded-2xl border border-[#242424] bg-[#111111] p-5 text-center text-sm text-[#a3a3a3]">
              Loading players…
            </div>
          )}

          {!isLoading && activePlayers.length === 0 && (
            <div className="rounded-2xl border border-[#242424] bg-[#111111] p-5 text-center text-sm text-[#a3a3a3]">
              No active players yet.
            </div>
          )}

          {!isLoading && activePlayers.map(renderPlayerCard)}
        </section>

        <section className="space-y-3">
          <div>
            <h2 className="text-xl font-bold">Inactive Players</h2>

            <p className="mt-1 text-sm text-[#a3a3a3]">
              Hidden from active roster flows.
            </p>
          </div>

          {!isLoading && inactivePlayers.length === 0 && (
            <div className="rounded-2xl border border-[#242424] bg-[#111111] p-5 text-center text-sm text-[#a3a3a3]">
              No inactive players.
            </div>
          )}

          {!isLoading && inactivePlayers.map(renderPlayerCard)}
        </section>

        <Link
          href="/admin"
          className="block text-center text-sm text-[#a3a3a3]"
        >
          ← Back to Admin
        </Link>
      </div>
    </main>
  );
}
