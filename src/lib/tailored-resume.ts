import { z } from "zod";
import {
  containsSkill,
  sourceItemSchema,
  type SourceContent,
} from "@/lib/resume-content";
import type { ProfileFacts } from "@/lib/profile-schema";
import { normalizeSkill } from "@/lib/matching";
export const tailoredItemSchema = sourceItemSchema
  .extend({
    origin: z.enum(["resume", "profile"]),
    locator: z.string().max(200),
    provenance: z.literal("verified"),
    relevance: z.array(z.string().max(100)).max(100),
    wordingConfirmed: z.boolean(),
  })
  .strict();
export const tailoredContentSchema = z
  .object({
    schemaVersion: z.literal(1),
    items: z.array(tailoredItemSchema).min(1).max(300),
    ruleVersion: z.literal("resume-selection-v1"),
  })
  .strict();
export type TailoredContent = z.infer<typeof tailoredContentSchema>;
export type TailoredItem = z.infer<typeof tailoredItemSchema>;
export const tailoringInputSchema = z
  .object({
    draftId: z.uuid(),
    expectedDraftRevision: z.number().int().positive(),
    sourceId: z.uuid(),
    expectedSourceRevision: z.number().int().positive(),
    expectedTailoredRevision: z.number().int().nonnegative(),
    parentId: z.uuid().nullable(),
    selections: z
      .array(
        z
          .object({
            id: z.string().max(100),
            text: z.string().trim().min(1).max(5000),
            wordingConfirmed: z.boolean(),
          })
          .strict(),
      )
      .min(1)
      .max(300)
      .optional(),
  })
  .strict();
