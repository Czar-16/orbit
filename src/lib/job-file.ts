import { z } from "zod";
import { emptyJob, jobBatchSchema } from "@/lib/job-input";
import { InputError } from "@/lib/action-result";

export const jobFileMetadataSchema = z
  .object({
    name: z
      .string()
      .max(120)
      .regex(/^[A-Za-z0-9 _.-]+\.(json|csv)$/i),
    size: z
      .number()
      .int()
      .positive()
      .max(1024 * 1024),
    type: z.enum([
      "application/json",
      "text/csv",
      "application/csv",
      "text/plain",
      "",
    ]),
  })
  .strict()
  .superRefine((file, ctx) => {
    if (
      (/\.json$/i.test(file.name) &&
        ["text/csv", "application/csv"].includes(file.type)) ||
      (/\.csv$/i.test(file.name) && file.type === "application/json")
    ) {
      ctx.addIssue({
        code: "custom",
        message: "The file type does not match its extension.",
      });
    }
  });

// A bounded comma-delimited parser: quoted commas/newlines and doubled quotes
// are supported. Ambiguous or malformed input is rejected before ingestion.
function csvRows(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let state: "plain" | "quoted" | "closed" = "plain";
  function finishCell() {
    row.push(cell);
    if (row.length > 13) throw new InputError("CSV has too many columns.");
    cell = "";
    state = "plain";
  }
  function finishRow() {
    finishCell();
    rows.push(row);
    if (rows.length > 51)
      throw new InputError("Use at most 50 jobs in a CSV file.");
    row = [];
  }
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (state === "quoted") {
      if (char === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i++;
        } else state = "closed";
      } else cell += char;
    } else if (char === ",") finishCell();
    else if (char === "\n" || char === "\r") {
      if (char === "\r" && text[i + 1] === "\n") i++;
      finishRow();
    } else if (char === '"' && state === "plain" && cell === "")
      state = "quoted";
    else if (state === "closed" || char === '"') {
      throw new InputError(
        "Malformed CSV quoting. Quote entire cells and escape quotes by doubling them.",
      );
    } else cell += char;
  }
  if (state === "quoted")
    throw new InputError("CSV contains an unclosed quoted cell.");
  if (cell || row.length || state === "closed") finishRow();
  return rows;
}

export function parseJobFile(text: string, filename: string): unknown {
  if (new TextEncoder().encode(text).byteLength > 1024 * 1024)
    throw new InputError("Use a job list up to 1 MB.");
  const contents = text.replace(/^\uFEFF/, "");
  let input: unknown;
  if (/\.csv$/i.test(filename)) {
    const [header, ...rows] = csvRows(contents);
    const allowed = new Set(
      Object.keys(emptyJob).filter(
        (key) => key !== "jobId" && key !== "expectedRevision",
      ),
    );
    if (
      !header?.length ||
      new Set(header).size !== header.length ||
      header.some((key) => !allowed.has(key))
    )
      throw new InputError(
        "CSV headers must be unique supported job field names. See the file format example.",
      );
    input = rows.map((row, index) => {
      if (row.length !== header.length)
        throw new InputError(
          `CSV row ${index + 2} has a different number of cells than the header.`,
        );
      return Object.fromEntries(header.map((key, index) => [key, row[index]]));
    });
  } else if (/\.json$/i.test(filename)) {
    try {
      input = JSON.parse(contents);
    } catch {
      throw new InputError("This file is not valid JSON.");
    }
  } else throw new InputError("Choose a CSV or JSON job list.");
  const result = jobBatchSchema.safeParse(input);
  if (!result.success)
    throw new InputError(
      `Check the import file: ${result.error.issues[0]?.message ?? "Invalid job list."}`,
    );
  return input;
}
