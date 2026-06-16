"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { logAuditEvent } from "@/lib/auditLog";
import { supabase } from "@/lib/supabase";

type AppFeedbackRow = {
  id: string;
  message: string;
  created_by_player_id: string | null;
  created_by_name: string | null;
  status: string;
  created_at: string | null;
  updated_at: string | null;
};

function formatDate(value: string | null) {
  return value ? new Date(value).toLocaleString() : "No timestamp";
}

export default function AdminAppFeedbackPage() {
  const [items, setItems] = useState<AppFeedbackRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [savingId, setSavingId] = useState("");

  async function fetchFeedback() {
    setIsLoading(true);

    const { data, error: fetchError } = await supabase
      .from("app_feedback")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);

    console.log("Admin app_feedback fetch:", { data, error: fetchError });

    if (fetchError) {
      setItems([]);
      setError(
        fetchError.code === "42P01"
          ? "App Feedback needs the Supabase setup SQL before submissions can be reviewed."
          : fetchError.message || "Could not load app feedback.",
      );
      setIsLoading(false);
      return;
    }

    setItems((data as AppFeedbackRow[]) || []);
    setError("");
    setIsLoading(false);
  }

  async function handleUpdateStatus(item: AppFeedbackRow, nextStatus: string) {
    setMessage("");
    setError("");
    setSavingId(item.id);

    const { data, error: updateError } = await supabase
      .from("app_feedback")
      .update({
        status: nextStatus,
        updated_at: new Date().toISOString(),
      })
      .eq("id", item.id)
      .select("*")
      .single();

    setSavingId("");

    if (updateError) {
      setError(updateError.message || "Could not update feedback status.");
      return;
    }

    setItems((currentItems) =>
      currentItems.map((currentItem) =>
        currentItem.id === item.id ? (data as AppFeedbackRow) : currentItem,
      ),
    );
    setMessage(`Feedback marked ${nextStatus}.`);

    await logAuditEvent({
      actionType: "app_feedback_status_updated",
      entityType: "app_feedback",
      entityId: item.id,
      summary: `App feedback marked ${nextStatus}.`,
      oldValue: item,
      newValue: data,
    });
  }

  async function handleDeleteFeedback(item: AppFeedbackRow) {
    if (!window.confirm("Delete this app feedback item?")) {
      return;
    }

    setMessage("");
    setError("");
    setSavingId(item.id);

    const { error: deleteError } = await supabase
      .from("app_feedback")
      .delete()
      .eq("id", item.id);

    setSavingId("");

    if (deleteError) {
      setError(deleteError.message || "Could not delete feedback.");
      return;
    }

    setItems((currentItems) =>
      currentItems.filter((currentItem) => currentItem.id !== item.id),
    );
    setMessage("Feedback deleted.");

    await logAuditEvent({
      actionType: "app_feedback_deleted",
      entityType: "app_feedback",
      entityId: item.id,
      summary: `Admin deleted app feedback: ${item.message.slice(0, 80)}`,
      oldValue: item,
    });
  }

  useEffect(() => {
    let isCurrent = true;

    async function loadFeedback() {
      const { data, error: fetchError } = await supabase
        .from("app_feedback")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);

      console.log("Admin app_feedback fetch:", { data, error: fetchError });

      if (!isCurrent) {
        return;
      }

      if (fetchError) {
        setItems([]);
        setError(
          fetchError.code === "42P01"
            ? "App Feedback needs the Supabase setup SQL before submissions can be reviewed."
            : fetchError.message || "Could not load app feedback.",
        );
        setIsLoading(false);
        return;
      }

      setItems((data as AppFeedbackRow[]) || []);
      setError("");
      setIsLoading(false);
    }

    loadFeedback();

    return () => {
      isCurrent = false;
    };
  }, []);

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(244,241,234,0.08),transparent_34%),#050505] p-5 text-[#f5f5f5]">
      <Link href="/admin" className="gc-back-link gc-floating-back gc-back-admin">
        ← BACK
      </Link>

      <div className="mx-auto w-full max-w-md space-y-6 py-8">
        <header className="space-y-3">
          <div>
            <p className="font-mono text-[10px] font-black uppercase tracking-[0.24em] text-[#b98590]">
              Admin
            </p>
            <h1 className="mt-2 text-4xl font-black tracking-tight">
              App Feedback
            </h1>
            <p className="mt-2 text-sm leading-6 text-[#a3a3a3]">
              Player-submitted notes, bugs, and ideas for the Golf Camp app.
            </p>
          </div>
        </header>

        <section className="overflow-hidden rounded-2xl border border-[#2b2b27] bg-[#0d0d0b] shadow-[0_18px_55px_rgba(0,0,0,0.42)]">
          <div className="flex items-center justify-between gap-3 border-b border-[#34312a] bg-[#151411] px-5 py-4">
            <div>
              <p className="font-mono text-[10px] font-black uppercase tracking-[0.2em] text-[#a8a29a]">
                Recent Notes
              </p>
              <h2 className="mt-1 text-2xl font-black">
                {items.length} Submitted
              </h2>
            </div>

            <button
              type="button"
              onClick={fetchFeedback}
              className="rounded-full border border-[#34312a] px-3 py-2 text-xs font-black text-[#c8bfae] transition hover:border-[#b98590] hover:text-[#f5f5f5]"
            >
              Refresh
            </button>
          </div>

          {isLoading && (
            <p className="px-5 py-6 text-sm font-semibold text-[#a3a3a3]">
              Loading feedback...
            </p>
          )}

          {message && (
            <p className="border-b border-[#242420] px-5 py-3 text-sm font-semibold text-[#8fa66a]">
              {message}
            </p>
          )}

          {error && (
            <p className="border-b border-[#242420] px-5 py-3 text-sm font-semibold text-[#fca5a5]">
              {error}
            </p>
          )}

          {!isLoading && !error && items.length === 0 && (
            <p className="px-5 py-6 text-sm font-semibold text-[#a3a3a3]">
              No app feedback submitted yet.
            </p>
          )}

          {!isLoading &&
            !error &&
            items.map((item) => (
              <article
                key={item.id}
                className="border-b border-[#242420] px-5 py-4 last:border-b-0"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-[#b98590]/45 px-2 py-0.5 font-mono text-[9px] font-black uppercase tracking-[0.16em] text-[#d7a8b0]">
                    {item.status || "new"}
                  </span>
                  <span className="text-[11px] font-semibold text-[#756f66]">
                    {formatDate(item.created_at)}
                  </span>
                </div>

                <p className="mt-3 whitespace-pre-wrap text-sm font-semibold leading-6 text-[#f4f1ea]">
                  {item.message}
                </p>

                <p className="mt-3 text-xs leading-5 text-[#82786a]">
                  Submitted by {item.created_by_name || "Anonymous"}
                </p>

                <div className="mt-4 grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => handleUpdateStatus(item, "reviewed")}
                    disabled={savingId === item.id || item.status === "reviewed"}
                    className="rounded-xl border border-[#34312a] px-3 py-2 text-[11px] font-black text-[#c8bfae] transition hover:border-[#b98590] hover:text-[#f5f5f5] disabled:cursor-not-allowed disabled:opacity-45"
                  >
                    Reviewed
                  </button>
                  <button
                    type="button"
                    onClick={() => handleUpdateStatus(item, "archived")}
                    disabled={savingId === item.id || item.status === "archived"}
                    className="rounded-xl border border-[#34312a] px-3 py-2 text-[11px] font-black text-[#c8bfae] transition hover:border-[#b98590] hover:text-[#f5f5f5] disabled:cursor-not-allowed disabled:opacity-45"
                  >
                    Archive
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteFeedback(item)}
                    disabled={savingId === item.id}
                    className="rounded-xl border border-[#5a2b33] px-3 py-2 text-[11px] font-black text-[#fca5a5] transition hover:bg-[#1a0d10] disabled:cursor-not-allowed disabled:opacity-45"
                  >
                    Delete
                  </button>
                </div>
              </article>
            ))}
        </section>
      </div>
    </main>
  );
}
