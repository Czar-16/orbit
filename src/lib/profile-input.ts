import { z } from "zod";
import { normalizeSkill } from "@/lib/matching";
import {
  emptyProfile,
  profileFields,
  profileFactsSchema,
} from "@/lib/profile-schema";
import { verifiedEvidence } from "@/lib/provenance";
const text = z.string().trim().max(5000);
export const profileInputSchema = z
  .object({
    name: text.max(150),
    email: z.union([z.literal(""), z.email()]),
    location: text.max(250),
    headline: text.max(300),
    experience: text,
    education: text,
    desiredRoles: text.max(1000),
    skills: text
      .max(2000)
      .refine(
        (value) => value.split(",").filter((item) => item.trim()).length <= 100,
        "Use at most 100 skills.",
      ),
    experienceYears: z
      .string()
      .trim()
      .refine(
        (v) =>
          !v || (/^(?:\d|[1-5]\d|60)(?:\.\d)?$/.test(v) && Number(v) <= 60),
        "Use 0–60 years, or leave unknown.",
      ),
    educationLevel: z.enum([
      "",
      "none",
      "secondary",
      "bachelor",
      "master",
      "doctorate",
    ]),
    absentSkills: text
      .max(2000)
      .refine(
        (v) => v.split(",").filter((s) => s.trim()).length <= 100,
        "Use at most 100 absent skills.",
      ),
    projects: text.refine(
      (v) => v.split("\n").filter((s) => s.trim()).length <= 30,
      "Use at most 30 project bullets.",
    ),
    resumeVersionId: z.union([z.literal(""), z.uuid()]),
    expectedRevision: z.number().int().min(0),
    confirmed: z
      .boolean()
      .refine(
        (value) => value,
        "Confirm that these facts are accurate before saving.",
      ),
  })
  .strict()
  .superRefine((value, ctx) => {
    const positive = new Set(value.skills.split(",").map(normalizeSkill));
    if (
      value.absentSkills
        .split(",")
        .some((s) => s.trim() && positive.has(normalizeSkill(s)))
    )
      ctx.addIssue({
        code: "custom",
        path: ["absentSkills"],
        message: "A skill cannot be both confirmed and absent.",
      });
  });
export type ProfileInput = z.infer<typeof profileInputSchema>;
export function profileFactsFromInput(input: ProfileInput, now = new Date()) {
  const facts = emptyProfile();
  for (const field of profileFields) {
    const value = input[field].trim();
    if (value)
      facts[field] = {
        value,
        evidence: verifiedEvidence(`Profile editor: ${field}`, now),
      };
  }
  for (const field of ["experienceYears", "educationLevel"] as const) {
    if (input[field])
      facts[field] = {
        value: input[field],
        evidence: verifiedEvidence(`Profile editor: ${field}`, now),
      };
  }
  for (const field of ["absentSkills", "projects"] as const) {
    facts[field] = input[field]
      .split(field === "projects" ? "\n" : ",")
      .map((v) => v.trim())
      .filter(Boolean)
      .map((value) => ({
        value,
        evidence: verifiedEvidence(`Profile editor: ${field}`, now),
      }));
  }
  const seen = new Set<string>();
  facts.skills = input.skills
    .split(",")
    .map((skill) => skill.trim())
    .filter((skill) => {
      const key = skill.toLowerCase();
      if (!skill || seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .map((value) => ({
      value,
      evidence: verifiedEvidence("Profile editor: skill", now),
    }));
  return profileFactsSchema.parse(facts);
}
export function profileDefaults(
  facts = emptyProfile(),
  revision = 0,
  resumeVersionId = "",
): ProfileInput {
  return {
    name: facts.name.value ?? "",
    email: facts.email.value ?? "",
    location: facts.location.value ?? "",
    headline: facts.headline.value ?? "",
    experience: facts.experience.value ?? "",
    education: facts.education.value ?? "",
    desiredRoles: facts.desiredRoles.value ?? "",
    skills: facts.skills
      .map((skill) => skill.value)
      .filter(Boolean)
      .join(","),
    experienceYears: facts.experienceYears.value ?? "",
    educationLevel: (facts.educationLevel.value ??
      "") as ProfileInput["educationLevel"],
    absentSkills: facts.absentSkills
      .map((s) => s.value)
      .filter(Boolean)
      .join(","),
    projects: facts.projects
      .map((s) => s.value)
      .filter(Boolean)
      .join("\n"),
    expectedRevision: revision,
    resumeVersionId,
    confirmed: false,
  };
}
