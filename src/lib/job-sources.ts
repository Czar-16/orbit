import { z } from "zod";
import { jobBatchSchema } from "@/lib/job-input";
import type { Preferences } from "@/lib/preferences";
import { listingUrlSchema } from "@/lib/url-validation";
export const providers = [
  "himalayas",
  "remotive",
  "jobicy",
  "remoteok",
] as const;
export type Provider = (typeof providers)[number];
export const sourceConfigSchema = z
  .object({
    provider: z.enum(providers),
    companyQuery: z
      .string()
      .trim()
      .min(1)
      .max(100)
      .regex(/^[a-zA-Z0-9][a-zA-Z0-9 ._-]*$/)
      .nullable(),
  })
  .strict();
export function sourceUrl(
  config: z.infer<typeof sourceConfigSchema>,
  preferences: Preferences,
) {
  const parsed = sourceConfigSchema.parse(config);
  const url = new URL(
    parsed.provider === "himalayas"
      ? "https://himalayas.app/jobs/api/search"
      : parsed.provider === "remotive"
        ? "https://remotive.com/api/remote-jobs"
        : parsed.provider === "jobicy"
          ? "https://jobicy.com/api/v2/remote-jobs"
          : "https://remoteok.com/api",
  );
  if (parsed.provider === "himalayas") {
    url.searchParams.set("country", "IN");
    url.searchParams.set("sort", "recent");
    url.searchParams.set("q", preferences.roles[0] ?? "software engineer");
    url.searchParams.set("page", "1");
    if (parsed.companyQuery)
      url.searchParams.set("company", parsed.companyQuery);
  } else if (parsed.provider === "remotive") {
    url.searchParams.set("search", preferences.roles[0] ?? "software engineer");
    if (parsed.companyQuery)
      url.searchParams.set("company_name", parsed.companyQuery);
    url.searchParams.set("limit", "20");
  }
  if (parsed.provider === "jobicy") {
    url.searchParams.set("count", "20");
    const tag = (preferences.roles[0] ?? "developer").slice(0, 50);
    if (tag.length >= 3) url.searchParams.set("tag", tag);
  }
  if (parsed.provider === "remoteok") {
    const role = preferences.roles[0]?.toLowerCase() ?? "";
    url.searchParams.set(
      "tag",
      role.includes("frontend")
        ? "frontend"
        : role.includes("backend")
          ? "backend"
          : "dev",
    );
  }
  return url;
}
const text = z.string().max(50000);
const himalayaSchema = z.object({
  jobs: z
    .array(
      z.object({
        title: z.string().max(300),
        companyName: z.string().max(300),
        description: text,
        applicationLink: z.string().max(2048),
        locationRestrictions: z.array(z.string().max(100)).max(100).optional(),
        employmentType: z.string().max(100).optional(),
        minSalary: z.number().nonnegative().nullable().optional(),
        maxSalary: z.number().nonnegative().nullable().optional(),
        currency: z.string().max(3).nullable().optional(),
        salaryPeriod: z.string().max(20).nullable().optional(),
        expiryDate: z.union([z.number(), z.string(), z.null()]).optional(),
      }),
    )
    .max(1000),
});
const remotiveSchema = z.object({
  jobs: z
    .array(
      z.object({
        title: z.string().max(300),
        company_name: z.string().max(300),
        description: text,
        url: z.string().max(2048),
        candidate_required_location: z.string().max(300),
        job_type: z.string().max(100).optional(),
      }),
    )
    .max(1000),
});
const jobicySchema = z.object({
  success: z.literal(true).optional(),
  jobs: z
    .array(
      z.object({
        id: z.number().int().positive(),
        jobTitle: z.string().max(300),
        companyName: z.string().max(300),
        jobDescription: text,
        url: z.string().max(2048),
        jobGeo: z.string().max(300).default(""),
        jobType: z.array(z.string().max(100)).max(10).default([]),
        salaryMin: z.number().nonnegative().nullable().optional(),
        salaryMax: z.number().nonnegative().nullable().optional(),
        salaryCurrency: z.string().max(3).nullable().optional(),
        salaryPeriod: z.string().max(20).nullable().optional(),
      }),
    )
    .max(1000),
});
const remoteokSchema = z
  .array(
    z.union([
      z.object({ legal: z.string().max(10000) }),
      z.object({
        id: z.union([z.string(), z.number()]),
        position: z.string().max(300),
        company: z.string().max(300),
        description: text,
        url: z.string().max(2048),
        location: z.string().max(300).default(""),
      }),
    ]),
  )
  .max(1000);
