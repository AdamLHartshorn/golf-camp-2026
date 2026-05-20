import Link from "next/link";

export default function MoneyRoundsPage() {
  return (
    <main className="min-h-screen bg-black p-6 text-[#f5f5f5]">
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center space-y-8 py-8">
        <div className="space-y-2">
          <p className="text-sm uppercase tracking-[0.35em] text-[#a3a3a3]">
            Golf Camp 2026
          </p>

          <h1 className="text-4xl font-bold tracking-tight">Money Rounds</h1>

          <p className="text-[#a3a3a3]">
            Team formats, round scores, payouts, and settlement prep.
          </p>
        </div>

        <section className="rounded-2xl border border-[#242424] bg-[#111111] p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#d4d4d4]">
            Coming Soon
          </p>

          <h2 className="mt-2 text-2xl font-bold">Round accounting hub</h2>

          <p className="mt-3 text-sm leading-6 text-[#a3a3a3]">
            The backend is ready for money rounds, teams, scores, and payouts.
            Score entry and payout workflows will be built here later.
          </p>
        </section>

        <Link href="/home" className="text-center text-sm text-[#a3a3a3]">
          ← Back to Dashboard
        </Link>
      </div>
    </main>
  );
}
