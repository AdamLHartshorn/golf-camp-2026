"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ActivityFeedItem } from "@/lib/activityFeed";
import { logAuditEvent } from "@/lib/auditLog";
import { supabase } from "@/lib/supabase";
import { CampFeedAdminForm } from "@/app/admin/CampFeedAdminForm";

function formatDate(value: string | null) {
  return value ? new Date(value).toLocaleString() : "No timestamp";
}

export default function AdminCampFeedPage() {
  const [items, setItems] = useState<ActivityFeedItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState("");

  async function fetchItems() {
    setIsLoading(true);

    const { data, error: fetchError } = await supabase
      .from("activity_feed")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);

    console.log("Admin activity_feed fetch:", { data, error: fetchError });

    if (fetchError) {
      setItems([]);
      setError(fetchError.message || "Could not load feed items.");
      setIsLoading(false);
      return;
    }

    setItems((data as ActivityFeedItem[]) || []);
    setError("");
    setIsLoading(false);
  }

  useEffect(() => {
    let isCurrent = true;

    async function loadItems() {
      const { data, error: fetchError } = await supabase
        .from("activity_feed")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);

      console.log("Admin activity_feed fetch:", { data, error: fetchError });

      if (!isCurrent) {
        return;
      }

      if (fetchError) {
        setItems([]);
        setError(fetchError.message || "Could not load feed items.");
        setIsLoading(false);
        return;
      }

      setItems((data as ActivityFeedItem[]) || []);
      setError("");
      setIsLoading(false);
    }

    loadItems();

    return () => {
      isCurrent = false;
    };
  }, []);

  async function handleDeleteItem(item: ActivityFeedItem) {
    if (!window.confirm("Delete this LIVE CAMP FEED item?")) {
      return;
    }

    setMessage("");
    setError("");
    setDeletingId(item.id);

    const { data, error: deleteError } = await supabase
      .from("activity_feed")
      .delete()
      .eq("id", item.id)
      .select();

    console.log("Admin activity_feed delete:", {
      item,
      data,
      error: deleteError,
    });

    setDeletingId("");

    if (deleteError) {
      setError(deleteError.message || "Could not delete feed item.");
      return;
    }

    setItems((currentItems) =>
      currentItems.filter((currentItem) => currentItem.id !== item.id),
    );
    setMessage("Feed item deleted.");
    await logAuditEvent({
      actionType: "camp_feed_post_deleted",
      entityType: "activity_feed",
      entityId: item.id,
      summary: `Admin deleted LIVE CAMP FEED item: ${item.message.slice(0, 80)}`,
      oldValue: item,
    });
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(143,166,106,0.08),transparent_34%),#050505] p-5 text-[#f5f5f5]">
      <div className="mx-auto w-full max-w-md space-y-6 py-8">
        <header className="space-y-3">
          <Link href="/admin" className="text-2xl text-[#a3a3a3]">
            ‹
          </Link>

          <div>
            <p className="font-mono text-[10px] font-black uppercase tracking-[0.24em] text-[#8fa66a]">
              Admin
            </p>
            <h1 className="mt-2 text-4xl font-black tracking-tight">
              Camp Feed
            </h1>
            <p className="mt-2 text-sm leading-6 text-[#a3a3a3]">
              Post updates and remove stale LIVE CAMP FEED entries. This does
              not delete source records like ledger events or scores.
            </p>
          </div>
        </header>

        <CampFeedAdminForm />

        <section className="overflow-hidden rounded-2xl border border-[#2b2b27] bg-[#0d0d0b] shadow-[0_18px_55px_rgba(0,0,0,0.42)]">
          <div className="flex items-center justify-between gap-3 border-b border-[#34312a] bg-[#151411] px-5 py-4">
            <div>
              <p className="font-mono text-[10px] font-black uppercase tracking-[0.2em] text-[#a8a29a]">
                Recent Items
              </p>
              <h2 className="mt-1 text-2xl font-black">Feed Cleanup</h2>
            </div>
            <button
              type="button"
              onClick={fetchItems}
              className="rounded-full border border-[#34312a] px-3 py-2 text-xs font-black text-[#c8bfae] transition hover:border-[#8fa66a] hover:text-[#f5f5f5]"
            >
              Refresh
            </button>
          </div>

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

          {isLoading && (
            <p className="px-5 py-6 text-sm font-semibold text-[#a3a3a3]">
              Loading feed items...
            </p>
          )}

          {!isLoading && items.length === 0 && (
            <p className="px-5 py-6 text-sm font-semibold text-[#a3a3a3]">
              No feed items found.
            </p>
          )}

          {!isLoading &&
            items.map((item) => (
              <div
                key={item.id}
                className="border-b border-[#242420] px-5 py-4 last:border-b-0"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-[#8fa66a]/35 px-2 py-0.5 font-mono text-[9px] font-black uppercase tracking-[0.16em] text-[#8fa66a]">
                    {item.source || "Camp"}
                  </span>
                  <span className="rounded-full border border-[#34312a] px-2 py-0.5 font-mono text-[9px] font-black uppercase tracking-[0.16em] text-[#a8a29a]">
                    {item.type || "update"}
                  </span>
                  <span className="text-[11px] font-semibold text-[#756f66]">
                    {formatDate(item.created_at)}
                  </span>
                </div>

                <p className="mt-2 text-sm font-semibold leading-5 text-[#f4f1ea]">
                  {item.message}
                </p>

                <button
                  type="button"
                  onClick={() => handleDeleteItem(item)}
                  disabled={deletingId === item.id}
                  className="mt-3 rounded-xl border border-[#5a2b33] px-3 py-2 text-xs font-black text-[#fca5a5] transition hover:bg-[#1a0d10] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {deletingId === item.id ? "Deleting..." : "Delete Feed Item"}
                </button>
              </div>
            ))}
        </section>

        <Link href="/admin" className="block text-center text-sm text-[#a3a3a3]">
          ← Back to Admin
        </Link>
      </div>
    </main>
  );
}