const types: Record<string, string> = {
  "Full Time": "full-time",
  "Part Time": "part-time",
  Contractor: "contract",
  Intern: "internship",
  Temporary: "temporary",
  full_time: "full-time",
  part_time: "part-time",
  contract: "contract",
  internship: "internship",
};
export function prohibitedListing(url: string) {
  const host = new URL(url).hostname.toLowerCase();
  return /(^|\.)(linkedin\.com|indeed\.[a-z.]+)$/.test(host);
}
function structuredPay(job: {
  minSalary?: number | null;
  maxSalary?: number | null;
  currency?: string | null;
  salaryPeriod?: string | null;
}) {
  const periods: Record<string, string> = {
    hourly: "hour",
    monthly: "month",
    annual: "year",
    annually: "year",
    yearly: "year",
  };
  const period = periods[job.salaryPeriod ?? "annual"];
  const hasPay =
    (job.minSalary !== null && job.minSalary !== undefined) ||
    (job.maxSalary !== null && job.maxSalary !== undefined);
  if (!hasPay || !period || !job.currency || !/^[A-Z]{3}$/.test(job.currency))
    return {};
  return {
    compensationMin:
      job.minSalary === null || job.minSalary === undefined
        ? ""
        : String(job.minSalary),
    compensationMax:
      job.maxSalary === null || job.maxSalary === undefined
        ? ""
        : String(job.maxSalary),
    currency: job.currency,
    compensationPeriod: period,
  };
}
export function normalizeSourceJobs(
  provider: Provider,
  input: unknown,
  now = new Date(),
) {
  const rows =
    provider === "himalayas"
      ? himalayaSchema
          .parse(input)
          .jobs.slice(0, 20)
          .map((j) => ({
            title: j.title,
            company: j.companyName,
            description: j.description,
            listingUrl: j.applicationLink,
            location: j.locationRestrictions?.join(", ") ?? "",
            employmentType: types[j.employmentType ?? ""] ?? "",
            expiry: j.expiryDate,
            ...structuredPay(j),
          }))
      : provider === "remotive"
        ? remotiveSchema
            .parse(input)
            .jobs.slice(0, 20)
            .map((j) => ({
              title: j.title,
              company: j.company_name,
              description: j.description,
              listingUrl: j.url,
              location: j.candidate_required_location,
              employmentType: types[j.job_type ?? ""] ?? "",
              expiry: null,
            }))
        : provider === "jobicy"
          ? jobicySchema
              .parse(input)
              .jobs.slice(0, 20)
              .map((j) => ({
                title: j.jobTitle,
                company: j.companyName,
                description: j.jobDescription,
                listingUrl: j.url,
                location: j.jobGeo,
                employmentType:
                  types[j.jobType[0]?.toLowerCase().replace("-", "_") ?? ""] ??
                  "",
                expiry: null,
                ...structuredPay({
                  minSalary: j.salaryMin,
                  maxSalary: j.salaryMax,
                  currency: j.salaryCurrency,
                  salaryPeriod: j.salaryPeriod ?? "unknown",
                }),
              }))
          : remoteokSchema
              .parse(input)
              .filter(
                (j): j is Exclude<typeof j, { legal: string }> =>
                  !("legal" in j),
              )
              .slice(0, 20)
              .map((j) => ({
                title: j.position,
                company: j.company,
                description: j.description,
                listingUrl: j.url,
                location: j.location,
                employmentType: "",
                expiry: null,
              }));
  const valid = rows
    .filter((j) => {
      if (
        !listingUrlSchema.safeParse(j.listingUrl).success ||
        prohibitedListing(j.listingUrl)
      )
        return false;
      const expiry =
        j.expiry === null || j.expiry === undefined
          ? null
          : typeof j.expiry === "number"
            ? new Date(j.expiry < 1e12 ? j.expiry * 1000 : j.expiry)
            : new Date(j.expiry);
      return !(expiry && !Number.isNaN(expiry.getTime()) && expiry <= now);
    })
    .map(({ expiry, ...j }) => {
      void expiry;
      return { ...j, workArrangement: "remote" };
    });
  return valid.length ? jobBatchSchema.parse(valid) : [];
}
export function sourceRelevant(
  job: { title: string; location: string; workArrangement: string },
  preferences: Preferences,
) {
  const role =
    !preferences.roles.length ||
    preferences.roles.some((r) =>
      job.title.toLowerCase().includes(r.toLowerCase()),
    );
  const notSenior = !/\b(?:senior|staff|principal|director|lead)\b/i.test(
    job.title,
  );
  const location =
    !job.location ||
    job.location.split(",").some((v) => v.trim().toUpperCase() === "IN") ||
    /\b(?:india|worldwide|anywhere|global)\b/i.test(job.location) ||
    preferences.locations.some((l) =>
      job.location.toLowerCase().includes(l.toLowerCase()),
    );
  return (
    role &&
    notSenior &&
    location &&
    (!preferences.arrangements.length ||
      preferences.arrangements.includes("remote"))
  );
}
