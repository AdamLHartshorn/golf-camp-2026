import { supabase } from "@/lib/supabase";

export type ActivityFeedItem = {
  id: string;
  type: string | null;
  message: string;
  source: string | null;
  source_id: string | null;
  created_at: string | null;
  created_by_player_id: string | null;
  link_url: string | null;
};

export type ActivityFeedInput = {
  type: string;
  message: string;
  source?: string | null;
  sourceId?: string | null;
  createdByPlayerId?: string | null;
  linkUrl?: string | null;
};

export async function logActivityFeedItem(input: ActivityFeedInput) {
  const message = input.message.trim();

  if (!message) {
    return;
  }

  const { error } = await supabase.from("activity_feed").insert({
    type: input.type,
    message,
    source: input.source || null,
    source_id: input.sourceId || null,
    created_by_player_id: input.createdByPlayerId || null,
    link_url: input.linkUrl || null,
  });

  if (error) {
    console.warn("activity_feed insert failed:", error.message);
  }
}
