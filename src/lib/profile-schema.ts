import { z } from "zod";
import { evidenceSchema, unknownEvidence } from "@/lib/provenance";
export const profileFields = [
  "name",
  "email",
  "location",
  "headline",
  "experience",
  "education",
  "desiredRoles",
] as const;
export type ProfileField = (typeof profileFields)[number];
export const factSchema = z
  .object({
    value: z.string().trim().min(1).max(5000).nullable(),
    evidence: evidenceSchema,
  })
  .strict()
  .superRefine((fact, ctx) => {
    if ((fact.value === null) !== (fact.evidence.provenance === "unknown"))
      ctx.addIssue({
        code: "custom",
        message: "Missing facts must have unknown provenance.",
      });
  });
export const profileFactsSchema = z
  .object({
    name: factSchema,
    email: factSchema,
    location: factSchema,
    headline: factSchema,
    experience: factSchema,
    education: factSchema,
    desiredRoles: factSchema,
    skills: z.array(factSchema).max(100),
    experienceYears: factSchema.default(() => ({
      value: null,
      evidence: unknownEvidence(),
    })),
    educationLevel: factSchema.default(() => ({
      value: null,
      evidence: unknownEvidence(),
    })),
    absentSkills: z.array(factSchema).max(100).default([]),
    projects: z.array(factSchema).max(30).default([]),
  })
  .strict();
export type ProfileFacts = z.infer<typeof profileFactsSchema>;
export function emptyProfile(): ProfileFacts {
  const empty = () => ({ value: null, evidence: unknownEvidence() });
  return {
    name: empty(),
    email: empty(),
    location: empty(),
    headline: empty(),
    experience: empty(),
    education: empty(),
    desiredRoles: empty(),
    skills: [],
    experienceYears: empty(),
    educationLevel: empty(),
    absentSkills: [],
    projects: [],
  };
}
