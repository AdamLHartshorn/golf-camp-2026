"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

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
  room: string | null;
  arrival: string | null;
  phone: string | null;
  email: string | null;
  photo_url: string | null;
  player_notes: string | null;
  questionnaire_answers: QuestionnaireAnswers | null;
  active: boolean | null;
};

function getInitials(player: PlayerRow) {
  return `${player.first_name?.[0] || ""}${player.last_name?.[0] || ""}` || "?";
}

function loreItems(player: PlayerRow) {
  const answers = player.questionnaire_answers || {};

  return [
    ["Nickname", player.nickname],
    ["Player Notes", player.player_notes],
    ["Favorite Golf Camp Memory", answers.favorite_golf_camp_memory],
    ["Most Likely To", answers.most_likely_to],
    ["Walk-Up Song", answers.walk_up_song],
    ["Personal Scouting Report", answers.personal_scouting_report],
    ["Other/Funny Notes", answers.other_funny_notes],
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
          "id, first_name, last_name, display_name, nickname, rank, room, arrival, phone, email, photo_url, player_notes, questionnaire_answers, active",
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
    <main className="min-h-screen bg-black p-6 text-[#f5f5f5]">
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center space-y-8 py-8">
        {isLoading && (
          <div className="rounded-2xl border border-[#242424] bg-[#111111] p-5 text-center text-sm text-[#a3a3a3]">
            Loading player...
          </div>
        )}

        {!isLoading && error && (
          <div className="rounded-2xl border border-[#242424] bg-[#111111] p-5 text-center text-sm text-[#ff8a8a]">
            {error}
          </div>
        )}

        {!isLoading && !error && !player && (
          <div className="rounded-2xl border border-[#242424] bg-[#111111] p-5 text-center text-sm text-[#a3a3a3]">
            Player not found.
          </div>
        )}

        {!isLoading && !error && player && (
          <>
            <div className="space-y-5">
              <div className="flex justify-center">
                {player.photo_url ? (
                  <div
                    aria-label={`${player.display_name} profile`}
                    className="h-32 w-32 rounded-full border border-[#3a3a3a] bg-cover bg-center"
                    role="img"
                    style={{ backgroundImage: `url(${player.photo_url})` }}
                  />
                ) : (
                  <div className="flex h-28 w-28 items-center justify-center rounded-full border border-[#3a3a3a] bg-[#111111] text-4xl font-bold">
                    {getInitials(player)}
                  </div>
                )}
              </div>

              <div className="space-y-2 text-center">
                <p className="text-sm uppercase tracking-[0.35em] text-[#a3a3a3]">
                  Camp Roster
                </p>

                <h1 className="text-4xl font-bold tracking-tight">
                  {player.display_name}
                </h1>

                <p className="text-[#a3a3a3]">
                  Rank {player.rank || "-"} · Room {player.room || "-"}
                </p>
              </div>
            </div>

            <section className="rounded-2xl border border-[#242424] bg-[#111111] p-5">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-[#242424] bg-black/30 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-[#a3a3a3]">
                    Rank
                  </p>

                  <p className="mt-2 text-3xl font-bold">{player.rank || "-"}</p>
                </div>

                <div className="rounded-xl border border-[#242424] bg-black/30 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-[#a3a3a3]">
                    Room
                  </p>

                  <p className="mt-2 text-3xl font-bold">{player.room || "-"}</p>
                </div>
              </div>

              <div className="mt-4 rounded-xl border border-[#242424] bg-black/30 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-[#a3a3a3]">
                  Arrival
                </p>

                <p className="mt-2 text-lg font-semibold">
                  {player.arrival || "Arrival TBD"}
                </p>
              </div>

              <div className="mt-4 rounded-xl border border-[#242424] bg-black/30 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-[#a3a3a3]">
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
                    className="rounded-2xl border border-[#242424] bg-[#111111] p-5"
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
                    Questionnaire
                  </h2>
                </div>

                {loreItems(player).map(([label, value]) => (
                  <div
                    key={label}
                    className="rounded-2xl border border-[#242424] bg-[#111111] p-5"
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
              <section className="rounded-2xl border border-[#242424] bg-[#111111] p-5 text-sm text-[#a3a3a3]">
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
