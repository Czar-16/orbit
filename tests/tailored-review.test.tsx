import React from "react";
import { it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TailoredResumeReview } from "@/components/tailored-resume-review";
import { ResumeSourceReview } from "@/components/resume-source-review";
import { proposeStructure } from "@/lib/resume-content";
import { emptyProfile } from "@/lib/profile-schema";
import {
  tailoringCandidates,
  buildTailoredContent,
} from "@/lib/tailored-resume";
const mocks = vi.hoisted(() => ({
  review: vi.fn(),
  generate: vi.fn(),
  approve: vi.fn(),
  select: vi.fn(),
  refresh: vi.fn(),
  push: vi.fn(),
}));
vi.mock("@/app/queue/resume-actions", () => ({
  reviewSourceAction: mocks.review,
  generateTailoredAction: mocks.generate,
  approveTailoredAction: mocks.approve,
  selectTailoredAction: mocks.select,
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: mocks.refresh, push: mocks.push }),
}));
beforeEach(() => vi.clearAllMocks());
it("requires individual source confirmation and retains edited reconstruction after server failure", async () => {
  const user = userEvent.setup();
  const source = proposeStructure("", true);
  mocks.review.mockResolvedValue({
    ok: false,
    message: "Source changed in another tab. Reload before confirming.",
  });
  render(
    <ResumeSourceReview
      id="source-id"
      revision={1}
      initial={source}
      facts={emptyProfile()}
    />,
  );
  const save = screen.getByRole("button", { name: "Confirm reviewed source" });
  expect(save).toBeDisabled();
  await user.type(
    screen.getByLabelText("Reviewed text"),
    "Synthetic Candidate",
  );
  await user.click(
    screen.getByLabelText(
      "I confirm this item and its classification are accurate.",
    ),
  );
  await user.click(screen.getByLabelText(/I compared the whole source/));
  save.focus();
  await user.keyboard("{Enter}");
  expect(await screen.findByRole("alert")).toHaveTextContent("another tab");
  expect(screen.getByLabelText("Reviewed text")).toHaveValue(
    "Synthetic Candidate",
  );
  expect(mocks.review).toHaveBeenCalledWith(
    expect.objectContaining({
      confirmed: true,
      content: expect.objectContaining({
        items: expect.arrayContaining([
          expect.objectContaining({
            text: "Synthetic Candidate",
            confirmed: true,
          }),
        ]),
      }),
    }),
  );
});
it("exposes actual PDF and text alternatives; changing wording clears confirmation and blocks old-file approval", async () => {
  const user = userEvent.setup();
  const source = proposeStructure(
    "Synthetic Candidate\nProjects\nDemo\n• Built React app.",
  );
  source.items.forEach((i) => (i.confirmed = true));
  source.items[0].section = "contact";
  source.items[2].kind = "entry";
  source.items[3].entryId = source.items[2].id;
  const candidates = tailoringCandidates(
      source,
      emptyProfile(),
      ["React"],
      null,
    ),
    content = buildTailoredContent(candidates);
  content.items[3].wordingConfirmed = true;
  render(
    <TailoredResumeReview
      draftId="draft-id"
      draftRevision={1}
      sourceId="source-id"
      sourceRevision={2}
      candidates={candidates}
      comparisonCandidates={candidates}
      expectedTailoredRevision={1}
      version={{
        id: "version-id",
        revision: 1,
        contentHash: "a".repeat(64),
        approved: false,
        stale: false,
        content,
      }}
      editable
      selectedId={null}
    />,
  );
  expect(screen.getByTitle("Generated resume PDF revision 1")).toHaveAttribute(
    "src",
    "/api/tailored-resumes/version-id?preview=1",
  );
  expect(screen.getByText(/Item comparison/)).toBeInTheDocument();
  const approve = screen.getByRole("button", {
    name: "Approve exact documents",
  });
  await user.click(screen.getByLabelText(/I inspected this actual PDF/));
  expect(approve).toBeEnabled();
  const confirmed = screen.getByLabelText(/I individually confirm/);
  expect(confirmed).toBeChecked();
  await user.type(screen.getByLabelText("Bullet wording"), " ");
  expect(confirmed).not.toBeChecked();
  expect(approve).toBeDisabled();
  expect(
    screen.getByText(/Unsaved edits differ from this PDF/),
  ).toBeInTheDocument();
  expect(mocks.approve).not.toHaveBeenCalled();
});
