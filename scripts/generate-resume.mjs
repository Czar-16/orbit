import { generateDocuments } from "./resume-document-engine.mjs";
let input = "";
process.stdin.setEncoding("utf8");
for await (const chunk of process.stdin) {
  input += chunk;
  if (input.length > 2000000) throw new Error("Document input exceeds limit.");
}
try {
  const items = JSON.parse(input);
  if (
    !Array.isArray(items) ||
    !items.length ||
    items.length > 300 ||
    items.some(
      (i) =>
        typeof i.text !== "string" || !i.text.trim() || i.text.length > 5000,
    )
  )
    throw new Error("Invalid document items.");
  const result = await generateDocuments(items);
  process.stdout.write(
    JSON.stringify({
      ...result,
      pdf: result.pdf.toString("base64"),
      docx: result.docx.toString("base64"),
    }),
  );
} catch (error) {
  process.stdout.write(
    JSON.stringify({
      error:
        error instanceof Error ? error.message : "Document generation failed.",
    }),
  );
  process.exitCode = 1;
}
