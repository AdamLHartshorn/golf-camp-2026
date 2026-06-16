"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { logAuditEvent } from "@/lib/auditLog";
import {
  DailyScheduleItem,
  formatScheduleTime,
  getScheduleDayIndex,
  groupScheduleItems,
  scheduleDays,
} from "@/lib/dailySchedule";
import { supabase } from "@/lib/supabase";

type ScheduleForm = {
  day: string;
  title: string;
  start_time: string;
  end_time: string;
  description: string;
};

const emptyForm: ScheduleForm = {
  day: "Tuesday",
  title: "",
  start_time: "",
  end_time: "",
  description: "",
};

function itemToForm(item: DailyScheduleItem): ScheduleForm {
  return {
    day: item.day || "Tuesday",
    title: item.title || "",
    start_time: item.start_time || "",
    end_time: item.end_time || "",
    description: item.description || "",
  };
}

function formToPayload(form: ScheduleForm) {
  return {
    day: form.day,
    title: form.title.trim(),
    start_time: form.start_time.trim() || null,
    end_time: form.end_time.trim() || null,
    description: form.description.trim() || null,
  };
}

export default function AdminDailySchedulePage() {
  const [items, setItems] = useState<DailyScheduleItem[]>([]);
  const [form, setForm] = useState<ScheduleForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const editingItem = useMemo(
    () => items.find((item) => item.id === editingId) || null,
    [editingId, items],
  );

  async function fetchItems() {
    setIsLoading(true);

    const { data, error: fetchError } = await supabase
      .from("daily_schedule_items")
      .select("*")
      .order("created_at", { ascending: true });

    console.log("Admin daily_schedule_items fetch:", {
      data,
      error: fetchError,
    });

    if (fetchError) {
      setItems([]);
      setError(fetchError.message || "Could not load schedule items.");
      setIsLoading(false);
      return;
    }

    setItems(
      ((data as DailyScheduleItem[]) || []).sort(
        (a, b) =>
          getScheduleDayIndex(a.day) - getScheduleDayIndex(b.day) ||
          String(a.start_time || "").localeCompare(String(b.start_time || "")),
      ),
    );
    setError("");
    setIsLoading(false);
  }

  useEffect(() => {
    window.setTimeout(() => {
      fetchItems();
    }, 0);
  }, []);

  function updateForm(field: keyof ScheduleForm, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
    setMessage("");
    setError("");
  }

  function resetForm() {
    setForm(emptyForm);
    setEditingId(null);
  }

  function handleEdit(item: DailyScheduleItem) {
    setEditingId(item.id);
    setForm(itemToForm(item));
    setMessage("");
    setError("");
  }

  async function handleSaveItem() {
    const payload = formToPayload(form);

    setMessage("");
    setError("");

    if (!payload.title) {
      setError("Title is required.");
      return;
    }

    if (!scheduleDays.includes(payload.day as (typeof scheduleDays)[number])) {
      setError("Choose a valid camp day.");
      return;
    }

    setIsSaving(true);

    if (editingId) {
      const { data, error: updateError } = await supabase
        .from("daily_schedule_items")
        .update(payload)
        .eq("id", editingId)
        .select("*")
        .single();

      console.log("Admin daily_schedule_items update:", {
        editingId,
        payload,
        data,
        error: updateError,
      });

      setIsSaving(false);

      if (updateError) {
        setError(updateError.message || "Could not update schedule item.");
        return;
      }

      await logAuditEvent({
        actionType: "daily_schedule_item_updated",
        entityType: "daily_schedule_item",
        entityId: editingId,
        summary: `Updated schedule item: ${payload.title}.`,
        oldValue: editingItem,
        newValue: data,
      });
      setMessage("Schedule item updated.");
      resetForm();
      await fetchItems();
      return;
    }

    const { data, error: insertError } = await supabase
      .from("daily_schedule_items")
      .insert(payload)
      .select("*")
      .single();

    console.log("Admin daily_schedule_items insert:", {
      payload,
      data,
      error: insertError,
    });

    setIsSaving(false);

    if (insertError) {
      setError(insertError.message || "Could not add schedule item.");
      return;
    }

    await logAuditEvent({
      actionType: "daily_schedule_item_created",
      entityType: "daily_schedule_item",
      entityId: (data as DailyScheduleItem).id,
      summary: `Added schedule item: ${payload.title}.`,
      newValue: data,
    });
    setMessage("Schedule item added.");
    resetForm();
    await fetchItems();
  }

  async function handleDeleteItem(item: DailyScheduleItem) {
    if (!window.confirm(`Delete schedule item: ${item.title}?`)) {
      return;
    }

    setMessage("");
    setError("");
    setIsSaving(true);

    const { data, error: deleteError } = await supabase
      .from("daily_schedule_items")
      .delete()
      .eq("id", item.id)
      .select("*");

    console.log("Admin daily_schedule_items delete:", {
      item,
      data,
      error: deleteError,
    });

    setIsSaving(false);

    if (deleteError) {
      setError(deleteError.message || "Could not delete schedule item.");
      return;
    }

    await logAuditEvent({
      actionType: "daily_schedule_item_deleted",
      entityType: "daily_schedule_item",
      entityId: item.id,
      summary: `Deleted schedule item: ${item.title}.`,
      oldValue: item,
    });
    setMessage("Schedule item deleted.");
    await fetchItems();
  }

  const groupedDays = groupScheduleItems(items);

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(244,241,234,0.08),transparent_34%),#050505] p-5 text-[#f5f5f5]">
      <Link href="/admin" className="gc-back-link gc-floating-back gc-back-camp">
        ← BACK
      </Link>
      <div className="mx-auto w-full max-w-md space-y-6 py-8">
        <header className="space-y-3">
          <div>
            <p className="font-mono text-[10px] font-black uppercase tracking-[0.24em] text-[#a8a29a]">
              Admin
            </p>
            <h1 className="mt-2 text-4xl font-black tracking-tight">
              Daily Schedule
            </h1>
            <p className="mt-2 text-sm leading-6 text-[#a3a3a3]">
              Maintain the clubhouse itinerary board.
            </p>
          </div>
        </header>

        <section className="space-y-4 rounded-2xl border border-[#2b2b27] bg-[#0d0d0b] p-5 shadow-[0_18px_55px_rgba(0,0,0,0.42)]">
          <div>
            <p className="font-mono text-[10px] font-black uppercase tracking-[0.2em] text-[#c8bfae]">
              {editingId ? "Edit Item" : "Add Item"}
            </p>
            <h2 className="mt-1 text-2xl font-black">
              {editingId ? "Update Schedule" : "New Schedule Item"}
            </h2>
          </div>

          <select
            value={form.day}
            onChange={(event) => updateForm("day", event.target.value)}
            className="w-full rounded-xl border border-[#34312a] bg-black/50 px-4 py-3 text-sm outline-none focus:border-[#f5f5f5]"
          >
            {scheduleDays.map((day) => (
              <option key={day} value={day}>
                {day}
              </option>
            ))}
          </select>

          <input
            value={form.title}
            onChange={(event) => updateForm("title", event.target.value)}
            placeholder="Title, e.g. Dinner"
            className="w-full rounded-xl border border-[#34312a] bg-black/50 px-4 py-3 text-sm outline-none placeholder:text-[#756f66] focus:border-[#f5f5f5]"
          />

          <div className="grid grid-cols-2 gap-3">
            <input
              value={form.start_time}
              onChange={(event) => updateForm("start_time", event.target.value)}
              placeholder="Start Time"
              className="w-full rounded-xl border border-[#34312a] bg-black/50 px-4 py-3 text-sm outline-none placeholder:text-[#756f66] focus:border-[#f5f5f5]"
            />
            <input
              value={form.end_time}
              onChange={(event) => updateForm("end_time", event.target.value)}
              placeholder="End Time"
              className="w-full rounded-xl border border-[#34312a] bg-black/50 px-4 py-3 text-sm outline-none placeholder:text-[#756f66] focus:border-[#f5f5f5]"
            />
          </div>

          <textarea
            value={form.description}
            onChange={(event) => updateForm("description", event.target.value)}
            placeholder="Optional description"
            rows={3}
            className="w-full resize-none rounded-xl border border-[#34312a] bg-black/50 px-4 py-3 text-sm outline-none placeholder:text-[#756f66] focus:border-[#f5f5f5]"
          />

          {message && <p className="text-sm font-semibold text-[#8fa66a]">{message}</p>}
          {error && <p className="text-sm font-semibold text-[#fca5a5]">{error}</p>}

          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={resetForm}
              className="rounded-xl border border-[#34312a] px-4 py-3 text-sm font-black text-[#a3a3a3] transition hover:border-[#f5f5f5] hover:text-[#f5f5f5]"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={handleSaveItem}
              disabled={isSaving}
              className="rounded-xl bg-[#efe9dc] px-4 py-3 text-sm font-black text-[#17130e] transition hover:bg-[#f8f2e6] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSaving ? "Saving..." : editingId ? "Update Item" : "Add Item"}
            </button>
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl border border-[#2b2b27] bg-[#0d0d0b] shadow-[0_18px_55px_rgba(0,0,0,0.42)]">
          <div className="border-b border-[#34312a] bg-[#151411] px-5 py-4">
            <p className="font-mono text-[10px] font-black uppercase tracking-[0.2em] text-[#a8a29a]">
              Itinerary Items
            </p>
            <h2 className="mt-1 text-2xl font-black">Camp Week</h2>
          </div>

          {isLoading && (
            <p className="px-5 py-6 text-sm font-semibold text-[#a3a3a3]">
              Loading schedule...
            </p>
          )}

          {!isLoading &&
            groupedDays.map((group) => (
              <section
                key={group.day}
                className="border-b border-[#242420] px-5 py-5 last:border-b-0"
              >
                <h3 className="text-xl font-black">{group.day}</h3>

                {group.items.length === 0 ? (
                  <p className="mt-3 rounded-2xl border border-[#242420] bg-black/30 px-4 py-4 text-sm text-[#82786a]">
                    No scheduled items yet.
                  </p>
                ) : (
                  <div className="mt-3 space-y-3">
                    {group.items.map((item) => (
                      <article
                        key={item.id}
                        className="rounded-2xl border border-[#34312a] bg-[#11110f] p-4"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="font-mono text-[10px] font-black uppercase tracking-[0.16em] text-[#c8bfae]">
                              {formatScheduleTime(item)}
                            </p>
                            <h4 className="mt-1 font-black text-[#f4f1ea]">
                              {item.title}
                            </h4>
                            {item.description && (
                              <p className="mt-1 text-sm leading-5 text-[#a3a3a3]">
                                {item.description}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="mt-3 grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => handleEdit(item)}
                            className="rounded-xl border border-[#34312a] px-3 py-2 text-xs font-black text-[#f5f5f5] transition hover:border-[#f5f5f5]"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteItem(item)}
                            disabled={isSaving}
                            className="rounded-xl border border-[#5a2b33] px-3 py-2 text-xs font-black text-[#fca5a5] transition hover:bg-[#1a0d10] disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            Delete
                          </button>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </section>
            ))}
        </section>
      </div>
    </main>
  );
}
