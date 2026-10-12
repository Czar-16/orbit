"use server";
import { revalidatePath } from "next/cache";
import { sourceForDraft } from "@/lib/resume-content-service";
import { prepareDraft, reviseDraft } from "@/lib/draft-service";
import { safeActionError, type ActionResult } from "@/lib/action-result";
export async function prepareDraftAction(
  input: unknown,
): Promise<ActionResult & { id?: string; sourceReviewRequired?: boolean }> {
  try {
    const draft = await prepareDraft(input);
    const { source } = await sourceForDraft(draft.id);
    revalidatePath("/tracker", "layout");
    revalidatePath("/");
    revalidatePath("/queue");
    revalidatePath("/");
    return {
      ok: true,
      sourceReviewRequired: source.reviewStatus !== "confirmed",
      message:
        source.reviewStatus !== "confirmed"
          ? "Draft saved. Review the original resume structure before tailoring. Nothing has been submitted."
          : "Draft saved. Nothing has been submitted.",
      id: draft.id,
    };
  } catch (e) {
    return safeActionError(e);
  }
}
export async function reviseDraftAction(
  input: unknown,
): Promise<ActionResult & { id?: string; sourceReviewRequired?: boolean }> {
  try {
    const draft = await reviseDraft(input);
    revalidatePath("/tracker", "layout");
    revalidatePath("/");
    revalidatePath("/queue");
    revalidatePath(`/queue/${draft.id}`);
    return {
      ok: true,
      message:
        draft.operation === "discard"
          ? "Draft discarded; revision history preserved."
          : `Saved revision ${draft.revision}. Nothing has been submitted.`,
      id: draft.id,
    };
  } catch (e) {
    return safeActionError(e);
  }
}
