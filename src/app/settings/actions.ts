"use server";
import { revalidatePath } from "next/cache";
import { savePreferences } from "@/lib/preference-service";
import { safeActionError } from "@/lib/action-result";
export async function savePreferencesAction(input: unknown) {
  try {
    const version = await savePreferences(input);
    revalidatePath("/", "layout");
    return {
      ok: true as const,
      message: `Saved preference revision ${version.revision}.`,
    };
  } catch (error) {
    return safeActionError(error);
  }
}
