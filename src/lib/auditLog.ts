import { getPlayerSession } from "@/lib/playerSession";
import { supabase } from "@/lib/supabase";

export type AuditLogInput = {
  actionType: string;
  entityType: string;
  entityId?: string | null;
  summary: string;
  oldValue?: unknown;
  newValue?: unknown;
  metadata?: unknown;
  actorPlayerId?: string | null;
  actorName?: string | null;
};

export async function logAuditEvent(input: AuditLogInput) {
  const session = getPlayerSession();

  const { error } = await supabase.from("audit_log").insert({
    actor_player_id: input.actorPlayerId ?? session?.id ?? null,
    actor_name: input.actorName ?? session?.display_name ?? "Unknown",
    action_type: input.actionType,
    entity_type: input.entityType,
    entity_id: input.entityId || null,
    summary: input.summary,
    old_value: input.oldValue ?? null,
    new_value: input.newValue ?? null,
    metadata: input.metadata ?? null,
  });

  if (error) {
    console.warn("audit_log insert failed:", error.message);
  }
}
