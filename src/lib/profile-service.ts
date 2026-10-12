import "server-only";
import { invalidateReadiness } from "@/lib/tracking-service";
import { requireWorkspace } from "@/lib/db";
import { profileInputSchema, profileFactsFromInput } from "@/lib/profile-input";
import { InputError } from "@/lib/action-result";
export async function saveProfile(input: unknown) {
  const parsed = profileInputSchema.safeParse(input);
  if (!parsed.success)
    throw new InputError(
      parsed.error.issues[0]?.message ?? "Check your profile fields.",
    );
  const { database, workspaceId } = await requireWorkspace();
  const data = parsed.data;
  const facts = profileFactsFromInput(data);
  return database.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "Workspace" WHERE id = ${workspaceId}::uuid FOR UPDATE`;
    const current = await tx.profileVersion.findFirst({
      where: { workspaceId },
      orderBy: { revision: "desc" },
    });
    if ((current?.revision ?? 0) !== data.expectedRevision)
      throw new InputError(
        "Your profile changed in another tab. Reload this page before saving to avoid overwriting newer facts.",
      );
    if (data.resumeVersionId) {
      const resume = await tx.resumeVersion.findFirst({
        where: { workspaceId, id: data.resumeVersionId, revokedAt: null },
      });
      if (!resume)
        throw new InputError(
          "The selected resume is no longer available. Choose an available version.",
        );
    }
    const saved = await tx.profileVersion.create({
      data: {
        workspaceId,
        revision: data.expectedRevision + 1,
        facts,
        resumeVersionId: data.resumeVersionId || null,
      },
    });
    await invalidateReadiness(tx, workspaceId, "profile-changed", saved.id);
    return saved;
  });
}
