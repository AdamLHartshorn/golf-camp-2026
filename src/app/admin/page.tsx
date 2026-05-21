import Link from "next/link";

const sections = [
  {
    label: "Players",
    title: "Player Database",
    href: "/admin/players",
    description: "Add, edit, activate, deactivate, and manage roster data.",
  },
  {
    label: "Night Golf",
    title: "Night Golf Admin",
    href: "/admin/night-golf",
    description: "Review scores, delete bad entries, and reset nights.",
  },
  {
    label: "Draft",
    title: "Live Draft Admin",
    href: "/admin/draft",
    description: "Create sessions, set captain order, and run the draft.",
  },
  {
    label: "Money Rounds",
    title: "Money Rounds Admin",
    href: "/admin/money-rounds",
    description: "Manage team scores, skins, payouts, and round bank previews.",
  },
  {
    label: "Shenanigans",
    title: "Shenanigans Admin",
    href: "/admin/shenanigans",
    description: "Manage ledger events, wagers, and resets.",
  },
  {
    label: "P2P Wagers",
    title: "P2P Admin",
    href: "/admin/p2p-wagers",
    description: "Manage freeform wagers and settlements.",
  },
  {
    label: "System",
    title: "System Tools",
    href: "/admin/system",
    description: "Exports, resets, archives, and future year setup.",
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
              className="block rounded-2xl border border-[#242424] bg-[#111111] p-5 transition hover:border-[#f5f5f5] hover:bg-[#171717]"
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

                <span className="text-2xl text-[#f5f5f5]">→</span>
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
