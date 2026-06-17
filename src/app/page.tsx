"use client";

import Image from "next/image";
import type { CSSProperties, FormEvent } from "react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ToastProvider";
import { supabase } from "@/lib/supabase";
import { getPlayerSession, setPlayerSession } from "@/lib/playerSession";

type LoginPlayer = {
  id: string;
  display_name: string;
  login_name: string | null;
  is_admin: boolean | null;
};

export default function LoginPage() {
  const { showToast } = useToast();
  const [loginName, setLoginName] = useState("");
  const [pinCode, setPinCode] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [loginError, setLoginError] = useState("");
  const router = useRouter();

  useEffect(() => {
    if (getPlayerSession()) {
      router.replace("/home");
    }
  }, [router]);

  async function handlePlayerLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const normalizedLoginName = loginName.trim().toLowerCase();
    const normalizedPinCode = pinCode.trim();

    setLoginError("");

    if (!normalizedLoginName || !normalizedPinCode) {
      setLoginError("Enter login name and PIN.");
      showToast({
        title: "Login Required",
        message: "Enter login name and PIN.",
        tone: "warning",
        accent: "#8fa66a",
      });
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
      showToast({
        title: "Wrong Login Or PIN",
        message: "Check your Golf Camp login.",
        tone: "error",
      });
      setIsLoading(false);
      return;
    }

    const player = data as LoginPlayer;
    await supabase
      .from("players")
      .update({ last_login_at: new Date().toISOString() })
      .eq("id", player.id);
    setPlayerSession(
      {
        id: player.id,
        display_name: player.display_name,
        login_name: player.login_name,
        is_admin: player.is_admin === true,
      },
      { remember: rememberMe },
    );
    setIsLoading(false);
    showToast({
      title: "Welcome Back",
      message: player.display_name,
      accent: "#8fa66a",
    });
    router.push("/home");
  }

  return (
    <main className="gc-mobile-shell flex items-center justify-center" style={{ "--page-accent": "#8fa66a" } as CSSProperties}>
      <div className="w-full max-w-sm space-y-7">
        <div className="flex justify-center pt-2">
          <Image
            src="/longview-invitational-logo.png"
            alt="Golf Camp 2026"
            width={320}
            height={320}
            priority
            className="h-auto w-full max-w-[285px] drop-shadow-[0_22px_55px_rgba(0,0,0,0.48)]"
          />
        </div>

        <form
          onSubmit={handlePlayerLogin}
          className="gc-edge-card space-y-4 p-5"
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
                }}
                placeholder="PIN"
                autoComplete="current-password"
                inputMode="numeric"
                enterKeyHint="go"
                className="login-field w-full rounded-xl border px-4 py-4 text-center text-base tracking-[0.18em] outline-none"
              />
            </div>
          </div>

          <label className="flex items-center justify-center gap-3 rounded-lg border border-[#34312a] bg-black/20 px-4 py-3 text-sm font-semibold text-[#c8bfae]">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(event) => setRememberMe(event.target.checked)}
              className="h-4 w-4 rounded border-[#34312a] accent-[#efe9dc]"
            />
            <span>Remember me</span>
          </label>

          {loginError && (
            <p className="text-sm font-semibold text-[#fca5a5]">{loginError}</p>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="gc-primary-button py-4 text-base disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isLoading ? "Entering..." : "Enter"}
          </button>
        </form>
      </div>
    </main>
  );
}
