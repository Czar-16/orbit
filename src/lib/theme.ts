export type ThemePreference = "light" | "dark" | "system";
export const themeStorageKey = "orbit.theme";
export function parseTheme(value: unknown): ThemePreference {
  return value === "light" || value === "dark" ? value : "system";
}
export function applyTheme(preference: ThemePreference) {
  const dark = preference === "dark" ||
    (preference === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", dark);
  document.documentElement.style.colorScheme = dark ? "dark" : "light";
}
// Self-contained so exactly this code runs in the head before the body paints.
function bootstrapTheme() {
  let preference = "system";
  try {
    const stored = localStorage.getItem("orbit.theme");
    if (stored === "light" || stored === "dark") preference = stored;
  } catch { /* Storage can be disabled; system remains the default. */ }
  const dark = preference === "dark" ||
    (preference === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", dark);
  document.documentElement.style.colorScheme = dark ? "dark" : "light";
}
export const themeBootstrapScript = `(${bootstrapTheme.toString()})();`;
