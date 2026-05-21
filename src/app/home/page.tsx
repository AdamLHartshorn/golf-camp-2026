"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { GolfCampIcon, GolfCampIconName } from "@/components/GolfCampIcons";
import {
  clearPlayerSession,
  getPlayerSession,
  PlayerSession,
  subscribeToPlayerSession,
} from "@/lib/playerSession";

const modules = [
  {
    icon: "camp",
    initial: "C",
    name: "Camp Office",
    href: "/camp-office",
    meta: "Roster • Rooms • Info",
    description: "Roster, rooms, arrivals",
    accent: "#f4f1ea",
    tint: "rgba(244,241,234,0.08)",
  },
  {
    icon: "money",
    initial: "M",
    name: "Money Rounds",
    href: "/money-rounds",
    meta: "Scores • Skins • Bank",
    description: "Leaderboards, skins, bank",
    accent: "#315f48",
    tint: "rgba(49,95,72,0.12)",
  },
  {
    icon: "draft",
    initial: "D",
    name: "Live Draft",
    href: "/draft",
    meta: "Teams • Picks • Board",
    description: "Picks, teams, the board",
    accent: "#324d70",
    tint: "rgba(50,77,112,0.13)",
  },
  {
    icon: "shenanigans",
    initial: "S",
    name: "Shenanigans",
    href: "/shenanigans",
    meta: "Points • Games • Events",
    description: "Points, games, chaos",
    accent: "#6a313c",
    tint: "rgba(106,49,60,0.14)",
  },
  {
    icon: "p2p",
    initial: "P",
    name: "P2P Wagers",
    href: "/p2p-wagers",
    meta: "Side Action • Cash Bets",
    description: "Side action, cash bets",
    accent: "#d6a84f",
    tint: "rgba(214,168,79,0.12)",
  },
  {
    icon: "night",
    initial: "N",
    name: "Night Golf",
    href: "/night-golf",
    meta: "Nightly Golf • Scores",
    description: "Nightly golf and scores",
    accent: "#f472b6",
    tint: "rgba(244,114,182,0.12)",
  },
] satisfies {
  icon: GolfCampIconName;
  initial: string;
  name: string;
  href: string;
  meta: string;
  description: string;
  accent: string;
  tint: string;
}[];

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

  const initials =
    session?.display_name
      ?.split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2) || "GC";

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_50%_-8%,rgba(143,166,106,0.18),transparent_34%),radial-gradient(circle_at_95%_12%,rgba(244,241,234,0.08),transparent_26%),#050505] px-4 py-5 text-[#f5f5f5]">
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center gap-4 py-3">
        <div className="flex items-center justify-between gap-4 py-3">
          <div>
            <p className="font-mono text-[30px] font-black uppercase leading-[0.9] tracking-[0.12em] text-[#f4f1ea] drop-shadow-[0_0_26px_rgba(244,241,234,0.18)]">
              GOLF CAMP 2026
            </p>
          </div>

          <div className="flex h-11 w-11 items-center justify-center rounded-full border border-[#3a372f] bg-[#161511] font-mono text-sm font-black text-[#f4f1ea]">
            {initials}
          </div>
        </div>

        <section className="overflow-hidden rounded-2xl border border-[#2f2a22] bg-[#0d0d0b]/95 text-[#f5f5f5] shadow-[0_28px_80px_rgba(0,0,0,0.5),0_0_55px_rgba(143,166,106,0.08)] backdrop-blur">
          {modules.map((module) => (
            <Link
              key={module.href}
              href={module.href}
              className="group grid grid-cols-[3.25rem_1fr_auto] items-center gap-3 border-b border-[#2a2925] px-4 py-3.5 transition duration-200 hover:bg-[#161511] last:border-b-0"
            >
              <div
                className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#34312a] bg-black/40 shadow-[0_0_28px_rgba(244,241,234,0.04)]"
                style={{ color: module.accent }}
              >
                <GolfCampIcon name={module.icon} className="h-6 w-6" />
              </div>

              <div className="min-w-0">
                <h2 className="truncate text-base font-black tracking-tight text-[#f4f1ea]">
                  {module.name}
                </h2>
                <p className="mt-0.5 truncate text-xs font-semibold text-[#b8b0a1]">
                  {module.meta}
                </p>
              </div>

              <span className="font-mono text-xl font-black text-[#82786a] transition group-hover:translate-x-0.5 group-hover:text-[#f4f1ea]">
                →
              </span>
            </Link>
          ))}
        </section>

        <div className="space-y-3">
          {session?.is_admin && (
            <Link
              href="/admin"
              className="group grid grid-cols-[3rem_1fr_auto] items-center gap-3 rounded-2xl border border-[#2f3d2b] bg-[#10140f] px-4 py-4 shadow-[0_16px_40px_rgba(0,0,0,0.3)] transition duration-200 hover:bg-[#151a13]"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#8fa66a]/35 bg-black/35 font-mono text-sm font-black text-[#8fa66a]">
                <GolfCampIcon name="admin" className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <h2 className="text-base font-black tracking-tight text-[#f5f5f5]">
                  Admin
                </h2>
                <p className="mt-1 truncate text-xs font-bold uppercase tracking-[0.12em] text-[#8fa66a]">
                  Tools • Data • System
                </p>
              </div>
              <span className="font-mono text-xl font-black text-[#f5f5f5] transition group-hover:translate-x-0.5">
                →
              </span>
            </Link>
          )}

          <div className="flex items-center justify-between gap-3 rounded-2xl border border-[#34312a] bg-[#11110f] px-4 py-3">
            <div className="min-w-0">
              <p className="mt-1 truncate text-xs font-semibold text-[#c8bfae]">
                {session ? (
                  <>
                    You&apos;re logged in as{" "}
                    <span className="text-[#f4f1ea]">{session.display_name}</span>
                  </>
                ) : (
                  "Fallback access active"
                )}
              </p>
            </div>
            {session ? (
              <button
                type="button"
                onClick={handleLogout}
                className="shrink-0 text-xs font-black text-[#8fa66a]"
              >
                Logout
              </button>
            ) : (
              <Link
                href="/"
                className="shrink-0 text-xs font-black text-[#8fa66a]"
              >
                Login
              </Link>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
