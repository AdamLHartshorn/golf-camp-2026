"use client";

import type { ReactNode } from "react";
import { useEffect } from "react";
import { usePathname } from "next/navigation";

const themeStorageKey = "golfCampTheme";
const themeEventName = "golfCampThemeChange";

export type GolfCampTheme = "dark" | "light";

function isTheme(value: string | null): value is GolfCampTheme {
  return value === "dark" || value === "light";
}

export function isForcedDarkPath(pathname: string | null) {
  return (
    pathname?.startsWith("/night-golf") ||
    pathname?.startsWith("/admin/night-golf")
  );
}

export function getStoredTheme(): GolfCampTheme {
  if (typeof window === "undefined") {
    return "dark";
  }

  const storedTheme = window.localStorage.getItem(themeStorageKey);
  return isTheme(storedTheme) ? storedTheme : "dark";
}

export function setStoredTheme(theme: GolfCampTheme) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(themeStorageKey, theme);
  window.dispatchEvent(new Event(themeEventName));
}

export function subscribeToTheme(callback: () => void) {
  if (typeof window === "undefined") {
    return () => {};
  }

  window.addEventListener(themeEventName, callback);
  window.addEventListener("storage", callback);

  return () => {
    window.removeEventListener(themeEventName, callback);
    window.removeEventListener("storage", callback);
  };
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  useEffect(() => {
    function applyTheme() {
      const nextTheme = isForcedDarkPath(pathname) ? "dark" : getStoredTheme();

      document.documentElement.dataset.theme = nextTheme;
      document.documentElement.style.colorScheme = nextTheme;
    }

    applyTheme();

    return subscribeToTheme(applyTheme);
  }, [pathname]);

  return children;
}
