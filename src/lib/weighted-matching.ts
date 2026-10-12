import { z } from "zod";
import { analyzeRequirements } from "@/lib/requirement-analysis";
import { normalizeSkill } from "@/lib/matching";
import { profileFactsSchema, type ProfileFacts } from "@/lib/profile-schema";
import {
  preferenceSchema,
  type Preferences,
  categories,
  type Category,
} from "@/lib/preferences";
export const WEIGHTED_RULE_VERSION = "weighted-v1";
export const weightedJobSchema = z
  .object({
    title: z.string().max(300).nullable(),
    location: z.string().max(300).nullable(),
    workArrangement: z.string().max(30).nullable(),
    employmentType: z.string().max(30).nullable(),
    description: z.string().max(50000).nullable(),
    experienceRequirement: z.string().max(2000).nullable(),
    skills: z.array(z.string().max(3000)).max(100),
    compensationMin: z
      .string()
      .regex(/^\d+(\.\d{1,2})?$/)
      .nullable(),
    compensationMax: z
      .string()
      .regex(/^\d+(\.\d{1,2})?$/)
      .nullable(),
    currency: z.string().max(3).nullable(),
    compensationPeriod: z.string().max(10).nullable(),
  })
  .strict();
export type WeightedJob = z.infer<typeof weightedJobSchema>;
export const weightedExplanationSchema = z
  .object({
    ruleVersion: z.literal(WEIGHTED_RULE_VERSION),
    score: z.number().int().min(0).max(100).nullable(),
    evaluatedWeight: z.number().int().min(0).max(100),
    upperBound: z.number().int().min(0).max(100),
    categories: z
      .array(
        z
          .object({
            category: z.enum(categories),
            weight: z.number().int().min(0).max(100),
            points: z.number().min(0).max(100),
            unknownWeight: z.number().min(0).max(100),
            status: z.enum(["match", "partial", "conflict", "unknown"]),
            explanation: z.string().max(5000),
          })
          .strict(),
      )
      .length(7),
    flags: z.array(
      z
        .object({
          kind: z.string(),
          status: z.enum(["conflict", "review"]),
          explanation: z.string(),
        })
        .strict(),
    ),
    matched: z.array(z.string()),
    unconfirmed: z.array(z.string()),
  })
  .strict();
