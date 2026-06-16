import Link from "next/link";
import type { CSSProperties } from "react";
import { GolfCampIcon } from "@/components/GolfCampIcons";
import { appGuides } from "./guides";

export default function GolfCampApp101Page() {
  return (
    <main className="gc-mobile-shell" style={{ "--page-accent": "#f4f1ea" } as CSSProperties}>
      <div className="gc-mobile-stage">
        <div className="gc-topbar">
          <Link href="/camp-office" className="gc-back-link">
            ← BACK
          </Link>
          <p className="gc-topbar-title">App 101</p>
          <span className="gc-top-icon">
            <GolfCampIcon name="rules" className="h-4 w-4" />
          </span>
        </div>

        <section className="gc-edge-card overflow-hidden">
          <div className="gc-section-head">
            <p className="gc-card-kicker">Camp Office</p>
            <h1 className="gc-card-title">Golf Camp App 101</h1>
            <p className="gc-card-copy">
              Pick the part of the app you want to understand. Each guide is
              short enough to read on your phone, but detailed enough to answer
              the stuff people will actually ask during camp.
            </p>
          </div>

          <div className="grid grid-cols-3 divide-x divide-[#2a2925] border-t border-[#2a2925] text-center">
            {["Follow", "Submit", "Settle"].map((label) => (
              <div key={label} className="px-3 py-4">
                <p className="font-mono text-[10px] font-black uppercase tracking-[0.18em] text-[#a8a29a]">
                  {label}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-3">
          {appGuides.map((guide, index) => (
            <Link
              key={guide.slug}
              href={`/camp-office/app-101/${guide.slug}`}
              className="group block overflow-hidden rounded-xl border bg-[#0d0d0b] shadow-[0_18px_55px_rgba(0,0,0,0.32)]"
              style={
                {
                  borderColor: `${guide.accent}42`,
                  boxShadow: `0 18px 55px rgba(0,0,0,0.32), 0 0 28px ${guide.accent}14`,
                } as CSSProperties
              }
            >
              <div
                className="grid grid-cols-[3.25rem_1fr_2.5rem] border-b"
                style={{ borderColor: `${guide.accent}26` }}
              >
                <div
                  className="flex items-center justify-center border-r bg-[#151411] font-mono text-sm font-black"
                  style={{
                    borderColor: `${guide.accent}24`,
                    color: guide.accent,
                    background: `linear-gradient(180deg, ${guide.accent}1f, #151411 74%)`,
                  }}
                >
                  {String(index + 1).padStart(2, "0")}
                </div>

                <div className="min-w-0 px-4 py-4">
                  <p
                    className="font-mono text-[9px] font-black uppercase tracking-[0.2em]"
                    style={{ color: guide.accent }}
                  >
                    {guide.kicker}
                  </p>
                  <h2 className="mt-1 text-2xl font-black tracking-tight text-[#f4f1ea]">
                    {guide.title}
                  </h2>
                </div>

                <div
                  className="flex items-center justify-center border-l text-xl font-black transition group-hover:translate-x-0.5"
                  style={{ borderColor: `${guide.accent}24`, color: guide.accent }}
                >
                  →
                </div>
              </div>

              <div className="grid grid-cols-[2.75rem_1fr] gap-4 p-5">
                <span
                  className="flex h-11 w-11 items-center justify-center rounded-xl border"
                  style={{
                    borderColor: `${guide.accent}55`,
                    color: guide.accent,
                    backgroundColor: `${guide.accent}12`,
                  }}
                >
                  <GolfCampIcon name={guide.icon} className="h-6 w-6" />
                </span>

                <div className="min-w-0">
                  <p className="text-sm font-semibold leading-6 text-[#d6d0c4]">
                    {guide.summary}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {guide.highlights.slice(0, 2).map((highlight) => (
                      <span
                        key={highlight}
                        className="rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-[#a8a29a]"
                        style={{ borderColor: `${guide.accent}30` }}
                      >
                        {highlight}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </section>
      </div>
    </main>
  );
}
