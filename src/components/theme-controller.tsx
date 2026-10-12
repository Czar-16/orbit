"use client";
import { useEffect, useSyncExternalStore } from "react";
import { applyTheme, parseTheme, themeStorageKey, type ThemePreference } from "@/lib/theme";

let preference: ThemePreference = "system";
const listeners = new Set<() => void>();
function update(value: ThemePreference) {
  preference = value;
  applyTheme(value);
  listeners.forEach((listener) => listener());
}
function readStoredTheme() {
  try { return parseTheme(localStorage.getItem(themeStorageKey)); }
  catch { return preference; }
}
function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}
function setPreference(value: ThemePreference) {
  update(value);
  try { localStorage.setItem(themeStorageKey, value); }
  catch { /* The choice still applies for this tab when storage is unavailable. */ }
}
export function ThemeController() {
  useEffect(() => {
    update(readStoredTheme());
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onSystemChange = () => { if (preference === "system") applyTheme(preference); };
    const onStorage = (event: StorageEvent) => {
      if (event.key === themeStorageKey || event.key === null) update(readStoredTheme());
    };
    media.addEventListener("change", onSystemChange);
    window.addEventListener("storage", onStorage);
    return () => {
      media.removeEventListener("change", onSystemChange);
      window.removeEventListener("storage", onStorage);
    };
  }, []);
  return null;
}
export function ThemePreferenceControl() {
  const selected = useSyncExternalStore(subscribe, () => preference, () => "system" as const);
  return (
    <section className="panel">
      <h2>Appearance</h2>
      <p className="field-hint">Choose a theme for this browser. System follows your device setting.</p>
      <fieldset className="mt-4">
        <legend className="field-label">Theme preference</legend>
        <div className="theme-options">
          {(["light", "dark", "system"] as const).map((value) => (
            <label className="theme-option" key={value}>
              <input type="radio" name="theme" value={value} checked={selected === value}
                onChange={() => setPreference(value)} />
              {value[0].toUpperCase() + value.slice(1)}
            </label>
          ))}
        </div>
      </fieldset>
    </section>
  );
}
