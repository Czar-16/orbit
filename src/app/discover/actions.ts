"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import {
  saveJob,
  importJobs,
  setJobState,
  refreshMatches,
} from "@/lib/job-service";
import {
  type ActionResult,
  InputError,
  safeActionError,
} from "@/lib/action-result";
function revalidateJobs(id?: string) {
  revalidatePath("/discover");
  revalidatePath("/saved");
  revalidatePath("/");
  if (id) revalidatePath(`/discover/${id}`);
}
export async function saveJobAction(
  input: unknown,
): Promise<ActionResult & { jobId?: string }> {
  try {
    const job = await saveJob(input);
    revalidateJobs(job.jobId);
    return {
      ok: true,
      message: job.duplicate
        ? "This exact listing URL is already imported. The existing job was preserved."
        : `Saved job revision ${job.revision}. Nothing has been submitted.`,
      jobId: job.jobId,
    };
  } catch (error) {
    return safeActionError(error);
  }
}
export async function importJobFileAction(
  form: FormData,
): Promise<ActionResult> {
  try {
    const file = form.get("jobs");
    if (!(file instanceof File))
      throw new InputError("Choose a JSON job list to import.");
    const metadata = z
      .object({
        name: z
          .string()
          .max(120)
          .regex(/^[A-Za-z0-9 _.-]+\.json$/),
        size: z
          .number()
          .int()
          .positive()
          .max(1024 * 1024),
        type: z.enum(["application/json", "text/plain", ""]),
      })
      .safeParse({ name: file.name, size: file.size, type: file.type });
    if (!metadata.success)
      throw new InputError(
        "Use a JSON file up to 1 MB with a simple filename.",
      );
    let contents: unknown;
    try {
      contents = JSON.parse(await file.text());
    } catch {
      throw new InputError("This file is not valid JSON.");
    }
    const result = await importJobs(contents);
    revalidateJobs();
    return {
      ok: true,
      message: `Imported ${result.imported} jobs; ${result.duplicates} exact URL duplicates skipped. Nothing has been submitted.`,
    };
  } catch (error) {
    return safeActionError(error);
  }
}
export async function jobStateAction(input: unknown): Promise<ActionResult> {
  try {
    await setJobState(input);
    revalidateJobs();
    return {
      ok: true,
      message: "Job list updated. Application status was not changed.",
    };
  } catch (error) {
    return safeActionError(error);
  }
}
export async function refreshMatchesAction(): Promise<ActionResult> {
  try {
    const result = await refreshMatches();
    revalidateJobs();
    return {
      ok: true,
      message: `Checked ${result.updated} recent jobs against profile revision ${result.profileRevision}; deterministic results are stored.`,
    };
  } catch (error) {
    return safeActionError(error);
  }
}
