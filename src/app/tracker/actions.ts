"use server";
import { revalidatePath } from "next/cache";
import { trackingCommand } from "@/lib/tracking-service";
import { safeActionError, type ActionResult } from "@/lib/action-result";
export async function trackingAction(input: unknown): Promise<ActionResult> {
  try {
    const app = await trackingCommand(input);
    for (const path of [
      "/",
      "/tracker",
      `/tracker/${app.id}`,
      "/queue",
      "/discover",
      "/saved",
    ])
      revalidatePath(path);
    return {
      ok: true,
      message: "Tracking saved. This action did not submit anything.",
    };
  } catch (error) {
    return safeActionError(error);
  }
}
