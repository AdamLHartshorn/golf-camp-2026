"use client";

import Image from "next/image";
import type { FormEvent } from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { setPlayerSession } from "@/lib/playerSession";

type LoginPlayer = {
  id: string;
  display_name: string;
  login_name: string | null;
  is_admin: boolean | null;
};

export default function LoginPage() {
  const [password, setPassword] = useState("");
  const [loginName, setLoginName] = useState("");
  const [pinCode, setPinCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [fallbackError, setFallbackError] = useState("");
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

    setFallbackError("Wrong password");
  }

  async function handlePlayerLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const normalizedLoginName = loginName.trim().toLowerCase();
    const normalizedPinCode = pinCode.trim();

    setLoginError("");
    setFallbackError("");

    if (!normalizedLoginName || !normalizedPinCode) {
      setLoginError("Enter login name and PIN.");
      return;
    }

    setIsLoading(true);

    const { data, error: loginError } = await supabase
      .from("players")
      .select("id, display_name, login_name, is_admin")
      .eq("login_name", normalizedLoginName)
      .eq("pin_code", normalizedPinCode)
      .eq("active", true)
      .maybeSingle();

    console.log("player pin login:", {
      loginName: normalizedLoginName,
      hasPlayer: Boolean(data),
      error: loginError,
    });

    if (loginError || !data) {
      setLoginError(loginError?.message || "Wrong login name or PIN.");
      setIsLoading(false);
      return;
    }

    const player = data as LoginPlayer;
    await supabase
      .from("players")
      .update({ last_login_at: new Date().toISOString() })
      .eq("id", player.id);
    setPlayerSession({
      id: player.id,
      display_name: player.display_name,
      login_name: player.login_name,
      is_admin: player.is_admin === true,
    });
    setIsLoading(false);
    router.push("/home");
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

        <form onSubmit={handlePlayerLogin} className="space-y-4">
          <div>
            <label
              htmlFor="login-name"
              className="mb-2 block text-xs font-semibold uppercase tracking-[0.22em] text-[#a3a3a3]"
            >
              Login Name
            </label>
            <input
              id="login-name"
              type="text"
              value={loginName}
              onChange={(event) => {
                setLoginName(event.target.value.toLowerCase());
                setLoginError("");
                setFallbackError("");
              }}
              placeholder="Login Name"
              autoComplete="username"
              enterKeyHint="next"
              className="w-full rounded-xl border border-[#242424] bg-[#111111] px-4 py-4 text-center text-lg outline-none focus:border-[#f5f5f5]"
            />
          </div>

          <div>
            <label
              htmlFor="pin-code"
              className="mb-2 block text-xs font-semibold uppercase tracking-[0.22em] text-[#a3a3a3]"
            >
              PIN
            </label>
            <input
              id="pin-code"
              type="text"
              value={pinCode}
              onChange={(event) => {
                setPinCode(event.target.value);
                setLoginError("");
                setFallbackError("");
              }}
              placeholder="PIN"
              autoComplete="current-password"
              inputMode="numeric"
              enterKeyHint="go"
              className="w-full rounded-xl border border-[#242424] bg-[#111111] px-4 py-4 text-center text-lg tracking-widest outline-none focus:border-[#f5f5f5]"
            />
          </div>

          <p className="text-center text-sm text-[#a3a3a3]">
            Use your assigned Golf Camp login and PIN.
          </p>

          {loginError && (
            <p className="text-center text-sm text-[#ff8a8a]">{loginError}</p>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-xl bg-[#f5f5f5] py-4 text-lg font-semibold text-black transition hover:bg-[#d4d4d4] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isLoading ? "Entering..." : "Enter"}
          </button>
        </form>

        <div className="flex items-center gap-3 text-xs uppercase tracking-[0.2em] text-[#737373]">
          <span className="h-px flex-1 bg-[#242424]" />
          Fallback Access
          <span className="h-px flex-1 bg-[#242424]" />
        </div>

        <form
          onSubmit={handleEnter}
          className="space-y-4 rounded-2xl border border-[#242424] bg-[#0b0b0b] p-4 opacity-90"
        >
          <input
            type="text"
            value={password}
            onChange={(event) => {
              setPassword(event.target.value);
              setLoginError("");
              setFallbackError("");
            }}
            placeholder="Enter Password"
            enterKeyHint="go"
            className="w-full rounded-xl border border-[#242424] bg-black px-4 py-4 text-center text-base tracking-widest outline-none focus:border-[#f5f5f5]"
          />

          {fallbackError && (
            <p className="text-center text-sm text-[#ff8a8a]">
              {fallbackError}
            </p>
          )}

          <button
            type="submit"
            className="w-full rounded-xl border border-[#242424] py-3 text-sm font-semibold text-[#a3a3a3] transition hover:border-[#f5f5f5] hover:text-[#f5f5f5]"
          >
            Enter
          </button>
        </form>
      </div>
    </main>
  );
}
