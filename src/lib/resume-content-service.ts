import "server-only";
import { createHash, randomUUID } from "node:crypto";
import { z } from "zod";
import { requireWorkspace } from "@/lib/db";
import { extractResumeText } from "@/lib/resume-extraction";
import { readResume } from "@/lib/resume-storage";
import { appendTrackingEvent } from "@/lib/tracking-service";
import { InputError } from "@/lib/action-result";
import { profileFactsSchema } from "@/lib/profile-schema";
import {
  proposeStructure,
  sourceContentSchema,
  validateReviewedSource,
  profileConflicts,
} from "@/lib/resume-content";
export { contentHash } from "@/lib/content-hash";
import { contentHash } from "@/lib/content-hash";
export async function sourceForDraft(draftId: string) {
  const { database, workspaceId } = await requireWorkspace();
  const draft = await database.applicationDraft.findFirst({
    where: { workspaceId, id: z.uuid().parse(draftId) },
    include: { resume: true, profile: true },
  });
  if (!draft) throw new InputError("Draft unavailable in this workspace.");
  const existing = await database.resumeContentVersion.findFirst({
    where: { workspaceId, resumeVersionId: draft.resumeVersionId },
    orderBy: { revision: "desc" },
    include: { profile: true },
  });
  const latestDraft = await database.applicationDraft.findFirst({
    where: { workspaceId, jobId: draft.jobId },
    orderBy: { revision: "desc" },
  });
  if (
    latestDraft?.id !== draft.id ||
    draft.operation === "discard" ||
    draft.resume.revokedAt
  ) {
    const pinned = await database.resumeContentVersion.findFirst({
      where: {
        workspaceId,
        resumeVersionId: draft.resumeVersionId,
        profileVersionId: draft.profileVersionId,
      },
      orderBy: { revision: "desc" },
    });
    if (pinned) return { draft, source: pinned };
    const structuredSource = proposeStructure("", true);
    return {
      draft,
      source: {
        id: randomUUID(),
        workspaceId,
        resumeVersionId: draft.resumeVersionId,
        profileVersionId: draft.profileVersionId,
        revision: 0,
        schemaVersion: 1,
        structuredSource,
        contentHash: contentHash(structuredSource),
        reviewStatus: "proposed",
        confirmedAt: null,
        createdAt: new Date(),
      },
    };
  }
  if (existing?.profileVersionId === draft.profileVersionId)
    return { draft, source: existing };
  let proposed;
  let reviewed = false;
  if (existing?.reviewStatus === "confirmed") {
    proposed = sourceContentSchema.parse(existing.structuredSource);
    const currentFacts = profileFactsSchema.parse(draft.profile.facts),
      previousFacts = profileFactsSchema.parse(existing.profile.facts);
    const resolutions: Record<string, string> = {};
    for (const conflict of profileConflicts(proposed, currentFacts)) {
      const field = conflict.id as
        | "name"
        | "email"
        | "education"
        | "experience";
      if (
        previousFacts[field].value === currentFacts[field].value &&
        previousFacts[field].evidence.provenance ===
          currentFacts[field].evidence.provenance &&
        proposed.conflictResolutions[field]
      )
        resolutions[field] = proposed.conflictResolutions[field];
    }
    proposed = { ...proposed, conflictResolutions: resolutions };
    try {
      validateReviewedSource(
        proposed,
        proposed,
        profileFactsSchema.parse(draft.profile.facts),
      );
      reviewed = true;
    } catch {
      proposed = { ...proposed, conflictResolutions: {} };
    }
  } else {
    let text = "";
    let failed = false;
    try {
      text = await extractResumeText(draft.resume);
    } catch {
      failed = true;
    }
    proposed = proposeStructure(text, failed);
    if (!sourceContentSchema.safeParse(proposed).success)
      proposed = { ...proposeStructure("", true), extractedText: text };
  }
  const source = await database.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "Workspace" WHERE id=${workspaceId}::uuid FOR UPDATE`;
    const latest = await tx.resumeContentVersion.findFirst({
      where: { workspaceId, resumeVersionId: draft.resumeVersionId },
      orderBy: { revision: "desc" },
    });
    if (latest?.profileVersionId === draft.profileVersionId) return latest;
    if (latest?.id !== existing?.id)
      throw new InputError("Source changed in another tab. Reload.");
    return tx.resumeContentVersion.create({
      data: {
        workspaceId,
        resumeVersionId: draft.resumeVersionId,
        profileVersionId: draft.profileVersionId,
        revision: (latest?.revision ?? 0) + 1,
        structuredSource: proposed,
        contentHash: contentHash(proposed),
        reviewStatus: reviewed ? "confirmed" : "proposed",
        confirmedAt: reviewed ? (existing?.confirmedAt ?? null) : null,
      },
    });
  });
  return { draft, source };
}
const reviewSchema = z
  .object({
    id: z.uuid(),
    expectedRevision: z.number().int().positive(),
    content: sourceContentSchema,
    confirmed: z.literal(true),
  })
  .strict();
export async function reviewSource(input: unknown) {
  const parsed = reviewSchema.safeParse(input);
  if (!parsed.success)
    throw new InputError(
      "Check source structure and explicitly confirm all facts.",
    );
  const data = parsed.data;
  const { database, workspaceId } = await requireWorkspace();
  return database.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "Workspace" WHERE id=${workspaceId}::uuid FOR UPDATE`;
    const source = await tx.resumeContentVersion.findFirst({
      where: { workspaceId, id: data.id },
      include: { profile: true, resume: true },
    });
    if (!source || source.resume.revokedAt)
      throw new InputError("Source unavailable.");
    const latest = await tx.resumeContentVersion.findFirst({
      where: { workspaceId, resumeVersionId: source.resumeVersionId },
      orderBy: { revision: "desc" },
    });
    if (latest?.id !== source.id || latest.revision !== data.expectedRevision)
      throw new InputError(
        "Source changed in another tab. Reload before confirming.",
      );
    if (
      createHash("sha256")
        .update(await readResume(source.resume.storageKey))
        .digest("hex") !== source.resume.sha256
    )
      throw new InputError(
        "Original checksum changed. Restore the original private file before reviewing.",
      );
    try {
      validateReviewedSource(
        data.content,
        sourceContentSchema.parse(source.structuredSource),
        profileFactsSchema.parse(source.profile.facts),
      );
    } catch (error) {
      throw new InputError(
        error instanceof Error ? error.message : "Source review failed.",
      );
    }
    const saved = await tx.resumeContentVersion.create({
      data: {
        workspaceId,
        resumeVersionId: source.resumeVersionId,
        profileVersionId: source.profileVersionId,
        revision: source.revision + 1,
        structuredSource: data.content,
        contentHash: contentHash(data.content),
        reviewStatus: "confirmed",
        confirmedAt: new Date(),
      },
    });
    const ready = await tx.application.findMany({
      where: {
        workspaceId,
        status: "READY_TO_APPLY",
        appliedAt: null,
        selectedDraft: { resumeVersionId: source.resumeVersionId },
      },
    });
    for (const app of ready)
      await appendTrackingEvent(
        tx,
        app,
        "resume-source-changed",
        "system",
        { status: "NEEDS_REVIEW" },
        {
          sourceVersionId: saved.id,
          notice:
            "Reviewed resume content changed. Generate, inspect, approve and select a new tailored version.",
        },
      );
    return saved;
  });
}
