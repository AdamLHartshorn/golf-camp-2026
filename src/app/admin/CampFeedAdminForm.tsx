"use client";

import { FormEvent, useState } from "react";
import { logAuditEvent } from "@/lib/auditLog";
import { getPlayerSession } from "@/lib/playerSession";
import { supabase } from "@/lib/supabase";

const maxMessageLength = 200;

export function CampFeedAdminForm() {
  const [message, setMessage] = useState("");
  const [source, setSource] = useState("Admin");
  const [isPosting, setIsPosting] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedMessage = message.trim();
    const trimmedSource = source.trim() || "Admin";

    setSuccess("");
    setError("");

    if (!trimmedMessage) {
      setError("Message is required.");
      return;
    }

    if (trimmedMessage.length > maxMessageLength) {
      setError(`Keep updates to ${maxMessageLength} characters or fewer.`);
      return;
    }

    setIsPosting(true);
    const session = getPlayerSession();

    const { data, error: insertError } = await supabase
      .from("activity_feed")
      .insert({
        type: "admin",
        source: trimmedSource,
        message: trimmedMessage,
        created_by_player_id: session?.id || null,
        created_at: new Date().toISOString(),
      })
      .select("*")
      .single();

    setIsPosting(false);

    if (insertError) {
      setError(insertError.message || "Could not post update.");
      return;
    }

    setMessage("");
    setSource("Admin");
    setSuccess("Update posted to LIVE CAMP FEED.");
    await logAuditEvent({
      actionType: "camp_feed_post_created",
      entityType: "activity_feed",
      entityId: data?.id || null,
      summary: `${session?.display_name || "Admin"} posted a LIVE CAMP FEED update.`,
      newValue: data,
    });
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-[#2b2b27] bg-[#0d0d0b] shadow-[0_18px_55px_rgba(0,0,0,0.42)]">
      <div className="border-b border-[#34312a] bg-[linear-gradient(90deg,rgba(143,166,106,0.09),rgba(21,20,17,0.94)_42%,rgba(21,20,17,0.86))] px-5 py-4">
        <p className="font-mono text-[10px] font-black uppercase tracking-[0.22em] text-[#8fa66a]">
          Live Camp Feed
        </p>
        <h2 className="mt-2 text-2xl font-black tracking-tight">
          Post Camp Update
        </h2>
        <p className="mt-1 text-sm leading-5 text-[#a3a3a3]">
          Simple camp-wide notes for everyone on the Home screen.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 px-5 py-5">
        <div>
          <label
            htmlFor="camp-feed-message"
            className="mb-2 block font-mono text-[10px] font-black uppercase tracking-[0.18em] text-[#a8a29a]"
          >
            Message
          </label>
          <textarea
            id="camp-feed-message"
            value={message}
            onChange={(event) => {
              setMessage(event.target.value.slice(0, maxMessageLength));
              setSuccess("");
              setError("");
            }}
            placeholder="Meet at the clubhouse in 10 minutes."
            rows={3}
            className="w-full resize-none rounded-xl border border-[#34312a] bg-black/40 px-4 py-3 text-sm font-semibold text-[#f5f5f5] outline-none transition placeholder:text-[#756f66] focus:border-[#8fa66a]"
          />
          <p className="mt-1 text-right font-mono text-[10px] font-semibold text-[#756f66]">
            {message.length}/{maxMessageLength}
          </p>
        </div>

        <div>
          <label
            htmlFor="camp-feed-source"
            className="mb-2 block font-mono text-[10px] font-black uppercase tracking-[0.18em] text-[#a8a29a]"
          >
            Source
          </label>
          <input
            id="camp-feed-source"
            type="text"
            value={source}
            onChange={(event) => {
              setSource(event.target.value);
              setSuccess("");
              setError("");
            }}
            placeholder="Admin"
            className="w-full rounded-xl border border-[#34312a] bg-black/40 px-4 py-3 text-sm font-semibold text-[#f5f5f5] outline-none transition placeholder:text-[#756f66] focus:border-[#8fa66a]"
          />
        </div>

        {success && <p className="text-sm font-semibold text-[#8fa66a]">{success}</p>}
        {error && <p className="text-sm font-semibold text-[#fca5a5]">{error}</p>}

        <button
          type="submit"
          disabled={isPosting}
          className="w-full rounded-xl border border-[#8fa66a]/45 bg-[#8fa66a] px-4 py-3 text-sm font-black text-[#10120c] transition hover:bg-[#a6ba80] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isPosting ? "Posting..." : "Post Update"}
        </button>
      </form>
    </section>
  );
}
