"use client";

import { logActivityFeedItem } from "@/lib/activityFeed";
import { logAuditEvent } from "@/lib/auditLog";
import { getPlayerSession } from "@/lib/playerSession";
import { supabase } from "@/lib/supabase";

export const currentCampYear = 2026;

export type CampYearStatus = "active" | "finalized";

export type CampYear = {
  id: string;
  year: number;
  status: CampYearStatus | string;
  finalized_at: string | null;
  finalized_by_player_id: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export function isCampYearFinalized(campYear: CampYear | null) {
  return campYear?.status === "finalized";
}

export function isMissingCampYearSchema(error: {
  code?: string;
  message?: string;
} | null) {
  return Boolean(
    error &&
      (error.code === "42P01" ||
        error.code === "42703" ||
        error.message?.includes("camp_years")),
  );
}

export async function getCampYear(year = currentCampYear) {
  const { data, error } = await supabase
    .from("camp_years")
    .select("*")
    .eq("year", year)
    .maybeSingle();

  if (error) {
    return {
      campYear: null,
      error,
      schemaMissing: isMissingCampYearSchema(error),
    };
  }

  return {
    campYear: (data as CampYear | null) || null,
    error: null,
    schemaMissing: false,
  };
}

async function createCampYearIfNeeded(year = currentCampYear) {
  const current = await getCampYear(year);

  if (current.campYear || current.error) {
    return current;
  }

  const { data, error } = await supabase
    .from("camp_years")
    .insert({ year, status: "active" })
    .select("*")
    .single();

  return {
    campYear: (data as CampYear | null) || null,
    error,
    schemaMissing: isMissingCampYearSchema(error),
  };
}

export async function setCampYearFinalized(
  shouldFinalize: boolean,
  year = currentCampYear,
) {
  const existing = await createCampYearIfNeeded(year);
  const session = getPlayerSession();

  if (existing.error || !existing.campYear) {
    return existing;
  }

  const payload = shouldFinalize
    ? {
        status: "finalized",
        finalized_at: new Date().toISOString(),
        finalized_by_player_id: session?.id || null,
        updated_at: new Date().toISOString(),
      }
    : {
        status: "active",
        finalized_at: null,
        finalized_by_player_id: null,
        updated_at: new Date().toISOString(),
      };

  const { data, error } = await supabase
    .from("camp_years")
    .update(payload)
    .eq("year", year)
    .select("*")
    .single();

  if (error) {
    return {
      campYear: null,
      error,
      schemaMissing: isMissingCampYearSchema(error),
    };
  }

  const nextCampYear = data as CampYear;

  await logAuditEvent({
    actionType: shouldFinalize ? "camp_year_finalized" : "camp_year_reopened",
    entityType: "camp_year",
    entityId: nextCampYear.id,
    summary: shouldFinalize
      ? `Golf Camp ${year} finalized.`
      : `Golf Camp ${year} reopened.`,
    oldValue: existing.campYear,
    newValue: nextCampYear,
  });

  if (shouldFinalize) {
    await logActivityFeedItem({
      type: "camp_year_finalized",
      source: "Camp",
      sourceId: nextCampYear.id,
      createdByPlayerId: session?.id || null,
      linkUrl: "/closing-presentation",
      message: `Golf Camp ${year} Closing Presentation is now live.`,
    });
  }

  return {
    campYear: nextCampYear,
    error: null,
    schemaMissing: false,
  };
}
