"use client";

import Link from "next/link";
import type { CSSProperties } from "react";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { DraftSession } from "@/app/draft/_lib/draftUtils";
import { GolfCampIcon } from "@/components/GolfCampIcons";

const completedDraftStatuses = ["complete", "completed", "final", "finalized"];

export default function DraftPage() {
  const [session, setSession] = useState<DraftSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isCurrent = true;

    async function fetchDraft() {
      const { data: activeData, error: activeError } = await supabase
        .from("draft_sessions")
        .select("*")
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!isCurrent) {
        return;
      }

      if (activeError) {
        setSession(null);
        setError(activeError.message || "Could not load active draft.");
        setIsLoading(false);
        return;
      }

      if (activeData) {
        setSession(activeData as DraftSession);
        setIsLoading(false);
        return;
      }

      const { data: completedData, error: completedError } = await supabase
        .from("draft_sessions")
        .select("*")
        .in("status", completedDraftStatuses)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!isCurrent) {
        return;
      }

      if (completedError) {
        setSession(null);
        setError(completedError.message || "Could not load completed draft.");
        setIsLoading(false);
        return;
      }

      setSession((completedData as DraftSession) || null);
      setIsLoading(false);
    }

    fetchDraft();

    return () => {
      isCurrent = false;
    };
  }, []);

  const isCompleteDraft =
    session && completedDraftStatuses.includes(String(session.status));

  return (
    <main className="gc-mobile-shell" style={{ "--page-accent": "#7bbcff" } as CSSProperties}>
      <div className="gc-mobile-stage">
        <div className="gc-topbar">
          <Link href="/home" className="gc-back-link">
            ‹
          </Link>
          <p className="gc-topbar-title">
            Live Draft
          </p>
          <span className="gc-top-icon">
            <GolfCampIcon name="draft" className="h-4 w-4" />
          </span>
        </div>

        {isLoading && (
          <section className="gc-edge-card p-5 text-sm text-[#a3a3a3]">
            Loading draft...
          </section>
        )}

        {!isLoading && error && (
          <section className="gc-edge-card p-5 text-sm text-[#ff8a8a]">
            {error}
          </section>
        )}

        {!isLoading && !error && session && (
          <section className="draft-public-board-card gc-edge-card">
            <Link
              href="/draft/live"
              className="block transition hover:bg-[#0b1730]"
            >
              <div className="draft-public-board-header gc-section-head">
                <p className="gc-card-kicker">
                  {isCompleteDraft ? "Complete Draft Board" : "On The Clock Board"}
                </p>
                <h1 className="mt-4 text-4xl font-black tracking-tight">
                  {session.name}
                </h1>
              </div>

              <div className="grid grid-cols-2 divide-x divide-[#1e40af]/35">
                <div className="px-5 py-4">
                  <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#93c5fd]">
                    Status
                  </p>
                  <p className="mt-1 font-black text-[#1d4ed8]">
                    {isCompleteDraft ? "Complete" : "Active"}
                  </p>
                </div>
                <div className="px-5 py-4">
                  <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#93c5fd]">
                    View
                  </p>
                  <p className="mt-1 font-black">TV Board →</p>
                </div>
              </div>
            </Link>

            <Link
              href="/draft/mobile"
              className="block border-t border-[#1e40af]/35 px-5 py-4 text-center text-sm font-black text-[#7bbcff] transition hover:bg-[#0b1730]"
            >
              Open Mobile Draft View
            </Link>
          </section>
        )}

        {!isLoading && !error && !session && (
          <section className="draft-public-board-card gc-edge-card">
            <div className="draft-public-board-header gc-section-head">
              <p className="gc-card-kicker">
                No Active Draft
              </p>

              <h1 className="mt-4 text-4xl font-black tracking-tight">
                Board Empty
              </h1>
            </div>

            <p className="px-5 py-4 text-sm leading-6 text-[#b8b0a1]">
              When Nick starts a draft from Admin, the live board will appear
              here.
            </p>
          </section>
        )}

        <Link
          href="/draft/prep"
          className="draft-prep-link-card gc-edge-card block transition hover:border-[#8fb0d8]/60 hover:bg-[#0b1730]"
        >
          <div className="gc-section-head flex items-start justify-between gap-4">
            <div>
              <p className="gc-card-kicker">
                Scouting Cards
              </p>
              <h2 className="gc-card-title">
                Draft Prep
              </h2>
              <p className="mt-2 text-sm leading-6 text-[#b8c3d4]">
                Scouting Reports · Rankings · Camp Lore · Sleeper Picks ·
                Chemistry Notes
              </p>
            </div>

            <span className="draft-prep-icon flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#324d70]/70 bg-black/35 text-[#8fb0d8] shadow-[0_0_24px_rgba(50,77,112,0.16)]">
              <GolfCampIcon name="draft" className="h-5 w-5" />
            </span>
          </div>

          <p className="px-5 py-4 text-sm leading-6 text-[#93a3bb]">
            Browse the player pool before the board goes live. Open Prep →
          </p>
        </Link>

        <Link href="/home" className="text-center text-sm text-[#a3a3a3]">
          ← Back to Dashboard
        </Link>
      </div>
    </main>
  );
}
