// @vitest-environment node
import { it, expect } from "vitest";
import PDFDocument from "pdfkit";
import JSZip from "jszip";
import { resolve } from "node:path";
import {
  generateDocuments,
  planDocument,
  validatePdf,
  validateDocx,
} from "../scripts/resume-document-engine.mjs";
import { generateResumeDocuments } from "@/lib/resume-document-worker";
import {
  buildTailoredContent,
  tailoringCandidates,
} from "@/lib/tailored-resume";
import { proposeStructure } from "@/lib/resume-content";
import { emptyProfile } from "@/lib/profile-schema";
const fixture = [
  {
    id: "contact",
    text: "Synthetic José Candidate · test@example.com",
    kind: "text" as const,
    section: "contact" as const,
    entryId: null,
  },
  {
    id: "heading",
    text: "Projects",
    kind: "heading" as const,
    section: "projects" as const,
    entryId: null,
  },
  {
    id: "entry",
    text: "Orbit synthetic project",
    kind: "entry" as const,
    section: "projects" as const,
    entryId: null,
  },
  {
    id: "bullet",
    text: "Built a React application with PostgreSQL. ".repeat(5).trim(),
    kind: "bullet" as const,
    section: "projects" as const,
    entryId: "entry",
  },
];
it("generates and validates selectable Unicode PDF and exact editable DOCX text", async () => {
  const result = await generateDocuments(fixture);
  expect(result.pdfValidation).toMatchObject({ passed: true, pageCount: 1 });
  expect(result.docxValidation).toMatchObject({
    passed: true,
    paragraphCount: 4,
  });
  const layout = planDocument(fixture);
  const zip = await JSZip.loadAsync(result.docx);
  const xml = await zip.file("word/document.xml")!.async("string");
  zip.file("word/document.xml", xml.replace("Synthetic", "Missing"));
  await expect(
    validateDocx(
      await zip.generateAsync({ type: "nodebuffer" }),
      layout.paragraphs,
    ),
  ).rejects.toThrow("text");
});
it("keeps headings/entries with following content and blocks third page and unsupported glyphs", async () => {
  const items = Array.from({ length: 45 }, (_, i) => ({
    ...fixture[0],
    id: `row-${i}`,
    text: "Synthetic body text.",
  }));
  const layout = planDocument([...items, ...fixture.slice(1)]);
  expect(layout.pages).toBe(2);
  expect(layout.paragraphs.at(-3)?.page).toBe(layout.paragraphs.at(-2)?.page);
  expect(layout.paragraphs.at(-2)?.page).toBe(layout.paragraphs.at(-1)?.page);
  expect(() =>
    planDocument(
      Array.from({ length: 100 }, (_, i) => ({
        ...fixture[0],
        id: `row-${i}`,
        text: "Synthetic body text.",
      })),
    ),
  ).toThrow("two A4 pages");
  expect(() =>
    planDocument([{ ...fixture[0], text: "Unsupported 🦄 glyph" }]),
  ).toThrow("Unsupported glyph");
  expect(() =>
    planDocument([{ ...fixture[0], text: "a".repeat(200) }]),
  ).toThrow("width");
  expect(() =>
    planDocument([{ ...fixture[3], text: "Long body text ".repeat(2000) }]),
  ).toThrow("too long");
});
async function corruptPdf(
  mode: "overlap" | "missing" | "order" | "bounds" | "empty",
) {
  const layout = planDocument(fixture);
  const doc = new PDFDocument({ autoFirstPage: false });
  doc
    .registerFont("regular", resolve("assets/fonts/LiberationSans-Regular.ttf"))
    .registerFont("bold", resolve("assets/fonts/LiberationSans-Bold.ttf"));
  const chunks: Buffer[] = [];
  const done = new Promise<Buffer>((r, j) => {
    doc.on("data", (c) => chunks.push(c));
    doc.on("end", () => r(Buffer.concat(chunks)));
    doc.on("error", j);
  });
  doc.addPage({ size: "A4", margin: 0 });
  const lines = mode === "order" ? [...layout.plan].reverse() : layout.plan;
  lines.forEach((line, i) => {
    if (mode === "missing" && i === 0) return;
    doc
      .font(line.font)
      .fontSize(line.size)
      .text(
        line.text,
        mode === "bounds" ? 2 : line.x,
        mode === "overlap" ? 60 : line.y,
        { lineBreak: false },
      );
  });
  if (mode === "empty") doc.addPage({ size: "A4", margin: 0 });
  doc.end();
  return { bytes: await done, layout };
}
it.each(["overlap", "missing", "order", "bounds", "empty"] as const)(
  "rejects invalid PDF %s",
  async (mode) => {
    const { bytes, layout } = await corruptPdf(mode);
    await expect(validatePdf(bytes, layout)).rejects.toThrow();
  },
);
it("runs the actual bounded local worker and exposes actionable failures", async () => {
  const source = proposeStructure("Synthetic Candidate");
  source.items[0].section = "contact";
  source.items[0].confirmed = true;
  const content = buildTailoredContent(
    tailoringCandidates(source, emptyProfile(), [], null),
  );
  const result = await generateResumeDocuments(content);
  expect(result.pdfValidation.pageCount).toBe(1);
  expect(result.pdf.length).toBeGreaterThan(1000);
  content.items[0].text = "🦄";
  await expect(generateResumeDocuments(content)).rejects.toThrow(
    "Unsupported glyph",
  );
});

it("preserves numeric and escaped XML paragraph text without coercing values", async () => {
  const result = await generateDocuments([
    { ...fixture[0], text: "001" },
    { ...fixture[0], id: "numeric", text: "3.0" },
    { ...fixture[0], id: "xml", text: 'R&D <local> & "synthetic"' },
  ]);
  expect(result.docxValidation).toMatchObject({
    passed: true,
    paragraphCount: 3,
  });
});
