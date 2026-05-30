import Link from "next/link";
import type { CSSProperties } from "react";
import { GolfCampIcon } from "@/components/GolfCampIcons";

const nights = [
  {
    initial: "T",
    name: "Tuesday",
    href: "/night-golf/tuesday",
    description: "June 23",
  },
  {
    initial: "W",
    name: "Wednesday",
    href: "/night-golf/wednesday",
    description: "June 24",
  },
  {
    initial: "T",
    name: "Thursday",
    href: "/night-golf/thursday",
    description: "June 25",
  },
  {
    initial: "F",
    name: "Friday",
    href: "/night-golf/friday",
    description: "June 26",
  },
  {
    initial: "S",
    name: "Saturday",
    href: "/night-golf/saturday",
    description: "June 27",
  },
];

export default function NightGolfPage() {
  return (
    <main className="gc-mobile-shell" style={{ "--page-accent": "#f472b6" } as CSSProperties}>
      <div className="gc-mobile-stage">
        <div className="gc-topbar">
          <Link href="/home" className="gc-back-link">
            ‹
          </Link>
          <p className="gc-topbar-title">
            Night Golf
          </p>
          <span className="gc-top-icon">
            <GolfCampIcon name="night" className="h-4 w-4" />
          </span>
        </div>

        <section className="space-y-3">
          <Link
            href="/night-golf/rules"
            className="gc-edge-card gc-edge-row border-b-0"
          >
            <span className="gc-edge-mark">
              <GolfCampIcon name="rules" className="h-6 w-6" />
            </span>
            <div className="min-w-0">
              <h2 className="gc-edge-title">Rules</h2>
              <p className="gc-edge-meta">
                Format, scoring, target rules, and tiebreakers.
              </p>
            </div>
            <span className="gc-edge-arrow">→</span>
          </Link>

          {nights.map((night) => (
            <Link
              key={night.name}
              href={night.href}
              className="gc-edge-card gc-edge-row border-b-0"
            >
              <span className="gc-edge-mark">
                <GolfCampIcon name="night" className="h-6 w-6" />
              </span>
              <div>
                <h2 className="gc-edge-title">{night.name}</h2>
                <p className="gc-edge-meta">
                  {night.description}
                </p>
              </div>
              <span className="gc-edge-arrow">→</span>
            </Link>
          ))}
        </section>

        <Link
          href="/home"
          className="text-center text-sm text-[#a3a3a3]"
        >
          ← Back to Camp Dashboard
        </Link>
      </div>
    </main>
  );
}
