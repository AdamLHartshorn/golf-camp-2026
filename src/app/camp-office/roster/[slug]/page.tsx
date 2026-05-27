"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
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
          "id, first_name, last_name, display_name, nickname, rank, display_rank, internal_rank_order, years_served, room, arrival, phone, email, photo_url, player_notes, questionnaire_answers, active",
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
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(244,241,234,0.08),transparent_34%),#050505] p-5 text-[#f5f5f5]">
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center space-y-6 py-8">
        {isLoading && (
          <div className="rounded-[1.45rem] border border-[#d8d1c4]/80 bg-[#efe9dc] p-5 text-center text-sm text-[#7a6f60]">
            Loading player...
          </div>
        )}

        {!isLoading && error && (
          <div className="rounded-2xl border border-[#242424] bg-[#111111] p-5 text-center text-sm text-[#ff8a8a]">
            {error}
          </div>
        )}

        {!isLoading && !error && !player && (
          <div className="rounded-[1.45rem] border border-[#d8d1c4]/80 bg-[#efe9dc] p-5 text-center text-sm text-[#7a6f60]">
            Player not found.
          </div>
        )}

        {!isLoading && !error && player && (
          <>
            <div className="overflow-hidden rounded-[1.8rem] border border-[#d8d1c4]/80 bg-[#efe9dc] text-[#17130e] shadow-[0_24px_70px_rgba(0,0,0,0.34)]">
              <div className="flex justify-center border-b border-[#d8d1c4] px-5 pt-6">
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
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#7a6f60]">
                  Camp Roster
                </p>

                <h1 className="text-4xl font-semibold tracking-[-0.05em]">
                  {player.display_name}
                </h1>

                <p className="text-[#7a6f60]">
                  Rank {getPublicDisplayRank(player.display_rank, player.rank)} ·{" "}
                  {typeof player.years_served === "number"
                    ? `${player.years_served} Years Served`
                    : `Room ${player.room || "-"}`}
                </p>
              </div>
            </div>

            <section className="rounded-[1.45rem] border border-[#d8d1c4]/80 bg-[#efe9dc] p-5 text-[#17130e]">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-[#d8d1c4] bg-[#f6f0e3] p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#7a6f60]">
                    Rank
                  </p>

                  <p className="mt-2 text-3xl font-semibold">
                    {getPublicDisplayRank(player.display_rank, player.rank)}
                  </p>
                </div>

                <div className="rounded-2xl border border-[#d8d1c4] bg-[#f6f0e3] p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#7a6f60]">
                    Years Served
                  </p>

                  <p className="mt-2 text-3xl font-semibold">
                    {typeof player.years_served === "number"
                      ? player.years_served
                      : "-"}
                  </p>
                </div>
              </div>

              <div className="mt-4 rounded-2xl border border-[#d8d1c4] bg-[#f6f0e3] p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#7a6f60]">
                  Room
                </p>

                <p className="mt-2 text-lg font-semibold">
                  {player.room || "-"}
                </p>
              </div>

              <div className="mt-4 rounded-2xl border border-[#d8d1c4] bg-[#f6f0e3] p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#7a6f60]">
                  Arrival
                </p>

                <p className="mt-2 text-lg font-semibold">
                  {player.arrival || "Arrival TBD"}
                </p>
              </div>

              <div className="mt-4 rounded-2xl border border-[#d8d1c4] bg-[#f6f0e3] p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#7a6f60]">
                  Status
                </p>

                <p className="mt-2 text-lg font-semibold">
                  {player.active === false ? "Inactive" : "Active"}
                </p>
              </div>
            </section>

            {[
              ["Phone", player.phone],
              ["Email", player.email],
            ].some(([, value]) => value) && (
              <section className="space-y-3">
                {[
                ["Phone", player.phone],
                ["Email", player.email],
              ]
                .filter(([, value]) => value)
                .map(([label, value]) => (
                  <div
                    key={label}
                    className="rounded-[1.45rem] border border-[#242424] bg-[#101010]/92 p-5"
                  >
                    <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#a3a3a3]">
                      {label}
                    </p>

                    <p className="mt-2 text-sm leading-6 text-[#f5f5f5]">
                      {value}
                    </p>
                  </div>
                ))}
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
                    className="rounded-[1.45rem] border border-[#242424] bg-[#101010]/92 p-5"
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

            {!player.phone && !player.email && loreItems(player).length === 0 && (
              <section className="rounded-[1.45rem] border border-[#242424] bg-[#101010]/92 p-5 text-sm text-[#a3a3a3]">
                No profile lore added yet.
              </section>
            )}
          </>
        )}

        <Link
          href="/camp-office/roster"
          className="text-center text-sm text-[#a3a3a3]"
        >
          ← Back to Camp Roster
        </Link>
      </div>
    </main>
  );
}
