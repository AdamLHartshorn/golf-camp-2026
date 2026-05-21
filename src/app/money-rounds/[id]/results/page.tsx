"use client";

import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  calculateRoundMoney,
  formatRelativeToPar,
  formatScoreToCompletedPar,
  getTeamScoreStatus,
  moneyRoundScorecard,
  MoneyRound,
  MoneyScore,
  MoneyTeam,
  money,
  signedMoney,
  teamScoreStatusLabel,
  TeamScoreStatus,
} from "@/app/money-rounds/_lib/moneyRoundUtils";

const sections = [
  { id: "intro", label: "Intro" },
  { id: "easiest_hole", label: "Easiest Hole" },
  { id: "hardest_hole", label: "Hardest Hole" },
  { id: "placements", label: "Placements" },
  { id: "skins", label: "Skins" },
  { id: "player_bank", label: "Round Bank" },
  { id: "complete", label: "Complete" },
];

function totalPot(round: MoneyRound) {
  return (
    Number(round.first_place_payout || 0) +
    Number(round.second_place_payout || 0) +
    Number(round.third_place_payout || 0) +
    Number(round.skins_pot || 0)
  );
}

function getHolePar(hole: number) {
  return moneyRoundScorecard.find((item) => item.hole === hole)?.par || 0;
}

function getHoleHandicap(hole: number) {
  return moneyRoundScorecard.find((item) => item.hole === hole)?.handicap || null;
}

