import Link from "next/link";

const cards = [
  {
    name: "Camp Roster",
    href: "/camp-office/roster",
    description: "Players, ranks, arrivals, and profiles.",
  },
  {
    name: "Room Assignments",
    href: "/camp-office/rooms",
    description: "Hotel room organization and arrivals.",
  },
];

export default function CampOfficePage() {
  return (
    <main className="min-h-screen bg-black p-6 text-[#f5f5f5]">
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center space-y-8">
        <div className="space-y-2">
          <p className="text-sm uppercase tracking-[0.35em] text-[#a3a3a3]">
            Golf Camp 2026
          </p>

          <h1 className="text-4xl font-bold tracking-tight">
            Camp Office
          </h1>

          <p className="text-[#a3a3a3]">
            Camp roster, room assignments, and logistics.
          </p>
        </div>

        <div className="space-y-4">
          {cards.map((card) => (
            <Link
              key={card.name}
              href={card.href}
              className="block rounded-2xl border border-[#242424] bg-[#111111] p-5 transition hover:border-[#f5f5f5]"
            >
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold">{card.name}</h2>

                  <p className="mt-1 text-sm text-[#a3a3a3]">
                    {card.description}
                  </p>
                </div>

                <span className="text-2xl text-[#f5f5f5]">→</span>
              </div>
            </Link>
          ))}
        </div>

        <div className="border-t border-[#242424] pt-4">
          <Link
            href="/my-profile"
            className="block rounded-2xl border border-[#242424] bg-[#111111] p-5 transition hover:border-[#f5f5f5]"
          >
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold">My Profile</h2>

                <p className="mt-1 text-sm text-[#a3a3a3]">
                  View your camp profile and change your PIN.
                </p>
              </div>

              <span className="text-2xl text-[#f5f5f5]">→</span>
            </div>
          </Link>
        </div>

        <Link
          href="/home"
          className="text-center text-sm text-[#a3a3a3]"
        >
          ← Back to Camp Dashboard
        </Link>
      </div>
    </main>
  );
}
