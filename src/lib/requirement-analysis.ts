import { z } from "zod";
import { normalizeSkill } from "@/lib/matching";
import { profileFactsSchema, type ProfileFacts } from "@/lib/profile-schema";

export const REQUIREMENT_RULE_VERSION = "requirement-review-v1";
const inputSchema = z
  .object({
    description: z.string().max(50000).nullable(),
    experienceRequirement: z.string().max(2000).nullable(),
  })
  .strict();
export type RequirementAnalysis = {
  ruleVersion: typeof REQUIREMENT_RULE_VERSION;
  requirements: {
    text: string;
    source: "description" | "experienceRequirement";
    classification: "mandatory" | "preferred" | "unclear";
    skills: { name: string; confirmation: "verified" | "unknown" }[];
    minimumYears: number | null;
  }[];
  flags: {
    kind: "unpaid" | "experience" | "location" | "eligibility";
    text: string;
    reason: string;
  }[];
  compensation: "explicitly-unpaid" | "needs-review";
};
const skillPatterns: [string, RegExp][] = [
  ["JavaScript", /\b(?:javascript|js)\b/i],
  ["TypeScript", /\b(?:typescript|ts)\b/i],
  ["React", /\breact(?:\.js|js)?\b/i],
  ["Next.js", /\bnext\.?js\b/i],
  ["Node.js", /\bnode(?:\.?js)?\b/i],
  ["Express", /\bexpress(?:\.js)?\b/i],
  ["REST APIs", /\brest(?:ful)?\s+apis?\b/i],
  ["MongoDB", /\bmongodb\b/i],
  ["PostgreSQL", /\b(?:postgresql|postgres)\b/i],
  ["Prisma", /\bprisma\b/i],
  ["Tailwind CSS", /\btailwind(?:\s+css)?\b/i],
  ["Docker", /\bdocker\b/i],
  ["Git", /\bgit\b/i],
  ["Java", /\bjava\b/i],
  ["Spring Boot", /\bspring\s+boot\b/i],
];
const mandatory =
  /\b(?:required|requirements|mandatory|must(?:\s+have)?|minimum|at least)\b/i;
const preferred =
  /\b(?:preferred|nice[- ]to[- ]have|bonus|desirable|optional|a plus)\b/i;
const uncertain =
  /\b(?:not required|not mandatory|no .*required|either|or|may|ideally)\b/i;
const heading =
  /^(?:required(?: qualifications| skills)?|requirements|must have|mandatory|preferred(?: qualifications| skills)?|nice[- ]to[- ]have|bonus)\s*:?[ \t]*$/i;

// Text is evidence to review, never executable instructions or verified employer facts.
// Classification is deliberately conservative; a complete eligibility model comes later.
export function analyzeRequirements(
  input: unknown,
  profile: ProfileFacts | null,
): RequirementAnalysis {
  const data = inputSchema.parse(input);
  const facts = profile === null ? null : profileFactsSchema.parse(profile);
  const confirmed = new Set(
    facts?.skills
      .filter((s) => s.evidence.provenance === "verified" && s.value)
      .map((s) => normalizeSkill(s.value ?? "")) ?? [],
  );
  const result: RequirementAnalysis = {
    ruleVersion: REQUIREMENT_RULE_VERSION,
    requirements: [],
    flags: [],
    compensation: "needs-review",
  };
  for (const source of ["description", "experienceRequirement"] as const) {
    let section: "mandatory" | "preferred" | "unclear" = "unclear";
    for (const line of (data[source] ?? "").split(/\r?\n/)) {
      const clean = line.replace(/^\s*[-*•]\s*/, "").trim();
      if (!clean) {
        section = "unclear";
        continue;
      }
      if (heading.test(clean)) {
        section = preferred.test(clean) ? "preferred" : "mandatory";
        continue;
      }
      if (/^[\w /&-]+:$/.test(clean)) section = "unclear";
      // Sentence/semicolon boundaries prevent a preferred sentence governing the next one.
      for (const text of clean
        .split(/;|(?<=[.!?])\s+(?=[A-Z])/)
        .map((s) => s.trim())
        .filter(Boolean)) {
        const hasPreferred = preferred.test(text);
        const hasMandatory = mandatory.test(text);
        const classification =
          uncertain.test(text) || (hasPreferred && hasMandatory)
            ? "unclear"
            : hasPreferred
              ? "preferred"
              : hasMandatory
                ? "mandatory"
                : section;
        const skills = skillPatterns
          .filter(([, pattern]) => pattern.test(text))
          .map(([name]) => ({
            name,
            confirmation: confirmed.has(normalizeSkill(name))
              ? ("verified" as const)
              : ("unknown" as const),
          }));
        const years = text.match(
          /\b(\d{1,2})(?:\s*\+|\s*[-–]\s*\d{1,2})?\s+years?\s+(?:of\s+)?(?:professional\s+|commercial\s+|relevant\s+)?experience\b/i,
        );
        const minimumYears =
          years && classification === "mandatory" ? Number(years[1]) : null;
        if (skills.length || years || hasMandatory || hasPreferred)
          result.requirements.push({
            text,
            source,
            classification,
            skills,
            minimumYears,
          });
        if (
          /\b(?:unpaid (?:position|role|internship)|(?:position|role|internship) is unpaid|no (?:salary|stipend|compensation)(?: is)? (?:provided|offered)|compensation:\s*unpaid)\b/i.test(
            text,
          ) &&
          !/\b(?:not unpaid|no unpaid|never unpaid)\b/i.test(text)
        ) {
          result.compensation = "explicitly-unpaid";
          result.flags.push({
            kind: "unpaid",
            text,
            reason:
              "Possible paid-only hard-filter conflict in supplied text. Review the listing; no employer verification or automatic exclusion.",
          });
        }
        if (minimumYears !== null && minimumYears > 0)
          result.flags.push({
            kind: "experience",
            text,
            reason: `Rule detected a mandatory minimum of ${minimumYears} years. Needs your input: verified structured experience is unavailable; eligibility is unknown.`,
          });
        if (
          /\b(?:on[- ]site only|must (?:be based|reside|relocate)|residents only|no remote)\b/i.test(
            text,
          )
        )
          result.flags.push({
            kind: "location",
            text,
            reason:
              "Location restriction detected. Needs your input: current location is not proof of relocation eligibility or preference.",
          });
        if (
          /\b(?:work authorization|visa|citizenship|citizen|degree|bachelor|graduation)\b/i.test(
            text,
          ) &&
          classification === "mandatory"
        )
          result.flags.push({
            kind: "eligibility",
            text,
            reason:
              "Qualification or eligibility requirement detected. Needs your input; no personal or sensitive answer is inferred.",
          });
      }
    }
  }
  return result;
}
