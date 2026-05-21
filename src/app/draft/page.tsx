"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { DraftSession } from "@/app/draft/_lib/draftUtils";

export default function DraftPage() {
  const [session, setSession] = useState<DraftSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isCurrent = true;

    async function fetchActiveDraft() {
      const { data, error: fetchError } = await supabase
        .from("draft_sessions")
        .select("*")
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      console.log("public active draft:", { data, error: fetchError });

      if (!isCurrent) {
        return;
      }

      if (fetchError) {
        setSession(null);
        setError(fetchError.message || "Could not load active draft.");
        setIsLoading(false);
        return;
      }

      setSession((data as DraftSession) || null);
      setIsLoading(false);
    }

    fetchActiveDraft();

    return () => {
      isCurrent = false;
    };
  }, []);

  return (
    <main className="min-h-screen bg-black p-6 text-[#f5f5f5]">
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center space-y-8 py-8">
        <div className="space-y-2">
          <p className="text-sm uppercase tracking-[0.35em] text-[#a3a3a3]">
            Golf Camp 2026
          </p>

          <h1 className="text-4xl font-bold tracking-tight">Live Draft</h1>

          <p className="text-[#a3a3a3]">
            Draft sessions, team boards, and pick tracking.
          </p>
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
          <Link
            href="/draft/live"
            className="block rounded-2xl border border-[#f5f5f5] bg-[#111111] p-5 transition hover:bg-[#171717]"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#d4d4d4]">
              Active Draft
            </p>

            <h2 className="mt-2 text-2xl font-bold">{session.name}</h2>

            <p className="mt-3 text-sm leading-6 text-[#a3a3a3]">
              Open the live board for the TV/projector view.
            </p>

            <p className="mt-4 text-sm font-bold text-[#f5f5f5]">
              View Live Board →
            </p>
          </Link>
        )}

        {!isLoading && !error && !session && (
          <section className="rounded-2xl border border-[#242424] bg-[#111111] p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#d4d4d4]">
              No Active Draft
            </p>

            <h2 className="mt-2 text-2xl font-bold">Coming Soon</h2>

            <p className="mt-3 text-sm leading-6 text-[#a3a3a3]">
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
