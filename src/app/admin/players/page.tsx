"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { logAuditEvent } from "@/lib/auditLog";
import { supabase } from "@/lib/supabase";
import { displayRanks } from "@/lib/playerRanks";

const ranks = ["A", "B", "C", "D"];
const scoutingGrades = [
  "A+",
  "A",
  "A-",
  "B+",
  "B",
  "B-",
  "C+",
  "C",
  "C-",
  "D+",
  "D",
  "D-",
  "F",
];

type QuestionnaireAnswers = {
  favorite_golf_camp_memory?: string;
  most_likely_to?: string;
  walk_up_song?: string;
  personal_scouting_report?: string;
  other_funny_notes?: string;
  [key: string]: unknown;
};

type PlayerRow = {
  id: string;
  player_key: string | null;
  first_name: string;
  last_name: string;
  display_name: string;
  nickname: string | null;
  rank: string | null;
  display_rank: string | null;
  internal_rank_order: string | null;
  years_served: number | null;
  room: string | null;
  arrival: string | null;
  phone: string | null;
  email: string | null;
  phone_number: string | null;
  email_address: string | null;
  photo_url: string | null;
  login_name: string | null;
  pin_code: string | null;
  is_admin: boolean | null;
  last_login_at: string | null;
  player_notes: string | null;
  questionnaire_answers: QuestionnaireAnswers | null;
  scouting_2025_draft_value_grade: string | null;
  scouting_2025_draft_value_index: string | null;
  scouting_2025_avg_draft_position: number | null;
  scouting_2025_total_earnings: number | null;
  scouting_2025_best_finish: string | null;
  deposit_paid: boolean | null;
  gambling_paid: boolean | null;
  active: boolean | null;
  created_at: string | null;
  updated_at: string | null;
};

type PlayerFormState = {
  first_name: string;
  last_name: string;
  display_name: string;
  nickname: string;
  rank: string;
  display_rank: string;
  internal_rank_order: string;
  years_served: string;
  room: string;
  arrival: string;
  phone: string;
  email: string;
  phone_number: string;
  email_address: string;
  photo_url: string;
  login_name: string;
  pin_code: string;
  is_admin: boolean;
  player_notes: string;
  imported_questionnaire_answers: QuestionnaireAnswers;
  scouting_2025_draft_value_grade: string;
  scouting_2025_draft_value_index: string;
  scouting_2025_avg_draft_position: string;
  scouting_2025_total_earnings: string;
  scouting_2025_best_finish: string;
  favorite_golf_camp_memory: string;
  most_likely_to: string;
  walk_up_song: string;
  personal_scouting_report: string;
  other_funny_notes: string;
  deposit_paid: boolean;
  gambling_paid: boolean;
  active: boolean;
};

type QuickEditState = {
  display_rank: string;
  years_served: string;
  room: string;
  active: boolean;
  is_admin: boolean;
  phone_number: string;
  email_address: string;
  scouting_2025_draft_value_grade: string;
  scouting_2025_draft_value_index: string;
};

const emptyForm: PlayerFormState = {
  first_name: "",
  last_name: "",
  display_name: "",
  nickname: "",
  rank: "A",
  display_rank: "",
  internal_rank_order: "",
  years_served: "",
  room: "",
  arrival: "",
  phone: "",
  email: "",
  phone_number: "",
  email_address: "",
  photo_url: "",
  login_name: "",
  pin_code: "",
  is_admin: false,
  player_notes: "",
  imported_questionnaire_answers: {},
  scouting_2025_draft_value_grade: "",
  scouting_2025_draft_value_index: "",
  scouting_2025_avg_draft_position: "",
  scouting_2025_total_earnings: "",
  scouting_2025_best_finish: "",
  favorite_golf_camp_memory: "",
  most_likely_to: "",
  walk_up_song: "",
  personal_scouting_report: "",
  other_funny_notes: "",
  deposit_paid: false,
  gambling_paid: false,
  active: true,
};

