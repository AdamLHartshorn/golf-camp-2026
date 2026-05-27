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
  const [showFallbackAccess, setShowFallbackAccess] = useState(false);
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
      setPlayerSession({
        id: "fallback-admin",
        display_name: "Fallback Admin",
        login_name: "megaballs",
        is_admin: true,
      });
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
    <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,rgba(143,166,106,0.1),transparent_34%),#050505] p-5 text-[#f5f5f5]">
      <div className="w-full max-w-sm space-y-7">
        <div className="flex justify-center pt-2">
          <Image
            src="/golf-camp-logo.png"
            alt="Golf Camp 2026"
            width={320}
            height={320}
            priority
            className="h-auto w-full max-w-[270px] drop-shadow-[0_20px_45px_rgba(0,0,0,0.45)]"
          />
        </div>

        <form
          onSubmit={handlePlayerLogin}
          className="space-y-4 rounded-2xl border border-[#2b2b27] bg-[#10100e]/92 p-5 shadow-[0_18px_55px_rgba(0,0,0,0.32)]"
        >
          <div className="space-y-4">
            <div>
            <label
              htmlFor="login-name"
              className="mb-2 block text-center text-xs font-semibold uppercase tracking-[0.16em] text-[#c8bfae]"
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
              className="login-field w-full rounded-xl border px-4 py-4 text-center text-base outline-none"
            />
            </div>

            <div>
            <label
              htmlFor="pin-code"
              className="mb-2 block text-center text-xs font-semibold uppercase tracking-[0.16em] text-[#c8bfae]"
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
              className="login-field w-full rounded-xl border px-4 py-4 text-center text-base tracking-[0.18em] outline-none"
            />
            </div>
          </div>

          {loginError && (
            <p className="text-sm font-semibold text-[#fca5a5]">{loginError}</p>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-xl bg-[#efe9dc] py-4 text-base font-semibold text-[#17130e] transition hover:bg-[#f8f2e6] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isLoading ? "Entering..." : "Enter"}
          </button>
        </form>

        <div className="space-y-3 text-center">
          {!showFallbackAccess && (
            <button
              type="button"
              onClick={() => {
                setShowFallbackAccess(true);
                setLoginError("");
                setFallbackError("");
              }}
              className="text-xs font-semibold text-[#756f66] underline-offset-4 transition hover:text-[#c8bfae] hover:underline"
            >
              Alternate access
            </button>
          )}

          {showFallbackAccess && (
            <form
              onSubmit={handleEnter}
              className="space-y-3 rounded-2xl border border-[#242424] bg-black/25 p-4"
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
                className="login-field w-full rounded-xl border px-4 py-3 text-center text-sm tracking-[0.18em] outline-none"
              />

              {fallbackError && (
                <p className="text-center text-sm text-[#ff8a8a]">
                  {fallbackError}
                </p>
              )}

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowFallbackAccess(false);
                    setPassword("");
                    setFallbackError("");
                  }}
                  className="rounded-xl border border-[#242424] py-3 text-sm font-semibold text-[#756f66] transition hover:border-[#34312a] hover:text-[#c8bfae]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl border border-[#34312a] py-3 text-sm font-semibold text-[#c8bfae] transition hover:border-[#8fa66a] hover:text-[#f5f5f5]"
                >
                  Enter
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}
