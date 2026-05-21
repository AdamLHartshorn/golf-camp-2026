import Link from "next/link";
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
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(236,72,153,0.16),transparent_34%),#050505] p-5 text-[#f5f5f5]">
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center space-y-5 py-6">
        <div className="flex items-center justify-between gap-4">
          <Link href="/home" className="text-2xl text-[#a3a3a3]">
            ‹
          </Link>
          <p className="font-mono text-sm uppercase tracking-[0.22em] text-[#f5f5f5]">
            Night Golf
          </p>
          <span className="flex h-9 w-9 items-center justify-center rounded-full border border-[#831843] bg-[#211019] text-[#f472b6]">
            <GolfCampIcon name="night" className="h-4 w-4" />
          </span>
        </div>

        <section className="overflow-hidden rounded-2xl border border-[#831843]/70 bg-[#0d0d0b]/95 text-[#f5f5f5] shadow-[0_28px_80px_rgba(0,0,0,0.5),0_0_52px_rgba(236,72,153,0.12)]">
          <Link
            href="/night-golf/rules"
            className="grid grid-cols-[3.25rem_1fr_auto] items-center gap-3 border-b border-[#2a2925] px-4 py-4 transition hover:bg-[#211019]"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#831843]/70 bg-[#211019] text-[#f472b6]">
              <GolfCampIcon name="rules" className="h-6 w-6" />
            </span>
            <div className="min-w-0">
              <h2 className="text-base font-black">Rules</h2>
              <p className="mt-0.5 truncate text-xs font-semibold text-[#b8b0a1]">
                Format, scoring, target rules, and tiebreakers.
              </p>
            </div>
            <span className="font-mono text-xl font-black text-[#82786a]">→</span>
          </Link>

          {nights.map((night) => (
            <Link
              key={night.name}
              href={night.href}
              className="grid grid-cols-[3.25rem_1fr_auto] items-center gap-3 border-b border-[#2a2925] px-4 py-4 transition hover:bg-[#211019] last:border-b-0"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#831843]/70 bg-[#211019] text-[#f472b6]">
                <GolfCampIcon name="night" className="h-6 w-6" />
              </span>
              <div>
                <h2 className="text-base font-black">{night.name}</h2>
                <p className="mt-0.5 text-xs font-semibold text-[#b8b0a1]">
                  {night.description}
                </p>
              </div>
              <span className="font-mono text-xl font-black text-[#82786a]">→</span>
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
