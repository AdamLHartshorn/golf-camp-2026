"use client";

import Link from "next/link";
import Image from "next/image";
import type { CSSProperties } from "react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { GolfCampIcon, GolfCampIconName } from "@/components/GolfCampIcons";
import { ActivityFeedItem } from "@/lib/activityFeed";
import {
  clearPlayerSession,
  getPlayerSession,
  PlayerSession,
  subscribeToPlayerSession,
} from "@/lib/playerSession";
import { supabase } from "@/lib/supabase";

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
    initial: "A",
    name: "Afternoon Rounds",
    href: "/afternoon-rounds",
    meta: "Optional Rounds • Teams",
    description: "Player-created rounds",
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
  {
    icon: "calcutta",
    initial: "C",
    name: "Calcutta",
    href: "/home",
    meta: "Auction • Team Ownership",
    description: "Pot tracking, payouts",
    accent: "#746a91",
    tint: "rgba(116,106,145,0.13)",
    comingSoon: true,
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
  comingSoon?: boolean;
}[];

export default function HomePage() {
  const [session, setSession] = useState<PlayerSession | null>(null);
  const [feedItems, setFeedItems] = useState<ActivityFeedItem[]>([]);
  const [isLoadingFeed, setIsLoadingFeed] = useState(true);
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

  useEffect(() => {
    let isCurrent = true;

    async function fetchFeed() {
      const { data, error } = await supabase
        .from("activity_feed")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(7);

      if (!isCurrent) {
        return;
      }

      if (error) {
        setFeedItems([]);
        setIsLoadingFeed(false);
        return;
      }

      setFeedItems((data as ActivityFeedItem[]) || []);
      setIsLoadingFeed(false);
    }

    fetchFeed();
    const intervalId = window.setInterval(fetchFeed, 30000);

    return () => {
      isCurrent = false;
      window.clearInterval(intervalId);
    };
  }, []);

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_50%_-8%,rgba(143,166,106,0.18),transparent_34%),radial-gradient(circle_at_95%_12%,rgba(244,241,234,0.08),transparent_26%),#050505] px-4 py-5 text-[#f5f5f5]">
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center gap-4 py-3">
        <div className="flex justify-center py-2">
          <Image
            src="/longview-invitational-logo.png"
            alt="Golf Camp"
            width={96}
            height={96}
            priority
            className="h-16 w-16 object-contain opacity-95 drop-shadow-[0_16px_34px_rgba(0,0,0,0.42)]"
          />
        </div>

        <CampFeed items={feedItems} isLoading={isLoadingFeed} />

        <CampChatBridge />

        <section className="overflow-hidden rounded-2xl border border-[#2f2a22] bg-[#0d0d0b]/95 text-[#f5f5f5] shadow-[0_28px_80px_rgba(0,0,0,0.5),0_0_55px_rgba(143,166,106,0.08)] backdrop-blur">
          {modules.map((module) => (
            <Link
              key={module.href}
              href={module.href}
              className="group grid grid-cols-[3.25rem_1fr_auto] items-center gap-3 border-b border-[#2a2925] bg-[linear-gradient(90deg,var(--module-tint),rgba(13,13,11,0.96)_34%,rgba(13,13,11,0.9)_100%)] px-4 py-3.5 shadow-[inset_1px_0_0_var(--module-edge),inset_0_1px_0_rgba(244,241,234,0.025)] transition duration-200 hover:bg-[linear-gradient(90deg,var(--module-tint-strong),rgba(22,21,17,0.98)_36%,rgba(22,21,17,0.94)_100%)] hover:shadow-[inset_2px_0_0_var(--module-edge-strong),inset_0_1px_0_rgba(244,241,234,0.04),0_0_28px_var(--module-glow)] last:border-b-0"
              style={
                {
                  "--module-tint": module.tint,
                  "--module-tint-strong": module.tint.replace("0.12", "0.18").replace("0.13", "0.19").replace("0.14", "0.2").replace("0.08", "0.13"),
                  "--module-edge": `${module.accent}30`,
                  "--module-edge-strong": `${module.accent}66`,
                  "--module-glow": module.tint,
                } as CSSProperties
              }
            >
              <div
                className="flex h-11 w-11 items-center justify-center rounded-xl border bg-black/40 shadow-[0_0_28px_var(--module-glow)] transition duration-200 group-hover:border-[var(--module-edge-strong)]"
                style={{
                  color: module.accent,
                  borderColor: `${module.accent}35`,
                }}
              >
                <GolfCampIcon name={module.icon} className="h-6 w-6" />
              </div>

              <div className="min-w-0">
                <h2 className="truncate font-mono text-[15px] font-black uppercase tracking-[0.12em] text-[#f4f1ea]">
                  {module.name.toUpperCase()}
                </h2>
                <p className="mt-0.5 truncate text-xs font-semibold text-[#b8b0a1]">
                  {module.comingSoon ? "Coming Soon • " : ""}
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
              className="group grid grid-cols-[3rem_1fr_auto] items-center gap-3 rounded-2xl border border-[#2f3d2b] bg-[linear-gradient(90deg,rgba(143,166,106,0.12),rgba(16,20,15,0.96)_38%,rgba(16,20,15,0.9))] px-4 py-4 shadow-[0_16px_40px_rgba(0,0,0,0.3),inset_1px_0_0_rgba(143,166,106,0.26)] transition duration-200 hover:bg-[linear-gradient(90deg,rgba(143,166,106,0.18),rgba(21,26,19,0.98)_38%,rgba(21,26,19,0.94))] hover:shadow-[0_18px_46px_rgba(0,0,0,0.34),0_0_28px_rgba(143,166,106,0.08),inset_2px_0_0_rgba(143,166,106,0.42)]"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#8fa66a]/35 bg-black/35 font-mono text-sm font-black text-[#8fa66a]">
                <GolfCampIcon name="admin" className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <h2 className="font-mono text-[15px] font-black uppercase tracking-[0.12em] text-[#f5f5f5]">
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

function CampChatBridge() {
  return (
    <a
      href="https://groupme.com/join_group/42409831/UEGIef"
      target="_blank"
      rel="noreferrer"
      className="group grid grid-cols-[2.35rem_1fr_auto] items-center gap-3 rounded-2xl border border-[#2f4f7a] bg-[radial-gradient(circle_at_10%_-20%,rgba(0,132,255,0.18),transparent_46%),linear-gradient(90deg,rgba(0,132,255,0.12),rgba(13,13,11,0.96)_42%,rgba(13,13,11,0.92))] px-3.5 py-2 shadow-[0_18px_52px_rgba(0,0,0,0.38),0_0_34px_rgba(0,132,255,0.08),inset_1px_0_0_rgba(0,132,255,0.22)] transition duration-200 hover:border-[#4d7fb9] hover:bg-[radial-gradient(circle_at_10%_-20%,rgba(0,132,255,0.22),transparent_46%),linear-gradient(90deg,rgba(0,132,255,0.16),rgba(18,20,23,0.98)_42%,rgba(18,20,23,0.94))] hover:shadow-[0_20px_58px_rgba(0,0,0,0.42),0_0_40px_rgba(0,132,255,0.12),inset_2px_0_0_rgba(0,132,255,0.32)]"
    >
      <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#4d8fd8]/40 bg-black/35 text-[#7bbcff] shadow-[0_0_24px_rgba(0,132,255,0.12)]">
        <svg
          aria-hidden="true"
          className="h-5 w-5"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.9"
          viewBox="0 0 24 24"
        >
          <path d="M6.5 17.5 4 20v-4.5A7.5 7.5 0 0 1 2.5 11C2.5 6.9 6.5 3.5 12 3.5S21.5 6.9 21.5 11 17.5 18.5 12 18.5a12 12 0 0 1-5.5-1Z" />
          <path d="M8 10.25h8" />
          <path d="M8 13.25h5.5" />
        </svg>
      </span>
      <div className="min-w-0">
        <h2 className="truncate font-mono text-[13px] font-black uppercase tracking-[0.12em] text-[#f4f1ea]">
          GroupMe Camp Chat
        </h2>
        <p className="mt-0.5 truncate text-[11px] font-bold uppercase tracking-[0.12em] text-[#7bbcff]">
          Open the golf camp group chat
        </p>
      </div>
      <span className="font-mono text-lg font-black text-[#7bbcff] transition group-hover:translate-x-0.5">
        ↗
      </span>
    </a>
  );
}

function CampFeed({
  items,
  isLoading,
}: {
  items: ActivityFeedItem[];
  isLoading: boolean;
}) {
  return (
    <section className="relative overflow-hidden rounded-2xl border border-[#4d232b] bg-[radial-gradient(circle_at_14%_-18%,rgba(106,49,60,0.22),transparent_42%),linear-gradient(180deg,rgba(106,49,60,0.08),rgba(13,13,11,0)_42%),#0d0d0b] shadow-[0_22px_70px_rgba(0,0,0,0.46),0_0_42px_rgba(106,49,60,0.1),inset_0_1px_0_rgba(244,241,234,0.035)] backdrop-blur">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(106,49,60,0.11),transparent_30%,transparent_72%,rgba(106,49,60,0.05))]" />
      <div className="relative flex items-center justify-between gap-4 border-b border-[#3a2026] bg-[linear-gradient(90deg,rgba(106,49,60,0.14),rgba(20,19,15,0.92)_42%,rgba(20,19,15,0.84))] px-4 py-2.5">
        <div>
          <p className="font-mono text-[15px] font-black uppercase tracking-[0.12em] text-[#f4f1ea]">
            LIVE CAMP FEED
          </p>
        </div>
        <span className="h-2 w-2 animate-[campFeedPulse_3.4s_ease-in-out_infinite] rounded-full bg-[#b98590] shadow-[0_0_18px_rgba(185,133,144,0.42)]" />
      </div>

      <div className="camp-feed-scroll relative max-h-[10.5rem] overflow-y-auto overscroll-contain scroll-smooth">
        {isLoading && (
          <p className="px-4 py-5 text-sm font-semibold text-[#a3a3a3]">
            Loading camp activity...
          </p>
        )}

        {!isLoading && items.length === 0 && (
          <p className="px-4 py-5 text-sm font-semibold text-[#a3a3a3]">
            No camp activity yet.
          </p>
        )}

        {!isLoading &&
          items.map((item) => (
              <div
                key={item.id}
                className="grid grid-cols-[auto_1fr] items-start gap-3 border-b border-[#242420] px-4 py-3 last:border-b-0"
              >
                <span
                  className="mt-1 h-2 w-2 rounded-full shadow-[0_0_14px_currentColor]"
                  style={{ color: getFeedAccent(item.source) }}
                />
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className="rounded-full border px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.16em]"
                      style={{
                        borderColor: `${getFeedAccent(item.source)}66`,
                        color: getFeedAccent(item.source),
                      }}
                    >
                      {item.source || "Camp"}
                    </span>
                    <span className="text-[11px] font-semibold text-[#82786a]">
                      {formatFeedTime(item.created_at)}
                    </span>
                  </div>
                  <p className="mt-1 line-clamp-2 text-sm font-semibold leading-5 text-[#f4f1ea]">
                    {item.message}
                  </p>
                </div>
              </div>
          ))}
      </div>
    </section>
  );
}

function getFeedAccent(source: string | null) {
  switch ((source || "").toLowerCase()) {
    case "money rounds":
      return "#315f48";
    case "live draft":
      return "#324d70";
    case "shenanigans":
      return "#6a313c";
    case "afternoon rounds":
      return "#d6a84f";
    default:
      return "#b98590";
  }
}

function formatFeedTime(value: string | null) {
  if (!value) {
    return "just now";
  }

  const elapsedMs = Date.now() - new Date(value).getTime();
  const elapsedMinutes = Math.max(0, Math.floor(elapsedMs / 60000));

  if (elapsedMinutes < 1) {
    return "just now";
  }

  if (elapsedMinutes < 60) {
    return `${elapsedMinutes}m ago`;
  }

  const elapsedHours = Math.floor(elapsedMinutes / 60);

  if (elapsedHours < 24) {
    return `${elapsedHours}h ago`;
  }

  return new Date(value).toLocaleDateString();
}
