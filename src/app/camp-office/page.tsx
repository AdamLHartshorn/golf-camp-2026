import Link from "next/link";
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
] satisfies {
  icon: GolfCampIconName;
  initial: string;
  name: string;
  href: string;
  label: string;
}[];

export default function CampOfficePage() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(244,241,234,0.08),transparent_34%),#050505] p-5 text-[#f5f5f5]">
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center space-y-5 py-6">
        <div className="flex items-center justify-between gap-4">
          <Link href="/home" className="text-2xl text-[#a3a3a3]">
            ‹
          </Link>
          <p className="font-mono text-sm uppercase tracking-[0.22em] text-[#f5f5f5]">
            Camp Office
          </p>
          <span className="flex h-9 w-9 items-center justify-center rounded-full border border-[#3a372f] bg-[#151411] text-[#f4f1ea]">
            <GolfCampIcon name="camp" className="h-4 w-4" />
          </span>
        </div>

        <section className="overflow-hidden rounded-2xl border border-[#2f2a22] bg-[#0d0d0b]/95 text-[#f5f5f5] shadow-[0_28px_80px_rgba(0,0,0,0.48),0_0_48px_rgba(244,241,234,0.05)]">
          {cards.map((card) => (
            <Link
              key={card.name}
              href={card.href}
              className="grid grid-cols-[3.25rem_1fr_auto] items-center gap-3 border-b border-[#2a2925] px-4 py-4 transition hover:bg-[#161511] last:border-b-0"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#34312a] bg-black/40 text-[#f4f1ea]">
                <GolfCampIcon name={card.icon} className="h-6 w-6" />
              </span>

              <div className="min-w-0">
                <h2 className="text-base font-black">{card.name}</h2>
                <p className="mt-0.5 truncate text-xs font-semibold text-[#b8b0a1]">
                  {card.label}
                </p>
              </div>

              <span className="self-center text-right font-mono text-xl font-black text-[#82786a]">
                →
              </span>
            </Link>
          ))}
        </section>

        <div className="border-t border-[#34312a] pt-4">
          <Link
            href="/my-profile"
            className="grid grid-cols-[3.25rem_1fr_auto] items-center gap-3 rounded-2xl border border-[#34312a] bg-[#11110f] px-4 py-4 transition hover:bg-[#15150f]"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#34312a] bg-black/35 font-mono text-sm font-black text-[#a8a29a]">
              <GolfCampIcon name="roster" className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <h2 className="text-base font-black">My Profile</h2>

              <p className="mt-1 truncate text-xs text-[#a3a3a3]">
                View your camp profile and change your PIN.
              </p>
            </div>

            <span className="self-center text-right font-mono text-xl font-black">
              →
            </span>
          </Link>
        </div>

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
