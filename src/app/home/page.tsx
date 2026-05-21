"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  clearPlayerSession,
  getPlayerSession,
  PlayerSession,
  subscribeToPlayerSession,
} from "@/lib/playerSession";

export default function HomePage() {
  const [session, setSession] = useState<PlayerSession | null>(null);
  const router = useRouter();

  useEffect(() => {
    function syncSession() {
      setSession(getPlayerSession());
    }

    syncSession();

    return subscribeToPlayerSession(syncSession);
  }, []);

  function handleLogout() {
    clearPlayerSession();
    router.push("/");
  }

  return (
    <main className="min-h-screen bg-black text-[#f5f5f5] p-6">
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center space-y-8">
        <div className="space-y-2">
          <p className="text-sm uppercase tracking-[0.35em] text-[#a3a3a3]">
            Golf Camp 2026
          </p>

          <h1 className="text-4xl font-bold tracking-tight">
            Camp Dashboard
          </h1>

          <p className="text-[#a3a3a3]">
            {session
              ? `Welcome, ${session.display_name}.`
              : "Select an event or camp utility."}
          </p>
        </div>

        <div className="space-y-4">
          <Link
            href="/camp-office"
            className="block rounded-2xl border border-[#d4d4d4] bg-[#111111] p-5 transition hover:bg-[#171717]"
          >
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-[#f5f5f5]">
                  Camp Office
                </h2>

                <p className="mt-1 text-sm text-[#a3a3a3]">
                  Contacts, room assignments, and camp info.
                </p>
              </div>

              <span className="text-2xl text-[#f5f5f5]">→</span>
            </div>
          </Link>

          <Link
            href="/money-rounds"
            className="block rounded-2xl border border-[#15803d] bg-[#111111] p-5 transition hover:bg-[#0f1f16]"
          >
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-[#16a34a]">
                  Money Rounds
                </h2>

                <p className="mt-1 text-sm text-[#a3a3a3]">
                  Team formats, round scores, payouts, and settlement prep.
                </p>
              </div>

              <span className="text-2xl text-[#16a34a]">→</span>
            </div>
          </Link>

          <Link
            href="/draft"
            className="block rounded-2xl border border-[#1d4ed8] bg-[#111111] p-5 transition hover:bg-[#0f172a]"
          >
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-[#2563eb]">
                  Live Draft
                </h2>

                <p className="mt-1 text-sm text-[#a3a3a3]">
                  Draft sessions, team boards, and pick tracking.
                </p>
              </div>

              <span className="text-2xl text-[#2563eb]">→</span>
            </div>
          </Link>

          <Link
            href="/shenanigans"
            className="block rounded-2xl border border-[#b91c1c] bg-[#111111] p-5 transition hover:bg-[#171717]"
          >
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-[#b91c1c]">
                  Shenanigans
                </h2>

                <p className="mt-1 text-sm text-[#a3a3a3]">
                  The official point bank, wagers, props, and chaos ledger.
                </p>
              </div>

              <span className="text-2xl text-[#b91c1c]">→</span>
            </div>
          </Link>

          <Link
            href="/p2p-wagers"
            className="block rounded-2xl border border-[#a16207] bg-[#111111] p-5 transition hover:bg-[#17130c]"
          >
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-[#d6a84f]">
                  P2P Wagers
                </h2>

                <p className="mt-1 text-sm text-[#a3a3a3]">
                  Freeform side bets, props, and cash settlements.
                </p>
              </div>

              <span className="text-2xl text-[#d6a84f]">→</span>
            </div>
          </Link>

          <Link
            href="/night-golf"
            className="block rounded-2xl border border-[#ec4899] bg-[#111111] p-5 transition hover:bg-[#1f0b18]"
          >
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-[#f472b6]">
                  Night Golf
                </h2>

                <p className="mt-1 text-sm text-[#a3a3a3]">
                  Scorecards, leaderboard, rules, and target games.
                </p>
              </div>

              <span className="text-2xl text-[#f472b6]">→</span>
            </div>
          </Link>
        </div>

        <div className="space-y-3 border-t border-[#242424] pt-4">
          {session?.is_admin && (
            <Link
              href="/admin"
              className="block rounded-2xl border border-[#d4d4d4] bg-[#111111] p-4 transition hover:bg-[#171717]"
            >
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-bold text-[#f5f5f5]">Admin</h2>
                  <p className="mt-1 text-sm text-[#a3a3a3]">
                    Mission control, players, rounds, and tools.
                  </p>
                </div>

                <span className="text-xl text-[#f5f5f5]">→</span>
              </div>
            </Link>
          )}

          {session && (
            <button
              type="button"
              onClick={handleLogout}
              className="w-full rounded-xl border border-[#242424] px-4 py-3 text-sm font-bold text-[#a3a3a3] transition hover:border-[#f5f5f5]"
            >
              Logout
            </button>
          )}
        </div>
      </div>
    </main>
  );
}
