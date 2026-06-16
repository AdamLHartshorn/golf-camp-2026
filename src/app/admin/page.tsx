import Link from "next/link";
import type { CSSProperties } from "react";
import { CampFeedAdminForm } from "@/app/admin/CampFeedAdminForm";

const sections = [
  {
    number: "01",
    label: "Players",
    title: "Player Database",
    href: "/admin/players",
    description: "Maintain roster records, photos, ranks, payments, and player lore.",
    accent: "#f4f1ea",
    tint: "rgba(244,241,234,0.06)",
  },
  {
    number: "02",
    label: "Draft",
    title: "Draft Control",
    href: "/admin/draft",
    description: "Create draft sessions, set captain order, run picks, and clean up tests.",
    accent: "#324d70",
    tint: "rgba(50,77,112,0.13)",
  },
  {
    number: "03",
    label: "Money Rounds",
    title: "Money Rounds Admin",
    href: "/admin/money-rounds",
    description: "Import teams, enter scorecards, preview skins, and finalize payouts.",
    accent: "#315f48",
    tint: "rgba(49,95,72,0.12)",
  },
  {
    number: "04",
    label: "Night Golf",
    title: "Night Golf Admin",
    href: "/admin/night-golf",
    description: "Review nightly scores, remove bad entries, and reset test nights.",
    accent: "#f472b6",
    tint: "rgba(244,114,182,0.11)",
  },
  {
    number: "05",
    label: "Shenanigans",
    title: "Shenanigans Admin",
    href: "/admin/shenanigans",
    description: "Audit ledger events, manage wagers, and reset chaos data when needed.",
    accent: "#EB9C5C",
    tint: "rgba(235,156,92,0.14)",
  },
  {
    number: "06",
    label: "Afternoon Rounds",
    title: "Afternoon Rounds",
    href: "/admin/afternoon-rounds",
    description: "Review player-owned optional rounds and override when needed.",
    accent: "#ffda03",
    tint: "rgba(255,218,3,0.11)",
  },
  {
    number: "07",
    label: "Camp Feed",
    title: "Camp Feed Admin",
    href: "/admin/camp-feed",
    description: "Post updates and remove stale or incorrect live feed entries.",
    accent: "#b98590",
    tint: "rgba(106,49,60,0.12)",
  },
  {
    number: "08",
    label: "Feedback",
    title: "App Feedback",
    href: "/admin/app-feedback",
    description: "Review player-submitted app notes, bugs, and ideas.",
    accent: "#b98590",
    tint: "rgba(185,133,144,0.1)",
  },
  {
    number: "09",
    label: "Schedule",
    title: "Daily Schedule",
    href: "/admin/daily-schedule",
    description: "Maintain the camp itinerary board for Tuesday through Sunday.",
    accent: "#f4f1ea",
    tint: "rgba(244,241,234,0.06)",
  },
  {
    number: "10",
    label: "Audit",
    title: "Audit Log",
    href: "/admin/audit-log",
    description: "Review who changed what and when across Golf Camp systems.",
    accent: "#a8a29a",
    tint: "rgba(168,162,154,0.08)",
  },
  {
    number: "11",
    label: "Closing",
    title: "Closing Presentation",
    href: "/closing-presentation",
    description: "Preview the final Golf Camp 2026 year-in-review deck.",
    accent: "#d7c8a4",
    tint: "rgba(215,200,164,0.1)",
  },
  {
    number: "12",
    label: "System",
    title: "System Tools",
    href: "/admin/system",
    description: "Prepare exports, archives, resets, and future camp-year utilities.",
    accent: "#a8a29a",
    tint: "rgba(168,162,154,0.08)",
  },
];

