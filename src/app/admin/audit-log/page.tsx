"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type AuditLogRow = {
  id: string;
  created_at: string | null;
  actor_player_id: string | null;
  actor_name: string | null;
  action_type: string;
  entity_type: string;
  entity_id: string | null;
  summary: string;
  old_value: unknown;
  new_value: unknown;
  metadata: unknown;
};

function formatDate(value: string | null) {
  return value ? new Date(value).toLocaleString() : "No timestamp";
}

export default function AdminAuditLogPage() {
  const [rows, setRows] = useState<AuditLogRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [actorFilter, setActorFilter] = useState("");
  const [entityFilter, setEntityFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("");

  async function fetchRows() {
    setIsLoading(true);

    let query = supabase
      .from("audit_log")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);

    if (entityFilter !== "all") {
      query = query.eq("entity_type", entityFilter);
    }

    if (dateFilter) {
      const start = new Date(`${dateFilter}T00:00:00`);
      const end = new Date(`${dateFilter}T23:59:59.999`);
      query = query
        .gte("created_at", start.toISOString())
        .lte("created_at", end.toISOString());
    }

    const { data, error: fetchError } = await query;

    console.log("Admin audit_log fetch:", { data, error: fetchError });

    if (fetchError) {
      setRows([]);
      setError(fetchError.message || "Could not load audit log.");
      setIsLoading(false);
      return;
    }

    setRows((data as AuditLogRow[]) || []);
    setError("");
    setIsLoading(false);
  }

  useEffect(() => {
    window.setTimeout(() => {
      fetchRows();
    }, 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entityFilter, dateFilter]);

  const entityTypes = useMemo(
    () =>
      Array.from(new Set(rows.map((row) => row.entity_type).filter(Boolean))).sort(),
    [rows],
  );

  const filteredRows = useMemo(() => {
    const normalizedActor = actorFilter.trim().toLowerCase();

    if (!normalizedActor) {
      return rows;
    }

    return rows.filter((row) =>
      String(row.actor_name || "Unknown")
        .toLowerCase()
        .includes(normalizedActor),
    );
  }, [actorFilter, rows]);

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(244,241,234,0.08),transparent_34%),#050505] p-5 text-[#f5f5f5]">
      <Link href="/admin" className="gc-back-link gc-floating-back gc-back-admin">
        ← BACK
      </Link>
      <div className="mx-auto w-full max-w-md space-y-6 py-8">
        <header className="space-y-3">
          <div>
            <p className="font-mono text-[10px] font-black uppercase tracking-[0.24em] text-[#a8a29a]">
              Admin
            </p>
            <h1 className="mt-2 text-4xl font-black tracking-tight">
              Audit Log
            </h1>
            <p className="mt-2 text-sm leading-6 text-[#a3a3a3]">
              Recent commissioner-visible changes across the app.
            </p>
          </div>
        </header>

        <section className="space-y-3 rounded-2xl border border-[#2b2b27] bg-[#0d0d0b] p-5 shadow-[0_18px_55px_rgba(0,0,0,0.42)]">
          <div className="grid grid-cols-1 gap-3">
            <input
              type="search"
              value={actorFilter}
              onChange={(event) => setActorFilter(event.target.value)}
              placeholder="Filter by actor"
              className="w-full rounded-xl border border-[#34312a] bg-black/50 px-4 py-3 text-sm outline-none placeholder:text-[#756f66] focus:border-[#f5f5f5]"
            />

            <select
              value={entityFilter}
              onChange={(event) => setEntityFilter(event.target.value)}
              className="w-full rounded-xl border border-[#34312a] bg-black/50 px-4 py-3 text-sm outline-none focus:border-[#f5f5f5]"
            >
              <option value="all">All entity types</option>
              {entityTypes.map((entityType) => (
                <option key={entityType} value={entityType}>
                  {entityType}
                </option>
              ))}
            </select>

            <input
              type="date"
              value={dateFilter}
              onChange={(event) => setDateFilter(event.target.value)}
              className="w-full rounded-xl border border-[#34312a] bg-black/50 px-4 py-3 text-sm outline-none focus:border-[#f5f5f5]"
            />
          </div>

          <button
            type="button"
            onClick={fetchRows}
            className="w-full rounded-xl border border-[#34312a] px-4 py-3 text-sm font-black text-[#c8bfae] transition hover:border-[#f5f5f5] hover:text-[#f5f5f5]"
          >
            Refresh
          </button>
        </section>

        <section className="overflow-hidden rounded-2xl border border-[#2b2b27] bg-[#0d0d0b] shadow-[0_18px_55px_rgba(0,0,0,0.42)]">
          <div className="border-b border-[#34312a] bg-[#151411] px-5 py-4">
            <p className="font-mono text-[10px] font-black uppercase tracking-[0.2em] text-[#a8a29a]">
              Recent Entries
            </p>
            <h2 className="mt-1 text-2xl font-black">
              {filteredRows.length} Logged
            </h2>
          </div>

          {isLoading && (
            <p className="px-5 py-6 text-sm font-semibold text-[#a3a3a3]">
              Loading audit log...
            </p>
          )}

          {error && (
            <p className="px-5 py-6 text-sm font-semibold text-[#fca5a5]">
              {error}
            </p>
          )}

          {!isLoading && !error && filteredRows.length === 0 && (
            <p className="px-5 py-6 text-sm font-semibold text-[#a3a3a3]">
              No audit entries found.
            </p>
          )}

          {!isLoading &&
            !error &&
            filteredRows.map((row) => (
              <article
                key={row.id}
                className="border-b border-[#242420] px-5 py-4 last:border-b-0"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-[#34312a] px-2 py-0.5 font-mono text-[9px] font-black uppercase tracking-[0.16em] text-[#c8bfae]">
                    {row.action_type}
                  </span>
                  <span className="rounded-full border border-[#34312a] px-2 py-0.5 font-mono text-[9px] font-black uppercase tracking-[0.16em] text-[#a8a29a]">
                    {row.entity_type}
                  </span>
                </div>
                <p className="mt-2 text-sm font-semibold leading-5 text-[#f4f1ea]">
                  {row.summary}
                </p>
                <p className="mt-2 text-xs leading-5 text-[#82786a]">
                  {formatDate(row.created_at)} · {row.actor_name || "Unknown"}
                </p>
              </article>
            ))}
        </section>
      </div>
    </main>
  );
}
