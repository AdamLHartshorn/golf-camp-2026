"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  getStoredTheme,
  GolfCampTheme,
  isForcedDarkPath,
  setStoredTheme,
  subscribeToTheme,
} from "@/components/ThemeProvider";

export function ThemeToggle({ className = "" }: { className?: string }) {
  const pathname = usePathname();
  const isForcedDark = isForcedDarkPath(pathname);
  const [theme, setTheme] = useState<GolfCampTheme>("dark");

  useEffect(() => {
    function syncTheme() {
      setTheme(isForcedDark ? "dark" : getStoredTheme());
    }

    syncTheme();

    return subscribeToTheme(syncTheme);
  }, [isForcedDark]);

  function handleToggle() {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setStoredTheme(nextTheme);
    setTheme(nextTheme);
  }

  return (
    <button
      type="button"
      onClick={handleToggle}
      disabled={isForcedDark}
      aria-label={`Switch to ${theme === "dark" ? "Light" : "Dark"} Mode`}
      aria-pressed={theme === "light"}
      className={`theme-toggle inline-flex items-center gap-2 rounded-full border border-[#34312a] bg-black/35 px-3 py-2 text-xs font-black uppercase tracking-[0.12em] text-[#c8bfae] shadow-[0_12px_32px_rgba(0,0,0,0.22)] transition hover:border-[#8fa66a] hover:text-[#f4f1ea] disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
    >
      <svg
        aria-hidden="true"
        className="h-4 w-4"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
        viewBox="0 0 24 24"
      >
        {theme === "dark" ? (
          <path d="M20 14.6A7.8 7.8 0 0 1 9.4 4 8.2 8.2 0 1 0 20 14.6Z" />
        ) : (
          <>
            <circle cx="12" cy="12" r="4.2" />
            <path d="M12 2.5v2.1" />
            <path d="M12 19.4v2.1" />
            <path d="m4.6 4.6 1.5 1.5" />
            <path d="m17.9 17.9 1.5 1.5" />
            <path d="M2.5 12h2.1" />
            <path d="M19.4 12h2.1" />
            <path d="m4.6 19.4 1.5-1.5" />
            <path d="m17.9 6.1 1.5-1.5" />
          </>
        )}
      </svg>
      <span>{theme === "dark" ? "Dark" : "Light"}</span>
    </button>
  );
}
