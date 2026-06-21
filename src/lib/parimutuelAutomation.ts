import { logActivityFeedItem } from "@/lib/activityFeed";
import { logAuditEvent } from "@/lib/auditLog";
import { supabase } from "@/lib/supabase";

export type ParimutuelMarketStatus =
  | "pending"
  | "open"
  | "locked"
  | "settled"
  | "void";

export type ParimutuelMarket = {
  id: string;
  draft_session_id: string;
  money_round_id: string | null;
  betting_night: string | null;
  money_round_day: string | null;
  status: ParimutuelMarketStatus | string | null;
  tee_time: string | null;
  opened_at: string | null;
  locked_at: string | null;
  reset_at: string | null;
  created_at: string | null;
  updated_at: string | null;
};

type DraftSessionForMarket = {
  id: string;
  name: string;
  status?: string | null;
};

type MoneyRoundOption = {
  id: string;
  name: string;
  status: string | null;
  round_date: string | null;
  created_at: string | null;
};

const roundDayToBettingNight: Record<string, string> = {
  wednesday: "tuesday",
  thursday: "wednesday",
  friday: "thursday",
  saturday: "friday",
};

const draftNightToRoundDay: Record<string, string> = {
  tuesday: "wednesday",
  wednesday: "thursday",
  thursday: "friday",
  friday: "saturday",
};

function isMissingParimutuelSchema(error: { code?: string; message?: string } | null) {
  if (!error) {
    return false;
  }

  return (
    error.code === "42P01" ||
    error.code === "42703" ||
    error.message?.includes("evening_parimutuel_markets") ||
    error.message?.includes("parimutuel_market_id")
  );
}

function getRoundDayFromDraftName(name: string) {
  const lowerName = name.toLowerCase();

  const draftNight = Object.keys(draftNightToRoundDay).find((night) =>
    lowerName.includes(`${night} night`),
  );

  if (draftNight) {
    const roundDay = draftNightToRoundDay[draftNight];

    return {
      bettingNight: draftNight,
      moneyRoundDay: `${roundDay.charAt(0).toUpperCase()}${roundDay.slice(1)}`,
    };
  }

  const roundDay = Object.keys(roundDayToBettingNight).find((day) =>
    lowerName.includes(day),
  );

  return roundDay
    ? {
        bettingNight: roundDayToBettingNight[roundDay],
        moneyRoundDay: `${roundDay.charAt(0).toUpperCase()}${roundDay.slice(1)}`,
      }
    : {
        bettingNight: null,
        moneyRoundDay: null,
      };
}

function getWeekdayName(dateValue: string | null) {
  if (!dateValue) {
    return "";
  }

  return new Date(`${dateValue}T12:00:00`).toLocaleDateString("en-US", {
    weekday: "long",
  });
}

async function findLinkedMoneyRound(draftSession: DraftSessionForMarket) {
  const inferred = getRoundDayFromDraftName(draftSession.name);

  if (!inferred.moneyRoundDay) {
    return null;
  }

  const { data, error } = await supabase
    .from("money_rounds")
    .select("id, name, status, round_date, created_at")
    .order("round_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    console.warn("money_rounds lookup for parimutuel linkage failed:", error.message);
    return null;
  }

  const rounds = ((data as MoneyRoundOption[]) || []).filter((round) => {
    const roundDay = inferred.moneyRoundDay?.toLowerCase() || "";

    return (
      round.name.toLowerCase().includes(roundDay) ||
      getWeekdayName(round.round_date).toLowerCase() === roundDay
    );
  });

  return rounds[0] || null;
}

export async function getParimutuelMarketForDraft(draftSessionId: string) {
  const { data, error } = await supabase
    .from("evening_parimutuel_markets")
    .select("*")
    .eq("draft_session_id", draftSessionId)
    .maybeSingle();

  if (error) {
    return {
      market: null,
      error,
      schemaMissing: isMissingParimutuelSchema(error),
    };
  }

  return {
    market: (data as ParimutuelMarket | null) || null,
    error: null,
    schemaMissing: false,
  };
}

