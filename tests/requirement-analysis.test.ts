import { describe, it, expect } from "vitest";
import { analyzeRequirements } from "@/lib/requirement-analysis";
import { matchSkills } from "@/lib/matching";
import { emptyProfile } from "@/lib/profile-schema";
import { providedEvidence, verifiedEvidence } from "@/lib/provenance";
import { matchingDescriptions } from "./fixtures/matching-descriptions";
const profile = emptyProfile();
profile.skills = ["TypeScript", "React", "PostgreSQL"].map((value) => ({
  value,
  evidence: verifiedEvidence("Synthetic fixture confirmation"),
}));
profile.skills.push({
  value: "Java",
  evidence: providedEvidence("Unconfirmed synthetic text"),
});

describe("supplementary deterministic requirement review", () => {
  it.each(matchingDescriptions)(
    "reviews $id without changing skills-only scoring",
    (fixture) => {
      const input = {
        description: fixture.description,
        experienceRequirement: null,
      };
      const analysis = analyzeRequirements(input, profile);
      const skills = (classification: string) => [
        ...new Set(
          analysis.requirements
            .filter((r) => r.classification === classification)
            .flatMap((r) => r.skills.map((s) => s.name)),
        ),
      ];
      expect(skills("mandatory").sort()).toEqual([...fixture.mandatory].sort());
      expect(skills("preferred").sort()).toEqual([...fixture.preferred].sort());
      expect([...new Set(analysis.flags.map((f) => f.kind))]).toEqual(
        "flag" in fixture ? [fixture.flag] : [],
      );
      expect(analysis.compensation).toBe(
        fixture.id === "unpaid" ? "explicitly-unpaid" : "needs-review",
      );
      expect(matchSkills([...fixture.skills], profile).score).toBe(
        fixture.score,
      );
      for (const skill of analysis.requirements.flatMap((r) => r.skills)) {
        expect(skill.confirmation).toBe(
          ["TypeScript", "React", "PostgreSQL"].includes(skill.name)
            ? "verified"
            : "unknown",
        );
      }
      expect(input.description).toBe(fixture.description);
    },
  );
  it("does not treat unconfirmed mandatory skills as absent or invent experience", () => {
    const result = analyzeRequirements(
      {
        description:
          "Java and Spring Boot required. Minimum 5 years of experience required.",
        experienceRequirement: null,
      },
      profile,
    );
    expect(result.requirements[0].skills).toEqual([
      { name: "Java", confirmation: "unknown" },
      { name: "Spring Boot", confirmation: "unknown" },
    ]);
    expect(result.flags[0].reason).toContain("eligibility is unknown");
    expect(profile.experience.value).toBeNull();
  });
  it("keeps empty inputs and null profiles unknown", () => {
    expect(
      analyzeRequirements(
        { description: null, experienceRequirement: null },
        null,
      ),
    ).toMatchObject({
      requirements: [],
      flags: [],
      compensation: "needs-review",
    });
    expect(
      analyzeRequirements(
        { description: "React required", experienceRequirement: null },
        null,
      ).requirements[0].skills[0].confirmation,
    ).toBe("unknown");
  });
  it("uses field provenance and handles CRLF bullets, ranges and section resets", () => {
    const result = analyzeRequirements(
      {
        description:
          "Preferred skills:\r\n• Java\r\n\r\nReact\r\nResponsibilities:\r\nSpring Boot",
        experienceRequirement: "Minimum 5–7 years of experience required",
      },
      profile,
    );
    expect(result.requirements.map((r) => r.classification)).toEqual([
      "preferred",
      "unclear",
      "unclear",
      "mandatory",
    ]);
    expect(result.requirements.at(-1)).toMatchObject({
      source: "experienceRequirement",
      minimumYears: 5,
    });
  });
  it("does not confuse JavaScript with Java or assume alternatives are mandatory", () => {
    const result = analyzeRequirements(
      {
        description: "JavaScript required. Java or TypeScript required.",
        experienceRequirement: null,
      },
      profile,
    );
    expect(result.requirements[0].skills.map((s) => s.name)).toEqual([
      "JavaScript",
    ]);
    expect(result.requirements[1].classification).toBe("unclear");
  });
  it("validates external text bounds and rejects extra instruction fields", () => {
    expect(() =>
      analyzeRequirements(
        { description: "a".repeat(50001), experienceRequirement: null },
        profile,
      ),
    ).toThrow();
    expect(() =>
      analyzeRequirements(
        { description: 12, experienceRequirement: null },
        profile,
      ),
    ).toThrow();
    expect(() =>
      analyzeRequirements(
        {
          description: "React required",
          experienceRequirement: null,
          applied: true,
        },
        profile,
      ),
    ).toThrow();
  });
});
