import PDFDocument from "pdfkit";
import { openSync } from "fontkit";
import { Document, Packer, Paragraph, TextRun } from "docx";
import JSZip from "jszip";
import { XMLParser, XMLValidator } from "fast-xml-parser";
import { getDocumentProxy } from "unpdf";
import { resolve } from "node:path";
export const TEMPLATE_VERSION = "liberation-a4-v1";
const M = (18 * 72) / 25.4,
  W = 595.28,
  H = 841.89,
  WIDTH = W - 2 * M;
const regularPath = resolve(
  process.cwd(),
  "assets/fonts/LiberationSans-Regular.ttf",
);
const boldPath = resolve(process.cwd(), "assets/fonts/LiberationSans-Bold.ttf");
const compact = (text) => text.replace(/\s/g, "").normalize("NFC");
const displayText = (item) =>
  (item.kind === "bullet"
    ? "• " + item.text.replace(/^[•*\-]\s*/, "")
    : item.text
  )
    .replace(/\s+/g, " ")
    .trim();
export function planDocument(items) {
  const fonts = { regular: openSync(regularPath), bold: openSync(boldPath) };
  const doc = new PDFDocument({ autoFirstPage: false });
  doc.registerFont("regular", regularPath).registerFont("bold", boldPath);
  const paragraphs = items.map((item) => {
    const text = displayText(item),
      bold = item.kind === "heading" || item.kind === "entry",
      size = item.kind === "heading" ? 13 : 11;
    const font = bold ? "bold" : "regular";
    for (const char of text)
      if (!fonts[font].hasGlyphForCodePoint(char.codePointAt(0)))
        throw new Error(
          `Unsupported glyph ${char}. Correct this character in source review; no glyph substitution is used.`,
        );
    doc.font(font).fontSize(size);
    const lines = [];
    let line = "";
    for (const word of text.split(" ")) {
      if (doc.widthOfString(word) > WIDTH)
        throw new Error(
          "A word or URL exceeds the printable width. Shorten it in source review.",
        );
      const next = line ? line + " " + word : word;
      if (doc.widthOfString(next) > WIDTH && line) {
        lines.push(line);
        line = word;
      } else line = next;
    }
    if (line) lines.push(line);
    return {
      id: item.id,
      text,
      font,
      size,
      kind: item.kind,
      entryId: item.entryId,
      section: item.section,
      lines,
      lineHeight: size + 3.5,
      gap: item.kind === "heading" ? 7 : 4,
      height: lines.length * (size + 3.5),
    };
  });
  let page = 1,
    y = M;
  const plan = [];
  for (let i = 0; i < paragraphs.length; i++) {
    const p = paragraphs[i];
    // Keep heading with its entry and first body paragraph; keep entry with first bullet.
    let required = p.height + p.gap;
    if (p.kind === "heading" && paragraphs[i + 1]) {
      required += paragraphs[i + 1].height + paragraphs[i + 1].gap;
      if (
        paragraphs[i + 1].kind === "entry" &&
        paragraphs[i + 2]?.entryId === paragraphs[i + 1].id
      )
        required += paragraphs[i + 2].height;
    } else if (p.kind === "entry" && paragraphs[i + 1]?.entryId === p.id)
      required += paragraphs[i + 1].height;
    if (required > H - 2 * M)
      throw new Error(
        "An entry is too long to fit without breaking its relationship. Remove or shorten selected bullets.",
      );
    if (y + required > H - M) {
      page++;
      y = M;
    }
    if (page > 2)
      throw new Error(
        "Resume exceeds two A4 pages at 11-point text. Remove less relevant content; text is never shrunk or truncated.",
      );
    p.page = page;
    p.lines.forEach((text, index) =>
      plan.push({
        id: p.id,
        text,
        page,
        x: M,
        y: y + index * p.lineHeight,
        size: p.size,
        font: p.font,
        width: doc.font(p.font).fontSize(p.size).widthOfString(text),
        lineHeight: p.lineHeight,
      }),
    );
    y += p.height + p.gap;
  }
  return { plan, paragraphs, pages: page };
}
export async function validatePdf(bytes, layout) {
  const pdf = await getDocumentProxy(new Uint8Array(bytes), {
    isEvalSupported: false,
    useSystemFonts: false,
  });
  try {
    if (pdf.numPages !== layout.pages || pdf.numPages < 1 || pdf.numPages > 2)
      throw new Error("PDF page count differs from the plan.");
    for (let page = 1; page <= pdf.numPages; page++) {
      const actual = await pdf.getPage(page);
      const content = await actual.getTextContent();
      const entries = content.items.filter((i) => "str" in i && i.str.trim());
      if (!entries.length) throw new Error("PDF contains an empty page.");
      const planned = layout.plan.filter((i) => i.page === page);
      if (
        compact(entries.map((i) => i.str).join("")) !==
        compact(planned.map((i) => i.text).join(""))
      )
        throw new Error("PDF text or order is incomplete.");
      const lines = [];
      for (const item of entries) {
        const x = item.transform[4],
          baseline = H - item.transform[5],
          top = baseline - item.height;
        if (
          x < M - 1 ||
          x + item.width > W - M + 1 ||
          top < M - 3 ||
          baseline > H - M + 1 ||
          item.str.includes("\uFFFD") ||
          item.str.includes("\u0000")
        )
          throw new Error("PDF has out-of-bounds text or missing glyphs.");
        const last = lines.at(-1);
        if (last && Math.abs(last.baseline - baseline) < 0.5) {
          if (x < last.right - 0.5)
            throw new Error("PDF text overlaps horizontally.");
          last.text += item.str;
          last.right = x + item.width;
        } else
          lines.push({
            text: item.str,
            x,
            baseline,
            top,
            right: x + item.width,
            height: item.height,
          });
      }
      if (lines.length !== planned.length)
        throw new Error("PDF line count differs from layout.");
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i],
          expected = planned[i];
        if (
          line.text.replace(/\s+/g, " ").trim().normalize("NFC") !==
            expected.text.replace(/\s+/g, " ").trim().normalize("NFC") ||
          Math.abs(line.x - expected.x) > 1 ||
          Math.abs(line.baseline - (expected.y + expected.size * 0.905)) > 2 ||
          Math.abs(line.right - line.x - expected.width) > 2
        )
          throw new Error("PDF line geometry differs from the planned layout.");
        if (i && line.top < lines[i - 1].baseline - 0.5)
          throw new Error("PDF lines overlap vertically.");
      }
    }
    return {
      passed: true,
      validatorVersion: "pdf-layout-v1",
      pageCount: pdf.numPages,
      textOrder: true,
      bounds: true,
      overlap: false,
      glyphs: true,
    };
  } finally {
    await pdf.loadingTask.destroy();
  }
}
export async function validateDocx(bytes, paragraphs) {
  const zip = await JSZip.loadAsync(bytes, { checkCRC32: true });
  const xml = await zip.file("word/document.xml")?.async("string");
  if (
    !xml ||
    !zip.file("[Content_Types].xml") ||
    !zip.file("word/styles.xml") ||
    XMLValidator.validate(xml) !== true
  )
    throw new Error("Invalid DOCX structure.");
  const parsed = new XMLParser({
    preserveOrder: true,
    ignoreAttributes: false,
    trimValues: false,
    parseTagValue: false,
    parseAttributeValue: false,
  }).parse(xml);
  const texts = [];
  function collectText(nodes) {
    let text = "";
    for (const node of nodes ?? []) {
      for (const [key, value] of Object.entries(node)) {
        if (key === "#text") text += value;
        else if (Array.isArray(value)) text += collectText(value);
      }
    }
    return text;
  }
  function walk(nodes) {
    for (const node of nodes ?? [])
      for (const [key, value] of Object.entries(node)) {
        if (key === "w:p") texts.push(collectText(value));
        else if (Array.isArray(value)) walk(value);
      }
  }
  walk(parsed);
  if (JSON.stringify(texts) !== JSON.stringify(paragraphs.map((p) => p.text)))
    throw new Error("DOCX paragraph text or order is incomplete.");
  if (!xml.includes('w:sz="11906"') && !xml.includes('w:w="11906"'))
    throw new Error("DOCX A4 section size missing.");
  return {
    passed: true,
    validatorVersion: "docx-text-v1",
    paragraphCount: texts.length,
    textOrder: true,
    notice:
      "Editable DOCX can reflow in Word/LibreOffice; only PDF receives geometric validation.",
  };
}
export async function generateDocuments(items) {
  const layout = planDocument(items);
  const doc = new PDFDocument({
    autoFirstPage: false,
    compress: true,
    info: { Title: "Tailored resume", Creator: "Orbit" },
  });
  doc.registerFont("regular", regularPath).registerFont("bold", boldPath);
  const chunks = [];
  let total = 0;
  const pdfPromise = new Promise((resolve, reject) => {
    doc.on("data", (chunk) => {
      total += chunk.length;
      if (total > 5242880) {
        doc.destroy(new Error("PDF exceeds 5 MB."));
      } else chunks.push(chunk);
    });
    doc.on("error", reject);
    doc.on("end", () => resolve(Buffer.concat(chunks)));
  });
  let page = 0;
  for (const line of layout.plan) {
    if (line.page !== page) {
      doc.addPage({
        size: "A4",
        margins: { top: M, left: M, right: M, bottom: M },
      });
      page = line.page;
    }
    doc
      .font(line.font)
      .fontSize(line.size)
      .fillColor("#000000")
      .text(line.text, line.x, line.y, {
        lineBreak: false,
        features: { liga: false },
      });
  }
  doc.end();
  const pdf = await pdfPromise;
  const docx = await Packer.toBuffer(
    new Document({
      styles: {
        default: {
          document: {
            run: { font: "Liberation Sans", size: 22 },
            paragraph: { spacing: { after: 80, line: 290 } },
          },
        },
      },
      sections: [
        {
          properties: {
            page: {
              size: { width: 11906, height: 16838 },
              margin: { top: 1020, bottom: 1020, left: 1020, right: 1020 },
            },
          },
          children: layout.paragraphs.map(
            (p, index) =>
              new Paragraph({
                keepNext: p.kind === "heading" || p.kind === "entry",
                keepLines: true,
                pageBreakBefore:
                  index > 0 && p.page !== layout.paragraphs[index - 1].page,
                spacing: { after: p.gap * 20, line: p.lineHeight * 20 },
                children: [
                  new TextRun({
                    text: p.text,
                    bold: p.font === "bold",
                    font: "Liberation Sans",
                    size: p.size * 2,
                  }),
                ],
              }),
          ),
        },
      ],
    }),
  );
  if (docx.length > 5242880) throw new Error("DOCX exceeds 5 MB.");
  const pdfValidation = await validatePdf(pdf, layout),
    docxValidation = await validateDocx(docx, layout.paragraphs);
  return {
    pdf,
    docx,
    pdfValidation,
    docxValidation,
    templateVersion: TEMPLATE_VERSION,
  };
}