export type WeightedExplanation = z.infer<typeof weightedExplanationSchema>;
export function weightedMatch(
  input: unknown,
  personal: ProfileFacts | null,
  preferences: Preferences,
): WeightedExplanation {
  const job = weightedJobSchema.parse(input),
    prefs = preferenceSchema.parse(preferences),
    profile = personal ? profileFactsSchema.parse(personal) : null;
  const analysis = analyzeRequirements(
    {
      description: job.description,
      experienceRequirement: job.experienceRequirement,
    },
    profile,
  );
  const result: WeightedExplanation = {
    ruleVersion: WEIGHTED_RULE_VERSION,
    score: null,
    evaluatedWeight: 0,
    upperBound: 100,
    categories: [],
    flags: [],
    matched: [],
    unconfirmed: [],
  };
  const add = (
    category: Category,
    ratio: number | null,
    explanation: string,
  ) => {
    const weight = prefs.weights[category];
    result.categories.push({
      category,
      weight,
      points: ratio === null ? 0 : weight * ratio,
      unknownWeight: ratio === null ? weight : 0,
      status:
        ratio === null
          ? "unknown"
          : ratio === 1
            ? "match"
            : ratio === 0
              ? "conflict"
              : "partial",
      explanation,
    });
  };
  const confirmed = new Set(
    profile?.skills
      .filter((s) => s.evidence.provenance === "verified" && s.value)
      .map((s) => normalizeSkill(s.value ?? "")) ?? [],
  );
  const absent = new Set(
    profile?.absentSkills
      .filter((s) => s.evidence.provenance === "verified" && s.value)
      .map((s) => normalizeSkill(s.value ?? "")) ?? [],
  );
  const inferredMandatory = analysis.requirements
    .filter((r) => r.classification === "mandatory")
    .flatMap((r) => r.skills.map((s) => s.name));
  // Preferred text never enters the mandatory denominator merely through description analysis.
  const requirements = [
    ...new Map(
      [...job.skills, ...inferredMandatory].map((s) => [normalizeSkill(s), s]),
    ).values(),
  ];
  result.matched = requirements.filter((s) => confirmed.has(normalizeSkill(s)));
  result.unconfirmed = requirements.filter(
    (s) => !confirmed.has(normalizeSkill(s)),
  );
  const unresolved = result.unconfirmed.filter(
    (s) => !absent.has(normalizeSkill(s)),
  );
  const ratio =
    requirements.length && confirmed.size
      ? result.matched.length / requirements.length
      : null;
  add(
    "skills",
    ratio,
    requirements.length
      ? `${result.matched.length}/${requirements.length} supplied or rule-inferred mandatory skills confirmed. ${unresolved.length} unconfirmed; absence is not assumed.`
      : "Skill requirements unknown. Needs your input.",
  );
  result.categories[0].unknownWeight = requirements.length
    ? (prefs.weights.skills * unresolved.length) / requirements.length
    : prefs.weights.skills;
  // Partial skills points are a coverage aid, not a claim that unconfirmed skills are absent.
  if (unresolved.length && result.categories[0].status === "conflict")
    result.categories[0].status = "unknown";
  for (const skill of result.unconfirmed.filter((s) =>
    absent.has(normalizeSkill(s)),
  ))
    result.flags.push({
      kind: "qualification",
      status: "conflict",
      explanation: `${skill} is stated mandatory in supplied fields/text and explicitly absent in verified profile.`,
    });
  const title = job.title?.toLowerCase();
  const roleFit =
    title && prefs.roles.length
      ? prefs.roles.some((r) => title.includes(r.toLowerCase()))
      : null;
  add(
    "role",
    roleFit === null ? null : roleFit ? 1 : 0,
    "Title keyword comparison against selected roles; responsibility equivalence is not verified.",
  );
  const responsibilityVerbs = [
    "build",
    "develop",
    "test",
    "maintain",
    "design",
    "debug",
    "deploy",
  ];
  const personalText = [profile?.experience, ...(profile?.projects ?? [])]
    .filter((f) => f?.evidence.provenance === "verified" && f.value)
    .map((f) => f?.value ?? "")
    .join(" ")
    .toLowerCase();
  const jobVerbs = responsibilityVerbs.filter((v) =>
    new RegExp(`\\b${v}(?:s|ed|ing)?\\b`, "i").test(job.description ?? ""),
  );
  const responsibilityRatio =
    jobVerbs.length && personalText
      ? jobVerbs.filter((v) =>
          new RegExp(`\\b${v}(?:s|ed|ing)?\\b`, "i").test(personalText),
        ).length / jobVerbs.length
      : null;
  const roleCategory = result.categories.at(-1);
  if (roleCategory) {
    roleCategory.points =
      prefs.weights.role *
      ((roleFit === true ? 0.5 : 0) +
        (responsibilityRatio === null ? 0 : 0.5 * responsibilityRatio));
    roleCategory.unknownWeight =
      prefs.weights.role *
      ((roleFit === null ? 0.5 : 0) + (responsibilityRatio === null ? 0.5 : 0));
    roleCategory.status =
      roleCategory.unknownWeight === prefs.weights.role
        ? "unknown"
        : roleCategory.points === prefs.weights.role
          ? "match"
          : roleCategory.points === 0 && roleCategory.unknownWeight === 0
            ? "conflict"
            : "partial";
    roleCategory.explanation =
      "Half title-keyword fit; half responsibility-verb overlap with verified project/experience text. Lexical rule inference, not employer verification. Missing responsibility evidence stays unknown.";
  }
  if (roleFit === false)
    result.flags.push({
      kind: "role",
      status: "conflict",
      explanation:
        "Title is outside configured role keywords; review wording before dismissal.",
    });
  const years = analysis.requirements
    .filter((r) => r.classification === "mandatory" && r.minimumYears !== null)
    .map((r) => r.minimumYears ?? 0);
  const min = years.length ? Math.max(...years) : null;
  const candidate = profile?.experienceYears;
  const actual =
    candidate?.evidence.provenance === "verified" &&
    candidate.value !== null &&
    /^\d+(\.\d)?$/.test(candidate.value)
      ? Number(candidate.value)
      : null;
  add(
    "experience",
    min !== null && actual !== null ? (actual >= min ? 1 : 0) : null,
    min === null
      ? "Required minimum is unknown; do not infer experience from a junior title."
      : actual === null
        ? `Required minimum ${min} years; your confirmed numeric experience is unknown.`
        : `Supplied required minimum ${min} years vs verified ${actual} years.`,
  );
  if (min !== null && actual !== null && actual < min)
    result.flags.push({
      kind: "experience",
      status: "conflict",
      explanation: `Required ${min} years exceeds confirmed ${actual} years.`,
    });
  const education = analysis.requirements.filter(
    (r) =>
      r.classification === "mandatory" && /\bbachelor(?:'s)?\b/i.test(r.text),
  );
  const level = profile?.educationLevel;
  const knownLevel =
    level?.evidence.provenance === "verified" ? level.value : null;
  const levels = ["none", "secondary", "bachelor", "master", "doctorate"];
  add(
    "education",
    education.length && knownLevel && levels.includes(knownLevel)
      ? levels.indexOf(knownLevel) >= 2
        ? 1
        : 0
      : null,
    "Only an explicit bachelor-level requirement and verified structured education level are comparable. Other education and sensitive eligibility need your input.",
  );
  if (result.categories.at(-1)?.status === "conflict")
    result.flags.push({
      kind: "education",
      status: "conflict",
      explanation:
        "Bachelor-level requirement conflicts with confirmed education level.",
    });
  const arrangement = job.workArrangement;
  const locFit =
    job.location && prefs.locations.length
      ? prefs.locations.some((l) =>
          job.location?.toLowerCase().includes(l.toLowerCase()),
        )
      : null;
  const arrangeFit =
    arrangement && prefs.arrangements.length
      ? prefs.arrangements.includes(
          arrangement as Preferences["arrangements"][number],
        )
      : null;
  const remoteRestricted = analysis.flags.some((f) => f.kind === "location");
  add(
    "location",
    arrangeFit === false
      ? 0
      : arrangement === "remote" && !remoteRestricted && arrangeFit === true
        ? 1
        : locFit !== null && arrangeFit !== null
          ? locFit && arrangeFit
            ? 1
            : 0
          : null,
    "Compares supplied location/arrangement with preferences, not personal relocation or work authorization. Unstructured remote restrictions require review.",
  );
  add(
    "employment",
    job.employmentType && prefs.employmentTypes.length
      ? prefs.employmentTypes.includes(
          job.employmentType as Preferences["employmentTypes"][number],
        )
        ? 1
        : 0
      : null,
    "Supplied employment type vs preferences; internship duration/availability require manual review.",
  );
  const pay = job.compensationMin !== null ? Number(job.compensationMin) : null;
  const unpaid =
    analysis.compensation === "explicitly-unpaid" ||
    (job.compensationMax !== null && Number(job.compensationMax) === 0);
  const payRatio = unpaid
    ? prefs.paidOnly
      ? 0
      : null
    : pay !== null && pay > 0
      ? prefs.minimumPay === null
        ? 1
        : job.currency === prefs.currency &&
            job.compensationPeriod === prefs.period
          ? pay >= prefs.minimumPay
            ? 1
            : 0
          : null
      : null;
  add(
    "compensation",
    payRatio,
    unpaid
      ? "Explicit unpaid wording/zero maximum supplied; not employer-verified."
      : payRatio === null
        ? "Salary compatibility unknown. No currency conversion or salary guess is made."
        : "Stated minimum pay compared using the same currency and period.",
  );
  if (unpaid && prefs.paidOnly)
    result.flags.push({
      kind: "unpaid",
      status: "conflict",
      explanation:
        "Explicit unpaid signal conflicts with paid-only preference. Supplied employer data requires review.",
    });
  for (const flag of analysis.flags)
    if (
      !result.flags.some((f) => f.kind === flag.kind && f.status === "conflict")
    )
      result.flags.push({
        kind: flag.kind,
        status: "review",
        explanation: flag.reason,
      });
  const evaluated = Math.round(
    result.categories.reduce((n, c) => n + c.weight - c.unknownWeight, 0),
  );
  const points = result.categories.reduce((n, c) => n + c.points, 0);
  result.evaluatedWeight = evaluated;
  result.score =
    profile &&
    result.categories.some((c) => c.points > 0 || c.status === "conflict")
      ? Math.round(points)
      : null;
  result.upperBound = Math.min(
    100,
    Math.round(
      points + result.categories.reduce((n, c) => n + c.unknownWeight, 0),
    ),
  );
  return weightedExplanationSchema.parse(result);
}
export function weightedJobFromRevision(revision: {
  title: string | null;
  location: string | null;
  workArrangement: string | null;
  employmentType: string | null;
  description: string | null;
  experienceRequirement: string | null;
  skills: string[];
  compensationMin: { toString(): string } | null;
  compensationMax: { toString(): string } | null;
  currency: string | null;
  compensationPeriod: string | null;
}): WeightedJob {
  return weightedJobSchema.parse({
    title: revision.title,
    location: revision.location,
    workArrangement: revision.workArrangement,
    employmentType: revision.employmentType,
    description: revision.description,
    experienceRequirement: revision.experienceRequirement,
    skills: revision.skills,
    compensationMin: revision.compensationMin?.toString() ?? null,
    compensationMax: revision.compensationMax?.toString() ?? null,
    currency: revision.currency,
    compensationPeriod: revision.compensationPeriod,
  });
}
