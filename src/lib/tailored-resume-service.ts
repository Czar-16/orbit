import "server-only";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { requireWorkspace } from "@/lib/db";
import { InputError } from "@/lib/action-result";
import { profileFactsSchema } from "@/lib/profile-schema";
import { sourceContentSchema } from "@/lib/resume-content";
import { contentHash } from "@/lib/content-hash";
import {
  buildTailoredContent,
  tailoringCandidates,
  tailoringInputSchema,
  tailoredContentSchema,
} from "@/lib/tailored-resume";
import { generateResumeDocuments } from "@/lib/resume-document-worker";
import {
  writeGeneratedResume,
  removeGeneratedResume,
} from "@/lib/generated-resume-storage";
import { readResume } from "@/lib/resume-storage";
import { checkedArtifacts, sha256 } from "@/lib/tailored-artifacts";
import { validInspectionReceipt } from "@/lib/resume-inspection";
import { draftContentSchema } from "@/lib/preparation";
import { trackDraft } from "@/lib/tracking-service";
export async function generateTailoredResume(input: unknown) {
  const parsed = tailoringInputSchema.safeParse(input);
  if (!parsed.success)
    throw new InputError(
      "Check selected items, pinned source and expected revisions. Reload if needed.",
    );
  const data = parsed.data;
  const { database, workspaceId } = await requireWorkspace();
  const draft = await database.applicationDraft.findFirst({
    where: { workspaceId, id: data.draftId },
    include: { jobRevision: true, profile: true, resume: true },
  });
  const source = await database.resumeContentVersion.findFirst({
    where: { workspaceId, id: data.sourceId },
  });
  if (
    !draft ||
    draft.operation === "discard" ||
    draft.resume.revokedAt ||
    !source ||
    source.reviewStatus !== "confirmed" ||
    source.revision !== data.expectedSourceRevision ||
    source.profileVersionId !== draft.profileVersionId ||
    source.resumeVersionId !== draft.resumeVersionId
  )
    throw new InputError(
      "Review the selected original source with this draft's profile before tailoring.",
    );
  if (
    sha256(await readResume(draft.resume.storageKey)) !== draft.resume.sha256 ||
    contentHash(sourceContentSchema.parse(source.structuredSource)) !==
      source.contentHash
  )
    throw new InputError(
      "Source checksum changed. Restore original storage before generating.",
    );
  const candidates = tailoringCandidates(
    sourceContentSchema.parse(source.structuredSource),
    profileFactsSchema.parse(draft.profile.facts),
    draft.jobRevision.skills,
    draft.jobRevision.description,
  );
  const parent = data.parentId
    ? await database.tailoredResumeVersion.findFirst({
        where: { workspaceId, jobId: draft.jobId, id: data.parentId },
      })
    : null;
  if (data.parentId && !parent)
    throw new InputError("Parent version unavailable.");
  const selections =
    data.selections ??
    (parent
      ? tailoredContentSchema
          .parse(parent.content)
          .items.map((i) => ({
            id: i.id,
            text: i.text,
            wordingConfirmed: i.wordingConfirmed,
          }))
      : undefined);
  let content;
  try {
    content = buildTailoredContent(candidates, selections);
  } catch (error) {
    throw new InputError(
      error instanceof Error ? error.message : "Review selected content.",
    );
  }
  // Validate revisions before spending worker time, and again before persisting.
  const checkVersions = async (
    tx: import("@/generated/prisma/client").Prisma.TransactionClient,
  ) => {
    const [latestDraft, latestSource, latestTailored] = await Promise.all([
      tx.applicationDraft.findFirst({
        where: { workspaceId, jobId: draft.jobId },
        orderBy: { revision: "desc" },
      }),
      tx.resumeContentVersion.findFirst({
        where: { workspaceId, resumeVersionId: draft.resumeVersionId },
        orderBy: { revision: "desc" },
      }),
      tx.tailoredResumeVersion.findFirst({
        where: { workspaceId, jobId: draft.jobId },
        orderBy: { revision: "desc" },
      }),
    ]);
    if (
      latestDraft?.id !== draft.id ||
      latestDraft.revision !== data.expectedDraftRevision ||
      latestSource?.id !== source.id ||
      (latestTailored?.revision ?? 0) !== data.expectedTailoredRevision
    )
      throw new InputError(
        "Draft, source or tailored history changed in another tab. Reload before generating.",
      );
  };
  await database.$transaction(checkVersions);
  const docs = await generateResumeDocuments(content);
  const pdfKey = `${randomUUID()}.pdf`,
    docxKey = `${randomUUID()}.docx`;
  const written: string[] = [];
  try {
    await writeGeneratedResume(pdfKey, docs.pdf);
    written.push(pdfKey);
    await writeGeneratedResume(docxKey, docs.docx);
    written.push(docxKey);
    return await database.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "Workspace" WHERE id=${workspaceId}::uuid FOR UPDATE`;
      await checkVersions(tx);
      const freshResume = await tx.resumeVersion.findFirst({
        where: { workspaceId, id: draft.resumeVersionId, revokedAt: null },
      });
      if (
        !freshResume ||
        sha256(await readResume(freshResume.storageKey)) !== freshResume.sha256
      )
        throw new InputError(
          "Original resume changed or was revoked. No files were saved.",
        );
      return tx.tailoredResumeVersion.create({
        data: {
          workspaceId,
          jobId: draft.jobId,
          jobRevisionId: draft.jobRevisionId,
          resumeVersionId: draft.resumeVersionId,
          profileVersionId: draft.profileVersionId,
          preferenceVersionId: draft.preferenceVersionId,
          resumeContentVersionId: source.id,
          originatingDraftId: draft.id,
          parentVersionId: parent?.id ?? null,
          revision: data.expectedTailoredRevision + 1,
          content,
          contentHash: contentHash(content),
          artifacts: {
            create: [
              {
                format: "PDF",
                storageKey: pdfKey,
                byteSize: docs.pdf.length,
                sha256: sha256(docs.pdf),
                templateVersion: docs.templateVersion,
                validation: docs.pdfValidation,
              },
              {
                format: "DOCX",
                storageKey: docxKey,
                byteSize: docs.docx.length,
                sha256: sha256(docs.docx),
                templateVersion: docs.templateVersion,
                validation: docs.docxValidation,
              },
            ],
          },
        },
      });
    });
  } catch (error) {
    await Promise.all(
      written.map((key) => removeGeneratedResume(key).catch(() => undefined)),
    );
    throw error;
  }
}
const approvalInputSchema = z
  .object({
    id: z.uuid(),
    expectedRevision: z.number().int().positive(),
    expectedContentHash: z.string().regex(/^[a-f0-9]{64}$/),
    pdfInspected: z.literal(true),
  })
  .strict();
export async function approveTailoredResume(input: unknown, receipt?: string) {
  const parsed = approvalInputSchema.safeParse(input);
  if (!parsed.success)
    throw new InputError(
      "Inspect the actual PDF and confirm the exact version before approving.",
    );
  const data = parsed.data;
  const { database, workspaceId } = await requireWorkspace();
  return database.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "Workspace" WHERE id=${workspaceId}::uuid FOR UPDATE`;
    const { version } = await checkedArtifacts(tx, workspaceId, data.id, false);
    const latest = await tx.tailoredResumeVersion.findFirst({
      where: { workspaceId, jobId: version.jobId },
      orderBy: { revision: "desc" },
    });
    if (
      version.approvedAt ||
      latest?.id !== version.id ||
      version.revision !== data.expectedRevision ||
      version.contentHash !== data.expectedContentHash
    )
      throw new InputError(
        "Version changed or already approved. Reload before approval.",
      );
    const pdf = version.artifacts.find((a) => a.format === "PDF"),
      docx = version.artifacts.find((a) => a.format === "DOCX");
    if (
      !pdf ||
      !docx ||
      !validInspectionReceipt(receipt, version.id, pdf.sha256)
    )
      throw new InputError(
        "Open the actual generated PDF again before approving. Preview receipts expire after one hour or an app restart.",
      );
    const now = new Date();
    return tx.tailoredResumeVersion.update({
      where: { id: version.id },
      data: {
        approvedAt: now,
        approval: {
          contentHash: version.contentHash,
          artifactHashes: { PDF: pdf.sha256, DOCX: docx.sha256 },
          templateVersion: "liberation-a4-v1",
          pdfInspected: true,
          confirmedAt: now.toISOString(),
          validators: ["pdf-layout-v1", "docx-text-v1"],
        },
      },
    });
  });
}
const selectionSchema = z
  .object({
    draftId: z.uuid(),
    expectedDraftRevision: z.number().int().positive(),
    versionId: z.uuid(),
  })
  .strict();
