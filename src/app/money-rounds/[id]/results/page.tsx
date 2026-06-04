"use client";

import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  calculateRoundMoney,
  compareTeamStandingsWorstFirst,
  formatRelativeToPar,
  formatScoreToCompletedPar,
  getTeamScoreStatus,
  moneyRoundScorecard,
  MoneyRound,
  MoneyScore,
  MoneyTeam,
  money,
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
    .sort(compareTeamStandingsWorstFirst);
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
  const winningStanding = standings.find((standing) => standing.position === 1);
  const biggestWinningTeam = Object.entries(bankByTeam)
    .filter(([, totals]) => totals.total > 0)
    .sort(
      ([teamNameA, totalsA], [teamNameB, totalsB]) =>
        totalsB.total - totalsA.total || teamNameA.localeCompare(teamNameB),
    )[0];
  const section = sections.find((item) => item.id === currentSection) || sections[0];
  const sectionPosition = sections.findIndex((item) => item.id === currentSection);
  const slideCount =
    currentSection === "placements"
      ? placementSlides.length
      : currentSection === "skins"
        ? skins.length
        : 1;
  const hasPrevious = !(currentSection === "intro" && currentIndex === 0);
  const hasNext = currentSection !== "complete";

  function renderHoleHighlightSlide(
    label: string,
    highlight: HoleHighlight | undefined,
  ) {
    return (
      <div className="space-y-8">
        <div>
          <p className="results-section-label text-xl font-semibold uppercase tracking-[0.28em] text-[#86efac]">
            Course Report
          </p>
          <h1 className="results-major-title mt-5 text-7xl font-black tracking-[-0.07em] lg:text-8xl">
            {label}
          </h1>
        </div>

        {!highlight ? (
          <p className="results-empty-state rounded-[0.9rem] border border-[#24452f] bg-black/45 p-8 text-3xl text-[#a3a3a3]">
            Hole scoring data is not available yet.
          </p>
        ) : (
          <div className="results-spotlight-card rounded-[0.9rem] border border-[#22c55e]/70 bg-[radial-gradient(circle_at_top_right,rgba(49,95,72,0.16),transparent_52%),linear-gradient(180deg,rgba(7,18,12,0.96),rgba(0,0,0,0.72))] p-10 shadow-[0_0_58px_rgba(49,95,72,0.11)]">
            <p className="results-section-label text-lg font-semibold uppercase tracking-[0.28em] text-[#86efac]">
              {label}
            </p>
            <h2 className="results-major-title mt-6 text-8xl font-black tracking-[-0.08em] lg:text-9xl">
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
    <main className="results-tv-shell min-h-screen overflow-hidden bg-[radial-gradient(circle_at_18%_8%,rgba(49,95,72,0.2),transparent_30%),radial-gradient(circle_at_88%_78%,rgba(36,76,58,0.18),transparent_36%),linear-gradient(135deg,#010503_0%,#050806_48%,#000_100%)] text-[#f5f5f5]">
      <div className="flex min-h-screen flex-col justify-between p-8 lg:p-12">
        <header className="results-topbar flex items-start justify-between gap-6 border-b border-[#24452f]/70 pb-5">
          <div>
            <div className="flex items-center gap-3">
              <p className="results-kicker text-sm font-semibold uppercase tracking-[0.28em] text-[#86efac]">
                Money Rounds Results
              </p>
              <span className="results-live-badge rounded-full border px-3 py-1 font-mono text-[10px] font-black uppercase tracking-[0.2em]">
                Live
              </span>
            </div>
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
            className="results-control-button rounded-full border border-[#22c55e]/70 bg-black/35 px-5 py-2 text-sm font-bold text-[#86efac] transition hover:bg-[#0f1f16]"
          >
            Enter TV Mode
          </button>
        </header>

        <section className="flex flex-1 items-center py-8">
          <div key={`${currentSection}-${currentIndex}`} className="results-slide w-full">
            {isLoading && (
              <p className="text-4xl font-bold text-[#a3a3a3]">
                Loading results...
              </p>
            )}

            {!isLoading && error && (
              <div className="rounded-[0.9rem] border border-[#242424] bg-[#111111] p-8 text-2xl text-[#ff8a8a]">
                {error}
              </div>
            )}

            {!isLoading && !error && round && section.id === "intro" && (
              <div className="grid gap-8 lg:grid-cols-[1.4fr_0.8fr] lg:items-end">
                <div>
                  <p className="results-section-label text-xl font-semibold uppercase tracking-[0.28em] text-[#86efac]">
                    Official Results
                  </p>
                  <h1 className="results-major-title mt-5 text-8xl font-black tracking-[-0.08em] lg:text-9xl">
                    {round.name}
                  </h1>
                  <p className="mt-5 text-3xl text-[#a3a3a3]">
                    {round.round_date || "Date TBD"} · {round.status}
                  </p>
                </div>

                <div className="results-spotlight-card rounded-[0.9rem] border border-[#22c55e]/70 bg-[radial-gradient(circle_at_top,rgba(49,95,72,0.16),transparent_58%),#07120c] p-8 shadow-[0_0_58px_rgba(49,95,72,0.11)]">
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
                  <p className="results-empty-state rounded-[0.9rem] border border-[#24452f] bg-black/45 p-8 text-3xl text-[#a3a3a3]">
                    This round does not have placement results yet.
                  </p>
                ) : (
                  <>
                    <p className="results-section-label text-xl font-semibold uppercase tracking-[0.28em] text-[#86efac]">
                      {ordinal(currentPlacement.position)} Place
                      {currentPlacement.position <= 3 ? "" : " · Standings Reveal"}
                    </p>
                    <div
                      className={`results-spotlight-card rounded-[0.9rem] border p-10 shadow-[0_28px_90px_rgba(0,0,0,0.48)] ${
                        currentPlacement.position <= 3
                          ? "border-[#22c55e]/75 bg-[radial-gradient(circle_at_top_right,rgba(49,95,72,0.16),transparent_54%),linear-gradient(180deg,rgba(7,18,12,0.96),rgba(0,0,0,0.72))]"
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
                          <p className="results-score-value text-7xl font-black tracking-[-0.06em]">
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
                            <p className="results-payout-value text-5xl font-black text-[#86efac]">
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
                  <p className="results-empty-state rounded-[0.9rem] border border-[#24452f] bg-black/45 p-8 text-3xl text-[#a3a3a3]">
                    No skins awarded this round.
                  </p>
                ) : (
                  <>
                    <p className="results-section-label text-xl font-semibold uppercase tracking-[0.28em] text-[#86efac]">
                      Skin {currentIndex + 1} of {skins.length}
                    </p>
                    <div className="results-spotlight-card rounded-[0.9rem] border border-[#22c55e]/75 bg-[radial-gradient(circle_at_top_right,rgba(49,95,72,0.16),transparent_54%),linear-gradient(180deg,rgba(7,18,12,0.96),rgba(0,0,0,0.72))] p-10 shadow-[0_0_58px_rgba(49,95,72,0.11),0_28px_90px_rgba(0,0,0,0.48)]">
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
                        <div className="results-stat-card rounded-[0.75rem] border border-[#22c55e]/40 bg-black/35 p-6">
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
                        <div className="results-stat-card rounded-[0.75rem] border border-[#22c55e]/40 bg-black/35 p-6">
                          <p className="text-sm uppercase tracking-[0.24em] text-[#a3a3a3]">
                            Skin Value
                          </p>
                          <p className="results-payout-value mt-3 text-6xl font-black text-[#86efac]">
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
                {payoutSlides.length === 0 ? (
                  <p className="results-empty-state rounded-[0.9rem] border border-[#24452f] bg-black/45 p-8 text-3xl text-[#a3a3a3]">
                    No positive player payouts this round.
                  </p>
                ) : (
                  <>
                    <p className="results-section-label text-xl font-semibold uppercase tracking-[0.28em] text-[#86efac]">
                      Player Payouts
                    </p>
                    <div className="results-spotlight-card rounded-[0.9rem] border border-[#22c55e]/75 bg-[radial-gradient(circle_at_top_right,rgba(49,95,72,0.16),transparent_54%),linear-gradient(180deg,rgba(7,18,12,0.96),rgba(0,0,0,0.72))] p-10 shadow-[0_0_58px_rgba(49,95,72,0.11),0_28px_90px_rgba(0,0,0,0.48)]">
                      <div className="flex flex-wrap items-end justify-between gap-5">
                        <div>
                          <h1 className="results-major-title text-6xl font-black tracking-[-0.07em] lg:text-7xl">
                            Round Bank
                          </h1>
                          <p className="mt-3 text-2xl text-[#a3a3a3]">
                            Positive player payouts
                          </p>
                        </div>
                        <p className="results-payout-value text-5xl font-black text-[#86efac]">
                          {money(
                            payoutSlides.reduce(
                              (total, row) => total + row.totalWinnings,
                              0,
                            ),
                          )}
                        </p>
                      </div>

                      <div className="mt-8 grid gap-3 lg:grid-cols-2">
                        {payoutSlides.map((row) => (
                          <div
                            key={`${row.playerName}-${row.teamName}`}
                            className="results-stat-card grid grid-cols-[1.1fr_0.85fr] items-center gap-4 rounded-[0.75rem] border border-[#22c55e]/40 bg-black/35 p-4"
                          >
                            <div className="min-w-0">
                              <p className="truncate text-2xl font-black tracking-[-0.04em]">
                                {row.playerName}
                              </p>
                              <p className="mt-1 truncate text-sm font-bold uppercase tracking-[0.16em] text-[#a3a3a3]">
                                {row.teamName}
                              </p>
                            </div>
                            <div className="grid grid-cols-3 items-end gap-3 text-right">
                              <div>
                                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#a3a3a3]">
                                  Place
                                </p>
                                <p className="mt-1 text-xl font-black">
                                  {money(row.placementWinnings)}
                                </p>
                              </div>
                              <div>
                                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#a3a3a3]">
                                  Skins
                                </p>
                                <p className="mt-1 text-xl font-black">
                                  {money(row.skinsWinnings)}
                                </p>
                              </div>
                              <div>
                                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#a3a3a3]">
                                  Total
                                </p>
                                <p className="results-payout-value mt-1 text-2xl font-black text-[#86efac]">
                                  {money(row.totalWinnings)}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {!isLoading && !error && round && section.id === "complete" && (
              <div className="flex min-h-[65vh] items-center justify-center">
                <div className="w-full max-w-6xl text-center">
                  <h1 className="results-major-title text-8xl font-black tracking-[-0.08em] lg:text-9xl">
                    {round.name} Complete
                  </h1>
                  <p className="mt-5 text-4xl font-black tracking-[-0.04em] text-[#86efac]">
                    Draft begins shortly.
                  </p>

                  <div className="mt-12 grid gap-4 text-left lg:grid-cols-5">
                    <div className="results-stat-card rounded-[0.75rem] border border-[#22c55e]/75 bg-[#07120c] p-6 shadow-[0_0_38px_rgba(49,95,72,0.1)]">
                      <p className="text-xs uppercase tracking-[0.24em] text-[#a3a3a3]">
                        Winning Team
                      </p>
                      <p className="mt-3 text-3xl font-black">
                        {winningStanding?.team.name || "-"}
                      </p>
                    </div>
                    <div className="results-stat-card rounded-[0.75rem] border border-[#24452f] bg-black/45 p-6">
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
                    <div className="results-stat-card rounded-[0.75rem] border border-[#24452f] bg-black/45 p-6">
                      <p className="text-xs uppercase tracking-[0.24em] text-[#a3a3a3]">
                        Biggest Winning Team
                      </p>
                      <p className="mt-3 text-3xl font-black">
                        {biggestWinningTeam?.[0] || "-"}
                      </p>
                      {biggestWinningTeam && (
                        <p className="mt-2 text-xl font-bold text-[#86efac]">
                          {money(biggestWinningTeam[1].total)}
                        </p>
                      )}
                    </div>
                    <div className="results-stat-card rounded-[0.75rem] border border-[#24452f] bg-black/45 p-6">
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
                    <div className="results-stat-card rounded-[0.75rem] border border-[#24452f] bg-black/45 p-6">
                      <p className="text-xs uppercase tracking-[0.24em] text-[#a3a3a3]">
                        Skins Awarded
                      </p>
                      <p className="mt-3 text-3xl font-black">
                        {skins.length}
                      </p>
                    </div>
                  </div>

                </div>
              </div>
            )}
          </div>
        </section>

        <footer className="results-footer flex items-center justify-between gap-4 border-t border-[#24452f]/70 pt-5">
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
      <style>{`
        .results-tv-shell {
          --results-accent: #6fa783;
          --results-accent-strong: #9ed1ae;
          --results-accent-deep: #315f48;
          --results-cream: #f4f1ea;
          --results-muted: #9b958b;
          position: relative;
          isolation: isolate;
          font-feature-settings:
            "tnum" 1,
            "ss01" 1;
        }

        .results-tv-shell::before {
          content: "";
          position: fixed;
          inset: -16%;
          pointer-events: none;
          z-index: -1;
          background:
            radial-gradient(circle at 16% 8%, rgba(158, 209, 174, 0.11), transparent 30rem),
            radial-gradient(circle at 82% 74%, rgba(49, 95, 72, 0.16), transparent 34rem),
            radial-gradient(circle at 50% 108%, rgba(111, 167, 131, 0.08), transparent 32rem);
          animation: resultsAmbientDrift 20s ease-in-out infinite alternate;
        }

        .results-tv-shell::after {
          content: "";
          position: fixed;
          inset: 0;
          pointer-events: none;
          z-index: -1;
          background:
            radial-gradient(circle at center, transparent 38%, rgba(0, 0, 0, 0.38) 100%),
            linear-gradient(180deg, rgba(255, 255, 255, 0.025), transparent 22%),
            repeating-linear-gradient(
              0deg,
              rgba(244, 241, 234, 0.016) 0,
              rgba(244, 241, 234, 0.016) 1px,
              transparent 1px,
              transparent 7px
            );
          mix-blend-mode: screen;
          opacity: 0.44;
        }

        .results-topbar,
        .results-footer {
          position: relative;
          overflow: hidden;
          border-color: color-mix(
            in srgb,
            var(--results-accent) 42%,
            rgba(244, 241, 234, 0.12)
          );
          background:
            radial-gradient(
              ellipse at 0% 50%,
              color-mix(in srgb, var(--results-accent) 11%, transparent),
              transparent 18rem
            ),
            radial-gradient(
              ellipse at 100% 50%,
              color-mix(in srgb, var(--results-accent) 7%, transparent),
              transparent 18rem
            ),
            linear-gradient(
              180deg,
              rgba(18, 21, 18, 0.78),
              rgba(5, 8, 6, 0.58)
            );
          box-shadow:
            inset 0 0 0 1px color-mix(in srgb, var(--results-accent) 13%, transparent),
            inset 0 0 22px color-mix(in srgb, var(--results-accent) 7%, transparent),
            0 0 34px color-mix(in srgb, var(--results-accent) 10%, transparent);
          backdrop-filter: blur(18px);
        }

        .results-topbar {
          border-width: 1px;
          border-radius: 0.8rem;
          padding: 1rem 1.1rem;
        }

        .results-footer {
          border-width: 1px;
          border-radius: 0.75rem;
          padding: 0.85rem 1rem;
        }

        .results-kicker,
        .results-section-label,
        .results-control-button,
        .results-live-badge,
        .results-footer button {
          font-family:
            var(--font-geist-mono),
            ui-monospace,
            SFMono-Regular,
            Menlo,
            Monaco,
            Consolas,
            "Liberation Mono",
            "Courier New",
            monospace;
          text-transform: uppercase;
          letter-spacing: 0.14em;
        }

        .results-kicker,
        .results-section-label {
          color: color-mix(in srgb, var(--results-accent) 72%, var(--results-cream) 28%) !important;
          text-shadow:
            0 0 18px color-mix(in srgb, var(--results-accent) 16%, transparent),
            0 2px 14px rgba(0, 0, 0, 0.35);
        }

        .results-empty-state {
          position: relative;
          overflow: hidden;
          border-color: color-mix(
            in srgb,
            var(--results-accent) 28%,
            rgba(244, 241, 234, 0.1)
          ) !important;
          background:
            radial-gradient(
              ellipse at 0% 50%,
              color-mix(in srgb, var(--results-accent) 9%, transparent),
              transparent 12rem
            ),
            linear-gradient(180deg, rgba(12, 14, 12, 0.78), rgba(4, 6, 4, 0.62)) !important;
          box-shadow:
            inset 0 0 0 1px color-mix(in srgb, var(--results-accent) 8%, transparent),
            0 0 20px color-mix(in srgb, var(--results-accent) 6%, transparent);
        }

        .results-slide {
          animation: resultsSlideSettle 620ms ease both;
        }

        .results-live-badge {
          color: var(--results-accent-strong);
          border-color: color-mix(in srgb, var(--results-accent) 58%, transparent);
          background:
            radial-gradient(
              circle at 50% 0%,
              color-mix(in srgb, var(--results-accent) 34%, transparent),
              transparent 70%
            ),
            rgba(5, 8, 6, 0.72);
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.09),
            0 0 18px color-mix(in srgb, var(--results-accent) 28%, transparent);
          animation: resultsLivePulse 2.7s ease-in-out infinite;
        }

        .results-control-button,
        .results-footer button {
          border-radius: 0.45rem !important;
          border-color: color-mix(in srgb, var(--results-accent) 48%, rgba(244, 241, 234, 0.12)) !important;
          background:
            linear-gradient(
              180deg,
              color-mix(in srgb, var(--results-accent) 15%, rgba(255, 255, 255, 0.03)),
              rgba(3, 7, 4, 0.72)
            ) !important;
          color: color-mix(in srgb, var(--results-accent) 56%, var(--results-cream) 44%) !important;
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.08),
            0 0 22px color-mix(in srgb, var(--results-accent) 12%, transparent);
        }

        .results-control-button:hover,
        .results-footer button:hover:not(:disabled) {
          border-color: color-mix(in srgb, var(--results-accent) 70%, rgba(244, 241, 234, 0.16)) !important;
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.1),
            0 0 32px color-mix(in srgb, var(--results-accent) 18%, transparent);
        }

        .results-spotlight-card {
          position: relative;
          overflow: hidden;
          border-color: color-mix(
            in srgb,
            var(--results-accent) 52%,
            rgba(244, 241, 234, 0.13)
          ) !important;
          background:
            radial-gradient(
              ellipse at 0% 50%,
              color-mix(in srgb, var(--results-accent) 17%, transparent),
              transparent 20rem
            ),
            radial-gradient(
              ellipse at 100% 50%,
              color-mix(in srgb, var(--results-accent) 10%, transparent),
              transparent 22rem
            ),
            linear-gradient(
              180deg,
              color-mix(in srgb, var(--results-accent) 7%, transparent),
              color-mix(in srgb, var(--results-accent) 3%, transparent)
            ),
            linear-gradient(180deg, rgba(14, 18, 14, 0.94), rgba(3, 7, 4, 0.86)) !important;
          box-shadow:
            inset 0 0 0 1px color-mix(in srgb, var(--results-accent) 20%, transparent),
            inset 0 0 30px color-mix(in srgb, var(--results-accent) 9%, transparent),
            inset 0 1px 0 rgba(255, 255, 255, 0.06),
            0 24px 72px rgba(0, 0, 0, 0.44),
            0 0 42px color-mix(in srgb, var(--results-accent) 14%, transparent) !important;
          backdrop-filter: blur(22px);
          animation: resultsSpotlightGlow 5.8s ease-in-out infinite alternate;
        }

        .results-stat-card {
          position: relative;
          overflow: hidden;
          border-color: color-mix(
            in srgb,
            var(--results-accent) 38%,
            rgba(244, 241, 234, 0.11)
          ) !important;
          background:
            radial-gradient(
              ellipse at 0% 50%,
              color-mix(in srgb, var(--results-accent) 13%, transparent),
              transparent 10rem
            ),
            linear-gradient(180deg, rgba(15, 18, 15, 0.82), rgba(4, 7, 4, 0.68)) !important;
          box-shadow:
            inset 0 0 0 1px color-mix(in srgb, var(--results-accent) 12%, transparent),
            inset 0 1px 0 rgba(255, 255, 255, 0.055),
            0 0 22px color-mix(in srgb, var(--results-accent) 8%, transparent);
          backdrop-filter: blur(14px);
        }

        .results-spotlight-card::before,
        .results-stat-card::before {
          content: "";
          position: absolute;
          inset: 0;
          pointer-events: none;
          background:
            linear-gradient(
              90deg,
              color-mix(in srgb, var(--results-accent) 15%, transparent),
              transparent 20%,
              transparent 80%,
              color-mix(in srgb, var(--results-accent) 9%, transparent)
            ),
            linear-gradient(180deg, rgba(255, 255, 255, 0.04), transparent 36%);
          opacity: 0.58;
          animation: resultsEdgeBreathe 4.8s ease-in-out infinite alternate;
        }

        .results-spotlight-card > *,
        .results-stat-card > * {
          position: relative;
          z-index: 1;
        }

        .results-major-title {
          color: var(--results-cream);
          font-family:
            var(--font-geist-mono),
            ui-monospace,
            SFMono-Regular,
            Menlo,
            Monaco,
            Consolas,
            "Liberation Mono",
            "Courier New",
            monospace;
          text-transform: uppercase;
          letter-spacing: -0.065em;
          text-shadow:
            0 0 22px color-mix(in srgb, var(--results-accent) 18%, transparent),
            0 0 68px color-mix(in srgb, var(--results-accent) 16%, transparent),
            0 8px 42px rgba(0, 0, 0, 0.5);
        }

        .results-score-value,
        .results-payout-value {
          animation: resultsValueEmphasis 720ms ease both;
          color: var(--results-accent-strong);
          text-shadow:
            0 0 18px color-mix(in srgb, var(--results-accent) 22%, transparent),
            0 0 48px color-mix(in srgb, var(--results-accent) 16%, transparent);
        }

        @keyframes resultsAmbientDrift {
          from {
            transform: translate3d(-0.55%, -0.45%, 0) scale(1);
            opacity: 0.82;
          }
          to {
            transform: translate3d(0.65%, 0.55%, 0) scale(1.022);
            opacity: 1;
          }
        }

        @keyframes resultsSlideSettle {
          from {
            opacity: 0;
            transform: translateY(12px) scale(0.996);
            filter: blur(5px);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
            filter: blur(0);
          }
        }

        @keyframes resultsSpotlightGlow {
          from {
            filter: saturate(1);
            box-shadow:
              inset 0 0 0 1px color-mix(in srgb, var(--results-accent) 18%, transparent),
              inset 0 0 28px color-mix(in srgb, var(--results-accent) 8%, transparent),
              inset 0 1px 0 rgba(255, 255, 255, 0.055),
              0 24px 72px rgba(0, 0, 0, 0.44),
              0 0 36px color-mix(in srgb, var(--results-accent) 12%, transparent);
          }
          to {
            filter: saturate(1.08);
            box-shadow:
              inset 0 0 0 1px color-mix(in srgb, var(--results-accent) 26%, transparent),
              inset 0 0 34px color-mix(in srgb, var(--results-accent) 11%, transparent),
              inset 0 1px 0 rgba(255, 255, 255, 0.07),
              0 24px 72px rgba(0, 0, 0, 0.46),
              0 0 56px color-mix(in srgb, var(--results-accent) 17%, transparent);
          }
        }

        @keyframes resultsEdgeBreathe {
          from {
            opacity: 0.38;
          }
          to {
            opacity: 0.72;
          }
        }

        @keyframes resultsLivePulse {
          0%,
          100% {
            opacity: 0.78;
            transform: translateY(0);
          }
          50% {
            opacity: 1;
            transform: translateY(-1px);
          }
        }

        @keyframes resultsValueEmphasis {
          from {
            opacity: 0.72;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .results-tv-shell::before,
          .results-slide,
          .results-live-badge,
          .results-spotlight-card,
          .results-spotlight-card::before,
          .results-stat-card::before,
          .results-score-value,
          .results-payout-value {
            animation: none;
          }
        }
      `}</style>
    </main>
  );
}
