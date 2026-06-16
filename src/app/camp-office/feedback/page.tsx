"use client";

import Link from "next/link";
import type { CSSProperties } from "react";
import { useState } from "react";
import { GolfCampIcon } from "@/components/GolfCampIcons";
import { logAuditEvent } from "@/lib/auditLog";
import { getPlayerSession } from "@/lib/playerSession";
import { supabase } from "@/lib/supabase";

export default function AppFeedbackPage() {
  const [session] = useState(() => getPlayerSession());
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  async function handleSubmitFeedback() {
    const trimmedMessage = message.trim();

    setSuccess("");
    setError("");

    if (!trimmedMessage) {
      setError("Write a quick note before submitting.");
      return;
    }

    if (trimmedMessage.length > 1000) {
      setError("Keep feedback under 1,000 characters.");
      return;
    }

    setIsSaving(true);

    const { data, error: insertError } = await supabase
      .from("app_feedback")
      .insert({
        message: trimmedMessage,
        created_by_player_id: session?.id || null,
        created_by_name: session?.display_name || null,
      })
      .select("*")
      .single();

    setIsSaving(false);

    if (insertError) {
      setError(
        insertError.code === "42P01"
          ? "App Feedback needs the Supabase setup SQL before feedback can be saved."
          : insertError.message || "Could not submit feedback.",
      );
      return;
    }

    await logAuditEvent({
      actionType: "app_feedback_submitted",
      entityType: "app_feedback",
      entityId: data?.id || null,
      summary: `${session?.display_name || "A player"} submitted app feedback.`,
      newValue: data,
    });

    setMessage("");
    setSuccess("Feedback submitted. Thank you.");
  }

  return (
    <main className="gc-mobile-shell" style={{ "--page-accent": "#f4f1ea" } as CSSProperties}>
      <div className="gc-mobile-stage">
        <div className="gc-topbar">
          <Link href="/camp-office" className="gc-back-link">
            ← BACK
          </Link>
          <p className="gc-topbar-title">App Feedback</p>
          <span className="gc-top-icon">
            <GolfCampIcon name="log" className="h-4 w-4" />
          </span>
        </div>

        <section className="gc-edge-card overflow-hidden">
          <div className="gc-section-head">
            <p className="gc-card-kicker">Camp Office</p>
            <h1 className="gc-card-title">App Feedback</h1>
            <p className="gc-card-copy">
              See something confusing, broken, or worth improving? Send a quick
              note here. Admins can review it from the control sheets.
            </p>
          </div>

          <div className="space-y-4 p-5">
            <label className="block">
              <span className="mb-2 block font-mono text-[10px] font-black uppercase tracking-[0.18em] text-[#a8a29a]">
                Feedback
              </span>
              <textarea
                value={message}
                onChange={(event) => {
                  setMessage(event.target.value);
                  setSuccess("");
                  setError("");
                }}
                className="gc-input min-h-40 resize-y leading-6"
                maxLength={1000}
                placeholder="What should we fix, clarify, or improve?"
              />
            </label>

            <div className="flex items-center justify-between gap-3 text-xs font-semibold text-[#737373]">
              <span>{session?.display_name ? `Submitting as ${session.display_name}` : "Anonymous feedback"}</span>
              <span>{message.trim().length}/1000</span>
            </div>

            {success && <p className="text-sm font-semibold text-[#8fa66a]">{success}</p>}
            {error && <p className="text-sm font-semibold text-[#fca5a5]">{error}</p>}

            <button
              type="button"
              onClick={handleSubmitFeedback}
              disabled={isSaving}
              className="gc-primary-button disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSaving ? "Submitting..." : "Submit Feedback"}
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}
