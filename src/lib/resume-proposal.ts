import { type ProfileFacts } from "@/lib/profile-schema";
import { normalizeSkill } from "@/lib/matching";
import { type Evidence } from "@/lib/provenance";
export function proposeResumeFacts(
  text: string,
  current: ProfileFacts,
  resumeId: string,
): ProfileFacts {
  const facts = structuredClone(current);
  const evidence: Evidence = {
    provenance: "inferred",
    basis: "rule",
    locator: `Resume text review: ${resumeId}`,
    confirmedAt: null,
    confirmedBy: null,
  };
  const proposal = (value: string) => ({ value, evidence });
  if (!facts.email.value) {
    const email = text.match(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i)?.[0];
    if (email) facts.email = proposal(email);
  }
  // Conservative known vocabulary only. Java/Spring Boot are never proposed.
  if (!facts.skills.length) {
    const vocabulary = [
      "JavaScript",
      "TypeScript",
      "React",
      "Next.js",
      "Node.js",
      "Express",
      "REST APIs",
      "MongoDB",
      "PostgreSQL",
      "Prisma",
      "Tailwind CSS",
      "Docker",
      "Git",
    ];
    const absent = new Set(
      facts.absentSkills.map((s) => normalizeSkill(s.value ?? "")),
    );
    facts.skills = vocabulary
      .filter(
        (s) =>
          !absent.has(normalizeSkill(s)) &&
          new RegExp(
            `(^|[^a-z0-9])${s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^a-z0-9]|$)`,
            "i",
          ).test(text),
      )
      .map(proposal);
  }
  // Verbatim bullet candidates require individual human review of what they describe.
  if (!facts.projects.length) {
    let remaining = 5000;
    facts.projects = text
      .split("\n")
      .map((s) => s.trim())
      .filter((s) => /^[•*-]\s+/.test(s) && s.length <= 5000)
      .filter((s) => {
        remaining -= s.length + 1;
        return remaining >= 0;
      })
      .slice(0, 30)
      .map(proposal);
  }
  return facts;
}
