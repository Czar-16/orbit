import { z } from "zod";
import { InputError } from "@/lib/action-result";
import { localDate } from "@/lib/time";
export const statuses = [
  "DISCOVERED",
  "SAVED",
  "NEEDS_REVIEW",
  "DRAFT_READY",
  "READY_TO_APPLY",
  "APPLIED",
  "INTERVIEW",
  "OFFER",
  "REJECTED",
  "WITHDRAWN",
  "ARCHIVED",
] as const;
export const statusSchema = z.enum(statuses);
export type TrackingStatus = z.infer<typeof statusSchema>;
export const statusLabels: Record<TrackingStatus, string> = {
  DISCOVERED: "Discovered",
  SAVED: "Saved",
  NEEDS_REVIEW: "Needs review",
  DRAFT_READY: "Draft ready",
  READY_TO_APPLY: "Ready to apply",
  APPLIED: "Applied",
  INTERVIEW: "Interview",
  OFFER: "Offer",
  REJECTED: "Rejected",
  WITHDRAWN: "Withdrawn",
  ARCHIVED: "Archived",
};
export const transitions: Record<TrackingStatus, readonly TrackingStatus[]> = {
  DISCOVERED: ["SAVED", "NEEDS_REVIEW", "DRAFT_READY", "APPLIED", "ARCHIVED"],
  SAVED: ["DISCOVERED", "NEEDS_REVIEW", "DRAFT_READY", "APPLIED", "ARCHIVED"],
  NEEDS_REVIEW: ["DISCOVERED", "SAVED", "DRAFT_READY", "APPLIED", "ARCHIVED"],
  DRAFT_READY: ["NEEDS_REVIEW", "READY_TO_APPLY", "APPLIED", "ARCHIVED"],
  READY_TO_APPLY: ["NEEDS_REVIEW", "DRAFT_READY", "APPLIED", "ARCHIVED"],
  APPLIED: ["INTERVIEW", "OFFER", "REJECTED", "WITHDRAWN", "ARCHIVED"],
  INTERVIEW: ["OFFER", "REJECTED", "WITHDRAWN", "ARCHIVED"],
  OFFER: ["WITHDRAWN", "ARCHIVED"],
  REJECTED: ["ARCHIVED"],
  WITHDRAWN: ["ARCHIVED"],
  ARCHIVED: [],
};
export function requireTransition(from: TrackingStatus, to: TrackingStatus) {
  if (!transitions[from].includes(to))
    throw new InputError(
      "That status transition is not allowed. Reload and choose an available action.",
    );
}
export function dateAtMidnight(date: string) {
  return new Date(`${z.iso.date().parse(date)}T00:00:00+05:30`);
}
export function appliedDate(
  date: string,
  confirmed: boolean,
  now = new Date(),
) {
  if (!confirmed)
    throw new InputError(
      "Confirm that you submitted this application yourself.",
    );
  const parsed = z.iso.date().safeParse(date);
  if (!parsed.success || parsed.data > localDate(now))
    throw new InputError(
      "Choose a valid application date, no later than today in Asia/Kolkata.",
    );
  return dateAtMidnight(parsed.data);
}
const base = { id: z.uuid(), expectedRevision: z.number().int().positive() };
export const trackingCommandSchema = z.discriminatedUnion("operation", [
  z
    .object({
      ...base,
      operation: z.literal("status"),
      status: statusSchema,
      confirmed: z.boolean(),
      date: z.union([z.literal(""), z.iso.date()]),
    })
    .strict(),
  z
    .object({
      ...base,
      operation: z.literal("restore"),
      confirmed: z.literal(true),
    })
    .strict(),
  z
    .object({
      ...base,
      operation: z.literal("note"),
      note: z.string().trim().min(1).max(5000),
    })
    .strict(),
  z
    .object({
      ...base,
      operation: z.literal("nextStep"),
      nextStep: z.string().trim().max(1000),
    })
    .strict(),
  z
    .object({
      ...base,
      operation: z.literal("followUp"),
      label: z.string().trim().min(1).max(300),
      date: z.iso.date(),
      followUpId: z.uuid().optional(),
      followUpRevision: z.number().int().positive().optional(),
    })
    .strict(),
  z
    .object({
      ...base,
      operation: z.enum(["completeFollowUp", "cancelFollowUp"]),
      followUpId: z.uuid(),
      followUpRevision: z.number().int().positive(),
      confirmed: z.literal(true),
    })
    .strict(),
]);
const text = z.string().trim().max(200).default("");
const score = z
  .string()
  .regex(/^$|^\d{1,3}$/)
  .refine((v) => v === "" || Number(v) <= 100)
  .default("");
export const trackerFilterSchema = z
  .object({
    role: text,
    company: text,
    location: text,
    source: text,
    status: z.union([z.literal("all"), statusSchema]).default("all"),
    minScore: score,
    maxScore: score,
    from: z.union([z.literal(""), z.iso.date()]).default(""),
    to: z.union([z.literal(""), z.iso.date()]).default(""),
    sort: z.enum(["newest", "oldest", "score", "company"]).default("newest"),
    page: z
      .string()
      .regex(/^[1-9]\d{0,4}$/)
      .default("1"),
  })
  .strict()
  .superRefine((v, ctx) => {
    if (
      (v.from && v.to && v.from > v.to) ||
      (v.minScore && v.maxScore && Number(v.minScore) > Number(v.maxScore))
    )
      ctx.addIssue({ code: "custom", message: "Check date and score ranges." });
  });
export type TrackerFilters = z.infer<typeof trackerFilterSchema>;
