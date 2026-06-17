"use client";

import Link from "next/link";
import { ReactNode, useEffect, useState } from "react";
import { getPlayerSession, PlayerSession } from "@/lib/playerSession";

export default function AdminLayout({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<PlayerSession | null>(null);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setSession(getPlayerSession());
      setIsChecking(false);
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

  if (isChecking) {
    return (
      <main className="min-h-screen bg-black p-6 text-[#f5f5f5]">
        <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center">
          <section className="rounded-2xl border border-[#242424] bg-[#111111] p-5 text-center text-sm text-[#a3a3a3]">
            Checking admin access...
          </section>
        </div>
      </main>
    );
  }

  if (!session?.is_admin) {
    return (
      <main className="min-h-screen bg-black p-6 text-[#f5f5f5]">
        <Link href="/home" className="gc-back-link gc-floating-back gc-back-admin">
          ← BACK
        </Link>
        <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center space-y-5">
          <section className="rounded-2xl border border-[#242424] bg-[#111111] p-6 text-center">
            <p className="text-sm uppercase tracking-[0.28em] text-[#a3a3a3]">
              Admin
            </p>
            <h1 className="mt-3 text-3xl font-bold tracking-tight">
              Admin access required
            </h1>
            <p className="mt-3 text-sm leading-6 text-[#a3a3a3]">
              Log in with an admin player account to use commissioner tools.
            </p>
          </section>

        </div>
      </main>
    );
  }

  return children;
}
