import { z } from "zod";
import type { ProfileFacts } from "@/lib/profile-schema";
export const MATCH_RULE_VERSION = "confirmed-skills-v1";
export const matchExplanationSchema = z
  .object({
    score: z.number().int().min(0).max(100).nullable(),
    matched: z.array(z.string()),
    missing: z.array(z.string()),
    unverified: z.array(z.string()),
    reason: z.string().nullable(),
    ruleVersion: z.literal(MATCH_RULE_VERSION),
  })
  .strict();
export type MatchExplanation = z.infer<typeof matchExplanationSchema>;
const aliases: Record<string, string> = {
  "react.js": "react",
  reactjs: "react",
  nodejs: "node.js",
  node: "node.js",
  js: "javascript",
  ts: "typescript",
  postgres: "postgresql",
};
export function normalizeSkill(skill: string) {
  const value = skill.trim().toLowerCase().replace(/\s+/g, " ");
  return aliases[value] ?? value;
}
export function matchSkills(
  required: string[],
  profile: ProfileFacts | null,
): MatchExplanation {
  const requirements = [
    ...new Map(
      required
        .filter((skill) => skill.trim())
        .map((skill) => [normalizeSkill(skill), skill]),
    ).values(),
  ];
  const base: MatchExplanation = {
    score: null,
    matched: [],
    missing: [],
    unverified: [],
    reason: null,
    ruleVersion: MATCH_RULE_VERSION,
  };
  if (!requirements.length)
    return {
      ...base,
      reason:
        "Required skills are unknown. Add the employer-stated requirements to calculate a score.",
    };
  const confirmed = new Set(
    profile?.skills
      .filter(
        (skill) => skill.evidence.provenance === "verified" && skill.value,
      )
      .map((skill) => normalizeSkill(skill.value ?? "")) ?? [],
  );
  const unverified = new Set(
    profile?.skills
      .filter(
        (skill) => skill.evidence.provenance !== "verified" && skill.value,
      )
      .map((skill) => normalizeSkill(skill.value ?? "")) ?? [],
  );
  if (!confirmed.size)
    return {
      ...base,
      unverified: requirements.filter((skill) =>
        unverified.has(normalizeSkill(skill)),
      ),
      reason:
        "Confirm your profile skills before calculating a score. Needs your input.",
    };
  const matched = requirements.filter((skill) =>
    confirmed.has(normalizeSkill(skill)),
  );
  const missing = requirements.filter(
    (skill) => !confirmed.has(normalizeSkill(skill)),
  );
  return {
    score: Math.round((matched.length / requirements.length) * 100),
    matched,
    missing,
    unverified: missing.filter((skill) =>
      unverified.has(normalizeSkill(skill)),
    ),
    reason: null,
    ruleVersion: MATCH_RULE_VERSION,
  };
}
export function scoreBand(score: number) {
  return score >= 85
    ? { label: "Excellent", tone: "text-success" }
    : score >= 70
      ? { label: "Strong", tone: "text-accent-hover" }
      : score >= 50
        ? { label: "Possible", tone: "text-warning" }
        : { label: "Low priority", tone: "text-text-muted" };
}
