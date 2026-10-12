import { z } from "zod";
export const provenanceSchema = z.enum([
  "verified",
  "user-provided",
  "inferred",
  "unknown",
]);
export const evidenceSchema = z
  .object({
    provenance: provenanceSchema,
    basis: z.enum(["user", "resume", "official", "rule", "ai"]).nullable(),
    locator: z.string().max(500).nullable(),
    confirmedAt: z.iso.datetime().nullable(),
    confirmedBy: z.literal("user").nullable(),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (
      value.provenance === "unknown" &&
      (value.basis !== null ||
        value.locator !== null ||
        value.confirmedAt !== null ||
        value.confirmedBy !== null)
    )
      ctx.addIssue({
        code: "custom",
        message: "Unknown fields cannot claim evidence.",
      });
    if (
      value.provenance === "verified" &&
      (!value.confirmedAt ||
        value.confirmedBy !== "user" ||
        !["user", "resume", "official"].includes(value.basis ?? ""))
    )
      ctx.addIssue({
        code: "custom",
        message: "Verified facts require explicit confirmation and evidence.",
      });
    if (value.provenance !== "unknown" && !value.basis)
      ctx.addIssue({
        code: "custom",
        message: "Known fields require an evidence basis.",
      });
    if (
      value.provenance !== "verified" &&
      (value.confirmedAt || value.confirmedBy)
    )
      ctx.addIssue({
        code: "custom",
        message: "Only verified fields carry confirmation.",
      });
    if (
      ["rule", "ai"].includes(value.basis ?? "") &&
      value.provenance !== "inferred"
    )
      ctx.addIssue({
        code: "custom",
        message: "Derived evidence must be inferred.",
      });
  });
export type Evidence = z.infer<typeof evidenceSchema>;
export function unknownEvidence(): Evidence {
  return {
    provenance: "unknown",
    basis: null,
    locator: null,
    confirmedAt: null,
    confirmedBy: null,
  };
}
export function providedEvidence(locator: string): Evidence {
  return {
    provenance: "user-provided",
    basis: "user",
    locator,
    confirmedAt: null,
    confirmedBy: null,
  };
}
export function verifiedEvidence(locator: string, now = new Date()): Evidence {
  return {
    provenance: "verified",
    basis: "user",
    locator,
    confirmedAt: now.toISOString(),
    confirmedBy: "user",
  };
}
