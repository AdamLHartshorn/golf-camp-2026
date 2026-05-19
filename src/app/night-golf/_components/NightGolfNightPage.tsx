import Link from "next/link";

type NightGolfNightPageProps = {
  date: string;
  nightLabel: string;
  nightPath: string;
};

export function NightGolfNightPage({
  date,
  nightLabel,
  nightPath,
}: NightGolfNightPageProps) {
  return (
    <main className="min-h-screen bg-black text-[#f5f5f5] p-6">
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center space-y-8">
        <div className="space-y-2">
          <p className="text-sm uppercase tracking-[0.35em] text-[#a3a3a3]">
            {date}
          </p>

          <h1 className="text-4xl font-bold tracking-tight text-[#cfff82]">
            {nightLabel} Night Golf
          </h1>

          <p className="text-[#a3a3a3]">
            Submit scores and track the leaderboard.
          </p>
        </div>

        <div className="space-y-4">
          <Link
            href={`/night-golf/${nightPath}/submit`}
            className="block rounded-2xl bg-[#cfff82] p-5 transition hover:opacity-90"
          >
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-black">
                  Scorecard
                </h2>

                <p className="mt-1 text-sm text-black/70">
                  Enter target-by-target results.
                </p>
              </div>

              <span className="text-2xl text-black">→</span>
            </div>
          </Link>

          <Link
            href={`/night-golf/${nightPath}/leaderboard`}
            className="block rounded-2xl border border-[#242424] bg-[#111111] p-5 transition hover:border-[#cfff82]"
          >
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">
                  Leaderboard
                </h2>

                <p className="mt-1 text-sm text-[#a3a3a3]">
                  Current standings and scores.
                </p>
              </div>

              <span className="text-2xl text-[#cfff82]">→</span>
            </div>
          </Link>

          <Link
            href="/night-golf/rules"
            className="block rounded-2xl border border-[#242424] bg-[#111111] p-5 transition hover:border-[#cfff82]"
          >
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">
                  Rules
                </h2>

                <p className="mt-1 text-sm text-[#a3a3a3]">
                  Review scoring and target rules.
                </p>
              </div>

              <span className="text-2xl text-[#cfff82]">→</span>
            </div>
          </Link>
        </div>

        <Link
          href="/night-golf"
          className="text-center text-sm text-[#a3a3a3]"
        >
          ← Back to Night Golf
        </Link>
      </div>
    </main>
  );
}
