import Link from "next/link";

export default function DraftPage() {
  return (
    <main className="min-h-screen bg-black p-6 text-[#f5f5f5]">
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center space-y-8 py-8">
        <div className="space-y-2">
          <p className="text-sm uppercase tracking-[0.35em] text-[#a3a3a3]">
            Golf Camp 2026
          </p>

          <h1 className="text-4xl font-bold tracking-tight">Live Draft</h1>

          <p className="text-[#a3a3a3]">
            Draft sessions, team boards, and pick tracking.
          </p>
        </div>

        <section className="rounded-2xl border border-[#242424] bg-[#111111] p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#d4d4d4]">
            Coming Soon
          </p>

          <h2 className="mt-2 text-2xl font-bold">Draft command center</h2>

          <p className="mt-3 text-sm leading-6 text-[#a3a3a3]">
            The database scaffolding is ready for draft sessions, teams, and
            picks. The live draft experience will land here when the rules and
            flow are locked.
          </p>
        </section>

        <Link href="/home" className="text-center text-sm text-[#a3a3a3]">
          ← Back to Dashboard
        </Link>
      </div>
    </main>
  );
}
