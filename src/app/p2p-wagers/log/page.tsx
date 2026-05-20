"use client";

import Link from "next/link";
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useActivePlayers } from "@/lib/useActivePlayers";

export default function P2PWagerLogPage() {
  const {
    players,
    isLoading: isLoadingPlayers,
    error: playersError,
  } = useActivePlayers();
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([]);
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  function togglePlayer(displayName: string) {
    setSelectedPlayers((currentPlayers) =>
      currentPlayers.includes(displayName)
        ? currentPlayers.filter((player) => player !== displayName)
        : [...currentPlayers, displayName],
    );
  }

  async function handleSubmit() {
    const trimmedDescription = description.trim();
    const parsedAmount = Number(amount);

    setMessage("");
    setError("");

    if (selectedPlayers.length < 2) {
      setError("Select at least two players.");
      return;
    }

    if (!trimmedDescription) {
      setError("Description is required.");
      return;
    }

    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setError("Enter a positive dollar amount.");
      return;
    }

    setIsSubmitting(true);

    const payload = {
      description: trimmedDescription,
      amount: parsedAmount,
      status: "active",
      player_names: selectedPlayers,
    };

    console.log("Submitting p2p_wagers payload:", payload);

    try {
      const { data, error: insertError } = await supabase
        .from("p2p_wagers")
        .insert(payload)
        .select();

      console.log("p2p_wagers insert result:", {
        data,
        error: insertError,
      });

      if (insertError) {
        setError(insertError.message || "Could not create wager.");
        return;
      }

      setAmount("");
      setDescription("");
      setMessage("Wager created.");
    } catch (submitError) {
      console.error("p2p_wagers insert failed:", submitError);
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Could not create wager.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-black p-6 text-[#f5f5f5]">
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center space-y-8 py-8">
        <div className="space-y-2">
          <p className="text-sm uppercase tracking-[0.35em] text-[#d6a84f]">
            P2P Wagers
          </p>

          <h1 className="text-4xl font-bold tracking-tight">Log Wager</h1>

          <p className="text-[#a3a3a3]">
            Book a side bet, prop, or gentleman&apos;s disagreement.
          </p>
        </div>

        <section className="rounded-2xl border border-[#242424] bg-[#111111] p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#d6a84f]">
            Players Involved
          </p>

          <div className="mt-4 space-y-3">
            {isLoadingPlayers && (
              <p className="text-sm text-[#a3a3a3]">Loading players...</p>
            )}

            {!isLoadingPlayers && playersError && (
              <p className="text-sm text-[#f5c56f]">{playersError}</p>
            )}

            {!isLoadingPlayers && !playersError && players.length === 0 && (
              <p className="text-sm text-[#a3a3a3]">No active players found.</p>
            )}

            {!isLoadingPlayers && !playersError && players.length > 0 && (
              <div className="grid grid-cols-2 gap-3">
                {players.map((player) => {
                  const isSelected = selectedPlayers.includes(
                    player.display_name,
                  );

                  return (
                    <button
                      key={player.id}
                      type="button"
                      onClick={() => togglePlayer(player.display_name)}
                      className={`rounded-2xl border p-4 text-left text-sm font-semibold transition-colors duration-200 ${
                        isSelected
                          ? "border-[#d6a84f] bg-[#d6a84f] text-black"
                          : "border-[#242424] bg-black text-[#f5f5f5] hover:border-[#d6a84f]"
                      }`}
                    >
                      {player.display_name}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-[#242424] bg-[#111111] p-5">
          <div className="space-y-4">
            <div>
              <label
                htmlFor="wager-description"
                className="mb-2 block text-sm text-[#a3a3a3]"
              >
                Wager Description
              </label>

              <input
                id="wager-description"
                type="text"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Closest approach, long drive, bad idea..."
                className="w-full rounded-xl border border-[#242424] bg-black px-4 py-4 text-[#f5f5f5] outline-none transition-colors duration-200 placeholder:text-[#737373] focus:border-[#d6a84f]"
              />
            </div>

            <div>
              <label
                htmlFor="wager-amount"
                className="mb-2 block text-sm text-[#a3a3a3]"
              >
                Dollar Amount
              </label>

              <input
                id="wager-amount"
                type="number"
                min="1"
                step="0.01"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                placeholder="25"
                className="w-full rounded-xl border border-[#242424] bg-black px-4 py-4 text-[#f5f5f5] outline-none transition-colors duration-200 placeholder:text-[#737373] focus:border-[#d6a84f]"
              />
            </div>

            <button
              type="button"
              onClick={handleSubmit}
              disabled={
                isSubmitting ||
                isLoadingPlayers ||
                Boolean(playersError) ||
                players.length === 0
              }
              className="w-full rounded-2xl border border-[#d6a84f] bg-[#d6a84f] px-5 py-4 text-center text-base font-bold text-black transition-colors duration-200 hover:border-[#b8872d] hover:bg-[#b8872d] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting ? "Creating..." : "Create Wager"}
            </button>
          </div>
        </section>

        {message && (
          <p className="text-center text-sm text-[#f5f5f5]">{message}</p>
        )}

        {error && (
          <p className="text-center text-sm text-[#f5c56f]">{error}</p>
        )}

        <Link
          href="/p2p-wagers"
          className="text-center text-sm text-[#a3a3a3]"
        >
          ← Back to P2P Wagers
        </Link>
      </div>
    </main>
  );
}
