import Link from "next/link";

const sections = [
  {
    label: "Players",
    title: "Player Database",
    href: "/admin/players",
    description: "Maintain roster records, photos, ranks, payments, and player lore.",
    accent: "border-[#3a3a3a] text-[#f5f5f5] hover:border-[#f5f5f5]",
  },
  {
    label: "Draft",
    title: "Draft Control",
    href: "/admin/draft",
    description: "Create draft sessions, set captain order, run picks, and clean up tests.",
    accent: "border-[#1d4ed8] text-[#60a5fa] hover:border-[#2563eb]",
  },
  {
    label: "Money Rounds",
    title: "Money Rounds Admin",
    href: "/admin/money-rounds",
    description: "Import teams, enter scorecards, preview skins, and finalize payouts.",
    accent: "border-[#15803d] text-[#16a34a] hover:border-[#16a34a]",
  },
  {
    label: "Night Golf",
    title: "Night Golf Admin",
    href: "/admin/night-golf",
    description: "Review nightly scores, remove bad entries, and reset test nights.",
    accent: "border-[#3a3a3a] text-[#f5f5f5] hover:border-[#f5f5f5]",
  },
  {
    label: "Shenanigans",
    title: "Shenanigans Admin",
    href: "/admin/shenanigans",
    description: "Audit ledger events, manage wagers, and reset chaos data when needed.",
    accent: "border-[#3a3a3a] text-[#f5f5f5] hover:border-[#f5f5f5]",
  },
  {
    label: "P2P Wagers",
    title: "P2P Admin",
    href: "/admin/p2p-wagers",
    description: "Review open bets, remove bad entries, and manage settled cash action.",
    accent: "border-[#3a3a3a] text-[#f5f5f5] hover:border-[#f5f5f5]",
  },
  {
    label: "System",
    title: "System Tools",
    href: "/admin/system",
    description: "Prepare exports, archives, resets, and future camp-year utilities.",
    accent: "border-[#3a3a3a] text-[#f5f5f5] hover:border-[#f5f5f5]",
  },
];

export default function AdminPage() {
  return (
    <main className="min-h-screen bg-black p-6 text-[#f5f5f5]">
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center space-y-8 py-8">
        <div className="space-y-2">
          <p className="text-sm uppercase tracking-[0.35em] text-[#a3a3a3]">
            Golf Camp 2026
          </p>

          <h1 className="text-4xl font-bold tracking-tight">
            Admin Mission Control
          </h1>

          <p className="text-[#a3a3a3]">
            Manage camp operations, scoring data, wagers, and system tools.
          </p>
        </div>

        <div className="space-y-4">
          {sections.map((section) => (
            <Link
              key={section.href}
              href={section.href}
              className={`block rounded-2xl border bg-[#111111] p-5 transition hover:bg-[#171717] ${section.accent}`}
            >
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#a3a3a3]">
                    {section.label}
                  </p>

                  <h2 className="mt-2 text-2xl font-bold">
                    {section.title}
                  </h2>

                  <p className="mt-1 text-sm leading-5 text-[#a3a3a3]">
                    {section.description}
                  </p>
                </div>

                <span className="text-2xl">→</span>
              </div>
            </Link>
          ))}
        </div>

        <Link href="/home" className="text-center text-sm text-[#a3a3a3]">
          ← Back to Camp Dashboard
        </Link>
      </div>
    </main>
  );
}
