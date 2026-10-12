import type { RequirementAnalysis } from "@/lib/requirement-analysis";
import { ProvenanceBadge } from "@/components/provenance-badge";

export function RequirementReview({
  analysis,
}: {
  analysis: RequirementAnalysis;
}) {
  return (
    <section className="panel mt-4">
      <h2 className="mb-4 flex flex-wrap items-center gap-2">
        Requirement review <ProvenanceBadge provenance="inferred" />
      </h2>
      <p className="mb-4 max-w-[70ch] text-sm text-text-muted">
        Supplementary rules applied to supplied text, not employer verification.
        Skills coverage is unchanged. No eligibility decision or automatic
        exclusion is made. Missing skill confirmation is not proof of absence.
      </p>
      {analysis.requirements.length ? (
        <ul className="space-y-4">
          {analysis.requirements.map((requirement, index) => (
            <li key={index} className="break-words text-sm">
              <p className="flex flex-wrap items-center gap-2">
                {requirement.classification === "unclear"
                  ? "Unclear requirement"
                  : `${requirement.classification === "mandatory" ? "Mandatory" : "Preferred"} wording`}
                <ProvenanceBadge provenance="inferred" />
              </p>
              <p className="mt-1 max-w-[70ch] whitespace-pre-wrap">
                {requirement.text}
              </p>
              <p className="mt-1 text-xs text-text-muted">
                Supplied{" "}
                {requirement.source === "description"
                  ? "description"
                  : "experience field"}
              </p>
              {requirement.skills.map((skill) => (
                <p
                  key={skill.name}
                  className="mt-2 flex flex-wrap items-center gap-2"
                >
                  {skill.name}:{" "}
                  {skill.confirmation === "verified"
                    ? "Confirmed in your profile"
                    : "Needs your input"}
                  <ProvenanceBadge provenance={skill.confirmation} />
                </p>
              ))}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-text-muted">
          No supported requirement wording detected. Needs your input; this does
          not establish a match.
        </p>
      )}
      <h3 className="mb-2 mt-4 text-sm font-semibold">
        Hard-filter evidence to review
      </h3>
      {analysis.flags.length ? (
        <ul className="space-y-3 text-sm">
          {analysis.flags.map((flag, index) => (
            <li key={index} className="max-w-[70ch] break-words">
              <p>{flag.reason}</p>
              <p className="mt-1 whitespace-pre-wrap text-text-muted">
                Supplied text: {flag.text}
              </p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-text-muted">
          No supported hard-filter signal detected. Eligibility remains unknown.
        </p>
      )}
      <p className="mt-4 flex flex-wrap items-center gap-2 text-sm">
        Compensation:{" "}
        {analysis.compensation === "explicitly-unpaid"
          ? "unpaid wording detected; review required"
          : "Needs your input; salary and compatibility remain unknown"}
        <ProvenanceBadge
          provenance={
            analysis.compensation === "explicitly-unpaid"
              ? "inferred"
              : "unknown"
          }
        />
      </p>
    </section>
  );
}
