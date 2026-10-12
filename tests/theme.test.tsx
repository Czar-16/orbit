import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ThemeController, ThemePreferenceControl } from "@/components/theme-controller";
import { themeBootstrapScript } from "@/lib/theme";
let systemDark = false;
let systemListener: (() => void) | undefined;
beforeEach(() => {
  localStorage.clear();
  systemDark = false;
  systemListener = undefined;
  vi.stubGlobal("matchMedia", vi.fn(() => ({
    get matches() { return systemDark; },
    addEventListener: (_: string, listener: () => void) => { systemListener = listener; },
    removeEventListener: vi.fn(),
  })));
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });
function mount() { return render(<><ThemeController /><ThemePreferenceControl /></>); }
function expectTheme(dark: boolean) {
  expect(document.documentElement.classList.contains("dark")).toBe(dark);
  expect(document.documentElement.style.colorScheme).toBe(dark ? "dark" : "light");
}
describe("browser theme preference", () => {
  it.each([null, "invalid", "system"])("defaults %s to system before paint and after mounting", (stored) => {
    if (stored) localStorage.setItem("orbit.theme", stored);
    systemDark = true;
    window.eval(themeBootstrapScript);
    expectTheme(true);
    mount();
    expect(screen.getByRole("radio", { name: "System" })).toBeChecked();
    expectTheme(true);
  });
  it.each(["light", "dark"])("restores explicit %s before paint", (stored) => {
    localStorage.setItem("orbit.theme", stored);
    systemDark = stored === "light";
    window.eval(themeBootstrapScript);
    mount();
    expectTheme(stored === "dark");
    expect(screen.getByRole("radio", { name: stored === "dark" ? "Dark" : "Light" })).toBeChecked();
  });
  it("persists choices and follows system changes only in System mode", async () => {
    mount();
    const user = userEvent.setup();
    await user.click(screen.getByRole("radio", { name: "Dark" }));
    expect(localStorage.getItem("orbit.theme")).toBe("dark");
    expectTheme(true);
    act(() => systemListener?.());
    expectTheme(true);
    await user.click(screen.getByRole("radio", { name: "System" }));
    expectTheme(false);
    systemDark = true;
    act(() => systemListener?.());
    expectTheme(true);
  });
  it("synchronizes other-tab changes, invalid values, and cleared storage", () => {
    mount();
    localStorage.setItem("orbit.theme", "dark");
    act(() => window.dispatchEvent(new StorageEvent("storage", { key: "orbit.theme" })));
    expectTheme(true);
    localStorage.setItem("orbit.theme", "invalid");
    act(() => window.dispatchEvent(new StorageEvent("storage", { key: "orbit.theme" })));
    expectTheme(false);
    localStorage.clear(); systemDark = true;
    act(() => window.dispatchEvent(new StorageEvent("storage", { key: null })));
    expect(screen.getByRole("radio", { name: "System" })).toBeChecked();
    expectTheme(true);
  });
  it("tolerates blocked storage and keeps a manual choice in the current tab", async () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => { throw new Error("blocked"); });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("blocked"); });
    window.eval(themeBootstrapScript);
    expectTheme(false);
    mount();
    await userEvent.setup().click(screen.getByRole("radio", { name: "Light" }));
    expectTheme(false);
    await userEvent.setup().click(screen.getByRole("radio", { name: "Dark" }));
    expectTheme(true);
  });
  it("removes system listeners on unmount", () => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    vi.mocked(window.matchMedia).mockReturnValue(media);
    const view = mount();
    view.unmount();
    expect(media.removeEventListener).toHaveBeenCalledWith("change", expect.any(Function));
  });
});