function formatAverage(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function formatAverageRelativeToPar(value: number) {
  if (Math.abs(value) < 0.05) {
    return "E";
  }

  return value > 0 ? `+${value.toFixed(1)}` : value.toFixed(1);
}

function ordinal(value: number) {
  const suffix =
    value % 100 >= 11 && value % 100 <= 13
      ? "th"
      : value % 10 === 1
        ? "st"
        : value % 10 === 2
          ? "nd"
          : value % 10 === 3
            ? "rd"
            : "th";

  return `${value}${suffix}`;
}

function scoreStatusClasses(status: TeamScoreStatus) {
  if (status === "verified") {
    return "border-[#16a34a] bg-[#0f1f16] text-[#16a34a]";
  }

  if (status === "submitted") {
    return "border-[#365f3d] bg-[#111b14] text-[#d8f5df]";
  }

  return "border-[#242424] bg-black text-[#a3a3a3]";
}

type HoleHighlight = {
  hole: number;
  par: number;
  handicap: number;
  averageScore: number;
  averageRelativeToPar: number;
};

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
  const courseHighlights = useMemo(() => {
    const holeRows = moneyRoundScorecard
      .map((metadata) => {
        const holeScores = scores
          .filter((score) => score.hole_number === metadata.hole)
          .map((score) => Number(score.score))
          .filter((score) => Number.isFinite(score));

        if (holeScores.length === 0) {
          return null;
        }

        const averageScore =
          holeScores.reduce((total, score) => total + score, 0) /
          holeScores.length;

        return {
          ...metadata,
          averageScore,
          averageRelativeToPar: averageScore - metadata.par,
        };
      })
      .filter((row): row is NonNullable<typeof row> => Boolean(row));

    const hardest = holeRows.slice().sort((a, b) => {
      const relativeDifference =
        b.averageRelativeToPar - a.averageRelativeToPar;

      if (Math.abs(relativeDifference) > 0.001) {
        return relativeDifference;
      }

      return b.handicap - a.handicap;
    })[0];
    const easiest = holeRows.slice().sort((a, b) => {
      const relativeDifference =
        a.averageRelativeToPar - b.averageRelativeToPar;

      if (Math.abs(relativeDifference) > 0.001) {
        return relativeDifference;
      }

      return b.handicap - a.handicap;
    })[0];

    return { hardest, easiest };
  }, [scores]);
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
  const placementSlides = standings
    .slice()
    .sort((a, b) => b.total - a.total || b.position - a.position);
  const currentPlacement =
    placementSlides[Math.min(currentIndex, Math.max(placementSlides.length - 1, 0))];
  const currentSkin = skins[Math.min(currentIndex, Math.max(skins.length - 1, 0))];
  const payoutSlides = bankRows
    .filter((row) => row.net > 0 || row.totalWinnings > 0)
    .sort(
      (a, b) =>
        a.totalWinnings - b.totalWinnings ||
        a.net - b.net ||
        a.playerName.localeCompare(b.playerName),
    );
  const currentPayout =
    payoutSlides[Math.min(currentIndex, Math.max(payoutSlides.length - 1, 0))];
  const winningStanding = standings.find((standing) => standing.position === 1);
  const biggestWinner = payoutSlides[payoutSlides.length - 1];
  const section = sections.find((item) => item.id === currentSection) || sections[0];
  const sectionPosition = sections.findIndex((item) => item.id === currentSection);
  const slideCount =
    currentSection === "placements"
      ? placementSlides.length
      : currentSection === "skins"
        ? skins.length
        : currentSection === "player_bank"
          ? payoutSlides.length
        : 1;
  const hasPrevious = !(currentSection === "intro" && currentIndex === 0);
  const hasNext =
    currentSection !== "complete" &&
    (currentSection !== "player_bank" ||
      currentIndex < payoutSlides.length - 1 ||
      sectionPosition < sections.length - 1);

  function renderHoleHighlightSlide(
    label: string,
    highlight: HoleHighlight | undefined,
  ) {
    return (
      <div className="space-y-8">
        <div>
          <p className="text-xl font-semibold uppercase tracking-[0.28em] text-[#86efac]">
            Course Report
          </p>
          <h1 className="mt-5 text-7xl font-black tracking-[-0.07em] lg:text-8xl">
            {label}
          </h1>
        </div>

        {!highlight ? (
          <p className="rounded-[2rem] border border-[#24452f] bg-black/45 p-8 text-3xl text-[#a3a3a3]">
            Hole scoring data is not available yet.
          </p>
        ) : (
          <div className="rounded-[2.2rem] border border-[#22c55e]/70 bg-[radial-gradient(circle_at_top_right,rgba(22,163,74,0.26),transparent_52%),linear-gradient(180deg,rgba(7,18,12,0.96),rgba(0,0,0,0.72))] p-10 shadow-[0_0_70px_rgba(22,163,74,0.18)]">
            <p className="text-lg font-semibold uppercase tracking-[0.28em] text-[#86efac]">
              {label}
            </p>
            <h2 className="mt-6 text-8xl font-black tracking-[-0.08em] lg:text-9xl">
              Hole {highlight.hole}
            </h2>
            <p className="mt-4 text-3xl text-[#a3a3a3]">
              Par {highlight.par} · Hcp {highlight.handicap}
            </p>
            <p className="mt-10 text-6xl font-black tracking-[-0.05em]">
              Avg {formatAverage(highlight.averageScore)}{" "}
              <span className="text-[#86efac]">
                ({formatAverageRelativeToPar(highlight.averageRelativeToPar)})
              </span>
            </p>
          </div>
        )}
      </div>
    );
  }

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

      if (
        currentSection === "player_bank" &&
        currentIndex < payoutSlides.length - 1
      ) {
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

    if (previousSection.id === "player_bank") {
      setCurrentIndex(Math.max(payoutSlides.length - 1, 0));
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
    <main className="min-h-screen overflow-hidden bg-[radial-gradient(circle_at_18%_8%,rgba(22,163,74,0.22),transparent_30%),radial-gradient(circle_at_88%_78%,rgba(20,83,45,0.18),transparent_36%),linear-gradient(135deg,#020604_0%,#050806_48%,#000_100%)] text-[#f5f5f5]">
      <div className="flex min-h-screen flex-col justify-between p-8 lg:p-12">
        <header className="flex items-start justify-between gap-6 border-b border-[#24452f]/70 pb-5">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[#86efac]">
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
            className="rounded-full border border-[#22c55e]/70 bg-black/35 px-5 py-2 text-sm font-bold text-[#86efac] transition hover:bg-[#0f1f16]"
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
              <div className="rounded-[2rem] border border-[#242424] bg-[#111111] p-8 text-2xl text-[#ff8a8a]">
                {error}
              </div>
            )}

            {!isLoading && !error && round && section.id === "intro" && (
              <div className="grid gap-8 lg:grid-cols-[1.4fr_0.8fr] lg:items-end">
                <div>
                  <p className="text-xl font-semibold uppercase tracking-[0.28em] text-[#86efac]">
                    Official Results
                  </p>
                  <h1 className="mt-5 text-8xl font-black tracking-[-0.08em] lg:text-9xl">
                    {round.name}
                  </h1>
                  <p className="mt-5 text-3xl text-[#a3a3a3]">
                    {round.round_date || "Date TBD"} · {round.status}
                  </p>
                </div>

                <div className="rounded-[2rem] border border-[#22c55e]/70 bg-[radial-gradient(circle_at_top,rgba(22,163,74,0.24),transparent_58%),#07120c] p-8 shadow-[0_0_70px_rgba(22,163,74,0.18)]">
                  <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#86efac]">
                    Total Pot
                  </p>
                  <p className="mt-4 text-7xl font-black tracking-[-0.06em]">
                    {money(totalPot(round))}
                  </p>
                  <p className="mt-4 text-lg text-[#a3a3a3]">
                    Live standings are unofficial until verified.
                  </p>
                </div>
              </div>
            )}

            {!isLoading &&
              !error &&
              round &&
              section.id === "easiest_hole" &&
              renderHoleHighlightSlide("Easiest Hole", courseHighlights.easiest)}

            {!isLoading &&
              !error &&
              round &&
              section.id === "hardest_hole" &&
              renderHoleHighlightSlide("Hardest Hole", courseHighlights.hardest)}

            {!isLoading && !error && round && section.id === "placements" && (
              <div className="space-y-8">
                {!hasScores || !currentPlacement ? (
                  <p className="rounded-[2rem] border border-[#24452f] bg-black/45 p-8 text-3xl text-[#a3a3a3]">
                    This round does not have placement results yet.
                  </p>
                ) : (
                  <>
                    <p className="text-xl font-semibold uppercase tracking-[0.28em] text-[#86efac]">
                      {ordinal(currentPlacement.position)} Place
                      {currentPlacement.position <= 3 ? "" : " · Standings Reveal"}
                    </p>
                    <div
                      className={`rounded-[2.2rem] border p-10 shadow-[0_28px_90px_rgba(0,0,0,0.48)] ${
                        currentPlacement.position <= 3
                          ? "border-[#22c55e]/75 bg-[radial-gradient(circle_at_top_right,rgba(22,163,74,0.24),transparent_54%),linear-gradient(180deg,rgba(7,18,12,0.96),rgba(0,0,0,0.72))]"
                          : "border-[#24452f] bg-[linear-gradient(180deg,rgba(17,17,17,0.95),rgba(0,0,0,0.65))]"
                      }`}
                    >
                      <div className="grid gap-8 lg:grid-cols-[1fr_0.35fr] lg:items-end">
                        <div>
                          <span
                            className={`mb-4 inline-flex rounded-full border px-3 py-2 text-xs font-bold uppercase tracking-[0.22em] ${scoreStatusClasses(
                              getTeamScoreStatus(currentPlacement.team),
                            )}`}
                          >
                            {teamScoreStatusLabel(currentPlacement.team)}
                          </span>
                          <h1 className="text-7xl font-black tracking-[-0.08em] lg:text-8xl">
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
                          <p className="text-7xl font-black tracking-[-0.06em]">
                            {formatScoreToCompletedPar(
                              currentPlacement.total,
                              currentPlacement.scoresByHole,
                            )}
                          </p>
                          <p className="mt-6 text-sm uppercase tracking-[0.24em] text-[#a3a3a3]">
                            Payout
                          </p>
                          {(bankByTeam[currentPlacement.team.name]?.placement || 0) >
                          0 ? (
                            <p className="text-5xl font-black text-[#86efac]">
                              {money(
                                bankByTeam[currentPlacement.team.name]?.placement ||
                                  0,
                              )}
                            </p>
                          ) : (
                            <p className="text-4xl font-black text-[#a3a3a3]">
                              No payout
                            </p>
                          )}
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
                  <p className="rounded-[2rem] border border-[#24452f] bg-black/45 p-8 text-3xl text-[#a3a3a3]">
                    No skins awarded this round.
                  </p>
                ) : (
                  <>
                    <p className="text-xl font-semibold uppercase tracking-[0.28em] text-[#86efac]">
                      Skin {currentIndex + 1} of {skins.length}
                    </p>
                    <div className="rounded-[2.2rem] border border-[#22c55e]/75 bg-[radial-gradient(circle_at_top_right,rgba(22,163,74,0.24),transparent_54%),linear-gradient(180deg,rgba(7,18,12,0.96),rgba(0,0,0,0.72))] p-10 shadow-[0_0_70px_rgba(22,163,74,0.18),0_28px_90px_rgba(0,0,0,0.48)]">
                      <p className="text-3xl font-black text-[#86efac]">
                        Hole {currentSkin.hole}
                      </p>
                      <p className="mt-2 text-lg uppercase tracking-[0.18em] text-[#a3a3a3]">
                        Par {getHolePar(currentSkin.hole)} · Hcp{" "}
                        {getHoleHandicap(currentSkin.hole) || "-"}
                      </p>
                      <h1 className="mt-5 text-7xl font-black tracking-[-0.08em] lg:text-8xl">
                        {currentSkin.team.name}
                      </h1>
                      <p className="mt-5 text-3xl text-[#a3a3a3]">
                        {currentSkin.team.player_names.join(", ") || "No players"}
                      </p>
                      <div className="mt-10 grid gap-4 lg:grid-cols-2">
                        <div className="rounded-[1.5rem] border border-[#22c55e]/40 bg-black/35 p-6">
                          <p className="text-sm uppercase tracking-[0.24em] text-[#a3a3a3]">
                            Team Score
                          </p>
                          <p className="mt-3 text-6xl font-black">
                            {currentSkin.score}
                          </p>
                          <p className="mt-2 text-lg font-bold text-[#86efac]">
                            {formatRelativeToPar(
                              currentSkin.score,
                              getHolePar(currentSkin.hole),
                            )}
                          </p>
                        </div>
                        <div className="rounded-[1.5rem] border border-[#22c55e]/40 bg-black/35 p-6">
                          <p className="text-sm uppercase tracking-[0.24em] text-[#a3a3a3]">
                            Skin Value
                          </p>
                          <p className="mt-3 text-6xl font-black text-[#86efac]">
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
              <div className="space-y-8">
                {!currentPayout ? (
                  <p className="rounded-[2rem] border border-[#24452f] bg-black/45 p-8 text-3xl text-[#a3a3a3]">
                    No positive player payouts this round.
                  </p>
                ) : (
                  <>
                    <p className="text-xl font-semibold uppercase tracking-[0.28em] text-[#86efac]">
                      Player Payouts
                    </p>
                    <div className="rounded-[2.2rem] border border-[#22c55e]/75 bg-[radial-gradient(circle_at_top_right,rgba(22,163,74,0.24),transparent_54%),linear-gradient(180deg,rgba(7,18,12,0.96),rgba(0,0,0,0.72))] p-10 shadow-[0_0_70px_rgba(22,163,74,0.18),0_28px_90px_rgba(0,0,0,0.48)]">
                      <div>
                        <h1 className="text-7xl font-black tracking-[-0.08em] lg:text-8xl">
                          {currentPayout.playerName}
                        </h1>
                        <p className="mt-5 text-3xl text-[#a3a3a3]">
                          {currentPayout.teamName}
                        </p>
                      </div>

                      <div className="mt-10 grid gap-4 lg:grid-cols-[1fr_1fr_1fr_1.25fr]">
                        <div className="rounded-[1.5rem] border border-[#22c55e]/40 bg-black/35 p-6">
                          <p className="text-sm uppercase tracking-[0.24em] text-[#a3a3a3]">
                            Placement
                          </p>
                          <p className="mt-3 text-4xl font-black">
                            {money(currentPayout.placementWinnings)}
                          </p>
                        </div>
                        <div className="rounded-[1.5rem] border border-[#22c55e]/40 bg-black/35 p-6">
                          <p className="text-sm uppercase tracking-[0.24em] text-[#a3a3a3]">
                            Skins
                          </p>
                          <p className="mt-3 text-4xl font-black">
                            {money(currentPayout.skinsWinnings)}
                          </p>
                        </div>
                        <div className="rounded-[1.5rem] border border-[#24452f] bg-black/35 p-6">
                          <p className="text-sm uppercase tracking-[0.24em] text-[#a3a3a3]">
                            Buy-In
                          </p>
                          <p className="mt-3 text-4xl font-black text-[#a3a3a3]">
                            {money(currentPayout.buyIn)}
                          </p>
                        </div>
                        <div className="rounded-[1.5rem] border border-[#22c55e]/70 bg-black/35 p-6">
                          <p className="text-sm uppercase tracking-[0.24em] text-[#a3a3a3]">
                            Total Winnings
                          </p>
                          <p className="mt-3 text-5xl font-black text-[#86efac]">
                            {money(currentPayout.totalWinnings)}
                          </p>
                          <p className="mt-3 text-lg font-bold text-[#a3a3a3]">
                            Net This Round {signedMoney(currentPayout.net)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {!isLoading && !error && round && section.id === "complete" && (
              <div className="flex min-h-[65vh] items-center justify-center">
                <div className="w-full max-w-6xl text-center">
                  <p className="text-xl font-semibold uppercase tracking-[0.3em] text-[#86efac]">
                    Money Round Final
                  </p>
                  <h1 className="mt-6 text-8xl font-black tracking-[-0.08em] lg:text-9xl">
                    {round.name} Complete
                  </h1>

                  <div className="mt-12 grid gap-4 text-left lg:grid-cols-5">
                    <div className="rounded-[1.5rem] border border-[#22c55e]/75 bg-[#07120c] p-6 shadow-[0_0_45px_rgba(22,163,74,0.14)]">
                      <p className="text-xs uppercase tracking-[0.24em] text-[#a3a3a3]">
                        Winning Team
                      </p>
                      <p className="mt-3 text-3xl font-black">
                        {winningStanding?.team.name || "-"}
                      </p>
                    </div>
                    <div className="rounded-[1.5rem] border border-[#24452f] bg-black/45 p-6">
                      <p className="text-xs uppercase tracking-[0.24em] text-[#a3a3a3]">
                        Winning Score
                      </p>
                      <p className="mt-3 text-3xl font-black text-[#86efac]">
                        {winningStanding
                          ? formatScoreToCompletedPar(
                              winningStanding.total,
                              winningStanding.scoresByHole,
                            )
                          : "-"}
                      </p>
                    </div>
                    <div className="rounded-[1.5rem] border border-[#24452f] bg-black/45 p-6">
                      <p className="text-xs uppercase tracking-[0.24em] text-[#a3a3a3]">
                        Biggest Winner
                      </p>
                      <p className="mt-3 text-3xl font-black">
                        {biggestWinner?.playerName || "-"}
                      </p>
                      {biggestWinner && (
                        <p className="mt-2 text-xl font-bold text-[#86efac]">
                          {money(biggestWinner.totalWinnings)}
                        </p>
                      )}
                    </div>
                    <div className="rounded-[1.5rem] border border-[#24452f] bg-black/45 p-6">
                      <p className="text-xs uppercase tracking-[0.24em] text-[#a3a3a3]">
                        Hardest Hole
                      </p>
                      <p className="mt-3 text-3xl font-black">
                        {courseHighlights.hardest
                          ? `Hole ${courseHighlights.hardest.hole}`
                          : "-"}
                      </p>
                      {courseHighlights.hardest && (
                        <p className="mt-2 text-lg text-[#a3a3a3]">
                          Avg{" "}
                          {formatAverage(courseHighlights.hardest.averageScore)}{" "}
                          (
                          {formatAverageRelativeToPar(
                            courseHighlights.hardest.averageRelativeToPar,
                          )}
                          )
                        </p>
                      )}
                    </div>
                    <div className="rounded-[1.5rem] border border-[#24452f] bg-black/45 p-6">
                      <p className="text-xs uppercase tracking-[0.24em] text-[#a3a3a3]">
                        Skins Awarded
                      </p>
                      <p className="mt-3 text-3xl font-black">
                        {skins.length}
                      </p>
                    </div>
                  </div>

                  <p className="mt-12 text-4xl font-black tracking-[-0.04em] text-[#86efac]">
                    Draft begins shortly.
                  </p>
                </div>
              </div>
            )}
          </div>
        </section>

        <footer className="flex items-center justify-between gap-4 border-t border-[#24452f]/70 pt-5">
          <button
            type="button"
            onClick={() => advanceLocal(-1)}
            disabled={!hasPrevious}
            className="rounded-full border border-[#24452f] bg-black/30 px-6 py-3 font-bold text-[#f5f5f5] transition hover:border-[#22c55e] disabled:cursor-not-allowed disabled:opacity-40"
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
            className="rounded-full border border-[#22c55e]/70 bg-black/30 px-6 py-3 font-bold text-[#86efac] transition hover:bg-[#0f1f16] disabled:cursor-not-allowed disabled:opacity-40"
          >
            Next
          </button>
        </footer>
      </div>
    </main>
  );
}
