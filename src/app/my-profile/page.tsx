"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  clearPlayerSession,
  getPlayerSession,
  PlayerSession,
} from "@/lib/playerSession";
import { getPublicRankBucket } from "@/lib/playerRanks";

type ProfilePlayer = {
  id: string;
  display_name: string;
  nickname: string | null;
  rank: string | null;
  internal_rank_order: string | null;
  room: string | null;
  arrival: string | null;
  phone: string | null;
  email: string | null;
  pin_code: string | null;
};

export default function MyProfilePage() {
  const [session, setSession] = useState<PlayerSession | null>(null);
  const [player, setPlayer] = useState<ProfilePlayer | null>(null);
  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  useEffect(() => {
    window.setTimeout(async () => {
      const nextSession = getPlayerSession();
      setSession(nextSession);

      if (!nextSession) {
        setIsLoading(false);
        return;
      }

      const { data, error: fetchError } = await supabase
        .from("players")
        .select(
          "id, display_name, nickname, rank, internal_rank_order, room, arrival, phone, email, pin_code",
        )
        .eq("id", nextSession.id)
        .single();

      if (fetchError) {
        setError(fetchError.message || "Could not load profile.");
        setIsLoading(false);
        return;
      }

      setPlayer(data as ProfilePlayer);
      setIsLoading(false);
    }, 0);
  }, []);

  function handleLogout() {
    clearPlayerSession();
    router.push("/");
  }

  async function handleChangePin() {
    setMessage("");
    setError("");

    if (!player) {
      setError("Login required.");
      return;
    }

    if (currentPin.trim() !== (player.pin_code || "")) {
      setError("Current PIN is incorrect.");
      return;
    }

    if (!newPin.trim() || newPin.trim() !== confirmPin.trim()) {
      setError("New PIN and confirmation must match.");
      return;
    }

    setIsSaving(true);

    const { data, error: updateError } = await supabase
      .from("players")
      .update({
        pin_code: newPin.trim(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", player.id)
      .select(
        "id, display_name, nickname, rank, internal_rank_order, room, arrival, phone, email, pin_code",
      )
      .single();

    setIsSaving(false);

    if (updateError) {
      setError(updateError.message || "Could not update PIN.");
      return;
    }

    setPlayer(data as ProfilePlayer);
    setCurrentPin("");
    setNewPin("");
    setConfirmPin("");
    setMessage("PIN updated.");
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(244,241,234,0.08),transparent_34%),#050505] p-5 text-[#f5f5f5]">
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center space-y-5 py-6">
        <div className="flex items-center justify-between gap-4">
          <Link href="/camp-office" className="text-2xl text-[#a3a3a3]">
            ‹
          </Link>
          <p className="font-mono text-sm uppercase tracking-[0.22em] text-[#f5f5f5]">
            My Profile
          </p>
          <span className="flex h-9 w-9 items-center justify-center rounded-full border border-[#34312a] bg-[#151411] font-mono text-xs font-black">
            ID
          </span>
        </div>

        {isLoading && (
          <div className="rounded-[1.45rem] border border-[#d8d1c4]/80 bg-[#efe9dc] p-5 text-sm text-[#7a6f60]">
            Loading profile...
          </div>
        )}

        {!isLoading && !session && (
          <div className="rounded-[1.45rem] border border-[#d8d1c4]/80 bg-[#efe9dc] p-5 text-[#17130e] shadow-[0_18px_45px_rgba(0,0,0,0.3)]">
            <p className="text-sm text-[#7a6f60]">
              Log in with a player PIN to manage your profile.
            </p>
            <Link
              href="/"
              className="mt-4 block rounded-xl bg-[#17130e] px-4 py-3 text-center font-semibold text-[#efe9dc]"
            >
              Go to Login
            </Link>
          </div>
        )}

        {!isLoading && player && (
          <>
            <section className="overflow-hidden rounded-[1.65rem] border border-[#d8d1c4]/80 bg-[#efe9dc] text-[#17130e] shadow-[0_24px_70px_rgba(0,0,0,0.34)]">
              <div className="border-b border-[#d8d1c4] px-5 py-5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#7a6f60]">
                Logged-In Player
              </p>
              <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em]">
                {player.display_name}
              </h1>
              {player.nickname && (
                <p className="mt-1 text-sm text-[#7a6f60]">
                  Nickname: {player.nickname}
                </p>
              )}
              </div>
              <div className="grid grid-cols-2 gap-3 p-5 text-sm">
                {[
                  ["Rank", getPublicRankBucket(player.rank, player.internal_rank_order)],
                  ["Room", player.room || "-"],
                  ["Arrival", player.arrival || "TBD"],
                  ["Phone", player.phone || "-"],
                  ["Email", player.email || "-"],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="rounded-2xl border border-[#d8d1c4] bg-[#f6f0e3] p-3"
                  >
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#7a6f60]">
                      {label}
                    </p>
                    <p className="mt-1 font-semibold">{value}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="space-y-3 rounded-[1.45rem] border border-[#242424] bg-[#101010]/92 p-5 shadow-[0_18px_45px_rgba(0,0,0,0.24)]">
              <h2 className="text-xl font-semibold tracking-[-0.02em]">Change PIN</h2>
              <p className="text-sm text-[#a3a3a3]">
                Enter your current PIN, then choose a new one.
              </p>
              <div>
                <label
                  htmlFor="current-pin"
                  className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-[#a3a3a3]"
                >
                  Current PIN
                </label>
                <input
                  id="current-pin"
                  type="text"
                  inputMode="numeric"
                  value={currentPin}
                  onChange={(event) => {
                    setCurrentPin(event.target.value);
                    setMessage("");
                    setError("");
                  }}
                  placeholder="Current PIN"
                  className="w-full rounded-xl border border-[#242424] bg-black px-4 py-3 outline-none focus:border-[#f5f5f5]"
                />
              </div>
              <div>
                <label
                  htmlFor="new-pin"
                  className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-[#a3a3a3]"
                >
                  New PIN
                </label>
                <input
                  id="new-pin"
                  type="text"
                  inputMode="numeric"
                  value={newPin}
                  onChange={(event) => {
                    setNewPin(event.target.value);
                    setMessage("");
                    setError("");
                  }}
                  placeholder="New PIN"
                  className="w-full rounded-xl border border-[#242424] bg-black px-4 py-3 outline-none focus:border-[#f5f5f5]"
                />
              </div>
              <div>
                <label
                  htmlFor="confirm-new-pin"
                  className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-[#a3a3a3]"
                >
                  Confirm New PIN
                </label>
                <input
                  id="confirm-new-pin"
                  type="text"
                  inputMode="numeric"
                  value={confirmPin}
                  onChange={(event) => {
                    setConfirmPin(event.target.value);
                    setMessage("");
                    setError("");
                  }}
                  placeholder="Confirm New PIN"
                  className="w-full rounded-xl border border-[#242424] bg-black px-4 py-3 outline-none focus:border-[#f5f5f5]"
                />
              </div>
              <button
                type="button"
                onClick={handleChangePin}
                disabled={isSaving}
                className="w-full rounded-xl bg-[#efe9dc] px-4 py-3 font-semibold text-[#17130e] transition hover:bg-[#f6f0e3] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSaving ? "Saving..." : "Update PIN"}
              </button>
            </section>
          </>
        )}

        {message && <p className="text-center text-sm">{message}</p>}
        {error && <p className="text-center text-sm text-[#ff8a8a]">{error}</p>}

        <div className="grid grid-cols-2 gap-3">
          <Link
            href="/home"
            className="rounded-xl border border-[#242424] px-4 py-3 text-center text-sm font-semibold text-[#a3a3a3]"
          >
            Back
          </Link>
          {session && (
            <button
              type="button"
              onClick={handleLogout}
              className="rounded-xl border border-[#242424] px-4 py-3 text-sm font-semibold text-[#a3a3a3]"
            >
              Logout
            </button>
          )}
        </div>
      </div>
    </main>
  );
}
