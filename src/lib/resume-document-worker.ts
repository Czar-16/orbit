import "server-only";
import { spawn } from "node:child_process";
import { resolve } from "node:path";
import { z } from "zod";
import { InputError } from "@/lib/action-result";
import {
  tailoredContentSchema,
  type TailoredContent,
} from "@/lib/tailored-resume";
export const artifactValidationSchema = z
  .object({
    passed: z.literal(true),
    validatorVersion: z.enum(["pdf-layout-v1", "docx-text-v1"]),
    pageCount: z.number().int().min(1).max(2).optional(),
    paragraphCount: z.number().int().positive().optional(),
    textOrder: z.literal(true),
    bounds: z.literal(true).optional(),
    overlap: z.literal(false).optional(),
    glyphs: z.literal(true).optional(),
    notice: z.string().optional(),
  })
  .strict();
const outputSchema = z
  .object({
    pdf: z.string().max(7_000_000),
    docx: z.string().max(7_000_000),
    templateVersion: z.literal("liberation-a4-v1"),
    pdfValidation: artifactValidationSchema,
    docxValidation: artifactValidationSchema,
  })
  .strict();
export async function generateResumeDocuments(content: TailoredContent) {
  const valid = tailoredContentSchema.parse(content);
  const result = await new Promise<z.infer<typeof outputSchema>>(
    (resolveResult, reject) => {
      const child = spawn(
        process.execPath,
        [
          "--max-old-space-size=256",
          resolve(process.cwd(), "scripts/generate-resume.mjs"),
        ],
        { stdio: ["pipe", "pipe", "ignore"], env: { NODE_ENV: "production" } },
      );
      let output = "",
        settled = false;
      const fail = (message: string) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        child.kill("SIGKILL");
        reject(new InputError(message));
      };
      const timer = setTimeout(
        () =>
          fail(
            "Document worker exceeded 30 seconds. Reduce selected content and retry; no documents were approved.",
          ),
        30000,
      );
      child.stdout.setEncoding("utf8");
      child.stdout.on("data", (chunk: string) => {
        output += chunk;
        if (output.length > 14_100_000)
          fail(
            "Document worker exceeded output limit. Reduce selected content.",
          );
      });
      child.on("error", () =>
        fail(
          "Document worker could not start. Check local dependencies and retry.",
        ),
      );
      child.stdin.on("error", () =>
        fail(
          "Document worker input failed. No successful generation is assumed.",
        ),
      );
      child.on("close", (code) => {
        if (settled) return;
        clearTimeout(timer);
        try {
          const json: unknown = JSON.parse(output);
          const error = z
            .object({ error: z.string().max(1000) })
            .safeParse(json);
          if (code !== 0 || error.success) {
            fail(
              error.success
                ? error.data.error
                : "Document worker failed. Reduce content and retry.",
            );
            return;
          }
          const parsed = outputSchema.parse(json);
          if (
            parsed.pdfValidation.validatorVersion !== "pdf-layout-v1" ||
            !parsed.pdfValidation.bounds ||
            !parsed.pdfValidation.glyphs ||
            parsed.pdfValidation.overlap !== false ||
            !parsed.pdfValidation.pageCount ||
            parsed.docxValidation.validatorVersion !== "docx-text-v1" ||
            parsed.docxValidation.paragraphCount !== valid.items.length
          )
            throw new Error("Incomplete validation");
          settled = true;
          resolveResult(parsed);
        } catch {
          fail(
            "Document worker returned invalid or incomplete output. No documents were approved.",
          );
        }
      });
      child.stdin.end(JSON.stringify(valid.items));
    },
  );
  const pdf = Buffer.from(result.pdf, "base64"),
    docx = Buffer.from(result.docx, "base64");
  if (
    !pdf.length ||
    !docx.length ||
    pdf.length > 5242880 ||
    docx.length > 5242880 ||
    pdf.subarray(0, 5).toString() !== "%PDF-" ||
    docx.subarray(0, 2).toString() !== "PK"
  )
    throw new InputError("Generated output is invalid or exceeds 5 MB.");
  return { ...result, pdf, docx };
}
