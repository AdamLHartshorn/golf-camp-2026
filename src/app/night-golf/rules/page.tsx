import Link from "next/link";

export default function RulesPage() {
  return (
    <main className="min-h-screen bg-black text-[#f5f5f5] p-6">
      <div className="mx-auto w-full max-w-md space-y-8 py-10">
        <div className="space-y-2">
          <p className="text-sm uppercase tracking-[0.35em] text-[#a3a3a3]">
            Golf Camp 2026
          </p>

          <h1 className="text-4xl font-bold tracking-tight text-[#f472b6]">
            Rules
          </h1>

          <p className="text-[#a3a3a3]">
            Night Golf Target Challenge
          </p>
        </div>

        <div className="space-y-6">
          <section className="rounded-2xl border border-[#242424] bg-[#111111] p-5">
            <h2 className="text-2xl font-bold">Format</h2>

            <div className="mt-4 space-y-3 text-[#d4d4d4]">
              <p>
                There are 9 total targets:
              </p>

              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded-lg bg-black p-3 text-[#f472b6]">
                  1G
                </div>

                <div className="rounded-lg bg-black p-3 text-[#f472b6]">
                  1Y
                </div>

                <div className="rounded-lg bg-black p-3 text-[#f472b6]">
                  1R
                </div>

                <div className="rounded-lg bg-black p-3 text-[#f472b6]">
                  2G
                </div>

                <div className="rounded-lg bg-black p-3 text-[#f472b6]">
                  2Y
                </div>

                <div className="rounded-lg bg-black p-3 text-[#f472b6]">
                  2R
                </div>

                <div className="rounded-lg bg-black p-3 text-[#f472b6]">
                  3G
                </div>

                <div className="rounded-lg bg-black p-3 text-[#f472b6]">
                  3Y
                </div>

                <div className="rounded-lg bg-black p-3 text-[#f472b6]">
                  3R
                </div>
              </div>

              <p>
                Each player gets two shots at every target.
              </p>

              <p>
                18 total shots per player.
              </p>
            </div>
          </section>

          <section className="rounded-2xl border border-[#242424] bg-[#111111] p-5">
            <h2 className="text-2xl font-bold">Scoring</h2>

            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between rounded-xl bg-black p-4">
                <span>Missed both shots</span>

                <span className="font-bold text-[#a3a3a3]">
                  0
                </span>
              </div>

              <div className="flex items-center justify-between rounded-xl bg-black p-4">
                <span>Stuck one shot</span>

                <span className="font-bold text-[#f5f5f5]">
                  1
                </span>
              </div>

              <div className="flex items-center justify-between rounded-xl bg-black p-4">
                <span>Stuck both shots</span>

                <span className="font-bold text-[#f472b6]">
                  3
                </span>
              </div>

              <div className="rounded-xl border border-[#ec4899] bg-black p-4 text-center">
                <p className="text-sm text-[#a3a3a3]">
                  Maximum Possible Score
                </p>

                <p className="mt-1 text-3xl font-bold text-[#f472b6]">
                  27
                </p>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-[#242424] bg-[#111111] p-5">
            <h2 className="text-2xl font-bold">Target Rules</h2>

            <div className="mt-4 space-y-3 text-[#d4d4d4]">
              <p>
                Ball must come to rest inside the target area to count.
              </p>

              <p>
                If the ball is visibly on the line (you can see the laser
                hitting the ball), it counts.
              </p>
            </div>
          </section>

          <section className="rounded-2xl border border-[#242424] bg-[#111111] p-5">
            <h2 className="text-2xl font-bold">Tiebreaker</h2>

            <div className="mt-4 space-y-3 text-[#d4d4d4]">
              <p>
                1. Most “stuck both” scores wins.
              </p>

              <p>
                2. Sudden death challenge target if still tied.
              </p>
            </div>
          </section>
        </div>

        <Link
          href="/night-golf"
          className="block text-center text-sm text-[#a3a3a3]"
        >
          ← Back to Night Golf
        </Link>
      </div>
    </main>
  );
}