export async function openParimutuelMarketForDraft(
  draftSession: DraftSessionForMarket,
) {
  const existingResult = await getParimutuelMarketForDraft(draftSession.id);

  if (existingResult.error) {
    return existingResult;
  }

  const linkedRound = await findLinkedMoneyRound(draftSession);
  const inferred = getRoundDayFromDraftName(draftSession.name);
  const now = new Date().toISOString();

  if (existingResult.market) {
    const shouldLogOpen = existingResult.market.status !== "open";
    const { data, error } = await supabase
      .from("evening_parimutuel_markets")
      .update({
        money_round_id: linkedRound?.id || existingResult.market.money_round_id,
        betting_night:
          inferred.bettingNight || existingResult.market.betting_night,
        money_round_day:
          inferred.moneyRoundDay || existingResult.market.money_round_day,
        status: "open",
        opened_at: existingResult.market.opened_at || now,
        locked_at: null,
        updated_at: now,
      })
      .eq("id", existingResult.market.id)
      .select("*")
      .single();

    if (error) {
      return {
        market: null,
        error,
        schemaMissing: isMissingParimutuelSchema(error),
      };
    }

    const market = data as ParimutuelMarket;

    if (shouldLogOpen) {
      await logParimutuelOpened(market, "opened");
    }

    await logAuditEvent({
      actionType: "parimutuel_market_opened",
      entityType: "evening_parimutuel_market",
      entityId: market.id,
      summary: `Parimutuel market opened for ${draftSession.name}.`,
      oldValue: existingResult.market,
      newValue: market,
      metadata: { draft_session_id: draftSession.id, money_round_id: linkedRound?.id || null },
    });

    return { market, error: null, schemaMissing: false };
  }

  const { data, error } = await supabase
    .from("evening_parimutuel_markets")
    .insert({
      draft_session_id: draftSession.id,
      money_round_id: linkedRound?.id || null,
      betting_night: inferred.bettingNight,
      money_round_day: inferred.moneyRoundDay,
      status: "open",
      opened_at: now,
      updated_at: now,
    })
    .select("*")
    .single();

  if (error) {
    return {
      market: null,
      error,
      schemaMissing: isMissingParimutuelSchema(error),
    };
  }

  const market = data as ParimutuelMarket;

  await logParimutuelOpened(market, "created");
  await logAuditEvent({
    actionType: "parimutuel_market_created",
    entityType: "evening_parimutuel_market",
    entityId: market.id,
    summary: `Parimutuel market created for ${draftSession.name}.`,
    newValue: market,
    metadata: { draft_session_id: draftSession.id, money_round_id: linkedRound?.id || null },
  });

  return { market, error: null, schemaMissing: false };
}

