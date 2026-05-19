import Link from "next/link";

const finalTotals = [
  { name: "Alex's Grandma", points: 34, net: 26 },
  { name: "Adam", points: 28, net: 2 },
  { name: "Nick", points: 26, net: -6 },
  { name: "Jesse", points: 22, net: -22 },
].sort((a, b) => b.points - a.points);

const paymentRows = [
  { payer: "Jesse", receiver: "Nick", amount: 4 },
  { payer: "Jesse", receiver: "Adam", amount: 6 },
  { payer: "Jesse", receiver: "Alex's Grandma", amount: 12 },
  { payer: "Nick", receiver: "Adam", amount: 2 },
  { payer: "Nick", receiver: "Alex's Grandma", amount: 8 },
  { payer: "Adam", receiver: "Alex's Grandma", amount: 6 },
];

function formatMoney(amount: number) {
  const prefix = amount > 0 ? "+" : amount < 0 ? "-" : "";

  return `${prefix}$${Math.abs(amount)}`;
}

export default function ShenanigansSettlementPage() {
  return (
    <main className="min-h-screen bg-black p-6 text-[#f5f5f5]">
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center space-y-8 py-8">
        <div className="space-y-2">
          <p className="text-sm uppercase tracking-[0.35em] text-[#b91c1c]">
            Shenanigans
          </p>

          <h1 className="text-4xl font-bold tracking-tight">
            Settlement
          </h1>

          <p className="text-[#a3a3a3]">
            Final points, units, and payouts.
          </p>
        </div>

        <section className="rounded-2xl border border-[#242424] bg-[#111111] p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#b91c1c]">
                Unit Value
              </p>

              <h2 className="mt-2 text-xl font-bold">$1 per point</h2>
            </div>

            <span className="rounded-full border border-[#b91c1c]/70 px-3 py-1 text-sm font-bold text-[#f5f5f5]">
              Preview
            </span>
          </div>
        </section>

        <section className="space-y-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#b91c1c]">
              Final Point Totals
            </p>

            <h2 className="mt-2 text-xl font-bold">Closing Board</h2>
          </div>

          <div className="space-y-3">
            {finalTotals.map((player, index) => (
              <div
                key={player.name}
                className="rounded-2xl border border-[#242424] bg-[#111111] p-4"
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#242424] text-sm font-bold text-[#a3a3a3]">
                      {index + 1}
                    </span>

                    <div className="min-w-0">
                      <h3 className="truncate text-lg font-semibold">
                        {player.name}
                      </h3>

                      <p className="text-xs uppercase tracking-[0.2em] text-[#a3a3a3]">
                        Final total
                      </p>
                    </div>
                  </div>

                  <p className="text-2xl font-bold text-[#f5f5f5]">
                    {player.points}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#b91c1c]">
              Net Settlement
            </p>

            <h2 className="mt-2 text-xl font-bold">After Everyone Pays Up</h2>
          </div>

          <div className="rounded-2xl border border-[#242424] bg-[#111111] px-5">
            {finalTotals.map((player) => {
              const isPositive = player.net > 0;

              return (
                <div
                  key={player.name}
                  className="flex items-center justify-between gap-4 border-b border-[#242424] py-4 last:border-b-0"
                >
                  <div className="min-w-0">
                    <h3 className="truncate font-semibold">{player.name}</h3>

                    <p className="mt-1 text-sm text-[#a3a3a3]">
                      {player.points} points
                    </p>
                  </div>

                  <span
                    className={`shrink-0 text-xl font-bold ${
                      isPositive ? "text-[#b91c1c]" : "text-[#a3a3a3]"
                    }`}
                  >
                    {formatMoney(player.net)}
                  </span>
                </div>
              );
            })}
          </div>
        </section>

        <section className="space-y-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#b91c1c]">
              Payment Matrix
            </p>

            <h2 className="mt-2 text-xl font-bold">Who Pays Who</h2>
          </div>

          <div className="space-y-3">
            {paymentRows.map((payment) => (
              <div
                key={`${payment.payer}-${payment.receiver}`}
                className="rounded-2xl border border-[#242424] bg-[#111111] p-4"
              >
                <div className="flex items-center justify-between gap-4">
                  <p className="min-w-0 text-sm leading-6 text-[#a3a3a3]">
                    <span className="font-semibold text-[#f5f5f5]">
                      {payment.payer}
                    </span>{" "}
                    pays{" "}
                    <span className="font-semibold text-[#f5f5f5]">
                      {payment.receiver}
                    </span>
                  </p>

                  <span className="shrink-0 rounded-full border border-[#b91c1c]/70 px-3 py-1 text-sm font-bold text-[#f5f5f5]">
                    ${payment.amount}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-[#242424] bg-[#0b0b0b] p-5 opacity-60">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#b91c1c]">
            Coming Soon
          </p>

          <h2 className="mt-2 text-xl font-bold">Live Settlement</h2>

          <p className="mt-2 text-sm leading-6 text-[#a3a3a3]">
            Coming soon — calculate payouts from real ledger totals.
          </p>
        </section>

        <Link
          href="/shenanigans"
          className="text-center text-sm text-[#a3a3a3]"
        >
          ← Back to Shenanigans
        </Link>
      </div>
    </main>
  );
}
