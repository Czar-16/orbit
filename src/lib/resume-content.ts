import { z } from "zod";
import { normalizeSkill } from "@/lib/matching";
import type { ProfileFacts } from "@/lib/profile-schema";
export const sections = [
  "contact",
  "summary",
  "employment",
  "projects",
  "education",
  "skills",
  "other",
] as const;
export const sourceItemSchema = z
  .object({
    id: z.string().min(1).max(100),
    original: z.string().max(5000),
    text: z.string().trim().max(5000),
    line: z.number().int().nonnegative(),
    section: z.enum(sections),
    kind: z.enum(["heading", "entry", "bullet", "text"]),
    entryId: z.string().max(100).nullable(),
    excluded: z.boolean(),
    exclusionReason: z.string().trim().max(500),
    confirmed: z.boolean(),
  })
  .strict();
export const sourceContentSchema = z
  .object({
    schemaVersion: z.literal(1),
    extractedText: z.string().max(100000),
    extractionFailed: z.boolean(),
    items: z.array(sourceItemSchema).min(1).max(300),
    conflictResolutions: z.record(
      z.string(),
      z.string().trim().min(10).max(1000),
    ),
  })
  .strict();
export type SourceContent = z.infer<typeof sourceContentSchema>;
export type SourceItem = z.infer<typeof sourceItemSchema>;
const headings: Record<string, (typeof sections)[number]> = {
  experience: "employment",
  "work experience": "employment",
  "professional experience": "employment",
  employment: "employment",
  projects: "projects",
  "personal projects": "projects",
  education: "education",
  skills: "skills",
  "technical skills": "skills",
  summary: "summary",
  profile: "summary",
  contact: "contact",
};
export function proposeStructure(text: string, failed = false): SourceContent {
  let section: (typeof sections)[number] = "other";
  let entryId: string | null = null;
  const items: SourceItem[] = [];
  text.split(/\r?\n/).forEach((original, line) => {
    if (!original.trim()) return;
    const text = original.trim();
    const found = headings[text.toLowerCase().replace(/:$/, "")];
    const id = `line-${line}`;
    if (found) {
      section = found;
      entryId = null;
    }
    const bullet = /^[•*\-]\s/.test(text);
    const kind = found ? "heading" : bullet ? "bullet" : "text";
    items.push({
      id,
      original,
      text,
      line,
      section: /@/.test(text) && section === "other" ? "contact" : section,
      kind,
      entryId,
      excluded: false,
      exclusionReason: "",
      confirmed: false,
    });
  });
  if (!items.length)
    items.push({
      id: "manual-0",
      original: "",
      text: "",
      line: 0,
      section: "contact",
      kind: "text",
      entryId: null,
      excluded: false,
      exclusionReason: "",
      confirmed: false,
    });
  return {
    schemaVersion: 1,
    extractedText: text,
    extractionFailed: failed,
    items,
    conflictResolutions: {},
  };
}
export function profileConflicts(source: SourceContent, facts: ProfileFacts) {
  const conflicts: { id: string; message: string }[] = [];
  const contact = source.items
    .filter((i) => !i.excluded && i.section === "contact")
    .map((i) => i.text)
    .join("\n");
  const emails =
    contact.match(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi) ?? [];
  if (
    facts.email.evidence.provenance === "verified" &&
    facts.email.value &&
    emails.some((e) => e.toLowerCase() !== facts.email.value?.toLowerCase())
  )
    conflicts.push({
      id: "email",
      message: `Source email differs from verified profile: ${facts.email.value}. Correct the source/profile or explain which source fact to use.`,
    });
  if (
    facts.name.evidence.provenance === "verified" &&
    facts.name.value &&
    !contact.toLowerCase().includes(facts.name.value.toLowerCase())
  )
    conflicts.push({
      id: "name",
      message: `Contact section does not include verified name: ${facts.name.value}. Resolve this before review.`,
    });
  for (const field of ["education", "experience"] as const) {
    const section = field === "experience" ? "employment" : field;
    const text = source.items
      .filter((i) => !i.excluded && i.section === section)
      .map((i) => i.text)
      .join(" ");
    if (
      text &&
      facts[field].value &&
      facts[field].evidence.provenance === "verified" &&
      !text.toLowerCase().includes(facts[field].value.toLowerCase())
    )
      conflicts.push({
        id: field,
        message: `Compare source ${field} with verified profile: ${facts[field].value}. Confirm differences explicitly; neither record overwrites the other.`,
      });
  }
  return conflicts;
}
export function validateReviewedSource(
  source: SourceContent,
  proposed: SourceContent,
  facts: ProfileFacts,
) {
  const ids = source.items.map((i) => i.id);
  if (new Set(ids).size !== ids.length)
    throw new Error("Each source item needs a unique stable ID.");
  for (const original of proposed.items) {
    const item = source.items.find((i) => i.id === original.id);
    if (
      !item ||
      item.original !== original.original ||
      item.line !== original.line
    )
      throw new Error(
        "Keep every extracted item and its original text/location. Exclude unwanted text with a reason.",
      );
  }
  if (
    source.extractedText !== proposed.extractedText ||
    source.extractionFailed !== proposed.extractionFailed
  )
    throw new Error("Original extraction cannot be replaced.");
  if (
    !source.items.some((i) => !i.excluded && i.section === "contact" && i.text)
  )
    throw new Error("Review at least one contact item.");
  for (const item of source.items) {
    if (
      !proposed.items.some((i) => i.id === item.id) &&
      (item.original !== "" ||
        item.line !== 0 ||
        !item.id.startsWith("manual-"))
    )
      throw new Error(
        "Missing source additions must retain manual provenance and empty original locations.",
      );
    if (
      !item.confirmed ||
      (!item.excluded && (!item.text || item.section === "other")) ||
      (item.excluded && !item.exclusionReason)
    )
      throw new Error(
        "Confirm every item, classify unmapped content, and explain exclusions. Needs your input.",
      );
    if (
      item.entryId &&
      !source.items.some(
        (e) =>
          e.id === item.entryId &&
          e.kind === "entry" &&
          e.section === item.section &&
          !e.excluded,
      )
    )
      throw new Error(
        "Bullets must reference an included entry in the same section.",
      );
    if (
      item.kind === "bullet" &&
      ["employment", "projects", "education"].includes(item.section) &&
      !item.entryId
    )
      throw new Error(
        "Link each employment/project/education bullet to its entry.",
      );
    if (
      !item.excluded &&
      /\bjava\b|spring\s*boot/i.test(item.text) &&
      !facts.skills.some(
        (f) =>
          f.evidence.provenance === "verified" &&
          /\bjava\b|spring\s*boot/i.test(f.value ?? ""),
      )
    )
      throw new Error(
        "Java/Spring Boot experience is unconfirmed. Correct the authoritative profile before including it.",
      );
    for (const absent of facts.absentSkills) {
      if (
        !item.excluded &&
        absent.evidence.provenance === "verified" &&
        absent.value &&
        containsSkill(item.text, absent.value)
      )
        throw new Error(
          `Source claims a skill marked absent: ${absent.value}. Correct the source or authoritative profile first.`,
        );
    }
  }
  for (const conflict of profileConflicts(source, facts))
    if (!source.conflictResolutions[conflict.id])
      throw new Error(conflict.message);
}
export function containsSkill(text: string, skill: string) {
  const escaped = normalizeSkill(skill).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`, "i").test(
    normalizeSkill(text),
  );
}
