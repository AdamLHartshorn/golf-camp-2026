import Link from "next/link";

export default function RulesPage() {
  return (
    <main className="min-h-screen bg-black text-[#f5f5f5] p-6">
      <Link href="/night-golf" className="gc-back-link gc-floating-back gc-back-night">
        ← BACK
      </Link>
      <div className="mx-auto w-full max-w-md space-y-8 py-10">
        <div className="space-y-2">
          <p className="font-mono text-[17px] font-black uppercase leading-none tracking-[0.26em] text-[#f5f5f5] drop-shadow-[0_0_18px_rgba(244,241,234,0.14)]">
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
              <div className="flex items-center justify-between rounded-xl border border-[#ec4899]/55 bg-[#140812] p-4">
                <span>Missed both shots</span>

                <span className="font-bold text-[#f472b6]">
                  0
                </span>
              </div>

              <div className="flex items-center justify-between rounded-xl border border-[#ec4899]/55 bg-[#140812] p-4">
                <span>Stuck one shot</span>

                <span className="font-bold text-[#f472b6]">
                  1
                </span>
              </div>

              <div className="flex items-center justify-between rounded-xl border border-[#ec4899]/55 bg-[#140812] p-4">
                <span>Stuck both shots</span>

                <span className="font-bold text-[#f472b6]">
                  3
                </span>
              </div>

              <div className="flex items-center justify-between rounded-xl border border-[#ec4899]/55 bg-[#140812] p-4">
                <span>Hole-Out</span>

                <span className="font-bold text-[#f472b6]">
                  5
                </span>
              </div>

              <div className="flex items-center justify-between rounded-xl border border-[#ec4899]/55 bg-[#140812] p-4">
                <span>Hole-Out + one stuck shot</span>

                <span className="font-bold text-[#f472b6]">
                  6
                </span>
              </div>

              <div className="flex items-center justify-between rounded-xl border border-[#ec4899]/55 bg-[#140812] p-4">
                <span>Double Hole-Out</span>

                <span className="font-bold text-[#f472b6]">
                  10
                </span>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-[#242424] bg-[#111111] p-5">
            <h2 className="text-2xl font-bold">Target Rules</h2>

            <div className="mt-4 space-y-3 text-[#d4d4d4]">
              <p>
                Ball must come to rest inside the target area to count.
              </p>
            </div>
          </section>

          <section className="rounded-2xl border border-[#242424] bg-[#111111] p-5">
            <h2 className="text-2xl font-bold">Sudden Death</h2>

            <div className="mt-4 space-y-3 text-[#d4d4d4]">
              <p>
                Ties are settled Open-style. Tied players start at the first
                hole and continue hole-by-hole.
              </p>

              <p>
                After each hole, the lowest point total among the tied players
                is eliminated. Continue until one winner remains.
              </p>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
