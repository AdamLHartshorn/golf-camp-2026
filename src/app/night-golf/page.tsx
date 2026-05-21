import Link from "next/link";

const nights = [
  {
    name: "Tuesday",
    href: "/night-golf/tuesday",
    description: "June 23",
  },
  {
    name: "Wednesday",
    href: "/night-golf/wednesday",
    description: "June 24",
  },
  {
    name: "Thursday",
    href: "/night-golf/thursday",
    description: "June 25",
  },
  {
    name: "Friday",
    href: "/night-golf/friday",
    description: "June 26",
  },
  {
    name: "Saturday",
    href: "/night-golf/saturday",
    description: "June 27",
  },
];

export default function NightGolfPage() {
  return (
    <main className="min-h-screen bg-black text-[#f5f5f5] p-6">
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center space-y-8">
        <div className="space-y-2">
          <p className="text-sm uppercase tracking-[0.35em] text-[#a3a3a3]">
            Golf Camp 2026
          </p>

          <h1 className="text-4xl font-bold tracking-tight text-[#f472b6]">
            Night Golf
          </h1>

          <p className="text-[#a3a3a3]">
            Read the rules, then select a night.
          </p>
        </div>

        <div className="space-y-4">
          <Link
            href="/night-golf/rules"
            className="block rounded-2xl bg-[#db2777] p-5 transition hover:opacity-90"
          >
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-black">
                  Rules
                </h2>

                <p className="mt-1 text-sm text-black/70">
                  Format, scoring, target rules, and tiebreakers.
                </p>
              </div>

              <span className="text-2xl text-black">→</span>
            </div>
          </Link>

          {nights.map((night) => (
            <Link
              key={night.name}
              href={night.href}
              className="block rounded-2xl border border-[#242424] bg-[#111111] p-5 transition hover:border-[#ec4899]"
            >
              <h2 className="text-2xl font-bold">{night.name}</h2>

              <p className="mt-1 text-sm text-[#a3a3a3]">
                {night.description}
              </p>
            </Link>
          ))}
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