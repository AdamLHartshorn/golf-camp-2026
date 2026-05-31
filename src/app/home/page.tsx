"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { GolfCampIconName } from "@/components/GolfCampIcons";
import {
  AdminHomeRow,
  BrandSealHeader,
  CinematicHomeShell,
  GroupMeBridge,
  LiveFeedPanel,
  ModuleMenu,
  SessionStrip,
} from "@/components/CinematicHome";
import { ThemeToggle } from "@/components/ThemeToggle";
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
] satisfies {
  icon: GolfCampIconName;
  initial: string;
  name: string;
  href: string;
  meta: string;
  description: string;
  accent: string;
  lightAccent?: string;
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

      <ModuleMenu modules={modules} />

      <div className="space-y-3">
        {session?.is_admin && <AdminHomeRow />}
        <SessionStrip
          displayName={session?.display_name}
          onLogout={handleLogout}
        />
      </div>
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
