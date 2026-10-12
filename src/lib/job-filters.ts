import { z } from "zod";
const text = z.string().trim().max(200).default("");
const score = z
  .string()
  .default("")
  .refine(
    (value) =>
      value === "" || (/^\d{1,3}$/.test(value) && Number(value) <= 100),
    "Score must be 0–100.",
  );
const date = z.union([z.literal(""), z.iso.date()]).default("");
export const jobFilterSchema = z
  .object({
    role: text,
    company: text,
    location: text,
    source: text,
    status: z
      .enum(["active", "all", "saved", "dismissed", "archived"])
      .default("active"),
    minScore: score,
    maxScore: score,
    from: date,
    to: date,
    sort: z.enum(["newest", "oldest", "score", "company"]).default("newest"),
    page: z
      .string()
      .regex(/^[1-9]\d{0,4}$/)
      .default("1"),
  })
  .superRefine((data, ctx) => {
    if (
      data.minScore &&
      data.maxScore &&
      Number(data.minScore) > Number(data.maxScore)
    )
      ctx.addIssue({
        code: "custom",
        message: "Minimum score must not exceed maximum.",
      });
    if (data.from && data.to && data.from > data.to)
      ctx.addIssue({
        code: "custom",
        message: "Start date must not be after end date.",
      });
  });
export type JobFilters = z.infer<typeof jobFilterSchema>;
export const defaultFilters: JobFilters = jobFilterSchema.parse({});
export function pageUrl(path: string, filters: JobFilters, page: number) {
  const params = new URLSearchParams({ ...filters, page: String(page) });
  return `${path}?${params}`;
}
