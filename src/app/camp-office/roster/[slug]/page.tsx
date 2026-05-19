import Link from "next/link";
import { notFound } from "next/navigation";
import { getPlayerBySlug, players } from "../../_data/roster";

export function generateStaticParams() {
  return players.map((player) => ({
    slug: player.slug,
  }));
}

export default async function PlayerProfilePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const player = getPlayerBySlug(slug);

  if (!player) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-black p-6 text-[#f5f5f5]">
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center space-y-8 py-8">
        <div className="space-y-5">
          <div className="flex justify-center">
            <div className="flex h-28 w-28 items-center justify-center rounded-full border border-[#3a3a3a] bg-[#111111] text-4xl font-bold">
              {player.initials}
            </div>
          </div>

          <div className="space-y-2 text-center">
            <p className="text-sm uppercase tracking-[0.35em] text-[#a3a3a3]">
              Camp Roster
            </p>

            <h1 className="text-4xl font-bold tracking-tight">
              {player.name}
            </h1>

            <p className="text-[#a3a3a3]">
              Rank {player.rank} · Room {player.room}
            </p>
          </div>
        </div>

        <section className="rounded-2xl border border-[#242424] bg-[#111111] p-5">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-[#242424] bg-black/30 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-[#a3a3a3]">
                Rank
              </p>

              <p className="mt-2 text-3xl font-bold">{player.rank}</p>
            </div>

            <div className="rounded-xl border border-[#242424] bg-black/30 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-[#a3a3a3]">
                Room
              </p>

              <p className="mt-2 text-3xl font-bold">{player.room}</p>
            </div>
          </div>

          <div className="mt-4 rounded-xl border border-[#242424] bg-black/30 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-[#a3a3a3]">
              Arrival
            </p>

            <p className="mt-2 text-lg font-semibold">{player.arrival}</p>
          </div>
        </section>

        <section className="space-y-3">
          {[
            ["Contact Info", player.contact],
            ["Handicap", player.handicap],
            ["Notes", player.notes],
          ].map(([label, value]) => (
            <div
              key={label}
              className="rounded-2xl border border-[#242424] bg-[#111111] p-5"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#a3a3a3]">
                {label}
              </p>

              <p className="mt-2 text-sm leading-6 text-[#f5f5f5]">
                {value}
              </p>
            </div>
          ))}
        </section>

        <Link
          href="/camp-office/roster"
          className="text-center text-sm text-[#a3a3a3]"
        >
          ← Back to Camp Roster
        </Link>
      </div>
    </main>
  );
}
