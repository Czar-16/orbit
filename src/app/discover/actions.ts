"use server";
import { jobFileMetadataSchema, parseJobFile } from "@/lib/job-file";
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
  revalidatePath("/tracker", "layout");
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
      throw new InputError("Choose a CSV or JSON job list to import.");
    const metadata = jobFileMetadataSchema.safeParse({
      name: file.name,
      size: file.size,
      type: file.type,
    });
    if (!metadata.success)
      throw new InputError(
        "Use a CSV or JSON file up to 1 MB with a simple filename and matching file type.",
      );
    const contents = parseJobFile(await file.text(), metadata.data.name);
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
      message:
        "Job visibility updated. Pre-application tracking synchronized; no submission was recorded.",
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
