"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { GolfCampIcon } from "@/components/GolfCampIcons";
import {
  DailyScheduleItem,
  formatScheduleTime,
  getScheduleDayIndex,
  groupScheduleItems,
} from "@/lib/dailySchedule";
import { supabase } from "@/lib/supabase";

export default function CampOfficeSchedulePage() {
  const [items, setItems] = useState<DailyScheduleItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isCurrent = true;

    async function fetchSchedule() {
      const { data, error: fetchError } = await supabase
        .from("daily_schedule_items")
        .select("*")
        .order("created_at", { ascending: true });

      console.log("daily_schedule_items public fetch:", {
        data,
        error: fetchError,
      });

      if (!isCurrent) {
        return;
      }

      if (fetchError) {
        setItems([]);
        setError(fetchError.message || "Could not load daily schedule.");
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

    fetchSchedule();

    return () => {
      isCurrent = false;
    };
  }, []);

  const groupedDays = groupScheduleItems(items);

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(244,241,234,0.08),transparent_34%),#050505] p-5 text-[#f5f5f5]">
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center space-y-5 py-6">
        <div className="flex items-center justify-between gap-4">
          <Link href="/camp-office" className="text-2xl text-[#a3a3a3]">
            ‹
          </Link>
          <p className="font-mono text-sm uppercase tracking-[0.22em] text-[#f5f5f5]">
            Daily Schedule
          </p>
          <span className="flex h-9 w-9 items-center justify-center rounded-full border border-[#3a372f] bg-[#151411] text-[#f4f1ea]">
            <GolfCampIcon name="ledger" className="h-4 w-4" />
          </span>
        </div>

        <section className="overflow-hidden rounded-2xl border border-[#2f2a22] bg-[#0d0d0b]/95 shadow-[0_28px_80px_rgba(0,0,0,0.48),0_0_48px_rgba(244,241,234,0.05)]">
          <div className="border-b border-[#2a2925] bg-[#151411] px-5 py-5">
            <p className="font-mono text-[10px] font-black uppercase tracking-[0.24em] text-[#c8bfae]">
              Clubhouse Itinerary
            </p>
            <h1 className="mt-2 text-3xl font-black tracking-tight">
              Camp Week
            </h1>
            <p className="mt-2 text-sm leading-6 text-[#a3a3a3]">
              Meals, tee times, drafts, night golf, and whatever else the week
              demands.
            </p>
          </div>

          {isLoading && (
            <p className="px-5 py-6 text-sm font-semibold text-[#a3a3a3]">
              Loading schedule...
            </p>
          )}

          {!isLoading && error && (
            <p className="px-5 py-6 text-sm font-semibold text-[#fca5a5]">
              {error}
            </p>
          )}

          {!isLoading &&
            !error &&
            groupedDays.map((group) => (
              <section
                key={group.day}
                className="border-b border-[#242420] px-5 py-5 last:border-b-0"
              >
                <div className="mb-4 flex items-center justify-between gap-4">
                  <h2 className="text-2xl font-black tracking-tight">
                    {group.day}
                  </h2>
                  <span className="font-mono text-[10px] font-black uppercase tracking-[0.16em] text-[#82786a]">
                    {group.items.length} item{group.items.length === 1 ? "" : "s"}
                  </span>
                </div>

                {group.items.length === 0 ? (
                  <p className="rounded-2xl border border-[#242420] bg-black/30 px-4 py-4 text-sm font-semibold text-[#82786a]">
                    No scheduled items yet.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {group.items.map((item) => (
                      <article
                        key={item.id}
                        className="grid grid-cols-[5.5rem_1fr] gap-3 rounded-2xl border border-[#34312a] bg-[#11110f] px-4 py-4"
                      >
                        <p className="font-mono text-[10px] font-black uppercase tracking-[0.14em] text-[#c8bfae]">
                          {formatScheduleTime(item)}
                        </p>
                        <div className="min-w-0">
                          <h3 className="font-black text-[#f4f1ea]">
                            {item.title}
                          </h3>
                          {item.description && (
                            <p className="mt-1 text-sm leading-5 text-[#a3a3a3]">
                              {item.description}
                            </p>
                          )}
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </section>
            ))}
        </section>

        <Link
          href="/camp-office"
          className="text-center text-sm text-[#a3a3a3]"
        >
          ← Back to Camp Office
        </Link>
      </div>
    </main>
  );
}
