"use server";
import { revalidatePath } from "next/cache";
import { saveProfile } from "@/lib/profile-service";
import { uploadResume } from "@/lib/resume-service";
import {
  safeActionError,
  type ActionResult,
  InputError,
} from "@/lib/action-result";
export async function saveProfileAction(input: unknown): Promise<ActionResult> {
  try {
    const profile = await saveProfile(input);
    revalidatePath("/profile");
    return { ok: true, message: `Saved profile revision ${profile.revision}.` };
  } catch (error) {
    return safeActionError(error);
  }
}
export async function uploadResumeAction(
  formData: FormData,
): Promise<ActionResult> {
  try {
    const file = formData.get("resume");
    if (!(file instanceof File))
      throw new InputError("Choose a PDF or TXT resume to upload.");
    await uploadResume(file);
    revalidatePath("/profile");
    return {
      ok: true,
      message:
        "Resume stored privately. Review your profile facts below; no facts were inferred from the document.",
    };
  } catch (error) {
    return safeActionError(error);
  }
}

export async function reviewResumeAction(
  id: unknown,
): Promise<ActionResult & { text?: string }> {
  try {
    const { resumeReview } = await import("@/lib/resume-management");
    const text = await resumeReview(id);
    return {
      ok: true,
      message:
        "Extracted locally. Review the proposed text; no profile facts have been saved.",
      text,
    };
  } catch (e) {
    return safeActionError(e);
  }
}
export async function configureResumeAction(
  input: unknown,
): Promise<ActionResult> {
  try {
    const { configureResume } = await import("@/lib/resume-management");
    await configureResume(input);
    revalidatePath("/profile");
    return { ok: true, message: "Resume selection settings saved." };
  } catch (e) {
    return safeActionError(e);
  }
}
