import Link from "next/link";
import { roomAssignments } from "../_data/roster";

export default function RoomAssignmentsPage() {
  return (
    <main className="min-h-screen bg-black p-6 text-[#f5f5f5]">
      <div className="mx-auto w-full max-w-md space-y-8 py-10">
        <div className="space-y-2">
          <p className="text-sm uppercase tracking-[0.35em] text-[#a3a3a3]">
            Camp Office
          </p>

          <h1 className="text-4xl font-bold tracking-tight">
            Room Assignments
          </h1>

          <p className="text-[#a3a3a3]">
            Hotel room organization and arrivals.
          </p>
        </div>

        <div className="space-y-4">
          {roomAssignments.map((room) => (
            <section
              key={room.room}
              className="rounded-2xl border border-[#242424] bg-[#111111] p-5"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#a3a3a3]">
                    Room #
                  </p>

                  <h2 className="mt-2 text-3xl font-bold">{room.room}</h2>
                </div>

                <span className="rounded-full border border-[#242424] px-3 py-1 text-sm font-bold text-[#f5f5f5]">
                  {room.players.length} players
                </span>
              </div>

              <div className="mt-5 space-y-3">
                {room.players.map((player) => (
                  <div
                    key={player.slug}
                    className="flex items-center justify-between gap-4 border-t border-[#242424] pt-3"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#3a3a3a] bg-black text-sm font-bold">
                        {player.initials}
                      </div>

                      <p className="truncate font-semibold">{player.name}</p>
                    </div>

                    <span className="shrink-0 text-sm font-bold text-[#a3a3a3]">
                      {player.rank}
                    </span>
                  </div>
                ))}
              </div>

              <div className="mt-5 rounded-xl border border-[#242424] bg-black/30 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-[#a3a3a3]">
                  Arrival Timing
                </p>

                <p className="mt-2 text-sm leading-6 text-[#f5f5f5]">
                  {room.arrivals.join(" / ")}
                </p>
              </div>
            </section>
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
