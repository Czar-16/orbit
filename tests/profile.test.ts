import { describe, it, expect } from "vitest";
import {
  profileInputSchema,
  profileFactsFromInput,
  profileDefaults,
} from "@/lib/profile-input";
describe("explicit profile verification", () => {
  it("reopens a maximum-length skills list without invalidating unrelated edits", () => {
    const skills = `${"a".repeat(999)},${"b".repeat(1000)}`;
    const input = profileInputSchema.parse({
      ...profileDefaults(),
      skills,
      confirmed: true,
    });
    const reopened = profileDefaults(profileFactsFromInput(input), 1);
    expect(reopened.skills).toBe(skills);
    expect(
      profileInputSchema.parse({
        ...reopened,
        headline: "Updated",
        confirmed: true,
      }).skills,
    ).toBe(skills);
  });
  it("requires user confirmation", () => {
    expect(profileInputSchema.safeParse(profileDefaults()).success).toBe(false);
  });
  it("keeps missing personal facts unknown", () => {
    const facts = profileFactsFromInput(
      profileInputSchema.parse({ ...profileDefaults(), confirmed: true }),
    );
    expect(facts.name.value).toBeNull();
    expect(facts.name.evidence.provenance).toBe("unknown");
    expect(facts.skills).toEqual([]);
  });
  it("records only entered and confirmed skills, without additions", () => {
    const facts = profileFactsFromInput(
      profileInputSchema.parse({
        ...profileDefaults(),
        confirmed: true,
        skills: "TypeScript, React, typescript",
      }),
    );
    expect(facts.skills.map((skill) => skill.value)).toEqual([
      "TypeScript",
      "React",
    ]);
    expect(
      facts.skills.every((skill) => skill.evidence.provenance === "verified"),
    ).toBe(true);
  });
  it("does not accept client-supplied provenance or extra fields", () => {
    expect(
      profileInputSchema.safeParse({
        ...profileDefaults(),
        confirmed: true,
        provenance: "verified",
        workAuthorization: "guessed",
      }).success,
    ).toBe(false);
  });
});
