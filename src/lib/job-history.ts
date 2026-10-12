import { z } from "zod";
import { evidenceSchema, providedEvidence } from "@/lib/provenance";

export const sourceSnapshotSchema = z
  .object({
    identity: z.string().trim().min(1).max(300),
    label: z.string().trim().min(1).max(300),
    kind: z.literal("MANUAL"),
    evidence: evidenceSchema.refine(
      (value) => value.provenance === "user-provided" && value.basis === "user",
      "Manual source identity must remain user-provided.",
    ),
  })
  .strict();

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
  if (revision.schemaVersion !== 2) return null;
  const source = sourceSnapshotSchema.safeParse(revision.sourceSnapshot);
  if (!source.success) return null;
  return { listingUrl: revision.listingUrl, source: source.data };
}
