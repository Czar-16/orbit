"use server";
import { revalidatePath } from "next/cache";
import { prepareDraft, reviseDraft } from "@/lib/draft-service";
import { safeActionError, type ActionResult } from "@/lib/action-result";
export async function prepareDraftAction(
  input: unknown,
): Promise<ActionResult & { id?: string }> {
  try {
    const draft = await prepareDraft(input);
    revalidatePath("/queue");
    revalidatePath("/");
    return {
      ok: true,
      message: "Draft saved. Nothing has been submitted.",
      id: draft.id,
    };
  } catch (e) {
    return safeActionError(e);
  }
}
export async function reviseDraftAction(
  input: unknown,
): Promise<ActionResult & { id?: string }> {
  try {
    const draft = await reviseDraft(input);
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
