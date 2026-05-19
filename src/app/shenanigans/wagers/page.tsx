import Link from "next/link";

const wagerRules = [
  "Verbal agreement locks in a wager.",
  "Wagers can involve 2, 3, or 4 players.",
  "Wagers can be placed on observable activity within the group.",
  "Winner gains the wagered points.",
  "Loser loses the wagered points.",
  "Odds may be used for handicap differences.",
  "On the back nine, the leader must accept at least 3 offered wagers.",
];

const activeWagers = [
  {
    players: "Nick vs Jesse",
    points: "3 points",
    description: "Longest drive on 7",
  },
  {
    players: "Alex's Grandma vs Adam",
    points: "4 points",
    description: "Closest approach on 9",
  },
  {
    players: "Jesse vs Nick vs Adam",
    points: "2 points",
    description: "First to make a par putt",
  },
];

const settledWagers = [
  {
    winner: "Nick",
    loser: "Adam",
    movement: "+3 / -3",
  },
  {
    winner: "Alex's Grandma",
    loser: "Jesse",
    movement: "+5 / -5",
  },
];

export default function ShenanigansWagersPage() {
  return (
    <main className="min-h-screen bg-black p-6 text-[#f5f5f5]">
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center space-y-8 py-8">
        <div className="space-y-2">
          <p className="text-sm uppercase tracking-[0.35em] text-[#b91c1c]">
            Shenanigans
          </p>

          <h1 className="text-4xl font-bold tracking-tight">
            Wagers
          </h1>

          <p className="text-[#a3a3a3]">
            Track player-to-player action.
          </p>
        </div>

        <section className="rounded-2xl border border-[#242424] bg-[#111111] p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#b91c1c]">
            Wager Rules
          </p>

          <h2 className="mt-2 text-xl font-bold">House Terms</h2>

          <div className="mt-4 space-y-3">
            {wagerRules.map((rule) => (
              <div key={rule} className="flex gap-3">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#b91c1c]" />

                <p className="text-sm leading-6 text-[#a3a3a3]">
                  {rule}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#b91c1c]">
              Active Wagers
            </p>

            <h2 className="mt-2 text-xl font-bold">Open Action</h2>
          </div>

          <div className="space-y-3">
            {activeWagers.map((wager) => (
              <div
                key={`${wager.players}-${wager.description}`}
                className="rounded-2xl border border-[#242424] bg-[#111111] p-5"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <h3 className="text-lg font-bold">{wager.players}</h3>

                    <p className="mt-2 text-sm leading-6 text-[#a3a3a3]">
                      {wager.description}
                    </p>
                  </div>

                  <span className="rounded-full border border-[#b91c1c]/70 px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-[#f5f5f5]">
                    Active
                  </span>
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-[#242424] pt-4">
                  <span className="text-xs uppercase tracking-[0.2em] text-[#737373]">
                    Stake
                  </span>

                  <span className="text-lg font-bold text-[#b91c1c]">
                    {wager.points}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#b91c1c]">
              Settled Wagers
            </p>

            <h2 className="mt-2 text-xl font-bold">Booked Results</h2>
          </div>

          <div className="space-y-3">
            {settledWagers.map((wager) => (
              <div
                key={`${wager.winner}-${wager.loser}`}
                className="rounded-2xl border border-[#242424] bg-[#111111] p-5"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-bold">
                      {wager.winner} beat {wager.loser}
                    </h3>

                    <p className="mt-2 text-sm text-[#a3a3a3]">
                      Winner gains. Loser pays.
                    </p>
                  </div>

                  <span className="rounded-full border border-[#242424] px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-[#a3a3a3]">
                    Settled
                  </span>
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-[#242424] pt-4">
                  <span className="text-xs uppercase tracking-[0.2em] text-[#737373]">
                    Net Move
                  </span>

                  <span className="text-lg font-bold text-[#f5f5f5]">
                    {wager.movement}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-[#242424] bg-[#0b0b0b] p-5 opacity-60">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#b91c1c]">
            Future Action
          </p>

          <h2 className="mt-2 text-xl font-bold">Log New Wager</h2>

          <p className="mt-2 text-sm leading-6 text-[#a3a3a3]">
            Coming soon — create, settle, and track wagers live.
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
