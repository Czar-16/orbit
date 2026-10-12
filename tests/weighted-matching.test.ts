import { describe, it, expect } from "vitest";
import { weightedMatch, type WeightedJob } from "@/lib/weighted-matching";
import { defaultPreferences, preferenceSchema } from "@/lib/preferences";
import { emptyProfile } from "@/lib/profile-schema";
import { verifiedEvidence } from "@/lib/provenance";
import { matchingDescriptions } from "./fixtures/matching-descriptions";
const base: WeightedJob = {
  title: "Junior Software Engineer",
  location: "Bengaluru",
  workArrangement: "on-site",
  employmentType: "full-time",
  description: null,
  experienceRequirement: null,
  skills: [],
  compensationMin: null,
  compensationMax: null,
  currency: null,
  compensationPeriod: null,
};
const profile = emptyProfile();
profile.skills = ["TypeScript", "React", "PostgreSQL"].map((value) => ({
  value,
  evidence: verifiedEvidence("synthetic"),
}));
profile.experienceYears = {
  value: "0",
  evidence: verifiedEvidence("synthetic"),
};
profile.educationLevel = {
  value: "bachelor",
  evidence: verifiedEvidence("synthetic"),
};
describe("seven-category weighted prioritization", () => {
  it.each(matchingDescriptions)("keeps $id evidence honest", (f) => {
    const result = weightedMatch(
      { ...base, description: f.description, skills: [...f.skills] },
      profile,
      defaultPreferences,
    );
    expect(result.categories).toHaveLength(7);
    expect(result.categories.reduce((n, c) => n + c.weight, 0)).toBe(100);
    expect(result.score).toBeLessThanOrEqual(result.upperBound);
    if (f.id === "java-preferred")
      expect(result.flags.filter((f) => f.kind === "qualification")).toEqual(
        [],
      );
    if (f.id === "five-years")
      expect(result.flags).toContainEqual(
        expect.objectContaining({ kind: "experience", status: "conflict" }),
      );
    if (f.id === "unpaid")
      expect(result.flags).toContainEqual(
        expect.objectContaining({ kind: "unpaid", status: "conflict" }),
      );
    if (f.id === "missing-salary")
      expect(
        result.categories.find((c) => c.category === "compensation")?.status,
      ).toBe("unknown");
  });
  it("requires explicit negative skill evidence for a qualification conflict", () => {
    const unknown = weightedMatch(
      { ...base, description: "Java required" },
      profile,
      defaultPreferences,
    );
    expect(unknown.flags.some((f) => f.kind === "qualification")).toBe(false);
    const absent = {
      ...profile,
      absentSkills: [
        { value: "Java", evidence: verifiedEvidence("synthetic absence") },
      ],
    };
    expect(
      weightedMatch(
        { ...base, description: "Java required" },
        absent,
        defaultPreferences,
      ).flags,
    ).toContainEqual(
      expect.objectContaining({ kind: "qualification", status: "conflict" }),
    );
  });
  it("does not renormalize missing categories into an excellent score", () => {
    const result = weightedMatch(
      {
        ...base,
        title: null,
        location: null,
        workArrangement: null,
        employmentType: null,
        skills: ["React"],
      },
      profile,
      defaultPreferences,
    );
    expect(result.score).toBe(30);
    expect(result.evaluatedWeight).toBe(30);
    expect(result.upperBound).toBe(100);
  });
  it("leaves null profile unscored and rejects invalid weights", () => {
    expect(weightedMatch(base, null, defaultPreferences).score).toBeNull();
    expect(
      preferenceSchema.safeParse({
        ...defaultPreferences,
        weights: { ...defaultPreferences.weights, skills: 31 },
      }).success,
    ).toBe(false);
  });
  it("never guesses salary currency conversion or legal eligibility", () => {
    const result = weightedMatch(
      {
        ...base,
        description: "Visa and citizenship required",
        compensationMin: "100",
        currency: "USD",
        compensationPeriod: "year",
      },
      profile,
      { ...defaultPreferences, minimumPay: 5000 },
    );
    expect(
      result.categories.find((c) => c.category === "compensation")?.status,
    ).toBe("unknown");
    expect(
      result.flags.some(
        (f) => f.kind === "eligibility" && f.status === "review",
      ),
    ).toBe(true);
  });
});
