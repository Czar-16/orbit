import { describe, it, expect } from "vitest";
import {
  proposeStructure,
  validateReviewedSource,
  profileConflicts,
} from "@/lib/resume-content";
import { emptyProfile } from "@/lib/profile-schema";
function reviewed(text = "Test Candidate\nProjects\nDemo\n• Built React app.") {
  const proposal = proposeStructure(text);
  const source = structuredClone(proposal);
  source.items.forEach((i) => {
    i.confirmed = true;
    if (i.id === "line-0") i.section = "contact";
    if (i.id === "line-2") i.kind = "entry";
    if (i.id === "line-3") i.entryId = "line-2";
  });
  return { proposal, source };
}
describe("reviewed structured source", () => {
  it("preserves duplicate bullets and original locations", () => {
    const { proposal, source } = reviewed(
      "Test Candidate\nProjects\nDemo\n• Built React app.\n• Built React app.",
    );
    source.items[4].entryId = "line-2";
    expect(source.items[3].id).not.toBe(source.items[4].id);
    expect(() =>
      validateReviewedSource(source, proposal, emptyProfile()),
    ).not.toThrow();
    source.items.pop();
    expect(() =>
      validateReviewedSource(source, proposal, emptyProfile()),
    ).toThrow("every extracted item");
  });
  it("requires classified and individually confirmed items and entry relationships", () => {
    const { proposal, source } = reviewed();
    source.items[3].confirmed = false;
    expect(() =>
      validateReviewedSource(source, proposal, emptyProfile()),
    ).toThrow("Confirm every");
    source.items[3].confirmed = true;
    source.items[3].entryId = null;
    expect(() =>
      validateReviewedSource(source, proposal, emptyProfile()),
    ).toThrow("Link each");
  });
  it("rejects unconfirmed Java/Spring claims", () => {
    const { proposal, source } = reviewed(
      "Test Candidate\nProjects\nDemo\n• Built Java Spring Boot app.",
    );
    expect(() =>
      validateReviewedSource(source, proposal, emptyProfile()),
    ).toThrow("unconfirmed");
  });
  it("supports manual reconstruction and explicit exclusions, without dropping extracted text", () => {
    const proposal = proposeStructure("", true);
    const source = structuredClone(proposal);
    source.items[0] = {
      ...source.items[0],
      text: "Test Candidate",
      confirmed: true,
    };
    expect(() =>
      validateReviewedSource(source, proposal, emptyProfile()),
    ).not.toThrow();
    const { proposal: p, source: s } = reviewed(
      "Test Candidate\nUnmapped text",
    );
    expect(() => validateReviewedSource(s, p, emptyProfile())).toThrow(
      "classify",
    );
    s.items[1].excluded = true;
    s.items[1].exclusionReason = "Not resume content";
    expect(() => validateReviewedSource(s, p, emptyProfile())).not.toThrow();
  });
  it("reports verified contact conflicts", () => {
    const { source } = reviewed();
    const facts = emptyProfile();
    facts.name = {
      value: "Different Candidate",
      evidence: {
        provenance: "verified",
        basis: "user",
        locator: null,
        confirmedAt: new Date().toISOString(),
        confirmedBy: "user",
      },
    };
    expect(profileConflicts(source, facts).map((c) => c.id)).toContain("name");
  });
});
