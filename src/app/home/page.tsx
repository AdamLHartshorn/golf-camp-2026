"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AdminHomeRow,
  BrandSealHeader,
  CinematicHomeShell,
  GroupMeBridge,
  LiveFeedPanel,
  type HomeModule,
  ModuleMenu,
  SessionStrip,
} from "@/components/CinematicHome";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ActivityFeedItem } from "@/lib/activityFeed";
import {
  CampYear,
  currentCampYear,
  getCampYear,
  isCampYearFinalized,
} from "@/lib/campYear";
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
    lightAccent: "#17130e",
    tint: "rgba(244,241,234,0.08)",
  },
  {
    icon: "draft",
    initial: "D",
    name: "Live Draft",
    href: "/draft",
    meta: "Teams • Picks • Board",
    description: "Picks, teams, the board",
    accent: "#7bbcff",
    tint: "rgba(123,188,255,0.18)",
  },
  {
    icon: "calcutta",
    initial: "C",
    name: "Parimutuel Bets",
    href: "/evening-parimutuel",
    meta: "Markets • Ledger • Settlement",
    description: "Nightly pools and settlement",
    accent: "#9c91ba",
    tint: "rgba(156,145,186,0.16)",
  },
  {
    icon: "money",
    initial: "M",
    name: "Money Rounds",
    href: "/money-rounds",
    meta: "Scores • Skins • Bank",
    description: "Leaderboards, skins, bank",
    accent: "#6fa783",
    tint: "rgba(111,167,131,0.18)",
  },
  {
    icon: "p2p",
    initial: "A",
    name: "Afternoon Rounds",
    href: "/afternoon-rounds",
    meta: "Optional Rounds • Teams",
    description: "Player-created rounds",
    accent: "#ffda03",
    tint: "rgba(255,218,3,0.12)",
  },
  {
    icon: "shenanigans",
    initial: "S",
    name: "Shenanigans",
    href: "/shenanigans",
    meta: "Points • Games • Events",
    description: "Points, games, chaos",
    accent: "#EB9C5C",
    tint: "rgba(235,156,92,0.18)",
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
] satisfies (HomeModule & {
  initial: string;
  description: string;
  lightAccent?: string;
})[];

const welcomeSeenKey = "golfCampWelcomeSeen:v1";

export default function HomePage() {
  const [session, setSession] = useState<PlayerSession | null>(null);
  const [feedItems, setFeedItems] = useState<ActivityFeedItem[]>([]);
  const [isLoadingFeed, setIsLoadingFeed] = useState(true);
  const [campYear, setCampYear] = useState<CampYear | null>(null);
  const [showWelcome, setShowWelcome] = useState(
    () =>
      typeof window !== "undefined" &&
      !window.localStorage.getItem(welcomeSeenKey),
  );
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

  function dismissWelcome() {
    window.localStorage.setItem(welcomeSeenKey, "true");
    setShowWelcome(false);
  }

  useEffect(() => {
    let isCurrent = true;

    async function fetchCampYear() {
      const { campYear: nextCampYear } = await getCampYear(currentCampYear);

      if (isCurrent) {
        setCampYear(nextCampYear);
      }
    }

    fetchCampYear();

    return () => {
      isCurrent = false;
    };
  }, []);

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

  const visibleModules = useMemo((): HomeModule[] => {
    const baseModules: HomeModule[] = modules;

    if (!isCampYearFinalized(campYear)) {
      return baseModules;
    }

    return [
      ...baseModules,
      {
        icon: "closing",
        name: "Closing Presentation",
        href: "/closing-presentation",
        meta: "Golf Camp 2026 Year In Review",
        accent: "#d7c8a4",
        tint: "rgba(215,200,164,0.15)",
      },
    ];
  }, [campYear]);

  return (
    <CinematicHomeShell>
      <div className="relative">
        <BrandSealHeader />
        <ThemeToggle className="home-theme-toggle absolute right-0 top-3" />
      </div>

      <LiveFeedPanel
        items={feedItems}
        isLoading={isLoadingFeed}
        getAccent={getFeedAccent}
        formatTime={formatFeedTime}
      />

      <GroupMeBridge />

      <ModuleMenu modules={visibleModules} />

      <div className="space-y-3">
        {session?.is_admin && <AdminHomeRow />}
        <SessionStrip
          displayName={session?.display_name}
          onLogout={handleLogout}
        />
      </div>

      {showWelcome && session && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/72 px-4 py-5 backdrop-blur-sm sm:items-center">
          <section className="welcome-card w-full max-w-md overflow-hidden rounded-[0.75rem] border p-5 shadow-[0_24px_80px_rgba(0,0,0,0.48)]">
            <div className="mb-5">
              <div>
                <p className="font-mono text-[11px] font-black uppercase tracking-[0.22em] text-[#c93a4d]">
                  Golf Camp App 101
                </p>
                <h2 className="mt-2 font-mono text-[1.65rem] font-black uppercase leading-none tracking-[0.08em] text-[#f4f1ea]">
                  Welcome to Golf Camp
                </h2>
              </div>
            </div>

            <div className="space-y-3">
              {[
                {
                  title: "Start with Camp Office",
                  body: "Roster, schedule, rooms, App 101, and feedback live there.",
                },
                {
                  title: "Money stays simple",
                  body: "Money Rounds, Parimutuel Bets, Afternoon Rounds, and Shenanigans all track who paid, who won, who owes, and how to settle.",
                },
                {
                  title: "Watch LIVE CAMP FEED",
                  body: "Important camp updates, results, and app activity roll through Home.",
                },
                {
                  title: "Use the modules as events happen",
                  body: "Draft, Money Rounds, Parimutuel Bets, Shenanigans, Afternoon Rounds, and Night Golf each have their own lane.",
                },
              ].map((item, index) => (
                <div
                  key={item.title}
                  className="welcome-step grid grid-cols-[2.25rem_1fr] gap-3 rounded-[0.55rem] border p-3"
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-[0.45rem] border font-mono text-sm font-black text-[#f4f1ea]">
                    {index + 1}
                  </span>
                  <span>
                    <span className="block font-mono text-[13px] font-black uppercase tracking-[0.12em] text-[#f4f1ea]">
                      {item.title}
                    </span>
                    <span className="mt-1 block text-sm font-semibold leading-5 text-[#c8bfae]">
                      {item.body}
                    </span>
                  </span>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={dismissWelcome}
              className="mt-5 w-full rounded-[0.55rem] border border-[#c93a4d]/65 bg-[#c93a4d]/18 px-4 py-4 font-mono text-sm font-black uppercase tracking-[0.14em] text-[#f4f1ea] shadow-[0_0_34px_rgba(201,58,77,0.2)] transition hover:bg-[#c93a4d]/26"
            >
              Got it
            </button>
          </section>
        </div>
      )}
    </CinematicHomeShell>
  );
}

function getFeedAccent(source: string | null) {
  switch ((source || "").toLowerCase()) {
    case "money rounds":
      return "#315f48";
    case "live draft":
      return "#324d70";
    case "shenanigans":
      return "#EB9C5C";
    case "afternoon rounds":
      return "#ffda03";
    default:
      return "#c93a4d";
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
