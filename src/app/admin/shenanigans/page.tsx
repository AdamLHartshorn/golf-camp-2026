"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type ShenanigansEvent = {
  id: string;
  player_name: string;
  event_type: string;
  description: string;
  points: number;
  created_at: string | null;
};

type ShenanigansWager = {
  id: string;
  description: string;
  points: number;
  status: string | null;
  player_names: string[];
  winner_name: string | null;
  loser_names: string[] | null;
  created_at: string | null;
  settled_at: string | null;
};

function formatDate(value: string | null) {
  return value ? new Date(value).toLocaleString() : "No timestamp";
}

export default function ShenanigansAdminPage() {
  const [events, setEvents] = useState<ShenanigansEvent[]>([]);
  const [wagers, setWagers] = useState<ShenanigansWager[]>([]);
  const [isLoadingEvents, setIsLoadingEvents] = useState(true);
  const [isLoadingWagers, setIsLoadingWagers] = useState(true);
  const [eventError, setEventError] = useState("");
  const [wagerError, setWagerError] = useState("");
  const [message, setMessage] = useState("");

  const activeWagers = useMemo(
    () => wagers.filter((wager) => wager.status !== "settled"),
    [wagers],
  );
  const settledWagers = useMemo(
    () => wagers.filter((wager) => wager.status === "settled"),
    [wagers],
  );

  async function fetchEvents() {
    setIsLoadingEvents(true);

    const { data, error } = await supabase
      .from("shenanigans_events")
      .select("*")
      .order("created_at", { ascending: false });

    console.log("Admin shenanigans_events fetch:", { data, error });

    if (error) {
      setEvents([]);
      setEventError(error.message || "Could not load Shenanigans events.");
      setIsLoadingEvents(false);
      return;
    }

    setEvents((data as ShenanigansEvent[]) || []);
    setEventError("");
    setIsLoadingEvents(false);
  }

  async function fetchWagers() {
    setIsLoadingWagers(true);

    const { data, error } = await supabase
      .from("shenanigans_wagers")
      .select("*")
      .order("created_at", { ascending: false });

    console.log("Admin shenanigans_wagers fetch:", { data, error });

    if (error) {
      setWagers([]);
      setWagerError(
        error.message || "Shenanigans wagers are not available yet.",
      );
      setIsLoadingWagers(false);
      return;
    }

    setWagers((data as ShenanigansWager[]) || []);
    setWagerError("");
    setIsLoadingWagers(false);
  }

  useEffect(() => {
    let isCurrent = true;

    async function loadEvents() {
      const { data, error } = await supabase
        .from("shenanigans_events")
        .select("*")
        .order("created_at", { ascending: false });

      console.log("Admin shenanigans_events fetch:", { data, error });

      if (!isCurrent) {
        return;
      }

      if (error) {
        setEvents([]);
        setEventError(error.message || "Could not load Shenanigans events.");
        setIsLoadingEvents(false);
        return;
      }

      setEvents((data as ShenanigansEvent[]) || []);
      setEventError("");
      setIsLoadingEvents(false);
    }

    async function loadWagers() {
      const { data, error } = await supabase
        .from("shenanigans_wagers")
        .select("*")
        .order("created_at", { ascending: false });

      console.log("Admin shenanigans_wagers fetch:", { data, error });

      if (!isCurrent) {
        return;
      }

      if (error) {
        setWagers([]);
        setWagerError(
          error.message || "Shenanigans wagers are not available yet.",
        );
        setIsLoadingWagers(false);
        return;
      }

      setWagers((data as ShenanigansWager[]) || []);
      setWagerError("");
      setIsLoadingWagers(false);
    }

    loadEvents();
    loadWagers();

    return () => {
      isCurrent = false;
    };
  }, []);

  async function handleDeleteEvent(event: ShenanigansEvent) {
    if (!window.confirm(`Delete ${event.player_name}'s ledger event?`)) {
      return;
    }

    setMessage("");

    const { data, error } = await supabase
      .from("shenanigans_events")
      .delete()
      .eq("id", event.id)
      .select();

    console.log("Admin shenanigans_events delete:", { event, data, error });

    if (error) {
      setEventError(error.message || "Could not delete event.");
      return;
    }

    setMessage("Ledger event deleted.");
    await fetchEvents();
  }

  async function handleResetEvents() {
    if (
      !window.confirm(
        "Reset all Shenanigans ledger events? This cannot be undone.",
      )
    ) {
      return;
    }

    setMessage("");

    const { data, error } = await supabase
      .from("shenanigans_events")
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000")
      .select();

    console.log("Admin shenanigans_events reset:", { data, error });

    if (error) {
      setEventError(error.message || "Could not reset ledger events.");
      return;
    }

    setMessage("All Shenanigans ledger events reset.");
    await fetchEvents();
  }

  async function handleDeleteWager(wager: ShenanigansWager) {
    if (!window.confirm(`Delete wager: ${wager.description}?`)) {
      return;
    }

    setMessage("");

    const { data, error } = await supabase
      .from("shenanigans_wagers")
      .delete()
      .eq("id", wager.id)
      .select();

    console.log("Admin shenanigans_wagers delete:", { wager, data, error });

    if (error) {
      setWagerError(error.message || "Could not delete wager.");
      return;
    }

    setMessage("Wager deleted.");
    await fetchWagers();
  }

  return (
    <main className="min-h-screen bg-black p-6 text-[#f5f5f5]">
      <div className="mx-auto w-full max-w-md space-y-8 py-10">
        <div className="space-y-2">
          <p className="text-sm uppercase tracking-[0.35em] text-[#a3a3a3]">
            Admin
          </p>

          <h1 className="text-4xl font-bold tracking-tight">
            Shenanigans
          </h1>

          <p className="text-[#a3a3a3]">
            Manage ledger events, wagers, and resets.
          </p>
        </div>

        {message && (
          <p className="text-center text-sm text-[#f5f5f5]">{message}</p>
        )}

        <section className="space-y-3">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold">Recent Ledger Events</h2>
              <p className="mt-1 text-sm text-[#a3a3a3]">
                Raw rows from shenanigans_events.
              </p>
            </div>

            <button
              type="button"
              onClick={handleResetEvents}
              disabled={isLoadingEvents || events.length === 0}
              className="rounded-xl border border-[#242424] px-3 py-2 text-xs font-bold transition hover:border-[#f5f5f5] disabled:cursor-not-allowed disabled:opacity-50"
            >
              Reset All
            </button>
          </div>

          {eventError && (
            <p className="text-center text-sm text-[#ff8a8a]">{eventError}</p>
          )}

          <div className="space-y-3">
            {isLoadingEvents && (
              <div className="rounded-2xl border border-[#242424] bg-[#111111] p-5 text-sm text-[#a3a3a3]">
                Loading ledger events...
              </div>
            )}

            {!isLoadingEvents && events.length === 0 && !eventError && (
              <div className="rounded-2xl border border-[#242424] bg-[#111111] p-5 text-sm text-[#a3a3a3]">
                No Shenanigans events found.
              </div>
            )}

            {!isLoadingEvents &&
              events.map((event) => (
                <div
                  key={event.id}
                  className="rounded-2xl border border-[#242424] bg-[#111111] p-5"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <h3 className="truncate text-lg font-bold">
                        {event.player_name}
                      </h3>
                      <p className="mt-1 text-sm text-[#a3a3a3]">
                        {event.event_type} · {event.points > 0 ? "+" : ""}
                        {event.points} pts
                      </p>
                      <p className="mt-2 text-sm leading-6 text-[#a3a3a3]">
                        {event.description}
                      </p>
                      <p className="mt-2 text-xs text-[#737373]">
                        {formatDate(event.created_at)}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDeleteEvent(event)}
                      className="shrink-0 rounded-xl border border-[#242424] px-3 py-2 text-xs font-bold transition hover:border-[#f5f5f5]"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
          </div>
        </section>

        <section className="space-y-3">
          <div>
            <h2 className="text-xl font-bold">Wagers</h2>
            <p className="mt-1 text-sm text-[#a3a3a3]">
              Active and settled shenanigans_wagers rows.
            </p>
          </div>

          {wagerError && (
            <div className="rounded-2xl border border-[#242424] bg-[#111111] p-5 text-sm leading-6 text-[#a3a3a3]">
              {wagerError}
            </div>
          )}

          {isLoadingWagers && (
            <div className="rounded-2xl border border-[#242424] bg-[#111111] p-5 text-sm text-[#a3a3a3]">
              Loading wagers...
            </div>
          )}

          {!isLoadingWagers && !wagerError && (
            <>
              {[
                ["Active", activeWagers],
                ["Settled", settledWagers],
              ].map(([label, wagerGroup]) => (
                <div key={label as string} className="space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#a3a3a3]">
                    {label as string}
                  </p>

                  {(wagerGroup as ShenanigansWager[]).length === 0 && (
                    <div className="rounded-2xl border border-[#242424] bg-[#111111] p-5 text-sm text-[#a3a3a3]">
                      No {(label as string).toLowerCase()} wagers.
                    </div>
                  )}

                  {(wagerGroup as ShenanigansWager[]).map((wager) => (
                    <div
                      key={wager.id}
                      className="rounded-2xl border border-[#242424] bg-[#111111] p-5"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <h3 className="text-lg font-bold">
                            {wager.player_names.join(" vs ")}
                          </h3>
                          <p className="mt-2 text-sm leading-6 text-[#a3a3a3]">
                            {wager.description}
                          </p>
                          <p className="mt-2 text-xs text-[#737373]">
                            {wager.points} pts · {wager.status || "active"}
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleDeleteWager(wager)}
                          className="shrink-0 rounded-xl border border-[#242424] px-3 py-2 text-xs font-bold transition hover:border-[#f5f5f5]"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </>
          )}
        </section>

        <Link href="/admin" className="block text-center text-sm text-[#a3a3a3]">
          ← Back to Admin
        </Link>
      </div>
    </main>
  );
}
