import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, it, vi } from "vitest";
import { TrackingControls } from "@/components/tracking-controls";
const mocks = vi.hoisted(() => ({ action: vi.fn(), refresh: vi.fn() }));
vi.mock("@/app/tracker/actions", () => ({ trackingAction: mocks.action }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: mocks.refresh }),
}));
beforeEach(() => {
  vi.clearAllMocks();
  mocks.action.mockResolvedValue({
    ok: true,
    message: "Tracking saved. This action did not submit anything.",
  });
});
it("requires manual confirmation with date and expected revision", async () => {
  render(
    <TrackingControls
      id="application-id"
      revision={3}
      status="DRAFT_READY"
      nextStep=""
      today="2026-10-12"
      followUps={[]}
    />,
  );
  expect(
    screen.getByLabelText("I confirm I submitted this application myself."),
  ).not.toBeChecked();
  fireEvent.click(
    screen.getByLabelText("I confirm I submitted this application myself."),
  );
  fireEvent.click(screen.getByRole("button", { name: "Mark as applied" }));
  await waitFor(() =>
    expect(mocks.action).toHaveBeenCalledWith({
      id: "application-id",
      expectedRevision: 3,
      operation: "status",
      status: "APPLIED",
      date: "2026-10-12",
      confirmed: true,
    }),
  );
  expect(mocks.refresh).toHaveBeenCalled();
});
it("shows save failure and keeps the current view", async () => {
  mocks.action.mockResolvedValue({
    ok: false,
    message: "Tracking changed in another tab. Reload before saving.",
  });
  render(
    <TrackingControls
      id="application-id"
      revision={3}
      status="APPLIED"
      nextStep=""
      today="2026-10-12"
      followUps={[]}
    />,
  );
  expect(
    screen.queryByRole("button", { name: "Mark as applied" }),
  ).not.toBeInTheDocument();
  fireEvent.change(screen.getByLabelText("Your note (user-provided)"), {
    target: { value: "Synthetic note" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Save note to history" }));
  await screen.findByText(
    "Tracking changed in another tab. Reload before saving.",
  );
  expect(mocks.refresh).not.toHaveBeenCalled();
  expect(screen.getByRole("alert")).toHaveTextContent("Reload before saving");
  expect(screen.getByLabelText("Your note (user-provided)")).toHaveValue(
    "Synthetic note",
  );
});
const props = {
  id: "application-id",
  revision: 3,
  status: "APPLIED" as const,
  nextStep: "",
  today: "2026-10-12",
  followUps: [
    {
      id: "follow-up-id",
      revision: 2,
      label: "Review next step",
      date: "2026-10-13",
      state: "Pending",
    },
  ],
};
it("does not mark Applied without manual confirmation, even on a direct submit event", () => {
  render(<TrackingControls {...props} status="DRAFT_READY" />);
  const button = screen.getByRole("button", { name: "Mark as applied" });
  fireEvent.submit(button.closest("form")!);
  expect(mocks.action).not.toHaveBeenCalled();
  expect(screen.getByRole("alert")).toHaveTextContent(
    "submitted this application yourself",
  );
});
it("requires application archive confirmation and keeps failures open", async () => {
  const user = userEvent.setup();
  render(<TrackingControls {...props} />);
  await user.selectOptions(screen.getByLabelText("Next status"), "ARCHIVED");
  await user.click(
    screen.getByLabelText("I have reviewed and confirm this status change."),
  );
  const save = screen.getByRole("button", { name: "Save status" });
  await user.click(save);
  const dialog = screen.getByRole("dialog", {
    name: "Archive this application?",
  });
  expect(dialog).toHaveTextContent("history are retained");
  expect(mocks.action).not.toHaveBeenCalled();
  await user.click(within(dialog).getByRole("button", { name: "Cancel" }));
  expect(save).toHaveFocus();
  await user.click(save);
  mocks.action.mockRejectedValueOnce(new Error("offline"));
  await user.click(screen.getByRole("button", { name: "Archive application" }));
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Your edits are retained",
  );
  expect(screen.getByRole("dialog")).toBeInTheDocument();
  expect(mocks.refresh).not.toHaveBeenCalled();
});
it.each([
  ["Complete", "Complete follow-up", "completeFollowUp"],
  ["Cancel follow-up", "Cancel follow-up", "cancelFollowUp"],
])(
  "confirms %s and records it only once",
  async (triggerName, label, operation) => {
    const user = userEvent.setup();
    let resolve!: (value: { ok: true; message: string }) => void;
    mocks.action.mockReturnValue(
      new Promise((done) => {
        resolve = done;
      }),
    );
    render(<TrackingControls {...props} />);
    const trigger = screen.getByRole("button", { name: triggerName });
    await user.click(trigger);
    let dialog = screen.getByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "Cancel" }));
    expect(trigger).toHaveFocus();
    expect(mocks.action).not.toHaveBeenCalled();
    await user.click(trigger);
    dialog = screen.getByRole("dialog");
    const confirm = within(dialog).getByRole("button", { name: label });
    fireEvent.click(confirm);
    fireEvent.click(confirm);
    expect(mocks.action).toHaveBeenCalledOnce();
    expect(mocks.action).toHaveBeenCalledWith({
      id: props.id,
      expectedRevision: 3,
      operation,
      followUpId: "follow-up-id",
      followUpRevision: 2,
      confirmed: true,
    });
    await user.keyboard("{Escape}");
    expect(dialog).toBeInTheDocument();
    await act(async () =>
      resolve({ ok: true, message: "Follow-up updated. History retained." }),
    );
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );
    expect(trigger).toHaveFocus();
    expect(screen.getByRole("status")).toHaveTextContent("Follow-up updated");
  },
);
it("guards ordinary form submissions and retains input after an exception", async () => {
  let reject!: (error: Error) => void;
  mocks.action.mockReturnValue(
    new Promise((_, fail) => {
      reject = fail;
    }),
  );
  render(<TrackingControls {...props} />);
  const note = screen.getByLabelText("Your note (user-provided)");
  fireEvent.change(note, { target: { value: "Keep this note" } });
  const form = note.closest("form")!;
  fireEvent.submit(form);
  fireEvent.submit(form);
  expect(mocks.action).toHaveBeenCalledOnce();
  expect(screen.getByRole("button", { name: "Saving…" })).toHaveAttribute(
    "aria-busy",
    "true",
  );
  await act(async () => reject(new Error("offline")));
  expect(screen.getByRole("alert")).toHaveTextContent(
    "Check the local services",
  );
  expect(note).toHaveValue("Keep this note");
});