export default function AdminPage() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(244,241,234,0.08),transparent_34%),#050505] p-5 text-[#f5f5f5]">
      <Link href="/home" className="gc-back-link gc-floating-back gc-back-admin">
        ← BACK
      </Link>
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center space-y-5 py-6">
        <div className="space-y-4">
          <p className="font-mono text-[17px] font-black uppercase leading-none tracking-[0.26em] text-[#f5f5f5] drop-shadow-[0_0_18px_rgba(244,241,234,0.14)]">
            Golf Camp 2026
          </p>

          <div className="grid grid-cols-[1fr_auto] gap-4">
            <div>
              <h1 className="text-5xl font-black tracking-tight">
                Control Sheets
              </h1>

              <p className="mt-2 text-[#a3a3a3]">
                Manage camp operations, scoring data, wagers, and system tools.
              </p>
            </div>

            <div className="border-l border-[#34312a] pl-4 text-right">
              <p className="text-xs uppercase tracking-[0.22em] text-[#a3a3a3]">
                Admin
              </p>
              <p className="mt-1 font-mono text-2xl font-black">HQ</p>
            </div>
          </div>
        </div>

        <section className="overflow-hidden rounded-2xl border border-[#2b2b27] bg-[#0d0d0b] shadow-[0_24px_70px_rgba(0,0,0,0.46)]">
          <div className="grid grid-cols-[1fr_auto] gap-4 border-b border-[#34312a] bg-[#151411] px-5 py-4">
            <div>
              <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-[#a8a29a]">
                Camp Status
              </p>
              <h2 className="mt-2 text-2xl font-black text-[#8fa66a]">
                All Systems Go
              </h2>
              <p className="mt-1 text-sm text-[#a3a3a3]">
                Commissioner tools and live operations.
              </p>
            </div>

            <div className="flex h-14 w-14 items-center justify-center rounded-full border border-[#8fa66a] font-mono text-2xl font-black text-[#8fa66a]">
              ✓
            </div>
          </div>

          <div className="grid grid-cols-2 divide-x divide-y divide-[#2a2925] text-sm">
            <Link href="/admin/money-rounds" className="px-4 py-3 transition hover:bg-[#17150f]">
              Update Standings
            </Link>
            <Link href="/admin/players" className="px-4 py-3 transition hover:bg-[#17150f]">
              Add Player
            </Link>
            <Link href="/admin/shenanigans" className="px-4 py-3 transition hover:bg-[#17150f]">
              Adjust Points
            </Link>
            <Link href="/admin/system" className="px-4 py-3 transition hover:bg-[#17150f]">
              Export Data
            </Link>
          </div>
        </section>

        <CampFeedAdminForm />

        <div className="overflow-hidden rounded-2xl border border-[#2b2b27] bg-[#0d0d0b] shadow-[0_18px_55px_rgba(0,0,0,0.42)]">
          <div className="grid grid-cols-[3.5rem_1fr_2.5rem] border-b border-[#34312a] bg-[#151411] px-4 py-3 font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-[#a8a29a]">
            <span>No.</span>
            <span>Commissioner Sheet</span>
            <span className="text-right">Go</span>
          </div>

          {sections.map((section) => (
            <Link
              key={section.href}
              href={section.href}
              className="group grid grid-cols-[3.5rem_1fr_2.5rem] border-b border-[#242420] bg-[linear-gradient(90deg,var(--admin-tint),rgba(13,13,11,0.96)_36%,rgba(13,13,11,0.92))] px-4 py-4 shadow-[inset_1px_0_0_var(--admin-edge)] transition hover:bg-[linear-gradient(90deg,var(--admin-tint-strong),rgba(21,21,18,0.98)_36%,rgba(21,21,18,0.94))] last:border-b-0"
              style={
                {
                  "--admin-tint": section.tint,
                  "--admin-tint-strong": section.tint
                    .replace("0.06", "0.1")
                    .replace("0.08", "0.12")
                    .replace("0.11", "0.16")
                    .replace("0.12", "0.17")
                    .replace("0.13", "0.18"),
                  "--admin-edge": `${section.accent}35`,
                } as CSSProperties
              }
            >
              <span className="pt-1 font-mono text-sm font-bold text-[#a8a29a]">
                {section.number}
              </span>

              <div className="min-w-0">
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <h2 className="text-xl font-black text-[#f5f5f5]">
                    {section.title}
                  </h2>
                  <p
                    className="font-mono text-[10px] font-black uppercase tracking-[0.16em]"
                    style={{ color: section.accent }}
                  >
                    {section.label}
                  </p>
                </div>

                <p className="mt-1 text-sm leading-5 text-[#a3a3a3]">
                  {section.description}
                </p>
              </div>

              <span
                className="self-center text-right font-mono text-xl font-black transition group-hover:translate-x-0.5"
                style={{ color: section.accent }}
              >
                →
              </span>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
