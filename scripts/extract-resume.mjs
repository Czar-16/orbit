import { getDocumentProxy } from "unpdf";
console.log = () => {};
console.warn = () => {};
const chunks = [];
for await (const chunk of process.stdin) chunks.push(chunk);
const pdf = await getDocumentProxy(new Uint8Array(Buffer.concat(chunks)), {
  isEvalSupported: false,
  useSystemFonts: false,
});
if (pdf.numPages > 30) throw new Error("Too many pages");
let text = "";
for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
  const page = await pdf.getPage(pageNumber);
  const content = await page.getTextContent();
  for (const item of content.items) {
    if ("str" in item) text += item.str + (item.hasEOL ? "\n" : " ");
    if (text.length > 100000) throw new Error("Too much text");
  }
  text += "\n";
  page.cleanup();
}
process.stdout.write(text);

// The isolated process exits after extraction; its memory is reclaimed by the OS.
