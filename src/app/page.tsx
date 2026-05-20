"use client";

import Image from "next/image";
import type { FormEvent } from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  function handleEnter(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();

    const normalizedPassword = password.trim().toUpperCase();

    if (normalizedPassword === "BALLS") {
      router.push("/home");
      return;
    }

    if (normalizedPassword === "MEGABALLS") {
      router.push("/admin");
      return;
    }

    setError("Wrong password");
  }

  return (
    <main className="min-h-screen bg-black text-[#f5f5f5] flex items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-8">
        <div className="flex justify-center">
          <Image
            src="/golf-camp-logo.png"
            alt="Golf Camp 2026"
            width={320}
            height={320}
            priority
            className="w-full max-w-[280px] h-auto"
          />
        </div>

        <form onSubmit={handleEnter} className="space-y-4">
          <input
            type="text"
            value={password}
            onChange={(event) => {
              setPassword(event.target.value);
              setError("");
            }}
            placeholder="Enter Password"
            enterKeyHint="go"
            className="w-full rounded-xl border border-[#242424] bg-[#111111] px-4 py-4 text-center text-xl tracking-widest outline-none focus:border-[#cfff82]"
          />

          {error && (
            <p className="text-center text-sm text-[#ff8a8a]">{error}</p>
          )}

          <button
            type="submit"
            className="w-full rounded-xl bg-[#f5f5f5] py-4 text-lg font-semibold text-black transition hover:bg-[#d4d4d4]"
          >
            Enter
          </button>
        </form>
      </div>
    </main>
  );
}