const vocabulary = [
  "JavaScript",
  "TypeScript",
  "React",
  "Next.js",
  "Node.js",
  "Express",
  "REST APIs",
  "MongoDB",
  "PostgreSQL",
  "Prisma",
  "Tailwind CSS",
  "Docker",
  "Git",
  "Python",
  "SQL",
  "Java",
  "Spring Boot",
];
export function profileItems(facts: ProfileFacts): TailoredItem[] {
  const scalar = [
    "name",
    "email",
    "location",
    "headline",
    "experience",
    "education",
  ] as const;
  const map = {
    name: "contact",
    email: "contact",
    location: "contact",
    headline: "summary",
    experience: "employment",
    education: "education",
  } as const;
  return [
    ...scalar.flatMap((field) =>
      facts[field].value && facts[field].evidence.provenance === "verified"
        ? [
            {
              id: `profile-${field}`,
              text: facts[field].value,
              section: map[field],
              locator: field,
            },
          ]
        : [],
    ),
    ...(["skills", "projects"] as const).flatMap((field) =>
      facts[field].flatMap((fact, i) =>
        fact.value && fact.evidence.provenance === "verified"
          ? [
              {
                id: `profile-${field}-${i}`,
                text: fact.value,
                section: field,
                locator: `${field}.${i}`,
              },
            ]
          : [],
      ),
    ),
  ].map((i) => ({
    ...i,
    original: i.text,
    line: 0,
    kind: "text",
    entryId: null,
    excluded: false,
    exclusionReason: "",
    confirmed: true,
    origin: "profile",
    provenance: "verified",
    relevance: [],
    wordingConfirmed: false,
  }));
}
export function tailoringCandidates(
  source: SourceContent,
  facts: ProfileFacts,
  skills: string[],
  description: string | null,
) {
  // Job text only supplies vocabulary matches. It is never an instruction or a personal fact.
  const terms = [
    ...new Set(
      [
        ...skills,
        ...vocabulary.filter((s) => containsSkill(description ?? "", s)),
      ].map(normalizeSkill),
    ),
  ].slice(0, 100);
  const relevance = (text: string) =>
    terms.filter((s) => containsSkill(text, s));
  const original: TailoredItem[] = source.items
    .filter((i) => !i.excluded)
    .map((i) => ({
      ...i,
      origin: "resume",
      locator: `line:${i.line + 1}`,
      provenance: "verified",
      relevance: relevance(i.text),
      wordingConfirmed: false,
    }));
  return [
    ...original,
    ...profileItems(facts)
      .filter((i) => !original.some((o) => o.text === i.text))
      .map((i) => ({ ...i, relevance: relevance(i.text) })),
  ];
}
export function deterministicSelection(candidates: TailoredItem[]) {
  const originals = candidates.filter((i) => i.origin === "resume");
  // Reorder bullets only within their own entry. Reorder project entry groups as a unit.
  const groups: TailoredItem[][] = [];
  for (const item of originals) {
    const group = item.entryId
      ? groups.find((g) => g[0].id === item.entryId)
      : undefined;
    if (group) group.push(item);
    else groups.push([item]);
  }
  for (const group of groups)
    if (group[0].kind === "entry") {
      const bullets = group
        .slice(1)
        .sort((a, b) => b.relevance.length - a.relevance.length);
      group.splice(1, group.length - 1, ...bullets);
    }
  const projects = groups
    .filter((g) => g[0].section === "projects" && g[0].kind === "entry")
    .sort(
      (a, b) =>
        b.reduce((n, i) => n + i.relevance.length, 0) -
        a.reduce((n, i) => n + i.relevance.length, 0),
    );
  const skills = groups
    .filter((g) => g[0].section === "skills" && g[0].kind !== "heading")
    .sort(
      (a, b) =>
        b.reduce((n, i) => n + i.relevance.length, 0) -
        a.reduce((n, i) => n + i.relevance.length, 0),
    );
  let skillIndex = 0;
  let projectIndex = 0;
  return groups.flatMap((g) =>
    g[0].section === "projects" && g[0].kind === "entry"
      ? projects[projectIndex++]
      : g[0].section === "skills" && g[0].kind !== "heading"
        ? skills[skillIndex++]
        : g,
  );
}
const linkingWords = new Set(
  "a an the and or with for to of in on at by using through as into from this that which while also my our i we it its was were is are be been have has had ".split(
    " ",
  ),
);
const sentenceVerbs = new Set(
  "developed built created implemented improved maintained delivered designed worked contributed helped used supporting supported".split(
    " ",
  ),
);
const words = (s: string) =>
  s.toLowerCase().match(/[\p{L}\p{N}+#]+(?:[.'-][\p{L}\p{N}+#]+)*/gu) ?? [];
export function validateManualWording(
  item: TailoredItem,
  text: string,
  confirmed: boolean,
) {
  if (text === item.text) return;
  if (item.kind !== "bullet")
    throw new Error(
      "Only bullets can be rewritten here. Correct other facts in source review first.",
    );
  if (!confirmed)
    throw new Error("Confirm each rewritten bullet individually.");
  const permitted = new Set(words(item.text));
  if (
    words(text).some((word) => !permitted.has(word) && !linkingWords.has(word))
  )
    throw new Error(
      "This rewrite adds unsupported wording or facts. Correct the authoritative source/profile first, or reuse the original wording.",
    );
  const protectedTokens =
    item.text.match(/\d[\d.,%+/-]*|\b[A-Z][\w.+-]*(?:\s+[A-Z][\w.+-]*)*/g) ??
    [];
  for (const rawToken of protectedTokens) {
    const pieces = rawToken.split(" ");
    while (
      pieces.length &&
      (linkingWords.has(pieces[0].toLowerCase()) ||
        sentenceVerbs.has(pieces[0].toLowerCase()))
    )
      pieces.shift();
    const token = pieces.join(" ");
    if (!token) continue;
    if (!text.includes(token))
      throw new Error(
        `Preserve protected names, dates, skills and metrics: ${token}.`,
      );
  }
  for (const skill of vocabulary)
    if (containsSkill(text, skill) !== containsSkill(item.text, skill))
      throw new Error(`Preserve the original skill claim: ${skill}.`);
  const originalNumbers = item.text.match(/\d[\d.,%+/-]*/g) ?? [];
  const numbers = text.match(/\d[\d.,%+/-]*/g) ?? [];
  if (JSON.stringify(originalNumbers) !== JSON.stringify(numbers))
    throw new Error("Preserve original metrics and dates exactly.");
}
export function buildTailoredContent(
  candidates: TailoredItem[],
  selections?: { id: string; text: string; wordingConfirmed: boolean }[],
): TailoredContent {
  const selected =
    selections ??
    deterministicSelection(candidates).map((i) => ({
      id: i.id,
      text: i.text,
      wordingConfirmed: false,
    }));
  if (new Set(selected.map((i) => i.id)).size !== selected.length)
    throw new Error("Select each stable item ID only once.");
  const items = selected.map((s) => {
    const item = candidates.find((i) => i.id === s.id);
    if (!item)
      throw new Error("Select only reviewed source or verified profile items.");
    validateManualWording(item, s.text, s.wordingConfirmed);
    return {
      ...item,
      text: s.text,
      wordingConfirmed: s.text !== item.text ? s.wordingConfirmed : false,
    };
  });
  if (!items.some((i) => i.section === "contact" && i.kind !== "heading"))
    throw new Error("Keep your reviewed contact information.");
  const employmentOrder = candidates
    .filter(
      (i) =>
        i.origin === "resume" &&
        i.section === "employment" &&
        i.kind !== "bullet",
    )
    .map((i) => i.id);
  const selectedEmployment = items
    .filter(
      (i) =>
        i.origin === "resume" &&
        i.section === "employment" &&
        i.kind !== "bullet",
    )
    .map((i) => i.id);
  if (
    JSON.stringify(
      employmentOrder.filter((id) => selectedEmployment.includes(id)),
    ) !== JSON.stringify(selectedEmployment)
  )
    throw new Error("Preserve employment chronology.");
  const seenSections = new Set<string>();
  let section = "";
  let entry: string | null = null;
  for (const item of items) {
    if (section !== item.section) {
      if (seenSections.has(item.section))
        throw new Error("Keep each section together.");
      section = item.section;
      seenSections.add(section);
      entry = null;
    }
    if (item.kind === "entry") entry = item.id;
    if (item.entryId && item.entryId !== entry)
      throw new Error("Keep bullets with their selected parent entry.");
  }
  for (let i = 0; i < items.length; i++)
    if (
      items[i].kind === "heading" &&
      (!items[i + 1] ||
        items[i + 1].section !== items[i].section ||
        items[i + 1].kind === "heading")
    )
      throw new Error("A heading needs following content in its section.");
  return tailoredContentSchema.parse({
    schemaVersion: 1,
    items,
    ruleVersion: "resume-selection-v1",
  });
}
export function compareItems(
  candidates: TailoredItem[],
  content: TailoredContent,
) {
  const original = candidates.filter((i) => i.origin === "resume");
  return [
    ...original,
    ...content.items.filter((i) => i.origin === "profile"),
  ].map((item) => {
    const after = content.items.find((i) => i.id === item.id);
    const from = original.findIndex((i) => i.id === item.id);
    const to = content.items.findIndex((i) => i.id === item.id);
    return {
      id: item.id,
      before: item.origin === "resume" ? item.text : null,
      after: after?.text ?? null,
      from,
      to,
      changes: !after
        ? ["Removed"]
        : item.origin === "profile"
          ? ["Added from verified profile"]
          : [
              ...(from !== to ? ["Moved"] : []),
              ...(after.text !== item.text ? ["Wording changed"] : []),
            ],
    };
  });
}
