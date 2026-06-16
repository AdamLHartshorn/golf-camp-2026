import Link from "next/link";
import type { CSSProperties } from "react";
import { GolfCampIcon, GolfCampIconName } from "@/components/GolfCampIcons";

const cards = [
  {
    icon: "roster",
    initial: "R",
    name: "Camp Roster",
    href: "/camp-office/roster",
    label: "Players • Ranks • Arrivals",
  },
  {
    icon: "rooms",
    initial: "M",
    name: "Room Assignments",
    href: "/camp-office/rooms",
    label: "Rooms • Groups • Timing",
  },
  {
    icon: "ledger",
    initial: "S",
    name: "Daily Schedule",
    href: "/camp-office/schedule",
    label: "Itinerary • Meals • Events",
  },
  {
    icon: "log",
    initial: "F",
    name: "App Feedback",
    href: "/camp-office/feedback",
    label: "Ideas • Bugs • Notes",
    accent: "#b98590",
  },
  {
    icon: "roster",
    initial: "P",
    name: "My Profile",
    href: "/my-profile",
    label: "Photo • PIN • Contact Info",
    accent: "#8fa66a",
  },
] satisfies {
  icon: GolfCampIconName;
  initial: string;
  name: string;
  href: string;
  label: string;
  accent?: string;
}[];

export default function CampOfficePage() {
  return (
    <main className="gc-mobile-shell" style={{ "--page-accent": "#f4f1ea" } as CSSProperties}>
      <div className="gc-mobile-stage">
        <div className="gc-topbar">
          <Link href="/home" className="gc-back-link">
            ← BACK
          </Link>
          <p className="gc-topbar-title">
            Camp Office
          </p>
          <span className="gc-top-icon">
            <GolfCampIcon name="camp" className="h-4 w-4" />
          </span>
        </div>

        <section className="space-y-3">
          {cards.map((card) => (
            <Link
              key={card.name}
              href={card.href}
              className="gc-edge-card gc-edge-row border-b-0"
              style={
                card.accent
                  ? ({ "--page-accent": card.accent } as CSSProperties)
                  : undefined
              }
            >
              <span className="gc-edge-mark">
                <GolfCampIcon name={card.icon} className="h-6 w-6" />
              </span>

              <div className="min-w-0">
                <h2 className="gc-edge-title">{card.name}</h2>
                <p className="gc-edge-meta">
                  {card.label}
                </p>
              </div>

              <span className="gc-edge-arrow">
                →
              </span>
            </Link>
          ))}
        </section>
      </div>
    </main>
  );
}
