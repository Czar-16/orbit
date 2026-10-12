import { act, render, screen, fireEvent } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import { RunDailyButton } from "@/components/run-daily-button";
import { PreferenceForm } from "@/components/preference-form";
import { defaultPreferences } from "@/lib/preferences";
const mocks = vi.hoisted(() => ({
  daily: vi.fn(),
  preferences: vi.fn(),
  refresh: vi.fn(),
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: mocks.refresh }),
}));
vi.mock("@/app/discover/discovery-actions", () => ({
  runDailyAction: mocks.daily,
}));
vi.mock("@/app/settings/actions", () => ({
  savePreferencesAction: mocks.preferences,
}));
beforeEach(() => vi.clearAllMocks());
it("announces run failures as alerts and prevents duplicate requests", async () => {
  let resolve!: (value: { ok: false; message: string }) => void;
  mocks.daily.mockReturnValue(
    new Promise((done) => {
      resolve = done;
    }),
  );
  render(<RunDailyButton available />);
  const button = screen.getByRole("button", { name: "Run now" });
  fireEvent.click(button);
  fireEvent.click(button);
  expect(mocks.daily).toHaveBeenCalledOnce();
  expect(screen.getByRole("button", { name: "Requesting…" })).toHaveAttribute(
    "aria-busy",
    "true",
  );
  expect(screen.queryByRole("status")).not.toBeInTheDocument();
  await act(async () =>
    resolve({
      ok: false,
      message: "Inngest unavailable. Start the local server and try again.",
    }),
  );
  expect(screen.getByRole("alert")).toHaveTextContent("Inngest unavailable");
  expect(screen.queryByRole("status")).not.toBeInTheDocument();
  expect(mocks.refresh).not.toHaveBeenCalled();
});
it("retains preference input when a request fails", async () => {
  mocks.preferences.mockResolvedValue({
    ok: false,
    message: "Database unavailable. Try again.",
  });
  render(<PreferenceForm values={defaultPreferences} revision={1} />);
  const roles = screen.getByLabelText("roles (comma-separated)");
  fireEvent.change(roles, { target: { value: "User-provided role" } });
  fireEvent.submit(roles.closest("form")!);
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Database unavailable",
  );
  expect(roles).toHaveValue("User-provided role");
  expect(mocks.refresh).not.toHaveBeenCalled();
});
