import React from "react";
import { vi, it, expect } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { JobActions } from "@/components/job-actions";
const mocks = vi.hoisted(() => ({ state: vi.fn(), refresh: vi.fn() }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: mocks.refresh }),
}));
vi.mock("@/app/discover/actions", () => ({
  jobStateAction: mocks.state,
  refreshMatchesAction: vi.fn(),
}));
it("confirms dismissal, restores focus on cancellation, and displays failure inside the dialog", async () => {
  const user = userEvent.setup();
  mocks.state.mockResolvedValue({
    ok: false,
    message: "Database unavailable; no update confirmed.",
  });
  render(
    <JobActions
      id="00000000-0000-4000-8000-000000000001"
      saved={false}
      hidden={false}
    />,
  );
  const dismiss = screen.getByRole("button", { name: "Dismiss" });
  await user.click(dismiss);
  expect(
    screen.getByRole("dialog", { name: "Dismiss this job?" }),
  ).toBeInTheDocument();
  expect(mocks.state).not.toHaveBeenCalled();
  await user.click(screen.getByRole("button", { name: "Cancel" }));
  expect(dismiss).toHaveFocus();
  await user.click(dismiss);
  await user.click(screen.getByRole("button", { name: "Confirm" }));
  const dialog = screen.getByRole("dialog");
  expect(await within(dialog).findByRole("alert")).toHaveTextContent(
    "Database unavailable",
  );
  expect(mocks.refresh).not.toHaveBeenCalled();
});
