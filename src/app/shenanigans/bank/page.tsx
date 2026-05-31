import Link from "next/link";
import type { CSSProperties } from "react";
import { ShenanigansCurrentGameNotice } from "@/lib/shenanigansGame";

const bankPoints = [
  { label: "Tee Shot", detail: "FIR / GIR", points: "+1" },
  { label: "Tee Shot", detail: "Distance Bonus", points: "+1" },
  { label: "Approach", detail: "GIR / GI2", points: "+1" },
  { label: "Approach", detail: "Closest Bonus", points: "+1" },
  { label: "Hole Out", detail: ">50 yards", points: "+10" },
  { label: "Hole Out", detail: "<50 yards", points: "+5" },
  { label: "Eagle Putt", detail: "Made putt", points: "+3" },
  { label: "Birdie Putt", detail: "Made putt", points: "+2" },
  { label: "Par Putt", detail: "Made putt", points: "+1" },
  { label: "Missed Putt", detail: "closest AND past hole", points: "+1" },
];

const propositionPoints = [
  { label: "Cart Path Bounce", detail: "per bounce, max 10", points: "+2" },
  { label: "Ball within 1 ft of obstacle", detail: "in fairway", points: "+2" },
  { label: "Ball within 1 ft of obstacle", detail: "outside fairway", points: "+1" },
  { label: "Tree square/direct rebound", detail: "clean hit", points: "+5" },
  { label: "Tree ricochet away", detail: "deflection", points: "+3" },
  { label: "Tree/branch/leaf minor contact", detail: "touch only", points: "+1" },
  { label: "Aerial object", detail: "any confirmed strike", points: "+10" },
  { label: "Ball ends up in water", detail: "hazard finish", points: "+1" },
  { label: "Water skip", detail: "confirmed skip", points: "+5" },
  { label: "Water skip and escapes hazard", detail: "dry land finish", points: "+10" },
];

function PointRow({
  label,
  detail,
  points,
}: {
  label: string;
  detail: string;
  points: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-[#242424] py-3 last:border-b-0">
      <div className="min-w-0">
        <h3 className="font-semibold text-[#f5f5f5]">{label}</h3>

        <p className="mt-1 text-sm text-[#a3a3a3]">{detail}</p>
      </div>

      <span className="shrink-0 rounded-full border border-[#b91c1c]/70 px-3 py-1 text-sm font-bold text-[#f5f5f5]">
        {points}
      </span>
    </div>
  );
}

export default function ShenanigansBankPage() {
  return (
    <main
      className="gc-mobile-shell text-[#f5f5f5]"
      style={{ "--page-accent": "#EB9C5C" } as CSSProperties}
    >
      <div className="gc-mobile-stage w-full max-w-md justify-center space-y-8">
        <div className="gc-section-head">
          <p className="gc-card-kicker text-[#EB9C5C]">
            Shenanigans
          </p>

          <h1 className="gc-card-title">
            The Bank
          </h1>

          <p className="gc-card-copy">
            Structured points and standard prop values.
          </p>
        </div>

        <ShenanigansCurrentGameNotice />

        <section className="gc-edge-card p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#b91c1c]">
                Starting Points
              </p>

              <h2 className="mt-2 text-xl font-bold">Opening Credit</h2>
            </div>

            <span className="rounded-full bg-[#b91c1c] px-3 py-1 text-sm font-bold">
              10 total
            </span>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <div className="rounded-lg border border-[#3a2b2e] bg-black/30 p-4">
              <p className="text-3xl font-bold">5</p>

              <p className="mt-1 text-sm text-[#a3a3a3]">
                points to start
              </p>
            </div>

            <div className="rounded-lg border border-[#3a2b2e] bg-black/30 p-4">
              <p className="text-3xl font-bold">5</p>

              <p className="mt-1 text-sm text-[#a3a3a3]">
                more at the turn
              </p>
            </div>
          </div>
        </section>

        <section className="space-y-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#b91c1c]">
              Bank Points
            </p>

            <h2 className="mt-2 text-xl font-bold">Standard Scoring</h2>
          </div>

          <div className="gc-edge-card px-5">
            {bankPoints.map((item) => (
              <PointRow
                key={`${item.label}-${item.detail}`}
                label={item.label}
                detail={item.detail}
                points={item.points}
              />
            ))}
          </div>
        </section>

        <section className="space-y-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#b91c1c]">
              Proposition Points
            </p>

            <h2 className="mt-2 text-xl font-bold">Approved Chaos</h2>
          </div>

          <div className="gc-edge-card px-5">
            {propositionPoints.map((item) => (
              <PointRow
                key={`${item.label}-${item.detail}`}
                label={item.label}
                detail={item.detail}
                points={item.points}
              />
            ))}
          </div>
        </section>

        <section className="gc-edge-card p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#b91c1c]">
            Optional Rule
          </p>

          <h2 className="mt-2 text-xl font-bold">Closing Stretch</h2>

          <p className="mt-2 text-sm leading-6 text-[#a3a3a3]">
            Last 3 holes may use double Bank points.
          </p>
        </section>

        <Link
          href="/shenanigans"
          className="text-center text-sm text-[#a3a3a3]"
        >
          ← Back to Shenanigans
        </Link>
      </div>
    </main>
  );
}
