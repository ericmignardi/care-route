import { THEME_STORAGE_KEY } from "./constants";

export type Theme = "light" | "dark";

/**
 * Mirrors the inline script in index.html, which resolves the theme before first paint
 * so a caregiver opening the app at 05:30 never sees a flash of the light palette.
 */
export function readStoredTheme(): Theme {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === "light" || stored === "dark") return stored;
  } catch {
    /* Private browsing, or storage disabled — fall through to the OS preference. */
  }
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function applyTheme(theme: Theme): void {
  document.documentElement.setAttribute("data-theme", theme);
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    /* Not being able to remember the choice is not a reason to refuse it. */
  }
}
