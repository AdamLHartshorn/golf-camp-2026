import Link from "next/link";

const sections = [
  {
    number: "01",
    label: "Players",
    title: "Player Database",
    href: "/admin/players",
    description: "Maintain roster records, photos, ranks, payments, and player lore.",
    accent: "border-[#3a3a3a] text-[#f5f5f5] hover:border-[#f5f5f5]",
  },
  {
    number: "02",
    label: "Draft",
    title: "Draft Control",
    href: "/admin/draft",
    description: "Create draft sessions, set captain order, run picks, and clean up tests.",
    accent: "border-[#1d4ed8] text-[#60a5fa] hover:border-[#2563eb]",
  },
  {
    number: "03",
    label: "Money Rounds",
    title: "Money Rounds Admin",
    href: "/admin/money-rounds",
    description: "Import teams, enter scorecards, preview skins, and finalize payouts.",
    accent: "border-[#15803d] text-[#16a34a] hover:border-[#16a34a]",
  },
  {
    number: "04",
    label: "Night Golf",
    title: "Night Golf Admin",
    href: "/admin/night-golf",
    description: "Review nightly scores, remove bad entries, and reset test nights.",
    accent: "border-[#3a3a3a] text-[#f5f5f5] hover:border-[#f5f5f5]",
  },
  {
    number: "05",
    label: "Shenanigans",
    title: "Shenanigans Admin",
    href: "/admin/shenanigans",
    description: "Audit ledger events, manage wagers, and reset chaos data when needed.",
    accent: "border-[#3a3a3a] text-[#f5f5f5] hover:border-[#f5f5f5]",
  },
  {
    number: "06",
    label: "Afternoon Rounds",
    title: "Afternoon Rounds",
    href: "/afternoon-rounds",
    description: "View player-created optional rounds, participants, and team groups.",
    accent: "border-[#3a3a3a] text-[#f5f5f5] hover:border-[#f5f5f5]",
  },
  {
    number: "07",
    label: "System",
    title: "System Tools",
    href: "/admin/system",
    description: "Prepare exports, archives, resets, and future camp-year utilities.",
    accent: "border-[#3a3a3a] text-[#f5f5f5] hover:border-[#f5f5f5]",
  },
];

export default function AdminPage() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(244,241,234,0.08),transparent_34%),#050505] p-5 text-[#f5f5f5]">
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
              className={`grid grid-cols-[3.5rem_1fr_2.5rem] border-b border-[#242420] bg-[#0d0d0b] px-4 py-4 transition hover:bg-[#15150f] last:border-b-0 ${section.accent}`}
            >
              <span className="pt-1 font-mono text-sm font-bold text-[#a8a29a]">
                {section.number}
              </span>

              <div className="min-w-0">
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <h2 className="text-xl font-black">
                    {section.title}
                  </h2>
                  <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-[#a3a3a3]">
                    {section.label}
                  </p>
                </div>

                <p className="mt-1 text-sm leading-5 text-[#a3a3a3]">
                  {section.description}
                </p>
              </div>

              <span className="self-center text-right font-mono text-xl font-black">→</span>
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
