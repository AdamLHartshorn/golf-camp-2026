import Link from "next/link";
import { playersByLastName, type PlayerRank } from "../_data/roster";

const rankStyles: Record<PlayerRank, string> = {
  A: "border-[#8b6f2f] bg-[#2b2517] text-[#d7bd75]",
  B: "border-[#8a8a8a] bg-[#242424] text-[#d4d4d4]",
  C: "border-[#7a4f32] bg-[#2a1f18] text-[#c28a5a]",
  D: "border-[#4b5563] bg-[#1f242b] text-[#9ca3af]",
};

export default function CampRosterPage() {
  return (
    <main className="min-h-screen bg-black p-6 text-[#f5f5f5]">
      <div className="mx-auto w-full max-w-md space-y-8 py-10">
        <div className="space-y-2">
          <p className="text-sm uppercase tracking-[0.35em] text-[#a3a3a3]">
            Camp Office
          </p>

          <h1 className="text-4xl font-bold tracking-tight">
            Camp Roster
          </h1>

          <p className="text-[#a3a3a3]">
            Players, rankings, and arrivals.
          </p>
        </div>

        <div className="space-y-3">
          {playersByLastName.map((player) => (
            <Link
              key={player.slug}
              href={`/camp-office/roster/${player.slug}`}
              className="block rounded-2xl border border-[#242424] bg-[#24201c] p-4 transition hover:border-[#3a3a3a] hover:bg-[#2a251f]"
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex min-w-0 items-center gap-4">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-[#3a3a3a] bg-black text-base font-bold text-[#f5f5f5]">
                    {player.initials}
                  </div>

                  <div className="min-w-0">
                    <h2 className="truncate text-xl font-bold">
                      {player.name}
                    </h2>

                    <p className="mt-1 text-sm text-[#a3a3a3]">
                      Room {player.room} · {player.arrival}
                    </p>
                  </div>
                </div>

                <div
                  className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border text-2xl font-bold ${rankStyles[player.rank]}`}
                >
                  {player.rank}
                </div>
              </div>
            </Link>
          ))}
        </div>

        <Link
          href="/camp-office"
          className="block text-center text-sm text-[#a3a3a3]"
        >
          ← Back to Camp Office
        </Link>
      </div>
    </main>
  );
}
