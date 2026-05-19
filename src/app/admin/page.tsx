import Link from "next/link";

export default function AdminPage() {
  return (
    <main className="min-h-screen bg-black p-6 text-[#f5f5f5]">
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center space-y-8">
        <div className="space-y-2">
          <p className="text-sm uppercase tracking-[0.35em] text-[#a3a3a3]">
            Golf Camp 2026
          </p>

          <h1 className="text-4xl font-bold tracking-tight">
            Admin
          </h1>

          <p className="text-[#a3a3a3]">
            Manage camp operations.
          </p>
        </div>

        <div className="space-y-4">
          <Link
            href="/admin/night-golf"
            className="block rounded-2xl border border-[#f5f5f5] bg-[#111111] p-5 transition hover:bg-[#171717]"
          >
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold">
                  Night Golf Admin
                </h2>

                <p className="mt-1 text-sm text-[#a3a3a3]">
                  Review, delete, and reset score submissions.
                </p>
              </div>

              <span className="text-2xl text-[#f5f5f5]">→</span>
            </div>
          </Link>

          <div className="rounded-2xl border border-[#242424] bg-[#0b0b0b] p-5 opacity-60">
            <h2 className="text-xl font-semibold">Shenanigans Admin</h2>

            <p className="mt-1 text-sm text-[#a3a3a3]">
              Coming soon.
            </p>
          </div>

          <div className="rounded-2xl border border-[#242424] bg-[#0b0b0b] p-5 opacity-60">
            <h2 className="text-xl font-semibold">Camp Office Admin</h2>

            <p className="mt-1 text-sm text-[#a3a3a3]">
              Coming soon.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