export async function selectTailoredResume(input: unknown) {
  const parsed = selectionSchema.safeParse(input);
  if (!parsed.success)
    throw new InputError(
      "Select a valid approved version and reload stale drafts.",
    );
  const data = parsed.data;
  const { database, workspaceId } = await requireWorkspace();
  return database.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "Workspace" WHERE id=${workspaceId}::uuid FOR UPDATE`;
    const draft = await tx.applicationDraft.findFirst({
      where: { workspaceId, id: data.draftId },
    });
    if (!draft || draft.operation === "discard")
      throw new InputError("Current draft unavailable.");
    const latest = await tx.applicationDraft.findFirst({
      where: { workspaceId, jobId: draft.jobId },
      orderBy: { revision: "desc" },
    });
    if (
      latest?.id !== draft.id ||
      draft.revision !== data.expectedDraftRevision
    )
      throw new InputError(
        "Draft changed in another tab. Reload before selecting.",
      );
    const { version } = await checkedArtifacts(
      tx,
      workspaceId,
      data.versionId,
      true,
    );
    for (const field of [
      "jobId",
      "jobRevisionId",
      "resumeVersionId",
      "profileVersionId",
      "preferenceVersionId",
    ] as const)
      if (draft[field] !== version[field])
        throw new InputError(
          "This document uses different job/source/profile/preferences. Generate and approve a compatible version.",
        );
    const source = await tx.resumeContentVersion.findFirst({
      where: { workspaceId, resumeVersionId: draft.resumeVersionId },
      orderBy: { revision: "desc" },
    });
    const resume = await tx.resumeVersion.findFirst({
      where: { workspaceId, id: draft.resumeVersionId, revokedAt: null },
    });
    if (
      !source ||
      source.id !== version.resumeContentVersionId ||
      source.reviewStatus !== "confirmed" ||
      !resume
    )
      throw new InputError(
        "Source changed or original was revoked. Generate and approve a compatible current version.",
      );
    const content = draftContentSchema.parse(draft.content);
    // Exact source review and approved documents resolve the older emphasis/extraction warning.
    // Answer and other eligibility warnings remain required.
    content.unresolved = content.unresolved.filter(
      (warning) =>
        warning !==
          "No verified project bullets found verbatim in the selected resume; resume emphasis needs your review." &&
        !warning.startsWith("Text extraction failed.") &&
        !warning.startsWith("Extracted text exceeds the review limit."),
    );
    const saved = await tx.applicationDraft.create({
      data: {
        workspaceId,
        jobId: draft.jobId,
        jobRevisionId: draft.jobRevisionId,
        resumeVersionId: draft.resumeVersionId,
        profileVersionId: draft.profileVersionId,
        preferenceVersionId: draft.preferenceVersionId,
        content,
        revision: draft.revision + 1,
        operation: "select-tailored-resume",
        tailoredResumeVersionId: version.id,
      },
    });
    await trackDraft(tx, saved);
    return saved;
  });
}