function createPlayerKey(displayName: string) {
  return displayName.trim().toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function playerToForm(player: PlayerRow): PlayerFormState {
  const answers = player.questionnaire_answers || {};
  const editableQuestionnaireKeys = new Set([
    "favorite_golf_camp_memory",
    "most_likely_to",
    "walk_up_song",
    "personal_scouting_report",
    "other_funny_notes",
  ]);
  const importedQuestionnaireAnswers = Object.fromEntries(
    Object.entries(answers).filter(([key]) => !editableQuestionnaireKeys.has(key)),
  ) as QuestionnaireAnswers;

  return {
    first_name: player.first_name || "",
    last_name: player.last_name || "",
    display_name: player.display_name || "",
    nickname: player.nickname || "",
    rank: player.rank || "A",
    display_rank: player.display_rank || "",
    internal_rank_order: player.internal_rank_order || "",
    years_served:
      typeof player.years_served === "number" ? String(player.years_served) : "",
    room: player.room || "",
    arrival: player.arrival || "",
    phone: player.phone || "",
    email: player.email || "",
    phone_number: player.phone_number || "",
    email_address: player.email_address || "",
    photo_url: player.photo_url || "",
    login_name: player.login_name || "",
    pin_code: player.pin_code || "",
    is_admin: player.is_admin ?? false,
    player_notes: player.player_notes || "",
    imported_questionnaire_answers: importedQuestionnaireAnswers,
    scouting_2025_draft_value_grade:
      player.scouting_2025_draft_value_grade || "",
    scouting_2025_draft_value_index:
      player.scouting_2025_draft_value_index || "",
    scouting_2025_avg_draft_position:
      typeof player.scouting_2025_avg_draft_position === "number"
        ? String(player.scouting_2025_avg_draft_position)
        : "",
    scouting_2025_total_earnings:
      typeof player.scouting_2025_total_earnings === "number"
        ? String(player.scouting_2025_total_earnings)
        : "",
    scouting_2025_best_finish: player.scouting_2025_best_finish || "",
    favorite_golf_camp_memory: answers.favorite_golf_camp_memory || "",
    most_likely_to: answers.most_likely_to || "",
    walk_up_song: answers.walk_up_song || "",
    personal_scouting_report: answers.personal_scouting_report || "",
    other_funny_notes: answers.other_funny_notes || "",
    deposit_paid: player.deposit_paid ?? false,
    gambling_paid: player.gambling_paid ?? false,
    active: player.active ?? true,
  };
}

function formToPayload(form: PlayerFormState) {
  const displayName = form.display_name.trim();
  const internalRankOrder = form.internal_rank_order.trim().toUpperCase();
  const scoutingAvgDraftPosition =
    form.scouting_2025_avg_draft_position.trim()
      ? Number(form.scouting_2025_avg_draft_position.trim())
      : null;
  const scoutingTotalEarnings = form.scouting_2025_total_earnings.trim()
    ? Number(form.scouting_2025_total_earnings.trim())
    : null;
  const questionnaireAnswers: QuestionnaireAnswers = {
    favorite_golf_camp_memory: form.favorite_golf_camp_memory.trim(),
    most_likely_to: form.most_likely_to.trim(),
    walk_up_song: form.walk_up_song.trim(),
    personal_scouting_report: form.personal_scouting_report.trim(),
    other_funny_notes: form.other_funny_notes.trim(),
  };
  const cleanQuestionnaireAnswers = Object.fromEntries(
    Object.entries(questionnaireAnswers).filter(([, value]) => value),
  );
  const mergedQuestionnaireAnswers = {
    ...form.imported_questionnaire_answers,
    ...cleanQuestionnaireAnswers,
  };

  return {
    first_name: form.first_name.trim(),
    last_name: form.last_name.trim(),
    display_name: displayName,
    player_key: createPlayerKey(displayName),
    nickname: form.nickname.trim() || null,
    rank: form.rank,
    display_rank: form.display_rank || null,
    internal_rank_order: internalRankOrder || null,
    years_served: form.years_served.trim()
      ? Number(form.years_served.trim())
      : null,
    room: form.room.trim() || null,
    arrival: form.arrival.trim() || null,
    phone: form.phone.trim() || null,
    email: form.email.trim() || null,
    phone_number: form.phone_number.trim() || null,
    email_address: form.email_address.trim() || null,
    photo_url: form.photo_url.trim() || null,
    login_name: form.login_name.trim().toLowerCase() || null,
    pin_code: form.pin_code.trim() || null,
    is_admin: form.is_admin,
    player_notes: form.player_notes.trim() || null,
    scouting_2025_draft_value_grade:
      form.scouting_2025_draft_value_grade || null,
    scouting_2025_draft_value_index:
      form.scouting_2025_draft_value_index.trim() || null,
    scouting_2025_avg_draft_position: scoutingAvgDraftPosition,
    scouting_2025_total_earnings: scoutingTotalEarnings,
    scouting_2025_best_finish:
      form.scouting_2025_best_finish.trim() || null,
    questionnaire_answers:
      Object.keys(mergedQuestionnaireAnswers).length > 0
        ? mergedQuestionnaireAnswers
        : null,
    deposit_paid: form.deposit_paid,
    gambling_paid: form.gambling_paid,
    active: form.active,
    updated_at: new Date().toISOString(),
  };
}

function playerToQuickEdit(player: PlayerRow): QuickEditState {
  return {
    display_rank: player.display_rank || "",
    years_served:
      typeof player.years_served === "number" ? String(player.years_served) : "",
    room: player.room || "",
    active: player.active ?? true,
    is_admin: player.is_admin ?? false,
    phone_number: player.phone_number || "",
    email_address: player.email_address || "",
    scouting_2025_draft_value_grade:
      player.scouting_2025_draft_value_grade || "",
    scouting_2025_draft_value_index:
      player.scouting_2025_draft_value_index || "",
  };
}

export default function PlayersAdminPage() {
  const [players, setPlayers] = useState<PlayerRow[]>([]);
  const [form, setForm] = useState<PlayerFormState>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expandedQuickEditIds, setExpandedQuickEditIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [quickEditRows, setQuickEditRows] = useState<Record<string, QuickEditState>>({});
  const [savingQuickEditId, setSavingQuickEditId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [rankFilter, setRankFilter] = useState("all");
  const formRef = useRef<HTMLElement | null>(null);

  const activePlayers = useMemo(
    () =>
      players
        .filter((player) => player.active !== false)
        .sort((a, b) => {
          const lastNameCompare = a.last_name.localeCompare(b.last_name);

          if (lastNameCompare !== 0) {
            return lastNameCompare;
          }

          return a.first_name.localeCompare(b.first_name);
        }),
    [players],
  );

  const inactivePlayers = useMemo(
    () =>
      players
        .filter((player) => player.active === false)
        .sort((a, b) => {
          const lastNameCompare = a.last_name.localeCompare(b.last_name);

          if (lastNameCompare !== 0) {
            return lastNameCompare;
          }

          return a.first_name.localeCompare(b.first_name);
        }),
    [players],
  );

  const filteredPlayers = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return players
      .filter((player) => {
        if (statusFilter === "active" && player.active === false) {
          return false;
        }

        if (statusFilter === "inactive" && player.active !== false) {
          return false;
        }

        if (rankFilter !== "all" && player.rank !== rankFilter) {
          return false;
        }

        if (!normalizedSearch) {
          return true;
        }

        return [
          player.display_name,
          player.first_name,
          player.last_name,
          player.nickname,
          player.room,
          player.arrival,
          player.login_name,
          player.email,
          player.email_address,
          player.phone,
          player.phone_number,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(normalizedSearch);
      })
      .sort((a, b) => {
        const activeCompare = Number(a.active === false) - Number(b.active === false);

        if (activeCompare !== 0) {
          return activeCompare;
        }

        const lastNameCompare = a.last_name.localeCompare(b.last_name);

        if (lastNameCompare !== 0) {
          return lastNameCompare;
        }

        return a.first_name.localeCompare(b.first_name);
      });
  }, [players, rankFilter, searchTerm, statusFilter]);

  async function fetchPlayers() {
    const { data, error: fetchError } = await supabase
      .from("players")
      .select("*");

    console.log("Admin players fetch:", {
      data,
      error: fetchError,
    });

    if (fetchError) {
      setPlayers([]);
      setError(fetchError.message || "Could not load players.");
      setIsLoading(false);
      return;
    }

    setPlayers((data as PlayerRow[]) || []);
    setIsLoading(false);
  }

  useEffect(() => {
    let isCurrent = true;

    async function loadPlayers() {
      const { data, error: fetchError } = await supabase
        .from("players")
        .select("*");

      console.log("Admin players fetch:", {
        data,
        error: fetchError,
      });

      if (!isCurrent) {
        return;
      }

      if (fetchError) {
        setPlayers([]);
        setError(fetchError.message || "Could not load players.");
        setIsLoading(false);
        return;
      }

      setPlayers((data as PlayerRow[]) || []);
      setIsLoading(false);
    }

    loadPlayers();

    return () => {
      isCurrent = false;
    };
  }, []);

  function updateForm(field: keyof PlayerFormState, value: string | boolean) {
    setForm((currentForm) => ({
      ...currentForm,
      [field]: value,
    }));
  }

  function resetForm(options?: { preserveFeedback?: boolean }) {
    setForm(emptyForm);
    setEditingId(null);

    if (!options?.preserveFeedback) {
      setMessage("");
      setError("");
    }
  }

  function handleEdit(player: PlayerRow) {
    setEditingId(player.id);
    setForm(playerToForm(player));
    setMessage("");
    setError("");
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function toggleQuickEdit(player: PlayerRow) {
    setQuickEditRows((currentRows) => ({
      ...currentRows,
      [player.id]: currentRows[player.id] || playerToQuickEdit(player),
    }));

    setExpandedQuickEditIds((currentIds) => {
      const nextIds = new Set(currentIds);

      if (nextIds.has(player.id)) {
        nextIds.delete(player.id);
      } else {
        nextIds.add(player.id);
      }

      return nextIds;
    });
  }

  function updateQuickEdit(
    playerId: string,
    field: keyof QuickEditState,
    value: string | boolean,
  ) {
    setQuickEditRows((currentRows) => {
      const player = players.find((currentPlayer) => currentPlayer.id === playerId);

      if (!currentRows[playerId] && !player) {
        return currentRows;
      }

      return {
        ...currentRows,
        [playerId]: {
          ...(currentRows[playerId] || playerToQuickEdit(player as PlayerRow)),
          [field]: value,
        },
      };
    });
  }

  async function handleQuickSave(player: PlayerRow) {
    const quickEdit = quickEditRows[player.id] || playerToQuickEdit(player);
    const yearsServed = quickEdit.years_served.trim()
      ? Number(quickEdit.years_served.trim())
      : null;

    setMessage("");
    setError("");

    if (
      quickEdit.display_rank &&
      !displayRanks.includes(quickEdit.display_rank as typeof displayRanks[number])
    ) {
      setError("Display rank must be A+, A, A-, B+, B, B-, C+, C, C-, D+, D, or D-.");
      return;
    }

    if (
      quickEdit.scouting_2025_draft_value_grade &&
      !scoutingGrades.includes(quickEdit.scouting_2025_draft_value_grade)
    ) {
      setError("2025 draft value grade must be A+ through D- or F.");
      return;
    }

    if (
      yearsServed !== null &&
      (!Number.isInteger(yearsServed) || yearsServed < 0)
    ) {
      setError("Years served must be zero or a positive whole number.");
      return;
    }

    const payload = {
      display_rank: quickEdit.display_rank || null,
      years_served: yearsServed,
      room: quickEdit.room.trim() || null,
      active: quickEdit.active,
      is_admin: quickEdit.is_admin,
      phone_number: quickEdit.phone_number.trim() || null,
      email_address: quickEdit.email_address.trim() || null,
      scouting_2025_draft_value_grade:
        quickEdit.scouting_2025_draft_value_grade || null,
      scouting_2025_draft_value_index:
        quickEdit.scouting_2025_draft_value_index.trim() || null,
      updated_at: new Date().toISOString(),
    };

    setSavingQuickEditId(player.id);

    const { data, error: updateError } = await supabase
      .from("players")
      .update(payload)
      .eq("id", player.id)
      .select("*")
      .single();

    console.log("Admin players quick edit update:", {
      id: player.id,
      payload,
      data,
      error: updateError,
    });

    setSavingQuickEditId(null);

    if (updateError) {
      setError(updateError.message || "Could not save quick edit.");
      return;
    }

    const updatedPlayer = data as PlayerRow;

    setPlayers((currentPlayers) =>
      currentPlayers.map((currentPlayer) =>
        currentPlayer.id === player.id ? updatedPlayer : currentPlayer,
      ),
    );
    setQuickEditRows((currentRows) => ({
      ...currentRows,
      [player.id]: playerToQuickEdit(updatedPlayer),
    }));
    setMessage(`Quick edit saved for ${updatedPlayer.display_name}.`);
    await logAuditEvent({
      actionType: "admin_player_quick_updated",
      entityType: "player",
      entityId: player.id,
      summary: `Admin quick edited ${updatedPlayer.display_name}.`,
      oldValue: {
        display_rank: player.display_rank,
        years_served: player.years_served,
        room: player.room,
        active: player.active,
        is_admin: player.is_admin,
        phone_number: player.phone_number,
        email_address: player.email_address,
        scouting_2025_draft_value_grade:
          player.scouting_2025_draft_value_grade,
        scouting_2025_draft_value_index:
          player.scouting_2025_draft_value_index,
      },
      newValue: payload,
    });
  }

  async function handlePhotoUpload(file: File | null) {
    if (!editingId) {
      setError("Save the player before uploading a photo.");
      return;
    }

    if (!file) {
      return;
    }

    setMessage("");
    setError("");
    setIsSaving(true);

    const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const safeName = `${editingId}/${Date.now()}.${extension}`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("player-photos")
      .upload(safeName, file, {
        cacheControl: "3600",
        upsert: true,
      });

    console.log("Admin player photo upload:", {
      editingId,
      path: safeName,
      data: uploadData,
      error: uploadError,
    });

    if (uploadError) {
      setError(uploadError.message || "Could not upload photo.");
      setIsSaving(false);
      return;
    }

    const { data: publicUrlData } = supabase.storage
      .from("player-photos")
      .getPublicUrl(uploadData.path);
    const photoUrl = publicUrlData.publicUrl;
    const { data, error: updateError } = await supabase
      .from("players")
      .update({
        photo_url: photoUrl,
        updated_at: new Date().toISOString(),
      })
      .eq("id", editingId)
      .select("*")
      .single();

    console.log("Admin player photo url update:", {
      editingId,
      photoUrl,
      data,
      error: updateError,
    });

    setIsSaving(false);

    if (updateError) {
      setError(updateError.message || "Could not save photo URL.");
      return;
    }

    setForm((currentForm) => ({ ...currentForm, photo_url: photoUrl }));
    setPlayers((currentPlayers) =>
      currentPlayers.map((player) =>
        player.id === editingId ? (data as PlayerRow) : player,
      ),
    );
    setMessage("Player photo uploaded.");
    await logAuditEvent({
      actionType: "admin_player_photo_updated",
      entityType: "player",
      entityId: editingId,
      summary: `Admin updated ${form.display_name || "player"} photo.`,
      newValue: { photo_url: photoUrl },
    });
  }

  async function handleSave() {
    const payload = formToPayload(form);

    setMessage("");
    setError("");

    if (!payload.display_name) {
      setError("Display name is required.");
      return;
    }

    if (!payload.first_name || !payload.last_name) {
      setError("First name and last name are required.");
      return;
    }

    if (!ranks.includes(payload.rank)) {
      setError("Rank must be A, B, C, or D.");
      return;
    }

    if (payload.display_rank && !displayRanks.includes(payload.display_rank as typeof displayRanks[number])) {
      setError("Display rank must be A+, A, A-, B+, B, B-, C+, C, C-, D+, D, or D-.");
      return;
    }

    if (
      payload.scouting_2025_draft_value_grade &&
      !scoutingGrades.includes(payload.scouting_2025_draft_value_grade)
    ) {
      setError("2025 draft value grade must be A+ through D- or F.");
      return;
    }

    if (
      payload.scouting_2025_avg_draft_position !== null &&
      (!Number.isFinite(payload.scouting_2025_avg_draft_position) ||
        payload.scouting_2025_avg_draft_position < 0)
    ) {
      setError("2025 average draft position must be a positive number.");
      return;
    }

    if (
      payload.scouting_2025_total_earnings !== null &&
      (!Number.isFinite(payload.scouting_2025_total_earnings) ||
        payload.scouting_2025_total_earnings < 0)
    ) {
      setError("2025 total earnings must be a positive number.");
      return;
    }

    if (
      payload.internal_rank_order &&
      !/^[ABCD][0-9]+$/.test(payload.internal_rank_order)
    ) {
      setError("Internal rank order must look like A1, B2, or C11.");
      return;
    }

    if (
      payload.years_served !== null &&
      (!Number.isInteger(payload.years_served) || payload.years_served < 0)
    ) {
      setError("Years served must be zero or a positive whole number.");
      return;
    }

    if (payload.login_name) {
      const duplicateLogin = players.find(
        (player) =>
          player.id !== editingId &&
          player.login_name?.trim().toLowerCase() === payload.login_name,
      );

      if (duplicateLogin) {
        setError(`Login name is already used by ${duplicateLogin.display_name}.`);
        return;
      }

      if (!payload.pin_code) {
        const shouldContinue = window.confirm(
          "This player has a login name but no PIN. Save anyway?",
        );

        if (!shouldContinue) {
          return;
        }
      }
    }

    setIsSaving(true);

    if (editingId) {
      const { data, error: updateError } = await supabase
        .from("players")
        .update(payload)
        .eq("id", editingId)
        .select("*")
        .single();

      console.log("Admin players update:", {
        id: editingId,
        payload,
        data,
        error: updateError,
      });

      setIsSaving(false);

      if (updateError) {
        setError(updateError.message || "Could not update player.");
        return;
      }

      setPlayers((currentPlayers) =>
        currentPlayers.map((player) =>
          player.id === editingId ? (data as PlayerRow) : player,
        ),
      );
      resetForm({ preserveFeedback: true });
      setMessage("Player updated.");
      await logAuditEvent({
        actionType: "admin_player_updated",
        entityType: "player",
        entityId: editingId,
        summary: `Admin updated ${payload.display_name}.`,
        oldValue: players.find((player) => player.id === editingId) || null,
        newValue: data,
      });
      return;
    }

    const { data, error: insertError } = await supabase
      .from("players")
      .insert(payload)
      .select("*")
      .single();

    console.log("Admin players insert:", {
      payload,
      data,
      error: insertError,
    });

    setIsSaving(false);

    if (insertError) {
      setError(insertError.message || "Could not create player.");
      return;
    }

    setPlayers((currentPlayers) => [...currentPlayers, data as PlayerRow]);
    resetForm({ preserveFeedback: true });
    setMessage("Player created.");
    await logAuditEvent({
      actionType: "admin_player_created",
      entityType: "player",
      entityId: (data as PlayerRow).id,
      summary: `Admin created player ${payload.display_name}.`,
      newValue: data,
    });
  }

  async function handleToggleActive(player: PlayerRow) {
    const nextActive = !(player.active ?? true);

    setMessage("");
    setError("");

    const { data, error: updateError } = await supabase
      .from("players")
      .update({
        active: nextActive,
        updated_at: new Date().toISOString(),
      })
      .eq("id", player.id)
      .select();

    console.log("Admin players active toggle:", {
      player,
      nextActive,
      data,
      error: updateError,
    });

    if (updateError) {
      setError(updateError.message || "Could not update active status.");
      return;
    }

    setMessage(nextActive ? "Player activated." : "Player deactivated.");
    await logAuditEvent({
      actionType: nextActive
        ? "admin_player_reactivated"
        : "admin_player_deactivated",
      entityType: "player",
      entityId: player.id,
      summary: nextActive
        ? `Admin reactivated ${player.display_name}.`
        : `Admin deactivated ${player.display_name}.`,
      oldValue: { active: player.active },
      newValue: { active: nextActive },
    });
    setIsLoading(true);
    await fetchPlayers();
  }

  function renderPlayerCard(player: PlayerRow) {
    const isQuickEditing = expandedQuickEditIds.has(player.id);
    const quickEdit = quickEditRows[player.id] || playerToQuickEdit(player);
    const isSavingQuickEdit = savingQuickEditId === player.id;

    return (
      <div
        key={player.id}
        className="rounded-2xl border border-[#242424] bg-[#111111] p-5"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="truncate text-xl font-bold">
                {player.display_name}
              </h3>

              <span className="rounded-full border border-[#242424] px-2 py-1 text-xs font-bold text-[#f5f5f5]">
                {player.display_rank || player.rank || "-"}
              </span>
            </div>

            <p className="mt-2 text-sm text-[#a3a3a3]">
              Room {player.room || "-"} · {player.arrival || "Arrival TBD"}
            </p>

            <p className="mt-1 text-xs uppercase tracking-[0.2em] text-[#737373]">
              {player.active === false ? "Inactive" : "Active"}
            </p>

            <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold uppercase tracking-[0.16em]">
              <span className="rounded-full border border-[#242424] px-2 py-1 text-[#a3a3a3]">
                Public {player.display_rank || "-"}
              </span>

              <span className="rounded-full border border-[#242424] px-2 py-1 text-[#a3a3a3]">
                Rank {player.rank || "-"}
              </span>

              <span className="rounded-full border border-[#242424] px-2 py-1 text-[#a3a3a3]">
                Internal {player.internal_rank_order || "-"}
              </span>

              <span className="rounded-full border border-[#242424] px-2 py-1 text-[#a3a3a3]">
                {typeof player.years_served === "number"
                  ? player.years_served === 0
                    ? "Rookie"
                    : `${player.years_served} Years Served`
                  : "Years -"}
              </span>

              <span className="rounded-full border border-[#242424] px-2 py-1 text-[#a3a3a3]">
                Deposit {player.deposit_paid ? "Paid" : "Open"}
              </span>

              <span className="rounded-full border border-[#242424] px-2 py-1 text-[#a3a3a3]">
                Gambling {player.gambling_paid ? "Paid" : "Open"}
              </span>

              <span className="rounded-full border border-[#242424] px-2 py-1 text-[#a3a3a3]">
                Login {player.login_name || "-"}
              </span>

              <span className="rounded-full border border-[#242424] px-2 py-1 text-[#a3a3a3]">
                Contact{" "}
                {player.phone_number || player.email_address ? "Set" : "Open"}
              </span>

              {player.is_admin && (
                <span className="rounded-full border border-[#f5f5f5] px-2 py-1 text-[#f5f5f5]">
                  Admin
                </span>
              )}
            </div>
          </div>

          <div className="flex shrink-0 flex-col gap-2">
            <button
              type="button"
              onClick={() => toggleQuickEdit(player)}
              className="rounded-xl border border-[#f5f5f5] bg-[#f5f5f5] px-3 py-2 text-xs font-bold text-black transition hover:bg-[#d4d4d4]"
            >
              {isQuickEditing ? "Close" : "Quick Edit"}
            </button>

            <button
              type="button"
              onClick={() => handleEdit(player)}
              className="rounded-xl border border-[#242424] px-3 py-2 text-xs font-bold text-[#f5f5f5] transition hover:border-[#f5f5f5]"
            >
              Advanced
            </button>
          </div>
        </div>

        {isQuickEditing && (
          <div className="mt-4 space-y-4 rounded-2xl border border-[#2f2f2f] bg-black/60 p-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#a3a3a3]">
                Quick Edit
              </p>
              <p className="mt-1 text-xs text-[#737373]">
                Fast fields for rooming, rank display, access, and contact maintenance.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <label className="space-y-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#737373]">
                Display Rank
                <select
                  value={quickEdit.display_rank}
                  onChange={(event) =>
                    updateQuickEdit(player.id, "display_rank", event.target.value)
                  }
                  className="mt-1 w-full rounded-xl border border-[#242424] bg-[#111111] px-3 py-3 text-sm font-bold normal-case tracking-normal text-[#f5f5f5] outline-none focus:border-[#f5f5f5]"
                >
                  <option value="">None</option>
                  {displayRanks.map((rank) => (
                    <option key={rank} value={rank}>
                      {rank}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#737373]">
                Years
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={quickEdit.years_served}
                  onChange={(event) =>
                    updateQuickEdit(player.id, "years_served", event.target.value)
                  }
                  placeholder="Years"
                  className="mt-1 w-full rounded-xl border border-[#242424] bg-[#111111] px-3 py-3 text-sm font-bold normal-case tracking-normal text-[#f5f5f5] outline-none focus:border-[#f5f5f5]"
                />
              </label>
            </div>

            <label className="space-y-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#737373]">
              2025 Draft Value Grade
              <select
                value={quickEdit.scouting_2025_draft_value_grade}
                onChange={(event) =>
                  updateQuickEdit(
                    player.id,
                    "scouting_2025_draft_value_grade",
                    event.target.value,
                  )
                }
                className="mt-1 w-full rounded-xl border border-[#242424] bg-[#111111] px-3 py-3 text-sm font-bold normal-case tracking-normal text-[#f5f5f5] outline-none focus:border-[#f5f5f5]"
              >
                <option value="">No 2025 grade</option>
                {scoutingGrades.map((grade) => (
                  <option key={grade} value={grade}>
                    {grade}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#737373]">
              Draft Value Index
              <input
                type="text"
                value={quickEdit.scouting_2025_draft_value_index}
                onChange={(event) =>
                  updateQuickEdit(
                    player.id,
                    "scouting_2025_draft_value_index",
                    event.target.value,
                  )
                }
                placeholder="Index"
                className="mt-1 w-full rounded-xl border border-[#242424] bg-[#111111] px-3 py-3 text-sm font-bold normal-case tracking-normal text-[#f5f5f5] outline-none focus:border-[#f5f5f5]"
              />
            </label>

            <label className="space-y-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#737373]">
              Room
              <input
                type="text"
                value={quickEdit.room}
                onChange={(event) =>
                  updateQuickEdit(player.id, "room", event.target.value)
                }
                placeholder="Room"
                className="mt-1 w-full rounded-xl border border-[#242424] bg-[#111111] px-3 py-3 text-sm font-bold normal-case tracking-normal text-[#f5f5f5] outline-none focus:border-[#f5f5f5]"
              />
            </label>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="space-y-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#737373]">
                Phone
                <input
                  type="tel"
                  value={quickEdit.phone_number}
                  onChange={(event) =>
                    updateQuickEdit(player.id, "phone_number", event.target.value)
                  }
                  placeholder="Phone number"
                  className="mt-1 w-full rounded-xl border border-[#242424] bg-[#111111] px-3 py-3 text-sm font-bold normal-case tracking-normal text-[#f5f5f5] outline-none focus:border-[#f5f5f5]"
                />
              </label>

              <label className="space-y-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#737373]">
                Email
                <input
                  type="email"
                  value={quickEdit.email_address}
                  onChange={(event) =>
                    updateQuickEdit(player.id, "email_address", event.target.value)
                  }
                  placeholder="Email address"
                  className="mt-1 w-full rounded-xl border border-[#242424] bg-[#111111] px-3 py-3 text-sm font-bold normal-case tracking-normal text-[#f5f5f5] outline-none focus:border-[#f5f5f5]"
                />
              </label>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <label className="flex items-center gap-3 rounded-xl border border-[#242424] bg-[#111111] px-3 py-3 text-sm font-bold text-[#f5f5f5]">
                <input
                  type="checkbox"
                  checked={quickEdit.active}
                  onChange={(event) =>
                    updateQuickEdit(player.id, "active", event.target.checked)
                  }
                  className="h-4 w-4"
                />
                Active
              </label>

              <label className="flex items-center gap-3 rounded-xl border border-[#242424] bg-[#111111] px-3 py-3 text-sm font-bold text-[#f5f5f5]">
                <input
                  type="checkbox"
                  checked={quickEdit.is_admin}
                  onChange={(event) =>
                    updateQuickEdit(player.id, "is_admin", event.target.checked)
                  }
                  className="h-4 w-4"
                />
                Admin
              </label>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => handleQuickSave(player)}
                disabled={isSavingQuickEdit}
                className="rounded-xl bg-[#f5f5f5] px-3 py-3 text-sm font-bold text-black transition hover:bg-[#d4d4d4] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSavingQuickEdit ? "Saving..." : "Save Row"}
              </button>

              <button
                type="button"
                onClick={() => handleEdit(player)}
                className="rounded-xl border border-[#242424] px-3 py-3 text-sm font-bold text-[#f5f5f5] transition hover:border-[#f5f5f5]"
              >
                Open Full Profile
              </button>
            </div>
          </div>
        )}

        <div className="mt-4 border-t border-[#242424] pt-4">
          <button
            type="button"
            onClick={() => handleToggleActive(player)}
            className="w-full rounded-xl border border-[#242424] px-3 py-2 text-xs font-bold text-[#f5f5f5] transition hover:border-[#f5f5f5]"
          >
            {player.active === false ? "Reactivate Player" : "Deactivate Player"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-black p-6 text-[#f5f5f5]">
      <Link href="/admin" className="gc-back-link gc-floating-back gc-back-camp">
        ← BACK
      </Link>
      <div className="mx-auto w-full max-w-md space-y-8 py-10">
        <div className="space-y-2">
          <p className="text-sm uppercase tracking-[0.35em] text-[#a3a3a3]">
            Admin
          </p>

          <h1 className="text-4xl font-bold tracking-tight">
            Player Database
          </h1>

          <p className="text-[#a3a3a3]">
            Create, edit, and manage roster players.
          </p>
        </div>

        <section
          ref={formRef}
          className="space-y-4 rounded-2xl border border-[#242424] bg-[#111111] p-5"
        >
          <div>
            <h2 className="text-xl font-bold">
              {editingId ? "Edit Player" : "Create Player"}
            </h2>

            <p className="mt-1 text-sm text-[#a3a3a3]">
              Controlled player record used across roster, draft, scoring, and login.
            </p>
          </div>

          <div className="border-t border-[#242424] pt-4">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#a3a3a3]">
              Identity
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <input
              type="text"
              value={form.first_name}
              onChange={(event) => updateForm("first_name", event.target.value)}
              placeholder="First name"
              className="rounded-xl border border-[#242424] bg-black px-4 py-3 outline-none focus:border-[#f5f5f5]"
            />

            <input
              type="text"
              value={form.last_name}
              onChange={(event) => updateForm("last_name", event.target.value)}
              placeholder="Last name"
              className="rounded-xl border border-[#242424] bg-black px-4 py-3 outline-none focus:border-[#f5f5f5]"
            />
          </div>

          <input
            type="text"
            value={form.display_name}
            onChange={(event) => updateForm("display_name", event.target.value)}
            placeholder="Display name"
            className="w-full rounded-xl border border-[#242424] bg-black px-4 py-3 outline-none focus:border-[#f5f5f5]"
          />

          <input
            type="text"
            value={form.nickname}
            onChange={(event) => updateForm("nickname", event.target.value)}
            placeholder="Nickname"
            className="w-full rounded-xl border border-[#242424] bg-black px-4 py-3 outline-none focus:border-[#f5f5f5]"
          />

          <div className="border-t border-[#242424] pt-4">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#a3a3a3]">
              Golf / Draft
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <select
              value={form.rank}
              onChange={(event) => updateForm("rank", event.target.value)}
              className="rounded-xl border border-[#242424] bg-black px-4 py-3 outline-none focus:border-[#f5f5f5]"
            >
              {ranks.map((rank) => (
                <option key={rank} value={rank}>
                  Rank {rank}
                </option>
              ))}
            </select>

            <select
              value={form.display_rank}
              onChange={(event) => updateForm("display_rank", event.target.value)}
              className="rounded-xl border border-[#242424] bg-black px-4 py-3 outline-none focus:border-[#f5f5f5]"
            >
              <option value="">Display rank</option>
              {displayRanks.map((rank) => (
                <option key={rank} value={rank}>
                  Display {rank}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 gap-3">
            <input
              type="text"
              value={form.internal_rank_order}
              onChange={(event) =>
                updateForm("internal_rank_order", event.target.value)
              }
              placeholder="A1"
              className="rounded-xl border border-[#242424] bg-black px-4 py-3 outline-none focus:border-[#f5f5f5]"
            />
          </div>

          <input
            type="number"
            min="0"
            step="1"
            value={form.years_served}
            onChange={(event) => updateForm("years_served", event.target.value)}
            placeholder="Years Served"
            className="w-full rounded-xl border border-[#242424] bg-black px-4 py-3 outline-none focus:border-[#f5f5f5]"
          />

          <div className="space-y-3 rounded-xl border border-[#242424] bg-black p-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#a3a3a3]">
                2025 Scouting Bridge
              </p>
              <p className="mt-1 text-xs leading-5 text-[#737373]">
                Temporary scouting fields for Scouting Cards until the historical
                data system is built.
              </p>
            </div>

            <select
              value={form.scouting_2025_draft_value_grade}
              onChange={(event) =>
                updateForm(
                  "scouting_2025_draft_value_grade",
                  event.target.value,
                )
              }
              className="w-full rounded-xl border border-[#242424] bg-[#111111] px-4 py-3 outline-none focus:border-[#f5f5f5]"
            >
              <option value="">Draft Value Grade</option>
              {scoutingGrades.map((grade) => (
                <option key={grade} value={grade}>
                  {grade}
                </option>
              ))}
            </select>

            <input
              type="text"
              value={form.scouting_2025_draft_value_index}
              onChange={(event) =>
                updateForm("scouting_2025_draft_value_index", event.target.value)
              }
              placeholder="Draft Value Index"
              className="w-full rounded-xl border border-[#242424] bg-[#111111] px-4 py-3 outline-none focus:border-[#f5f5f5]"
            />

            <div className="grid grid-cols-2 gap-3">
              <input
                type="number"
                min="0"
                step="0.1"
                value={form.scouting_2025_avg_draft_position}
                onChange={(event) =>
                  updateForm(
                    "scouting_2025_avg_draft_position",
                    event.target.value,
                  )
                }
                placeholder="Avg Draft Position"
                className="rounded-xl border border-[#242424] bg-[#111111] px-4 py-3 outline-none focus:border-[#f5f5f5]"
              />

              <input
                type="number"
                min="0"
                step="0.01"
                value={form.scouting_2025_total_earnings}
                onChange={(event) =>
                  updateForm(
                    "scouting_2025_total_earnings",
                    event.target.value,
                  )
                }
                placeholder="Total Earnings"
                className="rounded-xl border border-[#242424] bg-[#111111] px-4 py-3 outline-none focus:border-[#f5f5f5]"
              />
            </div>

            <input
              type="text"
              value={form.scouting_2025_best_finish}
              onChange={(event) =>
                updateForm("scouting_2025_best_finish", event.target.value)
              }
              placeholder="Best Finish"
              className="w-full rounded-xl border border-[#242424] bg-[#111111] px-4 py-3 outline-none focus:border-[#f5f5f5]"
            />
          </div>

          <div className="border-t border-[#242424] pt-4">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#a3a3a3]">
              Camp Logistics
            </p>
          </div>

          <input
            type="text"
            value={form.arrival}
            onChange={(event) => updateForm("arrival", event.target.value)}
            placeholder="Arrival"
            className="w-full rounded-xl border border-[#242424] bg-black px-4 py-3 outline-none focus:border-[#f5f5f5]"
          />

          <input
            type="text"
            value={form.room}
            onChange={(event) => updateForm("room", event.target.value)}
            placeholder="Room"
            className="w-full rounded-xl border border-[#242424] bg-black px-4 py-3 outline-none focus:border-[#f5f5f5]"
          />

          <div className="grid grid-cols-2 gap-3">
            <label className="flex items-center gap-3 rounded-xl border border-[#242424] bg-black px-4 py-3 text-sm text-[#a3a3a3]">
              <input
                type="checkbox"
                checked={form.deposit_paid}
                onChange={(event) =>
                  updateForm("deposit_paid", event.target.checked)
                }
                className="h-4 w-4"
              />
              Deposit paid
            </label>

            <label className="flex items-center gap-3 rounded-xl border border-[#242424] bg-black px-4 py-3 text-sm text-[#a3a3a3]">
              <input
                type="checkbox"
                checked={form.gambling_paid}
                onChange={(event) =>
                  updateForm("gambling_paid", event.target.checked)
                }
                className="h-4 w-4"
              />
              Gambling paid
            </label>
          </div>

          <input
            type="tel"
            value={form.phone}
            onChange={(event) => updateForm("phone", event.target.value)}
            placeholder="Legacy Phone"
            className="w-full rounded-xl border border-[#242424] bg-black px-4 py-3 outline-none focus:border-[#f5f5f5]"
          />

          <input
            type="email"
            value={form.email}
            onChange={(event) => updateForm("email", event.target.value)}
            placeholder="Legacy Email"
            className="w-full rounded-xl border border-[#242424] bg-black px-4 py-3 outline-none focus:border-[#f5f5f5]"
          />

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <input
              type="tel"
              value={form.phone_number}
              onChange={(event) => updateForm("phone_number", event.target.value)}
              placeholder="Phone Number"
              className="w-full rounded-xl border border-[#242424] bg-black px-4 py-3 outline-none focus:border-[#f5f5f5]"
            />

            <input
              type="email"
              value={form.email_address}
              onChange={(event) =>
                updateForm("email_address", event.target.value)
              }
              placeholder="Email Address"
              className="w-full rounded-xl border border-[#242424] bg-black px-4 py-3 outline-none focus:border-[#f5f5f5]"
            />
          </div>

          <p className="text-xs leading-5 text-[#737373]">
            Phone Number and Email Address are the player-editable contact
            fields used for downloadable roster contacts.
          </p>

          <div className="border-t border-[#242424] pt-4">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#a3a3a3]">
              Login / Permissions
            </p>
          </div>

          <div className="space-y-3 rounded-xl border border-[#242424] bg-black p-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#a3a3a3]">
                Player Login
              </p>
              <p className="mt-1 text-xs text-[#737373]">
                Lightweight PIN access for Golf Camp.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <input
                type="text"
                value={form.login_name}
                onChange={(event) =>
                  updateForm("login_name", event.target.value.toLowerCase())
                }
                placeholder="login name"
                className="rounded-xl border border-[#242424] bg-[#111111] px-4 py-3 outline-none focus:border-[#f5f5f5]"
              />

              <input
                type="text"
                value={form.pin_code}
                onChange={(event) => updateForm("pin_code", event.target.value)}
                placeholder="PIN"
                className="rounded-xl border border-[#242424] bg-[#111111] px-4 py-3 outline-none focus:border-[#f5f5f5]"
              />
            </div>

            <label className="flex items-center gap-3 text-sm text-[#a3a3a3]">
              <input
                type="checkbox"
                checked={form.is_admin}
                onChange={(event) => updateForm("is_admin", event.target.checked)}
                className="h-4 w-4"
              />
              Admin access
            </label>
          </div>

          <div className="border-t border-[#242424] pt-4">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#a3a3a3]">
              Profile / Lore
            </p>
          </div>

          <textarea
            value={form.player_notes}
            onChange={(event) => updateForm("player_notes", event.target.value)}
            placeholder="Player Notes"
            rows={4}
            className="w-full rounded-xl border border-[#242424] bg-black px-4 py-3 outline-none focus:border-[#f5f5f5]"
          />

          <div className="space-y-3 rounded-xl border border-[#242424] bg-black p-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#a3a3a3]">
                Questionnaire Answers
              </p>
              <p className="mt-1 text-xs text-[#737373]">
                Lightweight lore for public player profiles.
              </p>
            </div>

            {[
              [
                "favorite_golf_camp_memory",
                "Favorite Golf Camp memory",
              ],
              ["most_likely_to", "Most likely to..."],
              ["walk_up_song", "Walk-up song"],
              ["personal_scouting_report", "Personal scouting report"],
              ["other_funny_notes", "Other/funny notes"],
            ].map(([field, placeholder]) => (
              <textarea
                key={field}
                value={form[field as keyof PlayerFormState] as string}
                onChange={(event) =>
                  updateForm(
                    field as keyof PlayerFormState,
                    event.target.value,
                  )
                }
                placeholder={placeholder}
                rows={3}
                className="w-full rounded-xl border border-[#242424] bg-[#111111] px-4 py-3 outline-none focus:border-[#f5f5f5]"
              />
            ))}
          </div>

          <div className="space-y-3 rounded-xl border border-[#242424] bg-black p-4">
            <div className="flex items-center gap-4">
              {form.photo_url ? (
                <div
                  aria-label={`${form.display_name || "Player"} profile`}
                  className="h-16 w-16 shrink-0 rounded-full border border-[#3a3a3a] bg-cover bg-center"
                  role="img"
                  style={{ backgroundImage: `url(${form.photo_url})` }}
                />
              ) : (
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border border-[#3a3a3a] bg-[#111111] text-sm font-bold text-[#f5f5f5]">
                  Photo
                </div>
              )}

              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#a3a3a3]">
                  Profile Photo
                </p>
                <p className="mt-1 text-xs text-[#737373]">
                  Upload to Supabase Storage or paste a public photo URL.
                </p>
              </div>
            </div>

            <input
              type="url"
              value={form.photo_url}
              onChange={(event) => updateForm("photo_url", event.target.value)}
              placeholder="Photo URL"
              className="w-full rounded-xl border border-[#242424] bg-[#111111] px-4 py-3 outline-none focus:border-[#f5f5f5]"
            />

            <label className="block rounded-xl border border-[#242424] px-4 py-3 text-center text-sm font-bold text-[#f5f5f5] transition hover:border-[#f5f5f5]">
              Upload Photo
              <input
                type="file"
                accept="image/*"
                onChange={(event) => handlePhotoUpload(event.target.files?.[0] || null)}
                className="sr-only"
                disabled={!editingId || isSaving}
              />
            </label>

            {!editingId && (
              <p className="text-xs text-[#737373]">
                Create the player first, then upload a profile photo.
              </p>
            )}
          </div>

          <label className="flex items-center gap-3 text-sm text-[#a3a3a3]">
            <input
              type="checkbox"
              checked={form.active}
              onChange={(event) => updateForm("active", event.target.checked)}
              className="h-4 w-4"
            />
            Active player
          </label>

          {message && (
            <p className="text-center text-sm text-[#f5f5f5]">{message}</p>
          )}

          {error && (
            <p className="text-center text-sm text-[#ff8a8a]">{error}</p>
          )}

          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="rounded-xl bg-[#f5f5f5] px-4 py-3 font-bold text-black transition hover:bg-[#d4d4d4] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSaving ? "Saving..." : editingId ? "Save Player" : "Create Player"}
            </button>

            <button
              type="button"
              onClick={() => resetForm()}
              className="rounded-xl border border-[#242424] px-4 py-3 font-bold text-[#f5f5f5] transition hover:border-[#f5f5f5]"
            >
              {editingId ? "Cancel" : "Clear"}
            </button>
          </div>
        </section>

        <section className="space-y-4">
          <div>
            <h2 className="text-xl font-bold">Player Records</h2>

            <p className="mt-1 text-sm text-[#a3a3a3]">
              Search, filter, quick edit, deactivate, and reactivate records.
            </p>
          </div>

          <div className="space-y-3 rounded-2xl border border-[#242424] bg-[#111111] p-4">
            <div className="rounded-xl border border-[#2f2f2f] bg-black px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#f5f5f5]">
                Quick Edit Mode
              </p>
              <p className="mt-1 text-xs leading-5 text-[#a3a3a3]">
                Expand any player card to update common fields without leaving the list.
              </p>
            </div>

            <input
              type="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search players, rooms, login names..."
              className="w-full rounded-xl border border-[#242424] bg-black px-4 py-3 outline-none focus:border-[#f5f5f5]"
            />

            <div className="grid grid-cols-2 gap-3">
              <select
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(event.target.value as "all" | "active" | "inactive")
                }
                className="rounded-xl border border-[#242424] bg-black px-4 py-3 outline-none focus:border-[#f5f5f5]"
              >
                <option value="all">All statuses</option>
                <option value="active">Active only</option>
                <option value="inactive">Inactive only</option>
              </select>

              <select
                value={rankFilter}
                onChange={(event) => setRankFilter(event.target.value)}
                className="rounded-xl border border-[#242424] bg-black px-4 py-3 outline-none focus:border-[#f5f5f5]"
              >
                <option value="all">All ranks</option>
                {ranks.map((rank) => (
                  <option key={rank} value={rank}>
                    Rank {rank}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center text-xs text-[#a3a3a3]">
              <div className="rounded-xl border border-[#242424] bg-black px-3 py-2">
                <p className="font-bold text-[#f5f5f5]">{players.length}</p>
                <p>Total</p>
              </div>
              <div className="rounded-xl border border-[#242424] bg-black px-3 py-2">
                <p className="font-bold text-[#f5f5f5]">{activePlayers.length}</p>
                <p>Active</p>
              </div>
              <div className="rounded-xl border border-[#242424] bg-black px-3 py-2">
                <p className="font-bold text-[#f5f5f5]">{inactivePlayers.length}</p>
                <p>Inactive</p>
              </div>
            </div>
          </div>

          {isLoading && (
            <div className="rounded-2xl border border-[#242424] bg-[#111111] p-5 text-center text-sm text-[#a3a3a3]">
              Loading players…
            </div>
          )}

          {!isLoading && filteredPlayers.length === 0 && (
            <div className="rounded-2xl border border-[#242424] bg-[#111111] p-5 text-center text-sm text-[#a3a3a3]">
              No players match the current filters.
            </div>
          )}

          {!isLoading && filteredPlayers.map(renderPlayerCard)}
        </section>
      </div>
    </main>
  );
}
