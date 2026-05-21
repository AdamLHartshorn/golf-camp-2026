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

type ProfilePlayer = {
  id: string;
  display_name: string;
  nickname: string | null;
  rank: string | null;
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
          "id, display_name, nickname, rank, room, arrival, phone, email, pin_code",
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
        "id, display_name, nickname, rank, room, arrival, phone, email, pin_code",
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
    <main className="min-h-screen bg-black p-6 text-[#f5f5f5]">
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center space-y-6 py-8">
        <div className="space-y-2">
          <p className="text-sm uppercase tracking-[0.35em] text-[#a3a3a3]">
            Golf Camp 2026
          </p>
          <h1 className="text-4xl font-bold tracking-tight">My Profile</h1>
        </div>

        {isLoading && (
          <div className="rounded-2xl border border-[#242424] bg-[#111111] p-5 text-sm text-[#a3a3a3]">
            Loading profile...
          </div>
        )}

        {!isLoading && !session && (
          <div className="rounded-2xl border border-[#242424] bg-[#111111] p-5">
            <p className="text-sm text-[#a3a3a3]">
              Log in with a player PIN to manage your profile.
            </p>
            <Link
              href="/"
              className="mt-4 block rounded-xl bg-[#f5f5f5] px-4 py-3 text-center font-bold text-black"
            >
              Go to Login
            </Link>
          </div>
        )}

        {!isLoading && player && (
          <>
            <section className="rounded-2xl border border-[#242424] bg-[#111111] p-5">
              <h2 className="text-2xl font-bold">{player.display_name}</h2>
              {player.nickname && (
                <p className="mt-1 text-sm text-[#a3a3a3]">
                  Nickname: {player.nickname}
                </p>
              )}
              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                {[
                  ["Rank", player.rank || "-"],
                  ["Room", player.room || "-"],
                  ["Arrival", player.arrival || "TBD"],
                  ["Phone", player.phone || "-"],
                  ["Email", player.email || "-"],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="rounded-xl border border-[#242424] bg-black p-3"
                  >
                    <p className="text-xs uppercase tracking-[0.2em] text-[#737373]">
                      {label}
                    </p>
                    <p className="mt-1 font-semibold">{value}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="space-y-3 rounded-2xl border border-[#242424] bg-[#111111] p-5">
              <h2 className="text-xl font-bold">Change PIN</h2>
              <input
                type="text"
                inputMode="numeric"
                value={currentPin}
                onChange={(event) => setCurrentPin(event.target.value)}
                placeholder="Current PIN"
                className="w-full rounded-xl border border-[#242424] bg-black px-4 py-3 outline-none focus:border-[#f5f5f5]"
              />
              <input
                type="text"
                inputMode="numeric"
                value={newPin}
                onChange={(event) => setNewPin(event.target.value)}
                placeholder="New PIN"
                className="w-full rounded-xl border border-[#242424] bg-black px-4 py-3 outline-none focus:border-[#f5f5f5]"
              />
              <input
                type="text"
                inputMode="numeric"
                value={confirmPin}
                onChange={(event) => setConfirmPin(event.target.value)}
                placeholder="Confirm New PIN"
                className="w-full rounded-xl border border-[#242424] bg-black px-4 py-3 outline-none focus:border-[#f5f5f5]"
              />
              <button
                type="button"
                onClick={handleChangePin}
                disabled={isSaving}
                className="w-full rounded-xl bg-[#f5f5f5] px-4 py-3 font-bold text-black transition hover:bg-[#d4d4d4] disabled:cursor-not-allowed disabled:opacity-50"
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
            className="rounded-xl border border-[#242424] px-4 py-3 text-center text-sm font-bold text-[#a3a3a3]"
          >
            Back
          </Link>
          {session && (
            <button
              type="button"
              onClick={handleLogout}
              className="rounded-xl border border-[#242424] px-4 py-3 text-sm font-bold text-[#a3a3a3]"
            >
              Logout
            </button>
          )}
        </div>
      </div>
    </main>
  );
}
