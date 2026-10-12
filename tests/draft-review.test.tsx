import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
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
  it("cancels draft discard without losing edits and returns focus", async () => {
    const user = userEvent.setup();
    render(<DraftReview {...props} />);
    const letter = screen.getByLabelText("Review every claim before use");
    await user.clear(letter);
    await user.type(letter, "An unsaved, user-provided draft.");
    const discard = screen.getByRole("button", { name: "Discard draft" });
    await user.click(discard);
    expect(screen.getByRole("dialog")).toHaveTextContent(
      "earlier saved revisions remain in history",
    );
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(discard).toHaveFocus();
    expect(letter).toHaveValue("An unsaved, user-provided draft.");
    expect(mocks.revise).not.toHaveBeenCalled();
  });
  it("confirms regeneration of unsaved edits and retains them after rejection or failed results", async () => {
    const user = userEvent.setup();
    render(<DraftReview {...props} />);
    const letter = screen.getByLabelText("Review every claim before use");
    await user.clear(letter);
    await user.type(letter, "Unsaved input");
    const regenerate = screen.getByRole("button", { name: "Regenerate draft" });
    await user.click(regenerate);
    await user.keyboard("{Escape}");
    expect(regenerate).toHaveFocus();
    expect(mocks.prepare).not.toHaveBeenCalled();
    mocks.prepare.mockRejectedValueOnce(new Error("offline"));
    await user.click(regenerate);
    const dialog = screen.getByRole("dialog");
    await user.click(
      within(dialog).getByRole("button", { name: "Regenerate draft" }),
    );
    expect(await within(dialog).findByRole("alert")).toHaveTextContent(
      "Try again",
    );
    expect(letter).toHaveValue("Unsaved input");
    expect(mocks.push).not.toHaveBeenCalled();
    mocks.prepare.mockResolvedValueOnce({
      ok: false,
      message: "Provider unavailable. Select Off and try again.",
    });
    await user.click(
      within(dialog).getByRole("button", { name: "Regenerate draft" }),
    );
    await waitFor(() =>
      expect(within(dialog).getByRole("alert")).toHaveTextContent("Select Off"),
    );
    expect(letter).toHaveValue("Unsaved input");
  });
  it("protects discard while pending and navigates only after success", async () => {
    const user = userEvent.setup();
    let resolve!: (value: { ok: true; id: string; message: string }) => void;
    mocks.revise.mockReturnValue(
      new Promise((done) => {
        resolve = done;
      }),
    );
    render(<DraftReview {...props} />);
    await user.click(screen.getByRole("button", { name: "Discard draft" }));
    const dialog = screen.getByRole("dialog");
    const confirm = within(dialog).getByRole("button", {
      name: "Discard draft",
    });
    fireEvent.click(confirm);
    fireEvent.click(confirm);
    expect(mocks.revise).toHaveBeenCalledOnce();
    expect(mocks.revise).toHaveBeenCalledWith(
      expect.objectContaining({ operation: "discard", confirmed: true }),
    );
    await user.keyboard("{Escape}");
    expect(dialog).toBeInTheDocument();
    expect(mocks.push).not.toHaveBeenCalled();
    await act(async () =>
      resolve({
        ok: true,
        id: "discarded-revision",
        message: "Discarded; history retained.",
      }),
    );
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );
    expect(mocks.push).toHaveBeenCalledWith("/queue/discarded-revision");
  });
});