export async function linkParimutuelMarketToMoneyRoundIfPossible(
  market: ParimutuelMarket,
  draftSession: DraftSessionForMarket,
) {
  if (market.money_round_id) {
    return { market, linked: false, error: null, schemaMissing: false };
  }

  const linkedRound = await findLinkedMoneyRound(draftSession);

  if (!linkedRound) {
    return { market, linked: false, error: null, schemaMissing: false };
  }

  const { data, error } = await supabase
    .from("evening_parimutuel_markets")
    .update({
      money_round_id: linkedRound.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", market.id)
    .select("*")
    .single();

  if (error) {
    return {
      market,
      linked: false,
      error,
      schemaMissing: isMissingParimutuelSchema(error),
    };
  }

  const nextMarket = data as ParimutuelMarket;

  await logAuditEvent({
    actionType: "parimutuel_market_linked",
    entityType: "evening_parimutuel_market",
    entityId: nextMarket.id,
    summary: `Parimutuel market linked to ${linkedRound.name}.`,
    oldValue: { money_round_id: market.money_round_id },
    newValue: { money_round_id: linkedRound.id },
    metadata: {
      draft_session_id: draftSession.id,
      money_round_id: linkedRound.id,
    },
  });

  return { market: nextMarket, linked: true, error: null, schemaMissing: false };
}

async function logParimutuelOpened(
  market: ParimutuelMarket,
  action: "created" | "opened",
) {
  await logActivityFeedItem({
    type: "parimutuel_opened",
    source: "parimutuel",
    sourceId: market.id,
    linkUrl: "/evening-parimutuel",
    message: "Parimutuel Bets are now open for tomorrow's Money Round.",
  });

  if (action === "opened") {
    return;
  }
}

export async function resetParimutuelMarketForDraft(
  draftSessionId: string,
  options: { nextStatus?: "pending" | "open"; summary?: string } = {},
) {
  const existingResult = await getParimutuelMarketForDraft(draftSessionId);

  if (existingResult.error || !existingResult.market) {
    return {
      market: null,
      reset: false,
      error: existingResult.error,
      schemaMissing: existingResult.schemaMissing,
    };
  }

  const now = new Date().toISOString();
  const nextStatus = options.nextStatus || "pending";

  const { error: deleteError } = await supabase
    .from("evening_parimutuel_bets")
    .delete()
    .eq("parimutuel_market_id", existingResult.market.id);

  if (deleteError && !isMissingParimutuelSchema(deleteError)) {
    return {
      market: existingResult.market,
      reset: false,
      error: deleteError,
      schemaMissing: false,
    };
  }

  const { data, error: updateError } = await supabase
    .from("evening_parimutuel_markets")
    .update({
      status: nextStatus,
      locked_at: null,
      reset_at: now,
      updated_at: now,
    })
    .eq("id", existingResult.market.id)
    .select("*")
    .single();

  if (updateError) {
    return {
      market: existingResult.market,
      reset: false,
      error: updateError,
      schemaMissing: isMissingParimutuelSchema(updateError),
    };
  }

  const market = data as ParimutuelMarket;

  await logActivityFeedItem({
    type: "parimutuel_reset",
    source: "parimutuel",
    sourceId: market.id,
    linkUrl: "/evening-parimutuel",
    message: "Parimutuel Bets reset because draft teams changed.",
  });
  await logAuditEvent({
    actionType: "parimutuel_market_reset",
    entityType: "evening_parimutuel_market",
    entityId: market.id,
    summary: options.summary || "Parimutuel market reset because draft teams changed.",
    oldValue: existingResult.market,
    newValue: market,
    metadata: { draft_session_id: draftSessionId },
  });

  return { market, reset: true, error: null, schemaMissing: false };
}

export async function setParimutuelTeeTime(
  market: ParimutuelMarket,
  teeTime: string | null,
) {
  const { data, error } = await supabase
    .from("evening_parimutuel_markets")
    .update({
      tee_time: teeTime,
      updated_at: new Date().toISOString(),
    })
    .eq("id", market.id)
    .select("*")
    .single();

  if (error) {
    return { market: null, error, schemaMissing: isMissingParimutuelSchema(error) };
  }

  const nextMarket = data as ParimutuelMarket;

  await logAuditEvent({
    actionType: "parimutuel_tee_time_set",
    entityType: "evening_parimutuel_market",
    entityId: market.id,
    summary: teeTime
      ? "Parimutuel market tee time set."
      : "Parimutuel market tee time cleared.",
    oldValue: { tee_time: market.tee_time },
    newValue: { tee_time: teeTime },
  });

  return { market: nextMarket, error: null, schemaMissing: false };
}

export async function lockParimutuelMarket(
  market: ParimutuelMarket,
  options: { auto?: boolean } = {},
) {
  if (market.status === "locked") {
    return { market, error: null, schemaMissing: false };
  }

  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("evening_parimutuel_markets")
    .update({
      status: "locked",
      locked_at: now,
      updated_at: now,
    })
    .eq("id", market.id)
    .select("*")
    .single();

  if (error) {
    return { market: null, error, schemaMissing: isMissingParimutuelSchema(error) };
  }

  const nextMarket = data as ParimutuelMarket;

  await logActivityFeedItem({
    type: "parimutuel_locked",
    source: "parimutuel",
    sourceId: market.id,
    linkUrl: "/evening-parimutuel",
    message: "Parimutuel Bets are locked for today's Money Round.",
  });
  await logAuditEvent({
    actionType: options.auto
      ? "parimutuel_betting_auto_locked"
      : "parimutuel_betting_locked",
    entityType: "evening_parimutuel_market",
    entityId: market.id,
    summary: options.auto
      ? "Parimutuel betting auto-locked at tee time."
      : "Parimutuel betting locked by admin.",
    oldValue: market,
    newValue: nextMarket,
  });

  return { market: nextMarket, error: null, schemaMissing: false };
}

export async function autoLockParimutuelMarketIfNeeded(
  market: ParimutuelMarket | null,
) {
  if (!market || market.status !== "open" || !market.tee_time) {
    return { market, didLock: false };
  }

  const teeTime = new Date(market.tee_time).getTime();

  if (!Number.isFinite(teeTime) || Date.now() < teeTime) {
    return { market, didLock: false };
  }

  const result = await lockParimutuelMarket(market, { auto: true });

  return { market: result.market || market, didLock: !result.error };
}
