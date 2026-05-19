import Link from "next/link";

const cards = [
  {
    name: "Rules",
    href: "/shenanigans/rules",
    description:
      "Official format, Bank points, wagers, side games, and settlement rules.",
    featured: true,
  },
  {
    name: "Log Event",
    href: "/shenanigans/log-event",
    description: "Add Bank points, wagers, side games, or custom chaos.",
    featured: true,
  },
  {
    name: "The Bank",
    href: "/shenanigans/bank",
    description: "Structured points and standard prop values.",
  },
  {
    name: "Ledger",
    href: "/shenanigans/ledger",
    description: "Live point totals and round activity.",
  },
  {
    name: "Settlement",
    href: "/shenanigans/settlement",
    description: "Calculate final point payouts.",
  },
  {
    name: "Wagers",
    href: "/shenanigans/wagers",
    description: "Track player-to-player action.",
  },
  {
    name: "Side Games",
    href: "/shenanigans/side-games",
    description: "Bocce, basket-golf, and whatever else gets invented.",
  },
];

export default function ShenanigansPage() {
  return (
    <main className="min-h-screen bg-black p-6 text-[#f5f5f5]">
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center space-y-8">
        <div className="space-y-2">
          <p className="text-sm uppercase tracking-[0.35em] text-[#a3a3a3]">
            Golf Camp 2026
          </p>

          <h1 className="text-4xl font-bold tracking-tight text-[#b91c1c]">
            Shenanigans
          </h1>

          <p className="text-[#a3a3a3]">
            Points, wagers, props, and bad decisions.
          </p>
        </div>

        <div className="space-y-4">
          {cards.map((card) => (
            <Link
              key={card.name}
              href={card.href}
              className={`block min-h-[116px] rounded-2xl border p-5 transition-colors duration-200 ${
                card.featured
                  ? "border-[#b91c1c] bg-[#b91c1c] text-[#f5f5f5] hover:border-[#991b1b] hover:bg-[#991b1b]"
                  : "border-[#242424] bg-[#111111] hover:border-[#b91c1c]"
              }`}
            >
              <div className="flex h-full items-center justify-between gap-4">
                <div className="min-w-0 space-y-1">
                  <h2 className="text-2xl font-bold leading-tight">
                    {card.name}
                  </h2>

                  <p
                    className={`text-sm leading-5 ${
                      card.featured ? "text-[#f5f5f5]/80" : "text-[#a3a3a3]"
                    }`}
                  >
                    {card.description}
                  </p>
                </div>

                <span
                  className={`shrink-0 self-center text-2xl leading-none ${
                    card.featured ? "text-[#f5f5f5]" : "text-[#b91c1c]"
                  }`}
                >
                  →
                </span>
              </div>
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
