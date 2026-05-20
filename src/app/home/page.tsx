import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-black text-[#f5f5f5] p-6">
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center space-y-8">
        <div className="space-y-2">
          <p className="text-sm uppercase tracking-[0.35em] text-[#a3a3a3]">
            Golf Camp 2026
          </p>

          <h1 className="text-4xl font-bold tracking-tight">
            Camp Dashboard
          </h1>

          <p className="text-[#a3a3a3]">
            Select an event or camp utility.
          </p>
        </div>

        <div className="space-y-4">
          <Link
            href="/camp-office"
            className="block rounded-2xl border border-[#d4d4d4] bg-[#111111] p-5 transition hover:bg-[#171717]"
          >
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-[#f5f5f5]">
                  Camp Office
                </h2>

                <p className="mt-1 text-sm text-[#a3a3a3]">
                  Contacts, room assignments, and camp info.
                </p>
              </div>

              <span className="text-2xl text-[#f5f5f5]">→</span>
            </div>
          </Link>

          <Link
            href="/shenanigans"
            className="block rounded-2xl border border-[#b91c1c] bg-[#111111] p-5 transition hover:bg-[#171717]"
          >
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-[#b91c1c]">
                  Shenanigans
                </h2>

                <p className="mt-1 text-sm text-[#a3a3a3]">
                  The official point bank, wagers, props, and chaos ledger.
                </p>
              </div>

              <span className="text-2xl text-[#b91c1c]">→</span>
            </div>
          </Link>

          <Link
            href="/night-golf"
            className="block rounded-2xl border border-[#cfff82] bg-[#111111] p-5 transition hover:bg-[#171717]"
          >
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-[#cfff82]">
                  Night Golf
                </h2>

                <p className="mt-1 text-sm text-[#a3a3a3]">
                  Scorecards, leaderboard, rules, and target games.
                </p>
              </div>

              <span className="text-2xl text-[#cfff82]">→</span>
            </div>
          </Link>

          <Link
            href="/p2p-wagers"
            className="block rounded-2xl border border-[#a16207] bg-[#111111] p-5 transition hover:bg-[#17130c]"
          >
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-[#d6a84f]">
                  P2P Wagers
                </h2>

                <p className="mt-1 text-sm text-[#a3a3a3]">
                  Freeform side bets, props, and cash settlements.
                </p>
              </div>

              <span className="text-2xl text-[#d6a84f]">→</span>
            </div>
          </Link>

          <Link
            href="/draft"
            className="block rounded-2xl border border-[#3a3a3a] bg-[#111111] p-5 transition hover:bg-[#171717]"
          >
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-[#f5f5f5]">
                  Live Draft
                </h2>

                <p className="mt-1 text-sm text-[#a3a3a3]">
                  Draft sessions, team boards, and pick tracking.
                </p>
              </div>

              <span className="text-2xl text-[#f5f5f5]">→</span>
            </div>
          </Link>

          <Link
            href="/money-rounds"
            className="block rounded-2xl border border-[#3a3a3a] bg-[#111111] p-5 transition hover:bg-[#171717]"
          >
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-[#f5f5f5]">
                  Money Rounds
                </h2>

                <p className="mt-1 text-sm text-[#a3a3a3]">
                  Team formats, round scores, payouts, and settlement prep.
                </p>
              </div>

              <span className="text-2xl text-[#f5f5f5]">→</span>
            </div>
          </Link>
        </div>
      </div>
    </main>
  );
}
