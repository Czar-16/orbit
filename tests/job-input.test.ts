import { describe, it, expect } from "vitest";
import { jobInputSchema, jobBatchSchema, emptyJob } from "@/lib/job-input";
import { jobFilterSchema } from "@/lib/job-filters";
describe("manual intake boundaries", () => {
  it("requires a link or supplied description", () => {
    expect(jobInputSchema.safeParse(emptyJob).success).toBe(false);
    expect(
      jobInputSchema.safeParse({
        ...emptyJob,
        description: "Actual supplied text",
      }).success,
    ).toBe(true);
  });
  it("rejects guessed provenance, submission fields, and incomplete compensation", () => {
    expect(
      jobInputSchema.safeParse({
        ...emptyJob,
        description: "Text",
        applied: true,
      }).success,
    ).toBe(false);
    expect(
      jobInputSchema.safeParse({
        ...emptyJob,
        description: "Text",
        compensationMin: "100",
      }).success,
    ).toBe(false);
    expect(
      jobInputSchema.safeParse({
        ...emptyJob,
        description: "Text",
        compensationMin: "200",
        compensationMax: "100",
        currency: "INR",
        compensationPeriod: "month",
      }).success,
    ).toBe(false);
  });
  it("validates all file rows without throwing from safeParse", () => {
    expect(jobBatchSchema.safeParse([{ description: "Text" }]).success).toBe(
      true,
    );
    expect(
      jobBatchSchema.safeParse([
        { description: "Text" },
        { title: "No link or description" },
      ]).success,
    ).toBe(false);
    expect(
      jobBatchSchema.safeParse(
        Array.from({ length: 51 }, () => ({ description: "Text" })),
      ).success,
    ).toBe(false);
  });
  it("checks real calendar dates and ordered ranges", () => {
    expect(jobFilterSchema.safeParse({ from: "2026-02-30" }).success).toBe(
      false,
    );
    expect(
      jobFilterSchema.safeParse({ minScore: "90", maxScore: "10" }).success,
    ).toBe(false);
    expect(jobFilterSchema.safeParse({ page: "0" }).success).toBe(false);
  });
});
