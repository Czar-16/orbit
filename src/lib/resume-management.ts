import "server-only";
import { z } from "zod";
import { requireWorkspace } from "@/lib/db";
import { InputError } from "@/lib/action-result";
import { extractResumeText } from "@/lib/resume-extraction";
export async function resumeReview(id: unknown) {
  const { database, workspaceId } = await requireWorkspace();
  const resume = await database.resumeVersion.findFirst({
    where: { workspaceId, id: z.uuid().parse(id), revokedAt: null },
  });
  if (!resume) throw new InputError("Resume is unavailable.");
  return extractResumeText(resume);
}
export async function configureResume(input: unknown) {
  const data = z
    .object({
      id: z.uuid(),
      roleCategory: z.string().trim().max(100),
      isDefault: z.boolean(),
    })
    .strict()
    .parse(input);
  const { database, workspaceId } = await requireWorkspace();
  return database.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "Workspace" WHERE id = ${workspaceId}::uuid FOR UPDATE`;
    const resume = await tx.resumeVersion.findFirst({
      where: { workspaceId, id: data.id, revokedAt: null },
    });
    if (!resume) throw new InputError("Resume is unavailable.");
    if (data.isDefault)
      await tx.resumeVersion.updateMany({
        where: { workspaceId, isDefault: true },
        data: { isDefault: false },
      });
    return tx.resumeVersion.update({
      where: { id: resume.id },
      data: {
        roleCategory: data.roleCategory || null,
        isDefault: data.isDefault,
      },
    });
  });
}
