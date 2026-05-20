import Link from "next/link";

const tools = [
  {
    title: "Export Data",
    description: "Coming soon",
  },
  {
    title: "Archive Current Year",
    description: "Coming soon",
  },
  {
    title: "Reset Test Data",
    description: "Coming soon",
  },
  {
    title: "Start New Camp Year",
    description: "Coming soon",
  },
];

export default function SystemAdminPage() {
  return (
    <main className="min-h-screen bg-black p-6 text-[#f5f5f5]">
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center space-y-8 py-8">
        <div className="space-y-2">
          <p className="text-sm uppercase tracking-[0.35em] text-[#a3a3a3]">
            Admin
          </p>

          <h1 className="text-4xl font-bold tracking-tight">
            System Tools
          </h1>

          <p className="text-[#a3a3a3]">
            Exports, resets, archives, and future year setup.
          </p>
        </div>

        <section className="space-y-4">
          {tools.map((tool) => (
            <div
              key={tool.title}
              className="rounded-2xl border border-[#242424] bg-[#0b0b0b] p-5 opacity-70"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#a3a3a3]">
                System
              </p>

              <h2 className="mt-2 text-xl font-bold">{tool.title}</h2>

              <p className="mt-1 text-sm text-[#a3a3a3]">
                {tool.description}
              </p>
            </div>
          ))}
        </section>

        <Link href="/admin" className="text-center text-sm text-[#a3a3a3]">
          ← Back to Admin
        </Link>
      </div>
    </main>
  );
}
