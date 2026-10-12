import React from "react";
import { vi, it, expect, beforeEach } from "vitest";
import {
  act,
  fireEvent,
  render,
  screen,
  within,
  waitFor,
} from "@testing-library/react";
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
beforeEach(() => vi.clearAllMocks());
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
  await user.click(screen.getByRole("button", { name: "Dismiss job" }));
  const dialog = screen.getByRole("dialog");
  expect(await within(dialog).findByRole("alert")).toHaveTextContent(
    "Database unavailable",
  );
  expect(mocks.refresh).not.toHaveBeenCalled();
});
it("keeps a pending confirmation open, prevents duplicates, and closes after a real successful result", async () => {
  const user = userEvent.setup();
  let resolve!: (result: { ok: boolean; message: string }) => void;
  mocks.state.mockReturnValue(
    new Promise((done) => {
      resolve = done;
    }),
  );
  render(<JobActions id="fixture-job" saved={false} hidden={false} />);
  const archive = screen.getByRole("button", { name: "Archive" });
  await user.click(archive);
  const dialog = screen.getByRole("dialog", { name: "Archive this job?" });
  expect(within(dialog).getByRole("button", { name: "Cancel" })).toHaveFocus();
  await user.tab();
  expect(
    within(dialog).getByRole("button", { name: "Archive job" }),
  ).toHaveFocus();
  await user.tab();
  expect(within(dialog).getByRole("button", { name: "Cancel" })).toHaveFocus();
  const confirm = within(dialog).getByRole("button", { name: "Archive job" });
  fireEvent.click(confirm);
  fireEvent.click(confirm);
  expect(mocks.state).toHaveBeenCalledTimes(1);
  expect(
    within(dialog).getByRole("button", { name: "Archiving…" }),
  ).toHaveAttribute("aria-busy", "true");
  expect(within(dialog).getByRole("button", { name: "Cancel" })).toBeDisabled();
  await user.keyboard("{Escape}");
  expect(screen.getByRole("dialog")).toBeInTheDocument();
  expect(screen.queryByRole("status")).not.toBeInTheDocument();
  await act(async () =>
    resolve({ ok: true, message: "Job archived. History retained." }),
  );
  await waitFor(() =>
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
  );
  expect(archive).toHaveFocus();
  expect(screen.getByRole("status")).toHaveTextContent("Job archived");
  expect(mocks.refresh).toHaveBeenCalledOnce();
});
it("cancels with Escape without mutating a job", async () => {
  const user = userEvent.setup();
  render(<JobActions id="fixture-job" saved={false} hidden={false} />);
  const dismiss = screen.getByRole("button", { name: "Dismiss" });
  await user.click(dismiss);
  await user.keyboard("{Escape}");
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  expect(dismiss).toHaveFocus();
  expect(mocks.state).not.toHaveBeenCalled();
});
