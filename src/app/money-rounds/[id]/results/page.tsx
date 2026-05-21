"use client";

import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  calculateRoundMoney,
  MoneyRound,
  MoneyScore,
  MoneyTeam,
  money,
  signedMoney,
} from "@/app/money-rounds/_lib/moneyRoundUtils";

const sections = [
  { id: "intro", label: "Intro" },
  { id: "placements", label: "Placements" },
  { id: "skins", label: "Skins" },
  { id: "player_bank", label: "Round Bank" },
];

function totalPot(round: MoneyRound) {
  return (
    Number(round.first_place_payout || 0) +
    Number(round.second_place_payout || 0) +
    Number(round.third_place_payout || 0) +
    Number(round.skins_pot || 0)
  );
}

export default function MoneyRoundResultsPage() {
  const params = useParams<{ id: string }>();
  const [round, setRound] = useState<MoneyRound | null>(null);
  const [teams, setTeams] = useState<MoneyTeam[]>([]);
  const [scores, setScores] = useState<MoneyScore[]>([]);
  const [currentSection, setCurrentSection] = useState("intro");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [presentationStateError, setPresentationStateError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isCurrent = true;

    async function fetchRound() {
      const [
        { data: roundData, error: roundError },
        { data: teamData, error: teamError },
        { data: scoreData, error: scoreError },
      ] = await Promise.all([
        supabase.from("money_rounds").select("*").eq("id", params.id).single(),
        supabase
          .from("money_round_teams")
          .select("*")
          .eq("money_round_id", params.id)
          .order("created_at", { ascending: true }),
        supabase
          .from("money_round_scores")
          .select("*")
          .eq("money_round_id", params.id)
          .order("hole_number", { ascending: true }),
      ]);

      if (!isCurrent) {
        return;
      }

      if (roundError || teamError || scoreError) {
        setError(
          roundError?.message ||
            teamError?.message ||
            scoreError?.message ||
            "Could not load Money Round results.",
        );
        setIsLoading(false);
        return;
      }

      setRound(roundData as MoneyRound);
      setTeams((teamData as MoneyTeam[]) || []);
      setScores((scoreData as MoneyScore[]) || []);
      setIsLoading(false);
    }

    fetchRound();

    return () => {
      isCurrent = false;
    };
  }, [params.id]);

  useEffect(() => {
    let isCurrent = true;

    async function fetchPresentationState() {
      const { data, error: fetchError } = await supabase
        .from("money_round_presentation_state")
        .select("current_section, current_index, updated_at")
        .eq("money_round_id", params.id)
        .maybeSingle();

      if (!isCurrent) {
        return;
      }

      if (fetchError) {
        setPresentationStateError(fetchError.message);
        return;
      }

      setPresentationStateError("");

      if (data?.current_section) {
        const nextSectionIndex = sections.findIndex(
          (section) => section.id === data.current_section,
        );

        if (nextSectionIndex >= 0) {
          setCurrentSection(data.current_section);
          setCurrentIndex(Number(data.current_index || 0));
        }
      }
    }

    fetchPresentationState();
    const interval = window.setInterval(fetchPresentationState, 1500);
    return () => {
      isCurrent = false;
      window.clearInterval(interval);
    };
  }, [params.id]);

  const calculation = useMemo(
    () => calculateRoundMoney(round, teams, scores),
    [round, scores, teams],
  );
  const { bankRows, hasScores, skins, standings } = calculation;
  const bankByTeam = useMemo(
    () =>
      bankRows.reduce<
        Record<string, { placement: number; skins: number; total: number }>
      >((groups, row) => {
        groups[row.teamName] = groups[row.teamName] || {
          placement: 0,
          skins: 0,
          total: 0,
        };
        groups[row.teamName].placement += row.placementWinnings;
        groups[row.teamName].skins += row.skinsWinnings;
        groups[row.teamName].total += row.totalWinnings;
        return groups;
      }, {}),
    [bankRows],
  );
  const placementSlides = [3, 2, 1]
    .map((position) => standings.find((standing) => standing.position === position))
    .filter((standing): standing is (typeof standings)[number] => Boolean(standing));
  const currentPlacement =
    placementSlides[Math.min(currentIndex, Math.max(placementSlides.length - 1, 0))];
  const currentSkin = skins[Math.min(currentIndex, Math.max(skins.length - 1, 0))];
  const positiveBankRows = bankRows.filter((row) => row.net > 0);
  const section = sections.find((item) => item.id === currentSection) || sections[0];
  const sectionPosition = sections.findIndex((item) => item.id === currentSection);
  const slideCount =
    currentSection === "placements"
      ? placementSlides.length
      : currentSection === "skins"
        ? skins.length
        : 1;
  const hasPrevious = !(currentSection === "intro" && currentIndex === 0);
  const hasNext = currentSection !== "player_bank";

  function advanceLocal(direction: -1 | 1) {
    if (direction > 0) {
      if (currentSection === "placements" && currentIndex < placementSlides.length - 1) {
        setCurrentIndex((value) => value + 1);
        return;
      }

      if (currentSection === "skins" && currentIndex < skins.length - 1) {
        setCurrentIndex((value) => value + 1);
        return;
      }

      const nextSection = sections[Math.min(sectionPosition + 1, sections.length - 1)];
      setCurrentSection(nextSection.id);
      setCurrentIndex(0);
      return;
    }

    if (currentIndex > 0) {
      setCurrentIndex((value) => value - 1);
      return;
    }

    const previousSection = sections[Math.max(sectionPosition - 1, 0)];
    setCurrentSection(previousSection.id);

    if (previousSection.id === "placements") {
      setCurrentIndex(Math.max(placementSlides.length - 1, 0));
      return;
    }

    if (previousSection.id === "skins") {
      setCurrentIndex(Math.max(skins.length - 1, 0));
      return;
    }

    setCurrentIndex(0);
  }

  async function enterTvMode() {
    await document.documentElement.requestFullscreen?.();
  }

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "ArrowRight") {
        advanceLocal(1);
      }

      if (event.key === "ArrowLeft") {
        advanceLocal(-1);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  });

  return (
    <main className="min-h-screen overflow-hidden bg-black text-[#f5f5f5]">
      <div className="flex min-h-screen flex-col justify-between p-8 lg:p-12">
        <header className="flex items-start justify-between gap-6">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.35em] text-[#16a34a]">
              Money Rounds Results
            </p>
            <p className="mt-2 text-sm text-[#a3a3a3]">
              {section.label}
              {slideCount > 1 ? ` · ${currentIndex + 1}/${slideCount}` : ""}
            </p>
            {presentationStateError && (
              <p className="mt-2 text-xs text-[#ff8a8a]">
                Controller state unavailable: {presentationStateError}
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={enterTvMode}
            className="rounded-full border border-[#166534] px-5 py-2 text-sm font-bold text-[#16a34a] transition hover:bg-[#0f1f16]"
          >
            Enter TV Mode
          </button>
        </header>

        <section className="flex flex-1 items-center py-8">
          <div className="w-full">
            {isLoading && (
              <p className="text-4xl font-bold text-[#a3a3a3]">
                Loading results...
              </p>
            )}

            {!isLoading && error && (
              <div className="rounded-3xl border border-[#242424] bg-[#111111] p-8 text-2xl text-[#ff8a8a]">
                {error}
              </div>
            )}

            {!isLoading && !error && round && section.id === "intro" && (
              <div className="grid gap-8 lg:grid-cols-[1.4fr_0.8fr] lg:items-end">
                <div>
                  <p className="text-xl uppercase tracking-[0.3em] text-[#16a34a]">
                    Official Results
                  </p>
                  <h1 className="mt-5 text-7xl font-black tracking-tight lg:text-8xl">
                    {round.name}
                  </h1>
                  <p className="mt-5 text-3xl text-[#a3a3a3]">
                    {round.round_date || "Date TBD"} · {round.status}
                  </p>
                </div>

                <div className="rounded-3xl border border-[#166534] bg-[#07120c] p-8">
                  <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[#16a34a]">
                    Total Pot
                  </p>
                  <p className="mt-4 text-6xl font-black">
                    {money(totalPot(round))}
                  </p>
                  <p className="mt-4 text-lg text-[#a3a3a3]">
                    Placement plus skins payout configuration.
                  </p>
                </div>
              </div>
            )}

            {!isLoading && !error && round && section.id === "placements" && (
              <div className="space-y-8">
                {!hasScores || !currentPlacement ? (
                  <p className="rounded-3xl border border-[#242424] bg-[#111111] p-8 text-3xl text-[#a3a3a3]">
                    This round does not have placement results yet.
                  </p>
                ) : (
                  <>
                    <p className="text-xl uppercase tracking-[0.3em] text-[#16a34a]">
                      {currentPlacement.position === 1
                        ? "1st Place"
                        : currentPlacement.position === 2
                          ? "2nd Place"
                          : "3rd Place"}
                    </p>
                    <div className="rounded-[2rem] border border-[#16a34a] bg-[#07120c] p-10">
                      <div className="grid gap-8 lg:grid-cols-[1fr_0.35fr] lg:items-end">
                        <div>
                          <h1 className="text-7xl font-black tracking-tight lg:text-8xl">
                            {currentPlacement.team.name}
                          </h1>
                          <p className="mt-5 text-3xl text-[#a3a3a3]">
                            {currentPlacement.team.player_names.join(", ") ||
                              "No players"}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm uppercase tracking-[0.24em] text-[#a3a3a3]">
                            Total Score
                          </p>
                          <p className="text-7xl font-black">
                            {currentPlacement.total}
                          </p>
                          <p className="mt-6 text-sm uppercase tracking-[0.24em] text-[#a3a3a3]">
                            Payout
                          </p>
                          <p className="text-5xl font-black text-[#16a34a]">
                            {money(
                              bankByTeam[currentPlacement.team.name]?.placement || 0,
                            )}
                          </p>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {!isLoading && !error && round && section.id === "skins" && (
              <div className="space-y-8">
                {skins.length === 0 || !currentSkin ? (
                  <p className="rounded-3xl border border-[#242424] bg-[#111111] p-8 text-3xl text-[#a3a3a3]">
                    No skins awarded this round.
                  </p>
                ) : (
                  <>
                    <p className="text-xl uppercase tracking-[0.3em] text-[#16a34a]">
                      Skin {currentIndex + 1} of {skins.length}
                    </p>
                    <div className="rounded-[2rem] border border-[#16a34a] bg-[#07120c] p-10">
                      <p className="text-3xl font-black text-[#16a34a]">
                        Hole {currentSkin.hole}
                      </p>
                      <h1 className="mt-5 text-7xl font-black tracking-tight lg:text-8xl">
                        {currentSkin.team.name}
                      </h1>
                      <p className="mt-5 text-3xl text-[#a3a3a3]">
                        {currentSkin.team.player_names.join(", ") || "No players"}
                      </p>
                      <div className="mt-10 grid gap-4 lg:grid-cols-2">
                        <div className="rounded-3xl border border-[#166534]/70 bg-black/30 p-6">
                          <p className="text-sm uppercase tracking-[0.24em] text-[#a3a3a3]">
                            Team Score
                          </p>
                          <p className="mt-3 text-6xl font-black">
                            {currentSkin.score}
                          </p>
                        </div>
                        <div className="rounded-3xl border border-[#166534]/70 bg-black/30 p-6">
                          <p className="text-sm uppercase tracking-[0.24em] text-[#a3a3a3]">
                            Skin Value
                          </p>
                          <p className="mt-3 text-6xl font-black text-[#16a34a]">
                            {money(currentSkin.value)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {!isLoading && !error && round && section.id === "player_bank" && (
              <div className="space-y-5">
                <h1 className="text-6xl font-black tracking-tight">
                  Player Payouts
                </h1>
                {positiveBankRows.length === 0 && (
                  <p className="rounded-3xl border border-[#242424] bg-[#111111] p-8 text-3xl text-[#a3a3a3]">
                    No positive player payouts this round.
                  </p>
                )}
                <div className="grid gap-3 lg:grid-cols-2">
                  {positiveBankRows.map((row) => (
                    <div
                      key={`${row.teamName}-${row.playerName}`}
                      className="grid grid-cols-[1fr_0.55fr] gap-4 rounded-2xl border border-[#242424] bg-[#111111] p-5"
                    >
                      <div>
                        <h2 className="text-2xl font-black">{row.playerName}</h2>
                        <p className="mt-1 text-sm text-[#a3a3a3]">
                          {row.teamName}
                        </p>
                      </div>
                      <div className="text-right">
                        <p
                          className={`text-3xl font-black ${
                            row.net >= 0 ? "text-[#16a34a]" : "text-[#a3a3a3]"
                          }`}
                        >
                          {signedMoney(row.net)}
                        </p>
                        <p className="mt-1 text-xs text-[#a3a3a3]">
                          Placement Winnings {money(row.placementWinnings)} ·
                          Skins Winnings {money(row.skinsWinnings)} · Buy-In{" "}
                          {money(row.buyIn)} · Net This Round{" "}
                          {signedMoney(row.net)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>

        <footer className="flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={() => advanceLocal(-1)}
            disabled={!hasPrevious}
            className="rounded-full border border-[#242424] px-6 py-3 font-bold text-[#f5f5f5] transition hover:border-[#16a34a] disabled:cursor-not-allowed disabled:opacity-40"
          >
            Previous
          </button>

          <p className="hidden text-sm text-[#737373] sm:block">
            Use left/right arrow keys to move sections.
          </p>

          <button
            type="button"
            onClick={() => advanceLocal(1)}
            disabled={!hasNext}
            className="rounded-full border border-[#16a34a] px-6 py-3 font-bold text-[#16a34a] transition hover:bg-[#0f1f16] disabled:cursor-not-allowed disabled:opacity-40"
          >
            Next
          </button>
        </footer>
      </div>
    </main>
  );
}
