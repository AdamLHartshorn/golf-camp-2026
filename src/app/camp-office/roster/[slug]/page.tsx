"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import type { CSSProperties } from "react";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { PlayerSilhouette } from "@/components/PlayerSilhouette";
import { getPublicDisplayRank } from "@/lib/playerRanks";

type QuestionnaireAnswers = {
  favorite_golf_camp_memory?: string;
  most_likely_to?: string;
  walk_up_song?: string;
  personal_scouting_report?: string;
  other_funny_notes?: string;
};

type PlayerRow = {
  id: string;
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
  player_notes: string | null;
  questionnaire_answers: QuestionnaireAnswers | null;
  active: boolean | null;
};

function loreItems(player: PlayerRow) {
  return [
    ["Player Notes", player.player_notes],
  ].filter(([, value]) => typeof value === "string" && value.trim());
}

function escapeVCardValue(value: string) {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

function downloadPlayerContact(player: PlayerRow) {
  const phoneNumber = player.phone_number || player.phone || "";
  const emailAddress = player.email_address || player.email || "";

  if (!phoneNumber) {
    return;
  }

  const fullName = player.display_name;
  const vCard = [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `FN:${escapeVCardValue(fullName)}`,
    `N:${escapeVCardValue(player.last_name || "")};${escapeVCardValue(
      player.first_name || "",
    )};;;`,
    `TEL;TYPE=CELL:${escapeVCardValue(phoneNumber)}`,
    emailAddress ? `EMAIL:${escapeVCardValue(emailAddress)}` : "",
    "END:VCARD",
  ]
    .filter(Boolean)
    .join("\n");

  const blob = new Blob([vCard], { type: "text/vcard;charset=utf-8" });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = `${fullName.trim().replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.vcf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

export default function PlayerProfilePage() {
  const params = useParams<{ slug: string }>();
  const [player, setPlayer] = useState<PlayerRow | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isCurrent = true;

    async function fetchPlayer() {
      const { data, error: fetchError } = await supabase
        .from("players")
        .select(
          "id, first_name, last_name, display_name, nickname, rank, display_rank, internal_rank_order, years_served, room, arrival, phone, email, phone_number, email_address, photo_url, player_notes, questionnaire_answers, active",
        )
        .eq("id", params.slug)
        .single();

      console.log("Camp roster player profile fetch:", {
        id: params.slug,
        data,
        error: fetchError,
      });

      if (!isCurrent) {
        return;
      }

      if (fetchError) {
        setPlayer(null);
        setError(fetchError.message || "Could not load player.");
        setIsLoading(false);
        return;
      }

      setPlayer(data as PlayerRow);
      setIsLoading(false);
    }

    fetchPlayer();

    return () => {
      isCurrent = false;
    };
  }, [params.slug]);

  return (
    <main className="gc-mobile-shell" style={{ "--page-accent": "#f4f1ea" } as CSSProperties}>
      <Link href="/camp-office/roster" className="gc-back-link gc-floating-back">
        ← BACK
      </Link>
      <div className="gc-mobile-stage">
        {isLoading && (
          <div className="gc-edge-card p-5 text-center text-sm text-[#b8b0a1]">
            Loading player...
          </div>
        )}

        {!isLoading && error && (
          <div className="gc-edge-card p-5 text-center text-sm text-[#ff8a8a]">
            {error}
          </div>
        )}

        {!isLoading && !error && !player && (
          <div className="gc-edge-card p-5 text-center text-sm text-[#b8b0a1]">
            Player not found.
          </div>
        )}

        {!isLoading && !error && player && (
          <>
            <div className="gc-edge-card text-[#f4f1ea]">
              <div className="gc-section-head flex justify-center px-5 pt-6">
                {player.photo_url ? (
                  <div
                    aria-label={`${player.display_name} profile`}
                    className="h-32 w-32 rounded-full border border-[#cfc4b3] bg-cover bg-center"
                    role="img"
                    style={{ backgroundImage: `url(${player.photo_url})` }}
                  />
                ) : (
                  <PlayerSilhouette
                    className="h-28 w-28"
                    label={`${player.display_name} profile placeholder`}
                  />
                )}
              </div>

              <div className="space-y-2 px-5 py-5 text-center">
                <p className="gc-card-kicker">
                  Camp Roster
                </p>

                <h1 className="gc-card-title">
                  {player.display_name}
                </h1>

                <p className="gc-card-copy">
                  Rank {getPublicDisplayRank(player.display_rank, player.rank)} ·{" "}
                  {typeof player.years_served === "number"
                    ? player.years_served === 0
                      ? "Rookie"
                      : `${player.years_served} ${
                          player.years_served === 1 ? "Year" : "Years"
                        } Served`
                    : `Room ${player.room || "-"}`}
                </p>
              </div>
            </div>

            <section className="gc-edge-card p-5 text-[#f4f1ea]">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border border-[#34312a] bg-black/30 p-4">
                  <p className="gc-card-kicker">
                    Rank
                  </p>

                  <p className="mt-2 text-3xl font-semibold">
                    {getPublicDisplayRank(player.display_rank, player.rank)}
                  </p>
                </div>

                <div className="rounded-lg border border-[#34312a] bg-black/30 p-4">
                  <p className="gc-card-kicker">
                    Years Served
                  </p>

                  <p className="mt-2 text-3xl font-semibold">
                    {typeof player.years_served === "number"
                      ? player.years_served === 0
                        ? "Rookie"
                        : player.years_served
                      : "-"}
                  </p>
                </div>
              </div>

              <div className="mt-4 rounded-lg border border-[#34312a] bg-black/30 p-4">
                <p className="gc-card-kicker">
                  Room
                </p>

                <p className="mt-2 text-lg font-semibold">
                  {player.room || "-"}
                </p>
              </div>

              <div className="mt-4 rounded-lg border border-[#34312a] bg-black/30 p-4">
                <p className="gc-card-kicker">
                  Arrival
                </p>

                <p className="mt-2 text-lg font-semibold">
                  {player.arrival || "Arrival TBD"}
                </p>
              </div>

              <div className="mt-4 rounded-lg border border-[#34312a] bg-black/30 p-4">
                <p className="gc-card-kicker">
                  Status
                </p>

                <p className="mt-2 text-lg font-semibold">
                  {player.active === false ? "Inactive" : "Active"}
                </p>
              </div>
            </section>

            {(player.phone_number || player.phone) && (
              <section className="profile-detail-card gc-edge-card p-5">
                <p className="gc-card-kicker">
                  Contact
                </p>
                <h2 className="gc-card-title">Save Contact</h2>
                <p className="gc-card-copy">
                  Download this player&apos;s individual contact card.
                </p>
                <button
                  type="button"
                  onClick={() => downloadPlayerContact(player)}
                  className="gc-primary-button mt-4 text-sm"
                >
                  Save Contact
                </button>
              </section>
            )}

            {loreItems(player).length > 0 && (
            <section className="space-y-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#a3a3a3]">
                    Lore
                  </p>
                  <h2 className="mt-2 text-2xl font-bold">
                    Lore
                  </h2>
                </div>

                {loreItems(player).map(([label, value]) => (
                  <div
                    key={label}
                    className="profile-detail-card rounded-[1.45rem] border border-[#242424] bg-[#101010]/92 p-5"
                  >
                    <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#a3a3a3]">
                      {label}
                    </p>

                    <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[#f5f5f5]">
                      {value}
                    </p>
                  </div>
                ))}
              </section>
            )}

            {!player.phone_number &&
              !player.phone &&
              loreItems(player).length === 0 && (
              <section className="profile-detail-card rounded-[1.45rem] border border-[#242424] bg-[#101010]/92 p-5 text-sm text-[#a3a3a3]">
                No profile lore added yet.
              </section>
            )}
          </>
        )}
      </div>
    </main>
  );
}
