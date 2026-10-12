import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, it, expect, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  prepare: vi.fn(),
  revise: vi.fn(),
  push: vi.fn(),
  refresh: vi.fn(),
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mocks.push, refresh: mocks.refresh }),
}));
vi.mock("@/app/queue/actions", () => ({
  prepareDraftAction: mocks.prepare,
  reviseDraftAction: mocks.revise,
}));
import { DraftReview } from "@/components/draft-review";
import { prepareMaterials } from "@/lib/preparation";
import { emptyProfile } from "@/lib/profile-schema";
const content = prepareMaterials(
  emptyProfile(),
  { title: "Synthetic role", company: null, skills: [] },
  "",
).content;
const props = {
  id: "fixture-draft",
  jobId: "fixture-job",
  revision: 1,
  content,
  editable: true,
  resumes: [
    { id: "fixture-resume", filename: "Synthetic.txt", roleCategory: null },
  ],
  selectedResume: "fixture-resume",
  providers: { openai: false, ollama: false },
};
beforeEach(() => vi.clearAllMocks());
describe("draft review", () => {
  it("shows unknown answers empty, requires explicit factual confirmation, saves manual edits", async () => {
    const user = userEvent.setup();
    mocks.revise.mockResolvedValue({
      ok: true,
      id: "next-draft",
      message: "Saved revision 2.",
    });
    render(<DraftReview {...props} />);
    expect(screen.getByLabelText("Work authorization")).toHaveValue("");
    expect(screen.getByLabelText("Salary expectation")).toHaveValue("");
    await user.click(screen.getByRole("button", { name: "Save revision" }));
    expect(mocks.revise).not.toHaveBeenCalled();
    await user.type(
      screen.getByLabelText("Work authorization"),
      "User-supplied test answer",
    );
    await user.click(screen.getByRole("checkbox"));
    await user.click(screen.getByRole("button", { name: "Save revision" }));
    await waitFor(() =>
      expect(mocks.revise).toHaveBeenCalledWith(
        expect.objectContaining({
          operation: "edit",
          confirmed: true,
          expectedRevision: 1,
        }),
      ),
    );
    expect(mocks.push).toHaveBeenCalledWith("/queue/next-draft");
  });
  it("disables unavailable providers and regenerates using off mode", async () => {
    const user = userEvent.setup();
    mocks.prepare.mockResolvedValue({
      ok: true,
      id: "regenerated",
      message: "Saved.",
    });
    render(<DraftReview {...props} />);
    expect(screen.getByRole("option", { name: /OpenAI/ })).toBeDisabled();
    expect(screen.getByRole("option", { name: /Ollama/ })).toBeDisabled();
    await user.type(
      screen.getByLabelText(/Additional employer questions/),
      "Citizenship?",
    );
    await user.click(screen.getByRole("button", { name: "Regenerate draft" }));
    await waitFor(() =>
      expect(mocks.prepare).toHaveBeenCalledWith(
        expect.objectContaining({
          provider: "off",
          questions: ["Citizenship?"],
        }),
      ),
    );
  });
  it("preserves historical revisions as read-only", () => {
    render(<DraftReview {...props} editable={false} />);
    expect(
      screen.getByLabelText("Review every claim before use"),
    ).toBeDisabled();
    expect(
      screen.queryByRole("button", { name: "Save revision" }),
    ).not.toBeInTheDocument();
  });
});
