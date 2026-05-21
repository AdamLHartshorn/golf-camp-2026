import Link from "next/link";
import { GolfCampIcon } from "@/components/GolfCampIcons";

type NightGolfNightPageProps = {
  date: string;
  nightLabel: string;
  nightPath: string;
};

export function NightGolfNightPage({
  nightLabel,
  nightPath,
}: NightGolfNightPageProps) {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(236,72,153,0.1),transparent_32%),#050505] p-5 text-[#f5f5f5]">
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center space-y-5 py-6">
        <div className="flex items-center justify-between gap-4">
          <Link href="/night-golf" className="text-2xl text-[#a3a3a3]">
            ‹
          </Link>
          <p className="font-mono text-sm uppercase tracking-[0.22em] text-[#f5f5f5]">
            {nightLabel} Night Golf
          </p>
          <span className="flex h-9 w-9 items-center justify-center rounded-full border border-[#831843] bg-[#211019] text-[#f472b6]">
            <GolfCampIcon name="night" className="h-4 w-4" />
          </span>
        </div>

        <div className="overflow-hidden rounded-2xl border border-[#d8d1c4]/80 bg-[#efe9dc] text-[#17130e] shadow-[0_18px_55px_rgba(0,0,0,0.32)]">
          <Link
            href={`/night-golf/${nightPath}/submit`}
            className="grid grid-cols-[3.25rem_1fr_auto] items-center gap-3 border-b border-[#d2c8b8] px-4 py-4 transition hover:bg-[#f6f0e3]"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#d2c8b8] bg-[#f8f2e6] text-[#f472b6]">
              <GolfCampIcon name="log" className="h-6 w-6" />
            </span>
            <div>
              <h2 className="text-base font-black">Scorecard</h2>
              <p className="mt-0.5 text-xs font-semibold text-[#4f483f]">
                Enter target-by-target results.
              </p>
            </div>
            <span className="font-mono text-xl font-black text-[#4f483f]">→</span>
          </Link>

          <Link
            href={`/night-golf/${nightPath}/leaderboard`}
            className="grid grid-cols-[3.25rem_1fr_auto] items-center gap-3 border-b border-[#d2c8b8] px-4 py-4 transition hover:bg-[#f6f0e3]"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#d2c8b8] bg-[#f8f2e6] text-[#f472b6]">
              <GolfCampIcon name="ledger" className="h-6 w-6" />
            </span>
            <div>
              <h2 className="text-base font-black">Leaderboard</h2>
              <p className="mt-0.5 text-xs font-semibold text-[#4f483f]">
                Current standings and scores.
              </p>
            </div>
            <span className="font-mono text-xl font-black text-[#4f483f]">→</span>
          </Link>

          <Link
            href="/night-golf/rules"
            className="grid grid-cols-[3.25rem_1fr_auto] items-center gap-3 px-4 py-4 transition hover:bg-[#f6f0e3]"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#d2c8b8] bg-[#f8f2e6] text-[#f472b6]">
              <GolfCampIcon name="rules" className="h-6 w-6" />
            </span>
            <div>
              <h2 className="text-base font-black">Rules</h2>
              <p className="mt-0.5 text-xs font-semibold text-[#4f483f]">
                Review scoring and target rules.
              </p>
            </div>
            <span className="font-mono text-xl font-black text-[#4f483f]">→</span>
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
