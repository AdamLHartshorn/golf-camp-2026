"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  buildHoleInOneHighlights,
  calculateRoundMoney,
  compareTeamStandingsWorstFirst,
  MoneyRound,
  MoneyScore,
  MoneyTeam,
} from "@/app/money-rounds/_lib/moneyRoundUtils";

const sections = [
  { id: "intro", label: "Intro" },
  { id: "easiest_hole", label: "Easiest Hole" },
  { id: "hardest_hole", label: "Hardest Hole" },
  { id: "hole_in_ones", label: "Hole-In-Ones" },
  { id: "placements", label: "Placements" },
  { id: "skins", label: "Skins" },
  { id: "player_bank", label: "Player Bank" },
  { id: "parimutuel", label: "Parimutuel Bets" },
  { id: "complete", label: "Complete" },
];

type PresentationState = {
  current_section: string;
  current_index: number;
  updated_at: string | null;
};

export default function MoneyRoundPresentationControllerPage() {
  const params = useParams<{ id: string }>();
  const [round, setRound] = useState<MoneyRound | null>(null);
  const [teams, setTeams] = useState<MoneyTeam[]>([]);
  const [scores, setScores] = useState<MoneyScore[]>([]);
  const [presentationState, setPresentationState] =
    useState<PresentationState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const calculation = useMemo(
    () => calculateRoundMoney(round, teams, scores),
    [round, scores, teams],
  );
  const placementSlides = calculation.standings
    .slice()
    .sort(compareTeamStandingsWorstFirst);
  const holeInOneSlides = buildHoleInOneHighlights(teams, scores);
  const visibleSections = sections.filter(
    (section) => section.id !== "hole_in_ones" || holeInOneSlides.length > 0,
  );
  const currentSectionIndex = Math.max(
    visibleSections.findIndex(
      (section) => section.id === presentationState?.current_section,
    ),
    0,
  );
  const currentSection = visibleSections[currentSectionIndex] || visibleSections[0];
  const payoutSlides = calculation.bankRows
    .filter((row) => row.net > 0 || row.totalWinnings > 0)
    .sort(
      (a, b) =>
        a.totalWinnings - b.totalWinnings ||
        a.net - b.net ||
        a.playerName.localeCompare(b.playerName),
    );
  const slideCount =
    currentSection.id === "placements"
      ? placementSlides.length
      : currentSection.id === "hole_in_ones"
        ? holeInOneSlides.length
      : currentSection.id === "skins"
        ? calculation.skins.length
        : 1;
  const currentIndex = Math.min(
    presentationState?.current_index || 0,
    Math.max(slideCount - 1, 0),
  );
  const hasPrevious = !(currentSection.id === "intro" && currentIndex === 0);
  const hasNext = currentSection.id !== "complete";

  useEffect(() => {
    let isCurrent = true;

    async function fetchControllerState() {
      const [
        { data: roundData, error: roundError },
        { data: teamData, error: teamError },
        { data: scoreData, error: scoreError },
        { data: stateData, error: stateError },
      ] = await Promise.all([
        supabase.from("money_rounds").select("*").eq("id", params.id).single(),
        supabase
          .from("money_round_teams")
          .select("*")
          .eq("money_round_id", params.id),
        supabase
          .from("money_round_scores")
          .select("*")
          .eq("money_round_id", params.id),
        supabase
          .from("money_round_presentation_state")
          .select("current_section, current_index, updated_at")
          .eq("money_round_id", params.id)
          .maybeSingle(),
      ]);

      if (!isCurrent) {
        return;
      }

      if (roundError || teamError || scoreError || stateError) {
        setError(
          roundError?.message ||
            teamError?.message ||
            scoreError?.message ||
            stateError?.message ||
            "Could not load presentation controls.",
        );
        setIsLoading(false);
        return;
      }

      setRound(roundData as MoneyRound);
      setTeams((teamData as MoneyTeam[]) || []);
      setScores((scoreData as MoneyScore[]) || []);
      setPresentationState(
        (stateData as PresentationState | null) || {
          current_section: "intro",
          current_index: 0,
          updated_at: null,
        },
      );
      setIsLoading(false);
    }

    fetchControllerState();

    return () => {
      isCurrent = false;
    };
  }, [params.id]);

  async function setSection(sectionId: string, index = 0) {
    setMessage("");
    setError("");
    setIsSaving(true);

    const payload = {
      money_round_id: params.id,
      current_section: sectionId,
      current_index: index,
      updated_at: new Date().toISOString(),
    };
    const { data, error: upsertError } = await supabase
      .from("money_round_presentation_state")
      .upsert(payload, { onConflict: "money_round_id" })
      .select("current_section, current_index, updated_at")
      .single();

    console.log("money_round presentation state update:", {
      payload,
      data,
      error: upsertError,
    });

    setIsSaving(false);

    if (upsertError) {
      setError(upsertError.message || "Could not update presentation.");
      return;
    }

    setPresentationState(data as PresentationState);
    setMessage("Presentation updated.");
  }

  function goPrevious() {
    if (currentIndex > 0) {
      setSection(currentSection.id, currentIndex - 1);
      return;
    }

    const previousSection = visibleSections[Math.max(currentSectionIndex - 1, 0)];
    const previousCount =
      previousSection.id === "placements"
        ? placementSlides.length
        : previousSection.id === "hole_in_ones"
          ? holeInOneSlides.length
        : previousSection.id === "skins"
          ? calculation.skins.length
          : 1;
    setSection(previousSection.id, Math.max(previousCount - 1, 0));
  }

  function goNext() {
    if (currentSection.id === "placements" && currentIndex < placementSlides.length - 1) {
      setSection(currentSection.id, currentIndex + 1);
      return;
    }

    if (
      currentSection.id === "hole_in_ones" &&
      currentIndex < holeInOneSlides.length - 1
    ) {
      setSection(currentSection.id, currentIndex + 1);
      return;
    }

    if (currentSection.id === "skins" && currentIndex < calculation.skins.length - 1) {
      setSection(currentSection.id, currentIndex + 1);
      return;
    }

    setSection(
      visibleSections[
        Math.min(currentSectionIndex + 1, visibleSections.length - 1)
      ].id,
    );
  }

  return (
    <main className="min-h-screen bg-black p-6 text-[#f5f5f5]">
      <Link href="/admin/money-rounds" className="gc-back-link gc-floating-back gc-back-money">
        ← BACK
      </Link>
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center space-y-6 py-8">
        <div className="space-y-2">
          <p className="text-sm uppercase tracking-[0.35em] text-[#16a34a]">
            Money Rounds
          </p>
          <h1 className="text-4xl font-bold tracking-tight">
            Presentation Control
          </h1>
          <p className="text-[#a3a3a3]">
            {round?.name || "Loading round..."}
          </p>
        </div>

        {isLoading && (
          <div className="rounded-2xl border border-[#242424] bg-[#111111] p-5 text-sm text-[#a3a3a3]">
            Loading controller...
          </div>
        )}

        {!isLoading && (
          <>
            <section className="rounded-2xl border border-[#166534] bg-[#07120c] p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#16a34a]">
                Current Section
              </p>
              <h2 className="mt-2 text-3xl font-black">
                {currentSection.label}
              </h2>
              {slideCount > 1 && (
                <p className="mt-2 text-sm text-[#a3a3a3]">
                  Reveal {currentIndex + 1} of {slideCount}
                </p>
              )}
              {presentationState?.updated_at && (
                <p className="mt-2 text-xs text-[#a3a3a3]">
                  Updated {new Date(presentationState.updated_at).toLocaleTimeString()}
                </p>
              )}
            </section>

            <section className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={goPrevious}
                disabled={isSaving || !hasPrevious}
                className="rounded-2xl border border-[#242424] bg-[#111111] px-5 py-5 text-lg font-bold transition hover:border-[#16a34a] disabled:cursor-not-allowed disabled:opacity-40"
              >
                Previous
              </button>
              <button
                type="button"
                onClick={goNext}
                disabled={isSaving || !hasNext}
                className="rounded-2xl border border-[#16a34a] bg-[#16a34a] px-5 py-5 text-lg font-bold text-black transition hover:bg-[#15803d] disabled:cursor-not-allowed disabled:opacity-40"
              >
                Next
              </button>
            </section>

            <section className="space-y-3 rounded-2xl border border-[#242424] bg-[#111111] p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#a3a3a3]">
                Jump To
              </p>
              {sections.map((section) => (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => setSection(section.id)}
                  disabled={isSaving}
                  className={`w-full rounded-xl border px-4 py-4 text-left text-lg font-bold transition disabled:cursor-not-allowed disabled:opacity-50 ${
                    currentSection.id === section.id
                      ? "border-[#16a34a] bg-[#0f1f16] text-[#16a34a]"
                      : "border-[#242424] bg-black text-[#f5f5f5] hover:border-[#16a34a]"
                  }`}
                >
                  Jump to {section.label}
                  {section.id === "placements" && placementSlides.length > 0
                    ? " (Worst to Best)"
                    : ""}
                  {section.id === "skins" && calculation.skins.length > 0
                    ? " (Skin 1)"
                    : ""}
                  {section.id === "player_bank" && payoutSlides.length > 0
                    ? " (Summary)"
                    : ""}
                </button>
              ))}
            </section>
          </>
        )}

        {message && <p className="text-center text-sm">{message}</p>}
        {error && <p className="text-center text-sm text-[#ff8a8a]">{error}</p>}

        <div>
          <Link
            href={`/money-rounds/${params.id}/results`}
            className="block rounded-xl border border-[#16a34a] px-4 py-3 text-center text-sm font-bold text-[#16a34a]"
          >
            Open TV
          </Link>
        </div>
      </div>
    </main>
  );
}
