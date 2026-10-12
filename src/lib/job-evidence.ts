import { z } from "zod";
import { evidenceSchema } from "@/lib/provenance";
export const jobEvidenceSchema = z
  .object({
    title: evidenceSchema,
    company: evidenceSchema,
    location: evidenceSchema,
    workArrangement: evidenceSchema,
    employmentType: evidenceSchema,
    compensationMin: evidenceSchema,
    compensationMax: evidenceSchema,
    currency: evidenceSchema,
    compensationPeriod: evidenceSchema,
    experienceRequirement: evidenceSchema,
    skills: evidenceSchema,
    description: evidenceSchema,
    listingUrl: evidenceSchema,
  })
  .strict();
export type JobEvidence = z.infer<typeof jobEvidenceSchema>;
