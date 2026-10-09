"use client";

import { useSyncExternalStore } from "react";

/* Theme lives on <html data-theme> (applied before paint by an inline script
   in layout.tsx) and in localStorage. This module is the single writer so the
   header icon and the document stay in sync without effect-driven setState. */

export type Theme = "dark" | "light";

const KEY = "pcp-theme";
const listeners = new Set<() => void>();

export function getTheme(): Theme {
  if (typeof document === "undefined") return "dark";
  return document.documentElement.getAttribute("data-theme") === "light"
    ? "light"
    : "dark";
}

export function setTheme(theme: Theme): void {
  if (typeof document !== "undefined") {
    document.documentElement.setAttribute("data-theme", theme);
  }
  try {
    localStorage.setItem(KEY, theme);
  } catch {
    /* storage unavailable (private mode) — theme still applies for the session */
  }
  listeners.forEach((l) => l());
}

export function toggleTheme(): void {
  setTheme(getTheme() === "dark" ? "light" : "dark");
}

function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function useTheme(): Theme {
  return useSyncExternalStore(subscribe, getTheme, () => "dark");
}
