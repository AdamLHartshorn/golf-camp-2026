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
          <Link href="/night-golf" className="gc-back-link gc-back-night">
            ← BACK
          </Link>
          <p className="font-mono text-sm uppercase tracking-[0.22em] text-[#f5f5f5]">
            {nightLabel} Night Golf
          </p>
          <span className="flex h-9 w-9 items-center justify-center rounded-full border border-[#831843] bg-[#211019] text-[#f472b6]">
            <GolfCampIcon name="night" className="h-4 w-4" />
          </span>
        </div>

        <div className="overflow-hidden rounded-2xl border border-[#831843]/70 bg-[#0d0d0b]/95 text-[#f5f5f5] shadow-[0_28px_80px_rgba(0,0,0,0.5),0_0_52px_rgba(236,72,153,0.12)]">
          <Link
            href={`/night-golf/${nightPath}/submit`}
            className="grid grid-cols-[3.25rem_1fr_auto] items-center gap-3 border-b border-[#2a2925] px-4 py-4 transition hover:bg-[#211019]"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#831843]/70 bg-[#211019] text-[#f472b6]">
              <GolfCampIcon name="log" className="h-6 w-6" />
            </span>
            <div>
              <h2 className="text-base font-black">Scorecard</h2>
              <p className="mt-0.5 text-xs font-semibold text-[#b8b0a1]">
                Enter target-by-target results.
              </p>
            </div>
            <span className="font-mono text-xl font-black text-[#b8b0a1]">→</span>
          </Link>

          <Link
            href={`/night-golf/${nightPath}/leaderboard`}
            className="grid grid-cols-[3.25rem_1fr_auto] items-center gap-3 border-b border-[#2a2925] px-4 py-4 transition hover:bg-[#211019]"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#831843]/70 bg-[#211019] text-[#f472b6]">
              <GolfCampIcon name="ledger" className="h-6 w-6" />
            </span>
            <div>
              <h2 className="text-base font-black">Leaderboard</h2>
              <p className="mt-0.5 text-xs font-semibold text-[#b8b0a1]">
                Current standings and scores.
              </p>
            </div>
            <span className="font-mono text-xl font-black text-[#b8b0a1]">→</span>
          </Link>

          <Link
            href="/night-golf/rules"
            className="grid grid-cols-[3.25rem_1fr_auto] items-center gap-3 px-4 py-4 transition hover:bg-[#211019]"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#831843]/70 bg-[#211019] text-[#f472b6]">
              <GolfCampIcon name="rules" className="h-6 w-6" />
            </span>
            <div>
              <h2 className="text-base font-black">Rules</h2>
              <p className="mt-0.5 text-xs font-semibold text-[#b8b0a1]">
                Review scoring and target rules.
              </p>
            </div>
            <span className="font-mono text-xl font-black text-[#b8b0a1]">→</span>
          </Link>
        </div>
      </div>
    </main>
  );
}
