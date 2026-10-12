"use server";
import { cookies } from "next/headers";
import { z } from "zod";
import { inspectionCookie } from "@/lib/resume-inspection";
import {
  generateTailoredResume,
  approveTailoredResume,
  selectTailoredResume,
} from "@/lib/tailored-resume-service";
import { revalidatePath } from "next/cache";
import { reviewSource } from "@/lib/resume-content-service";
import { safeActionError } from "@/lib/action-result";
export async function reviewSourceAction(input: unknown) {
  try {
    const source = await reviewSource(input);
    revalidatePath("/queue", "layout");
    return {
      ok: true as const,
      message: `Source revision ${source.revision} confirmed. Original unchanged.`,
    };
  } catch (error) {
    return safeActionError(error);
  }
}

export async function generateTailoredAction(input: unknown) {
  try {
    const version = await generateTailoredResume(input);
    revalidatePath("/queue", "layout");
    return {
      ok: true as const,
      message:
        "PDF and DOCX generated and validated. Inspect the actual PDF before approval.",
      id: version.id,
    };
  } catch (error) {
    return safeActionError(error);
  }
}
export async function approveTailoredAction(input: unknown) {
  try {
    const parsed = z.object({ id: z.uuid() }).parse(input);
    const receipt = (await cookies()).get(inspectionCookie(parsed.id))?.value;
    await approveTailoredResume(input, receipt);
    revalidatePath("/queue", "layout");
    return {
      ok: true as const,
      message:
        "Exact content and document hashes approved. Select this version for the application.",
    };
  } catch (error) {
    return safeActionError(error);
  }
}
export async function selectTailoredAction(input: unknown) {
  try {
    const draft = await selectTailoredResume(input);
    revalidatePath("/queue", "layout");
    revalidatePath("/tracker", "layout");
    return {
      ok: true as const,
      message: "Approved resume selected in a new application-draft revision.",
      draftId: draft.id,
    };
  } catch (error) {
    return safeActionError(error);
  }
}
