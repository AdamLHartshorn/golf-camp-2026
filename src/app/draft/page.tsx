"use client";

import Link from "next/link";
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
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(37,99,235,0.14),transparent_34%),#050505] p-5 text-[#f5f5f5]">
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center space-y-5 py-6">
        <div className="flex items-center justify-between gap-4">
          <Link href="/home" className="text-2xl text-[#a3a3a3]">
            ‹
          </Link>
          <p className="font-mono text-sm uppercase tracking-[0.22em] text-[#f5f5f5]">
            Live Draft
          </p>
          <span className="flex h-9 w-9 items-center justify-center rounded-full border border-[#1e40af] bg-[#071123] text-[#60a5fa]">
            <GolfCampIcon name="draft" className="h-4 w-4" />
          </span>
        </div>

        {isLoading && (
          <section className="rounded-2xl border border-[#242424] bg-[#111111] p-5 text-sm text-[#a3a3a3]">
            Loading draft...
          </section>
        )}

        {!isLoading && error && (
          <section className="rounded-2xl border border-[#242424] bg-[#111111] p-5 text-sm text-[#ff8a8a]">
            {error}
          </section>
        )}

        {!isLoading && !error && session && (
          <section className="overflow-hidden rounded-2xl border border-[#d8d1c4]/80 bg-[#efe9dc] text-[#17130e] shadow-[0_18px_55px_rgba(0,0,0,0.38)]">
            <Link
              href="/draft/live"
              className="block transition hover:bg-[#f6f0e3]"
            >
              <div className="border-b border-[#c6d3e8] bg-[#dbe7fb] px-5 py-5">
                <p className="font-mono text-[10px] font-black uppercase tracking-[0.2em] text-[#1d4ed8]">
                  {isCompleteDraft ? "Complete Draft Board" : "On The Clock Board"}
                </p>
                <h1 className="mt-4 text-4xl font-black tracking-tight">
                  {session.name}
                </h1>
              </div>

              <div className="grid grid-cols-2 divide-x divide-[#d2c8b8]">
                <div className="px-5 py-4">
                  <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#5f574b]">
                    Status
                  </p>
                  <p className="mt-1 font-black text-[#1d4ed8]">
                    {isCompleteDraft ? "Complete" : "Active"}
                  </p>
                </div>
                <div className="px-5 py-4">
                  <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#5f574b]">
                    View
                  </p>
                  <p className="mt-1 font-black">TV Board →</p>
                </div>
              </div>
            </Link>

            <Link
              href="/draft/mobile"
              className="block border-t border-[#d2c8b8] px-5 py-4 text-center text-sm font-black text-[#1d4ed8] transition hover:bg-[#f6f0e3]"
            >
              Open Mobile Draft View
            </Link>
          </section>
        )}

        {!isLoading && !error && !session && (
          <section className="overflow-hidden rounded-2xl border border-[#d8d1c4]/80 bg-[#efe9dc] text-[#17130e] shadow-[0_18px_55px_rgba(0,0,0,0.38)]">
            <div className="border-b border-[#c6d3e8] bg-[#dbe7fb] px-5 py-5">
              <p className="font-mono text-[10px] font-black uppercase tracking-[0.2em] text-[#1d4ed8]">
                No Active Draft
              </p>

              <h1 className="mt-4 text-4xl font-black tracking-tight">
                Board Empty
              </h1>
            </div>

            <p className="px-5 py-4 text-sm leading-6 text-[#4f483f]">
              When Nick starts a draft from Admin, the live board will appear
              here.
            </p>
          </section>
        )}

        <Link href="/home" className="text-center text-sm text-[#a3a3a3]">
          ← Back to Dashboard
        </Link>
      </div>
    </main>
  );
}
