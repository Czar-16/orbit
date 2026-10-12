import { z } from "zod";
import { evidenceSchema, providedEvidence } from "@/lib/provenance";

export const sourceSnapshotSchema = z
  .object({
    identity: z.string().trim().min(1).max(300),
    label: z.string().trim().min(1).max(300),
    kind: z.enum(["MANUAL", "OFFICIAL_API"]),
    evidence: evidenceSchema.refine(
      (value) =>
        (value.provenance === "user-provided" && value.basis === "user") ||
        (value.provenance === "inferred" && value.basis === "official"),
      "Manual source identity must remain user-provided.",
    ),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (
      value.kind === "MANUAL"
        ? value.evidence.provenance !== "user-provided"
        : value.evidence.provenance !== "inferred" ||
          value.evidence.basis !== "official"
    )
      ctx.addIssue({
        code: "custom",
        message: "Source kind and evidence must agree.",
      });
  });

export function captureManualSource(source: {
  identity: string;
  label: string;
  kind: string;
}) {
  return sourceSnapshotSchema.parse({
    identity: source.identity,
    label: source.label,
    kind: source.kind,
    evidence: providedEvidence("Manual intake: source"),
  });
}

export function readListingHistory(revision: {
  schemaVersion: number;
  listingUrl: string | null;
  sourceSnapshot: unknown;
}) {
  if (![2, 3].includes(revision.schemaVersion)) return null;
  const source = sourceSnapshotSchema.safeParse(revision.sourceSnapshot);
  if (!source.success) return null;
  return { listingUrl: revision.listingUrl, source: source.data };
}
