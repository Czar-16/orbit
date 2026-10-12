import { describe, it, expect } from "vitest";
import {
  evidenceSchema,
  unknownEvidence,
  verifiedEvidence,
} from "@/lib/provenance";
import {
  emptyProfile,
  profileFactsSchema,
  factSchema,
} from "@/lib/profile-schema";
describe("provenance boundaries", () => {
  it("represents a missing profile without facts", () => {
    expect(profileFactsSchema.parse(emptyProfile()).name.value).toBeNull();
  });
  it("rejects values dressed as unknown", () => {
    expect(
      factSchema.safeParse({ value: "Fabricated", evidence: unknownEvidence() })
        .success,
    ).toBe(false);
  });
  it("rejects AI evidence marked verified", () => {
    expect(
      evidenceSchema.safeParse({ ...verifiedEvidence("AI"), basis: "ai" })
        .success,
    ).toBe(false);
  });
  it("requires actual confirmation for verified facts", () => {
    expect(
      evidenceSchema.safeParse({
        ...unknownEvidence(),
        provenance: "verified",
        basis: "user",
      }).success,
    ).toBe(false);
  });
});
