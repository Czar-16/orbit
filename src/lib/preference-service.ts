import "server-only";
import { invalidateReadiness } from "@/lib/tracking-service";
import { z } from "zod";
import { requireWorkspace } from "@/lib/db";
import { preferenceSchema, defaultPreferences } from "@/lib/preferences";
import { InputError } from "@/lib/action-result";
export async function getPreferences() {
  const { database, workspaceId } = await requireWorkspace();
  const version = await database.preferenceVersion.findFirst({
    where: { workspaceId },
    orderBy: { revision: "desc" },
  });
  return {
    version,
    values: version
      ? preferenceSchema.parse(version.values)
      : defaultPreferences,
  };
}
export async function savePreferences(input: unknown) {
  const parsed = z
    .object({
      values: preferenceSchema,
      expectedRevision: z.number().int().nonnegative(),
    })
    .strict()
    .safeParse(input);
  if (!parsed.success)
    throw new InputError(
      parsed.error.issues[0]?.message ?? "Check preferences.",
    );
  const { database, workspaceId } = await requireWorkspace();
  return database.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "Workspace" WHERE id = ${workspaceId}::uuid FOR UPDATE`;
    const current = await tx.preferenceVersion.findFirst({
      where: { workspaceId },
      orderBy: { revision: "desc" },
    });
    if ((current?.revision ?? 0) !== parsed.data.expectedRevision)
      throw new InputError(
        "Preferences changed in another tab. Reload before saving.",
      );
    const saved = await tx.preferenceVersion.create({
      data: {
        workspaceId,
        revision: parsed.data.expectedRevision + 1,
        values: parsed.data.values,
      },
    });
    await invalidateReadiness(tx, workspaceId, "preferences-changed", saved.id);
    return saved;
  });
}
