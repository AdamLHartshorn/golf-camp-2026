"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  CampYear,
  currentCampYear,
  getCampYear,
  isCampYearFinalized,
  setCampYearFinalized,
} from "@/lib/campYear";

const tools = [
  {
    title: "Export Data",
    description: "Coming soon",
  },
  {
    title: "Archive Current Year",
    description: "Coming soon",
  },
  {
    title: "Reset Test Data",
    description: "Coming soon",
  },
  {
    title: "Start New Camp Year",
    description: "Coming soon",
  },
];

export default function SystemAdminPage() {
  const [campYear, setCampYear] = useState<CampYear | null>(null);
  const [isLoadingYear, setIsLoadingYear] = useState(true);
  const [isSavingYear, setIsSavingYear] = useState(false);
  const [yearMessage, setYearMessage] = useState("");
  const [yearError, setYearError] = useState("");
  const [schemaMissing, setSchemaMissing] = useState(false);
  const finalized = isCampYearFinalized(campYear);

  useEffect(() => {
    let isCurrent = true;

    async function fetchYear() {
      const result = await getCampYear(currentCampYear);

      if (!isCurrent) {
        return;
      }

      setCampYear(result.campYear);
      setSchemaMissing(result.schemaMissing);
      setYearError(
        result.error && !result.schemaMissing
          ? result.error.message || "Could not load camp year status."
          : "",
      );
      setIsLoadingYear(false);
    }

    fetchYear();

    return () => {
      isCurrent = false;
    };
  }, []);

  async function handleYearStatusChange(shouldFinalize: boolean) {
    const confirmationMessage = shouldFinalize
      ? "Finalizing the year will reveal the Closing Presentation and begin preserving this year for history. Continue?"
      : "Reopen Golf Camp 2026? This will hide the Closing Presentation from normal players until finalized again.";

    if (!window.confirm(confirmationMessage)) {
      return;
    }

    setIsSavingYear(true);
    setYearMessage("");
    setYearError("");

    const result = await setCampYearFinalized(shouldFinalize, currentCampYear);

    setIsSavingYear(false);
    setSchemaMissing(result.schemaMissing);

    if (result.error || !result.campYear) {
      setYearError(
        result.schemaMissing
          ? "Run supabase/2026_camp_years.sql before finalizing the year."
          : result.error?.message || "Could not update camp year status.",
      );
      return;
    }

    setCampYear(result.campYear);
    setYearMessage(
      shouldFinalize
        ? "Golf Camp 2026 finalized. Closing Presentation is visible."
        : "Golf Camp 2026 reopened. Closing Presentation is hidden from players.",
    );
  }

  return (
    <main className="min-h-screen bg-black p-6 text-[#f5f5f5]">
      <Link href="/admin" className="gc-back-link gc-floating-back gc-back-admin">
        ← BACK
      </Link>
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center space-y-8 py-8">
        <div className="space-y-2">
          <p className="text-sm uppercase tracking-[0.35em] text-[#a3a3a3]">
            Admin
          </p>

          <h1 className="text-4xl font-bold tracking-tight">
            System Tools
          </h1>

          <p className="text-[#a3a3a3]">
            Exports, resets, archives, and future year setup.
          </p>
        </div>

        <section className="gc-edge-card overflow-hidden">
          <div className="gc-section-head">
            <p className="gc-card-kicker">Golf Camp {currentCampYear}</p>
            <h2 className="gc-card-title">Year Finalization</h2>
            <p className="gc-card-copy">
              Finalizing reveals the Closing Presentation and starts preserving
              this year for future history views.
            </p>
          </div>

          <div className="space-y-4 p-5">
            <div className="grid grid-cols-[1fr_auto] items-center gap-4 rounded-xl border border-[#34312a] bg-black/30 px-4 py-3">
              <div>
                <p className="font-mono text-[10px] font-black uppercase tracking-[0.18em] text-[#a8a29a]">
                  Current Status
                </p>
                <p className="mt-1 text-xl font-black">
                  {isLoadingYear
                    ? "Loading..."
                    : finalized
                      ? "Finalized"
                      : "Active"}
                </p>
                {campYear?.finalized_at && (
                  <p className="mt-1 text-xs text-[#a3a3a3]">
                    Finalized {new Date(campYear.finalized_at).toLocaleString()}
                  </p>
                )}
              </div>
              <span
                className={`rounded-[0.4rem] border px-3 py-1 font-mono text-[10px] font-black uppercase tracking-[0.16em] ${
                  finalized
                    ? "border-[#d7c8a4]/50 text-[#d7c8a4]"
                    : "border-[#8fa66a]/50 text-[#8fa66a]"
                }`}
              >
                {finalized ? "Closed" : "Live"}
              </span>
            </div>

            {schemaMissing && (
              <div className="rounded-xl border border-[#d7c8a4]/35 bg-[#d7c8a4]/10 p-4 text-sm text-[#d7c8a4]">
                Run <span className="font-mono">supabase/2026_camp_years.sql</span>{" "}
                in Supabase before finalizing.
              </div>
            )}

            <div className="grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => handleYearStatusChange(true)}
                disabled={isSavingYear || finalized}
                className="gc-primary-button disabled:cursor-not-allowed disabled:opacity-45"
              >
                Finalize Golf Camp 2026
              </button>
              <button
                type="button"
                onClick={() => handleYearStatusChange(false)}
                disabled={isSavingYear || !finalized}
                className="rounded-xl border border-[#34312a] px-4 py-3 font-bold text-[#f4f1ea] transition hover:border-[#d7c8a4] disabled:cursor-not-allowed disabled:opacity-45"
              >
                Reopen Year
              </button>
            </div>

            <Link
              href="/closing-presentation"
              className="block rounded-xl border border-[#d7c8a4]/45 px-4 py-3 text-center font-bold text-[#d7c8a4] transition hover:bg-[#d7c8a4]/10"
            >
              Preview Closing Presentation
            </Link>

            {yearMessage && (
              <p className="text-sm font-semibold text-[#8fa66a]">
                {yearMessage}
              </p>
            )}
            {yearError && (
              <p className="text-sm font-semibold text-[#ff8a8a]">
                {yearError}
              </p>
            )}
          </div>
        </section>

        <section className="space-y-4">
          {tools.map((tool) => (
            <div
              key={tool.title}
              className="rounded-2xl border border-[#242424] bg-[#0b0b0b] p-5 opacity-70"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#a3a3a3]">
                System
              </p>

              <h2 className="mt-2 text-xl font-bold">{tool.title}</h2>

              <p className="mt-1 text-sm text-[#a3a3a3]">
                {tool.description}
              </p>
            </div>
          ))}
        </section>
      </div>
    </main>
  );
}
