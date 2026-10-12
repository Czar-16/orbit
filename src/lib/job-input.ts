import { z } from "zod";
const short = z.string().trim().max(300);
const amount = z
  .string()
  .trim()
  .refine(
    (value) => !value || /^\d{1,12}(\.\d{1,2})?$/.test(value),
    "Use a nonnegative amount with at most two decimals.",
  );
export const jobInputSchema = z
  .object({
    listingUrl: z
      .string()
      .trim()
      .max(2048)
      .refine(
        (value) => !value || z.url().safeParse(value).success,
        "Use a valid HTTPS listing URL.",
      ),
    description: z.string().trim().max(50000),
    title: short,
    company: short,
    location: short,
    workArrangement: z.enum(["", "remote", "hybrid", "on-site"]),
    employmentType: z.enum([
      "",
      "full-time",
      "part-time",
      "contract",
      "internship",
      "temporary",
    ]),
    compensationMin: amount,
    compensationMax: amount,
    currency: z
      .string()
      .trim()
      .refine(
        (value) => !value || /^[A-Z]{3}$/.test(value),
        "Use a three-letter uppercase currency code.",
      ),
    compensationPeriod: z.enum(["", "hour", "month", "year"]),
    experienceRequirement: z.string().trim().max(2000),
    skills: z
      .string()
      .trim()
      .max(3000)
      .refine(
        (value) =>
          value.split(",").filter((skill) => skill.trim()).length <= 100,
        "Use at most 100 required skills.",
      ),
    jobId: z.union([z.literal(""), z.uuid()]),
    expectedRevision: z.number().int().nonnegative(),
  })
  .strict()
  .superRefine((data, ctx) => {
    if (!data.listingUrl && !data.description)
      ctx.addIssue({
        code: "custom",
        path: ["description"],
        message: "Paste a URL or a job description.",
      });
    const compensation =
      data.compensationMin !== "" || data.compensationMax !== "";
    if (compensation && (!data.currency || !data.compensationPeriod))
      ctx.addIssue({
        code: "custom",
        path: ["currency"],
        message: "Amounts require currency and pay period.",
      });
    if (!compensation && (data.currency || data.compensationPeriod))
      ctx.addIssue({
        code: "custom",
        path: ["compensationMin"],
        message: "Currency and period require a stated amount.",
      });
    if (
      data.compensationMin &&
      data.compensationMax &&
      Number(data.compensationMin) > Number(data.compensationMax)
    )
      ctx.addIssue({
        code: "custom",
        path: ["compensationMax"],
        message: "Maximum must be at least the minimum.",
      });
    if (
      (!data.jobId && data.expectedRevision !== 0) ||
      (data.jobId && data.expectedRevision < 1)
    )
      ctx.addIssue({
        code: "custom",
        path: ["expectedRevision"],
        message: "Invalid revision reference.",
      });
  });
export type JobInput = z.infer<typeof jobInputSchema>;
export const emptyJob: JobInput = {
  listingUrl: "",
  description: "",
  title: "",
  company: "",
  location: "",
  workArrangement: "",
  employmentType: "",
  compensationMin: "",
  compensationMax: "",
  currency: "",
  compensationPeriod: "",
  experienceRequirement: "",
  skills: "",
  jobId: "",
  expectedRevision: 0,
};
export function uniqueSkills(input: string) {
  const seen = new Set<string>();
  return input
    .split(",")
    .map((skill) => skill.trim())
    .filter((skill) => {
      const key = skill.toLowerCase();
      if (!skill || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}
export const jobBatchSchema = z
  .array(
    z
      .object({
        listingUrl: z.string().default(""),
        description: z.string().default(""),
        title: z.string().default(""),
        company: z.string().default(""),
        location: z.string().default(""),
        workArrangement: z.string().default(""),
        employmentType: z.string().default(""),
        compensationMin: z.string().default(""),
        compensationMax: z.string().default(""),
        currency: z.string().default(""),
        compensationPeriod: z.string().default(""),
        experienceRequirement: z.string().default(""),
        skills: z.string().default(""),
      })
      .strict()
      .transform((value) => ({ ...value, jobId: "", expectedRevision: 0 }))
      .pipe(jobInputSchema),
  )
  .min(1)
  .max(50);
