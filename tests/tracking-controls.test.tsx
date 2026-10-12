import { fireEvent, render, screen, waitFor } from "@testing-library/react";
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
});
