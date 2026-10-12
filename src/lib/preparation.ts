import { z } from "zod";
import { type ProfileFacts } from "@/lib/profile-schema";
import { matchSkills, normalizeSkill } from "@/lib/matching";
export const providerSchema = z.enum(["off", "openai", "ollama"]);
export const answerSchema = z
  .object({
    question: z.string().min(1).max(500),
    value: z.string().max(5000),
    provenance: z.enum(["verified", "user-provided", "unknown"]),
    sensitive: z.boolean(),
  })
  .strict()
  .superRefine((a, ctx) => {
    if (a.sensitive && a.provenance === "verified")
      ctx.addIssue({
        code: "custom",
        message:
          "Sensitive answers require user input; never automatic verification.",
      });
    if (!a.value && a.provenance !== "unknown")
      ctx.addIssue({ code: "custom", message: "Empty answers are unknown." });
    if (a.value && a.provenance === "unknown")
      ctx.addIssue({
        code: "custom",
        message: "An answered field needs provenance.",
      });
  });
export const draftContentSchema = z
  .object({
    schemaVersion: z.literal(1),
    letter: z.string().max(20000),
    letterProvenance: z.enum(["inferred", "user-provided"]),
    answers: z.array(answerSchema).max(30),
    originals: z.array(z.string().max(5000)).max(30),
    order: z.array(z.number().int().nonnegative()).max(30),
    unresolved: z.array(z.string().max(500)).max(100),
    provider: providerSchema,
    matchSummary: z.string().max(20000),
  })
  .strict()
  .superRefine((d, ctx) => {
    if (
      new Set(d.order).size !== d.order.length ||
      d.order.some((i) => i >= d.originals.length)
    )
      ctx.addIssue({
        code: "custom",
        message: "Emphasis must select unique existing bullet indexes.",
      });
  });
export type DraftContent = z.infer<typeof draftContentSchema>;
export const selectionSchema = z
  .object({
    sentences: z.array(z.number().int().nonnegative()).max(12),
    bullets: z.array(z.number().int().nonnegative()).max(30),
  })
  .strict();
export function validateSelection(
  input: unknown,
  sentences: string[],
  originals: string[],
) {
  const value = selectionSchema.parse(input);
  if (
    new Set(value.sentences).size !== value.sentences.length ||
    new Set(value.bullets).size !== value.bullets.length ||
    value.sentences.some((i) => i >= sentences.length) ||
    value.bullets.some((i) => i >= originals.length)
  )
    throw new Error("Model selected unsupported facts.");
  return value;
}
const verified = (fact: ProfileFacts["name"]) =>
  fact.evidence.provenance === "verified" ? fact.value : null;
const flat = (text: string) => text.replace(/\s+/g, " ").trim();
export function prepareMaterials(
  facts: ProfileFacts,
  job: { title: string | null; company: string | null; skills: string[] },
  resumeText: string,
  questions: string[] = [],
) {
  const matchedKeys = new Set(
    matchSkills(job.skills, facts).matched.map(normalizeSkill),
  );
  const matching = facts.skills
    .map(verified)
    .filter(
      (value): value is string =>
        !!value && matchedKeys.has(normalizeSkill(value)),
    );
  const skillValues = facts.skills
    .map(verified)
    .filter((s): s is string => !!s);
  const sentences = [
    ...(matching.length
      ? [
          `My confirmed skills relevant to the supplied requirements include ${matching.join(", ")}.`,
        ]
      : []),
    ...facts.projects
      .map(verified)
      .filter((s): s is string => !!s)
      .slice(0, 3),
  ];
  const resumeFlat = flat(resumeText);
  const originals = facts.projects
    .map(verified)
    .filter((s): s is string => !!s && resumeFlat.includes(flat(s)))
    .sort((a, b) => resumeFlat.indexOf(flat(a)) - resumeFlat.indexOf(flat(b)));
  const relevance = (s: string) =>
    matching.filter((skill) =>
      normalizeSkill(s).includes(normalizeSkill(skill)),
    ).length;
  const order = originals
    .map((_, i) => i)
    .sort((a, b) => relevance(originals[b]) - relevance(originals[a]));
  const supported: Record<string, string | null> = {
    "Full name": verified(facts.name),
    Email: verified(facts.email),
    "Relevant skills": matching.length ? matching.join(", ") : null,
    Education: verified(facts.education),
  };
  const defaults = [
    ...Object.keys(supported),
    "Work authorization",
    "Salary expectation",
    "Availability",
    "Demographic / disability / veteran information",
  ];
  const answers = [...new Set([...defaults, ...questions])].map((question) => {
    const value = supported[question] ?? "";
    return {
      question,
      value,
      provenance: value ? ("verified" as const) : ("unknown" as const),
      sensitive: !Object.hasOwn(supported, question),
    };
  });
  const unresolved = answers.filter((a) => !a.value).map((a) => a.question);
  if (!verified(facts.name)) unresolved.push("Signature name");
  if (!originals.length)
    unresolved.push(
      "No verified project bullets found verbatim in the selected resume; resume emphasis needs your review.",
    );
  const intro = `Dear hiring team,\n\nI am applying for ${job.title ?? "the advertised role"}${job.company ? ` at ${job.company}` : ""}.`;
  const closing = `Thank you for considering my application.${verified(facts.name) ? `\n\n${verified(facts.name)}` : ""}`;
  const render = (indexes: number[]) =>
    [intro, ...indexes.map((i) => sentences[i]), closing].join("\n\n");
  const content: DraftContent = {
    schemaVersion: 1,
    letter: render(sentences.map((_, i) => i)),
    letterProvenance: "inferred",
    answers,
    originals,
    order,
    unresolved,
    provider: "off",
    matchSummary: matching.length
      ? `Confirmed skill overlaps: ${matching.join(", ")}.`
      : `No confirmed skill overlaps. ${skillValues.length} verified skills available. Unknown qualifications require review.`,
  };
  return { content: draftContentSchema.parse(content), sentences, render };
}
