import Link from "next/link";
import { ShenanigansCurrentGameNotice } from "@/lib/shenanigansGame";

const sections = [
  {
    title: "Overview",
    copy: "Shenanigans is played under the rules of a golf scramble. Points are earned through skill, luck, side games, and player-to-player wagers. At the end of the round, the player with the most points wins.",
  },
  {
    title: "The Bank",
    copy: "The Bank awards structured points for tee shots, approach shots, putting, and standard proposition outcomes.",
  },
  {
    title: "Wagering Points",
    copy: "Players may wager points with each other on observable outcomes during the round. Verbal agreement locks in a wager. The winner gains the wagered points and the loser loses the same amount.",
  },
  {
    title: "Side Games",
    copy: "Players may create agreed-upon side games during the round, including Ultimate Bocce, Basket-Golf, or anything else the group approves.",
  },
  {
    title: "Monetizing Points",
    copy: "Optional: each point can represent one unit of cash. Final settlement can be calculated from each player’s final point total.",
  },
  {
    title: "Optional Double Points",
    copy: "In an 18-hole round, the last three holes may use double Bank points. In a 9-hole round, the last hole may use double Bank points.",
  },
];

export default function ShenanigansRulesPage() {
  return (
    <main className="min-h-screen bg-black p-6 text-[#f5f5f5]">
      <Link href="/shenanigans" className="gc-back-link gc-floating-back gc-back-shenanigans">
        ← BACK
      </Link>
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center space-y-8 py-8">
        <div className="space-y-2">
          <p className="text-sm uppercase tracking-[0.35em] text-[#b91c1c]">
            Shenanigans
          </p>

          <h1 className="text-4xl font-bold tracking-tight">
            Rules
          </h1>

          <p className="text-[#a3a3a3]">
            The official chaos doctrine.
          </p>
        </div>

        <ShenanigansCurrentGameNotice />

        <div className="space-y-3">
          {sections.map((section, index) => (
            <section
              key={section.title}
              className="rounded-2xl border border-[#242424] bg-[#111111] p-5"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#b91c1c]">
                {String.fromCharCode(65 + index)}
              </p>

              <h2 className="mt-2 text-xl font-bold">{section.title}</h2>

              <p className="mt-3 text-sm leading-6 text-[#a3a3a3]">
                {section.copy}
              </p>
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}
