import { z } from "zod";
export const MAX_RESUME_BYTES = 5 * 1024 * 1024;
export const resumeMetadataSchema = z
  .object({
    name: z
      .string()
      .min(1)
      .max(120)
      .regex(
        /^[A-Za-z0-9][A-Za-z0-9 _.-]*$/,
        "Use a simple filename without directory separators.",
      )
      .refine(
        (name) => !name.includes(".."),
        "Filename must not contain '..'.",
      ),
    type: z.enum(["application/pdf", "text/plain"]),
    size: z.number().int().positive().max(MAX_RESUME_BYTES),
  })
  .strict();
export function validateResume(metadata: unknown, bytes: Uint8Array) {
  const data = resumeMetadataSchema.parse(metadata);
  if (bytes.length !== data.size)
    throw new Error("File size did not match the upload metadata.");
  const extension = data.type === "application/pdf" ? "pdf" : "txt";
  if (!data.name.toLowerCase().endsWith(`.${extension}`))
    throw new Error(
      "File extension and type must match. Upload PDF or UTF-8 TXT.",
    );
  if (extension === "pdf") {
    const header = new TextDecoder().decode(bytes.subarray(0, 5));
    const footer = new TextDecoder().decode(
      bytes.subarray(Math.max(0, bytes.length - 1024)),
    );
    if (header !== "%PDF-" || !footer.includes("%%EOF"))
      throw new Error("This file does not have a valid PDF signature.");
  } else {
    const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    if (!text.trim() || /[\x00-\x08\x0B\x0C\x0E-\x1F]/.test(text))
      throw new Error("TXT uploads must contain readable UTF-8 text.");
  }
  return { ...data, extension };
}
