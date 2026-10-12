"use server";
import { revalidatePath } from "next/cache";
import { runDiscovery, sourceControls } from "@/lib/discovery-service";
import { safeActionError } from "@/lib/action-result";
export async function runDiscoveryAction() {
  try {
    const result = await runDiscovery();
    revalidatePath("/", "layout");
    return {
      ok: true as const,
      message:
        result
          .map(
            (s) =>
              `${s.source}: ${s.state}, ${s.fetched} fetched, ${s.imported} new, ${s.duplicates} duplicates${s.error ? `; ${s.error}` : ""}`,
          )
          .join(". ") || "No enabled source.",
    };
  } catch (error) {
    return safeActionError(error);
  }
}
export async function sourceControlAction(input: unknown) {
  try {
    await sourceControls(input);
    revalidatePath("/", "layout");
    return { ok: true as const, message: "Source settings saved." };
  } catch (error) {
    return safeActionError(error);
  }
}
