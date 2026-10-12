import "server-only";
import { createHash } from "node:crypto";
import { z } from "zod";
import { type Prisma } from "@/generated/prisma/client";
import { contentHash } from "@/lib/content-hash";
import { InputError } from "@/lib/action-result";
import { readGeneratedResume } from "@/lib/generated-resume-storage";
import { artifactValidationSchema } from "@/lib/resume-document-worker";
import { tailoredContentSchema } from "@/lib/tailored-resume";
export const sha256 = (bytes: Uint8Array) =>
  createHash("sha256").update(bytes).digest("hex");
export const approvalSchema = z
  .object({
    contentHash: z.string(),
    artifactHashes: z.object({ PDF: z.string(), DOCX: z.string() }).strict(),
    templateVersion: z.literal("liberation-a4-v1"),
    pdfInspected: z.literal(true),
    confirmedAt: z.iso.datetime(),
    validators: z.tuple([
      z.literal("pdf-layout-v1"),
      z.literal("docx-text-v1"),
    ]),
  })
  .strict();
export async function checkedArtifacts(
  tx: Prisma.TransactionClient,
  workspaceId: string,
  id: string,
  requireApproval: boolean,
) {
  const version = await tx.tailoredResumeVersion.findFirst({
    where: { workspaceId, id },
    include: { artifacts: true },
  });
  if (
    !version ||
    contentHash(tailoredContentSchema.parse(version.content)) !==
      version.contentHash
  )
    throw new InputError(
      "Tailored content checksum is invalid or unavailable.",
    );
  const approval = requireApproval
    ? approvalSchema.safeParse(version.approval)
    : null;
  if (
    requireApproval &&
    (!version.approvedAt ||
      !approval?.success ||
      approval.data.contentHash !== version.contentHash)
  )
    throw new InputError(
      "Inspect and approve the exact tailored documents first.",
    );
  if (version.artifacts.length !== 2)
    throw new InputError("Generate both PDF and DOCX before approval.");
  const files: { PDF?: Buffer; DOCX?: Buffer } = {};
  for (const artifact of version.artifacts) {
    const validation = artifactValidationSchema.safeParse(artifact.validation);
    if (
      !validation.success ||
      artifact.templateVersion !== "liberation-a4-v1" ||
      !["PDF", "DOCX"].includes(artifact.format)
    )
      throw new InputError(
        "Document validation is missing or invalid. Generate a new version.",
      );
    const format = artifact.format as "PDF" | "DOCX";
    if (
      (format === "PDF" &&
        (validation.data.validatorVersion !== "pdf-layout-v1" ||
          !validation.data.bounds ||
          !validation.data.glyphs ||
          !validation.data.pageCount ||
          validation.data.overlap !== false)) ||
      (format === "DOCX" && validation.data.validatorVersion !== "docx-text-v1")
    )
      throw new InputError("Document validation is incomplete.");
    const bytes = await readGeneratedResume(artifact.storageKey);
    if (
      bytes.length !== artifact.byteSize ||
      sha256(bytes) !== artifact.sha256 ||
      (approval?.success &&
        approval.data.artifactHashes[format] !== artifact.sha256)
    )
      throw new InputError(
        "Document checksum changed. Generate and approve a new version.",
      );
    files[format] = bytes;
  }
  if (!files.PDF || !files.DOCX)
    throw new InputError("Both document formats are required.");
  return { version, files: { PDF: files.PDF, DOCX: files.DOCX } };
}
