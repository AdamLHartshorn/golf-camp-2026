import Link from "next/link";

const featuredGames = [
  {
    title: "Ultimate Bocce",
    description:
      "Establish a target, then each player rolls a golf ball. Closest ball wins.",
    pointNote: "Play for agreed-upon points.",
  },
  {
    title: "Basket-Golf",
    description:
      "Any object that can contain a golf ball can become the basket. First player to make it wins.",
    pointNote: "Play for agreed-upon points.",
  },
];

const liveChallenges = [
  {
    description: "Nick challenged Jesse to Ultimate Bocce",
    points: "4 points",
  },
  {
    description: "Alex's Grandma challenged Adam to Basket-Golf",
    points: "3 points",
  },
];

export default function ShenanigansSideGamesPage() {
  return (
    <main className="min-h-screen bg-black p-6 text-[#f5f5f5]">
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center space-y-8 py-8">
        <div className="space-y-2">
          <p className="text-sm uppercase tracking-[0.35em] text-[#b91c1c]">
            Shenanigans
          </p>

          <h1 className="text-4xl font-bold tracking-tight">
            Side Games
          </h1>

          <p className="text-[#a3a3a3]">
            Bocce, basket-golf, and whatever else gets invented.
          </p>
        </div>

        <section className="space-y-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#b91c1c]">
              Featured Side Games
            </p>

            <h2 className="mt-2 text-xl font-bold">Round Breakers</h2>
          </div>

          <div className="space-y-3">
            {featuredGames.map((game) => (
              <div
                key={game.title}
                className="rounded-2xl border border-[#242424] bg-[#111111] p-5"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-xl font-bold">{game.title}</h3>

                    <p className="mt-2 text-sm leading-6 text-[#a3a3a3]">
                      {game.description}
                    </p>
                  </div>

                  <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-[#b91c1c]" />
                </div>

                <div className="mt-4 border-t border-[#242424] pt-4">
                  <p className="text-sm font-semibold text-[#f5f5f5]">
                    {game.pointNote}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-[#b91c1c] bg-[#111111] p-5 shadow-[0_0_0_1px_rgba(185,28,28,0.18)]">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#b91c1c]">
            Custom Games
          </p>

          <h2 className="mt-2 text-xl font-bold">Invented Shenanigans</h2>

          <p className="mt-2 text-sm leading-6 text-[#a3a3a3]">
            Additional side games can be created during the round if all players agree.
          </p>

          <p className="mt-4 text-sm font-bold text-[#f5f5f5]">
            If everyone agrees, it counts.
          </p>
        </section>

        <section className="space-y-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#b91c1c]">
              Live Challenge Preview
            </p>

            <h2 className="mt-2 text-xl font-bold">Pending Chaos</h2>
          </div>

          <div className="space-y-3">
            {liveChallenges.map((challenge) => (
              <div
                key={challenge.description}
                className="rounded-2xl border border-[#242424] bg-[#111111] p-5"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <h3 className="text-base font-semibold leading-6">
                      {challenge.description}
                    </h3>

                    <p className="mt-3 text-lg font-bold text-[#b91c1c]">
                      {challenge.points}
                    </p>
                  </div>

                  <span className="rounded-full border border-[#b91c1c]/70 px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-[#f5f5f5]">
                    Pending
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-[#242424] bg-[#0b0b0b] p-5 opacity-60">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#b91c1c]">
            Coming Soon
          </p>

          <h2 className="mt-2 text-xl font-bold">Start New Side Game</h2>

          <p className="mt-2 text-sm leading-6 text-[#a3a3a3]">
            Coming soon — create challenges, accept them, and settle results live.
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
