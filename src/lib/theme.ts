// Shared theme constants. Kept free of "use client" so the server-rendered
// root layout can import the init script as a plain string.

export type ThemeChoice = "system" | "light" | "dark";

export const THEME_STORAGE_KEY = "malliqa-theme";
export const THEMES = { light: "malliqa", dark: "malliqa-dark" } as const;

/** Browser chrome colors, matching `--color-base-200` of each theme. */
export const THEME_COLORS = { light: "#f7f1e8", dark: "#1c1612" } as const;

/**
 * Inline script for <head>: applies the saved theme before first paint so the
 * page never flashes the wrong palette.
 */
export const themeInitScript = `(function(){try{var t=localStorage.getItem(${JSON.stringify(
  THEME_STORAGE_KEY,
)});if(t==="light")document.documentElement.setAttribute("data-theme","${THEMES.light}");else if(t==="dark")document.documentElement.setAttribute("data-theme","${THEMES.dark}");}catch(e){}})();`;
