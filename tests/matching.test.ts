import { describe, it, expect } from "vitest";
import { matchSkills, normalizeSkill } from "@/lib/matching";
import { emptyProfile } from "@/lib/profile-schema";
import { verifiedEvidence, providedEvidence } from "@/lib/provenance";
describe("deterministic skills matching", () => {
  it("leaves unknown requirements or profile skills unscored", () => {
    expect(matchSkills([], emptyProfile()).score).toBeNull();
    expect(matchSkills(["TypeScript"], emptyProfile()).score).toBeNull();
    expect(matchSkills(["TypeScript"], null).reason).toContain(
      "Needs your input",
    );
  });
  it("counts confirmed overlaps and explains missing requirements", () => {
    const profile = emptyProfile();
    profile.skills = [
      { value: "TypeScript", evidence: verifiedEvidence("test") },
      { value: "React", evidence: verifiedEvidence("test") },
    ];
    const match = matchSkills(
      ["TypeScript", "React.js", "PostgreSQL", "Java"],
      profile,
    );
    expect(match.score).toBe(50);
    expect(match.matched).toEqual(["TypeScript", "React.js"]);
    expect(match.missing).toEqual(["PostgreSQL", "Java"]);
  });
  it("does not claim unverified personal skills", () => {
    const profile = emptyProfile();
    profile.skills = [
      { value: "TypeScript", evidence: verifiedEvidence("test") },
      { value: "Java", evidence: providedEvidence("unconfirmed") },
    ];
    expect(matchSkills(["Java"], profile)).toMatchObject({
      score: 0,
      matched: [],
      missing: ["Java"],
      unverified: ["Java"],
    });
  });
  it("does not infer Java or Spring Boot from JavaScript", () => {
    const profile = emptyProfile();
    profile.skills = [
      { value: "JavaScript", evidence: verifiedEvidence("test") },
    ];
    expect(matchSkills(["Java", "Spring Boot"], profile).score).toBe(0);
    expect(normalizeSkill("Java")).not.toBe(normalizeSkill("JavaScript"));
  });
  it("deduplicates requirements without giving extra weight", () => {
    const profile = emptyProfile();
    profile.skills = [{ value: "React", evidence: verifiedEvidence("test") }];
    expect(matchSkills(["React", "React.js", "Postgres"], profile).score).toBe(
      50,
    );
  });
});
