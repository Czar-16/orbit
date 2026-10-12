import Link from "next/link";
import { ExternalLink, CircleHelp } from "lucide-react";
import { type JobEntry } from "@/lib/job-query";
import { localDate } from "@/lib/time";
import { scoreBand } from "@/lib/matching";
import { JobActions } from "@/components/job-actions";
import { ProvenanceBadge } from "@/components/provenance-badge";
import { Button } from "@/components/ui/button";
export function JobCard({
  entry,
  inspect = true,
}: {
  entry: JobEntry;
  inspect?: boolean;
}) {
  const { job, revision, evidence, match, weighted } = entry;
  const band =
    weighted.score === null
      ? null
      : scoreBand(weighted.score ?? match.score ?? 0);
  const status = job.archivedAt
    ? "Archived"
    : job.dismissedAt
      ? "Dismissed"
      : job.savedAt
        ? "Saved"
        : "Discovered";
  const fields = [
    { label: "Company", value: revision.company, evidence: evidence.company },
    {
      label: "Location",
      value: revision.location,
      evidence: evidence.location,
    },
    {
      label: "Work arrangement",
      value: revision.workArrangement,
      evidence: evidence.workArrangement,
    },
    {
      label: "Employment type",
      value: revision.employmentType,
      evidence: evidence.employmentType,
    },
    {
      label: "Experience requirement",
      value: revision.experienceRequirement,
      evidence: evidence.experienceRequirement,
    },
  ];
  const compensation =
    revision.compensationMin !== null || revision.compensationMax !== null;
  return (
    <article className="panel job-card">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="break-words text-[15px]">
            {revision.title ?? "Job title needs your input"}
          </h2>
          <div className="mt-2">
            <ProvenanceBadge provenance={evidence.title.provenance} />
          </div>
        </div>
        <div
          title="Prioritization aid, not a guarantee."
          className="rounded-md border border-border bg-surface-2 px-3 py-2"
        >
          <p className="text-xs text-text-muted">Weighted prioritization</p>
          <p className={`font-mono text-sm ${band?.tone ?? "text-text-muted"}`}>
            {weighted.score === null
              ? "Unavailable"
              : `${weighted.score} · ${band?.label}`}
          </p>
          {weighted.score !== null && (
            <span className="text-xs text-text-muted">Inferred by rules</span>
          )}
        </div>
      </div>
      <dl className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {fields.map((field) => (
          <div key={field.label}>
            <dt className="text-xs text-text-muted">{field.label}</dt>
            <dd className="mt-1 flex flex-wrap items-center gap-2 break-words text-sm">
              {field.value ?? "Needs your input"}
              <ProvenanceBadge provenance={field.evidence.provenance} />
            </dd>
          </div>
        ))}
        <div>
          <dt className="text-xs text-text-muted">Compensation</dt>
          <dd className="mt-1 text-sm">
            {compensation ? (
              <div className="space-y-1">
                {[
                  {
                    label: "Minimum",
                    value: revision.compensationMin?.toString(),
                    evidence: evidence.compensationMin,
                  },
                  {
                    label: "Maximum",
                    value: revision.compensationMax?.toString(),
                    evidence: evidence.compensationMax,
                  },
                  {
                    label: "Currency",
                    value: revision.currency,
                    evidence: evidence.currency,
                  },
                  {
                    label: "Pay period",
                    value: revision.compensationPeriod,
                    evidence: evidence.compensationPeriod,
                  },
                ].map((field) => (
                  <p
                    className="flex flex-wrap items-center gap-2"
                    key={field.label}
                  >
                    <span>
                      {field.label}: {field.value ?? "Needs your input"}
                    </span>
                    <ProvenanceBadge provenance={field.evidence.provenance} />
                  </p>
                ))}
              </div>
            ) : (
              <span className="flex flex-wrap items-center gap-2">
                Needs your input <ProvenanceBadge provenance="unknown" />
              </span>
            )}
          </dd>
        </div>
      </dl>
      <div className="mt-4">
        <p className="mb-2 flex items-center gap-2 text-xs text-text-muted">
          Required skills{" "}
          <ProvenanceBadge provenance={evidence.skills.provenance} />
        </p>
        {revision.skills.length ? (
          <p className="text-sm">{revision.skills.join(", ")}</p>
        ) : (
          <p className="text-sm text-text-muted">Needs your input.</p>
        )}
      </div>
      <details className="mt-4 text-sm">
        <summary className="min-h-11 cursor-pointer">
          Weighted explanation · {weighted.evaluatedWeight}/100 weight evaluated
        </summary>
        <p className="mb-3 text-text-muted">
          {100 - weighted.evaluatedWeight} weight unknown; possible upper bound{" "}
          {weighted.upperBound}. Rule inference from supplied facts and
          preferences; not employer verification.
        </p>
        <ul className="space-y-2">
          {weighted.categories.map((c) => (
            <li key={c.category}>
              <span>
                {c.category}: {Math.round(c.points * 10) / 10}/{c.weight} ·{" "}
                {c.status} · {Math.round(c.unknownWeight * 10) / 10} weight
                unknown
              </span>
              <p className="text-xs text-text-muted">{c.explanation}</p>
            </li>
          ))}
        </ul>
        {weighted.flags.map((f, i) => (
          <p className="mt-2 text-warning" key={i}>
            {f.status === "conflict" ? "Hard-filter flag" : "Needs review"}:{" "}
            {f.explanation}
          </p>
        ))}
      </details>
      <div className="mt-4 space-y-2 text-sm">
        <p className="text-text-muted">
          Separate skills coverage:{" "}
          {match.score === null ? "Unavailable" : `${match.score}%`}
        </p>
        {match.reason ? (
          <p className="flex items-start gap-2 text-text-muted">
            <CircleHelp
              size={16}
              className="mt-0.5 shrink-0"
              aria-hidden="true"
            />
            {match.reason}
          </p>
        ) : (
          <>
            <p className="text-success">
              Matching skills:{" "}
              {match.matched.length
                ? match.matched.slice(0, 5).join(", ")
                : "No confirmed overlaps"}
              {match.matched.length > 5
                ? ` +${match.matched.length - 5} more`
                : ""}
            </p>
            <p className="text-warning">
              Missing / unverified:{" "}
              {match.missing.length
                ? match.missing.slice(0, 5).join(", ")
                : "None among the supplied requirements"}
              {match.missing.length > 5
                ? ` +${match.missing.length - 5} more`
                : ""}
            </p>
          </>
        )}
        <p className="text-xs text-text-muted">
          Prioritization aid, not a guarantee. Skills only; experience, salary,
          eligibility, and employer claims are not verified by this score.
          {entry.profileRevision !== null
            ? ` Profile revision ${entry.profileRevision}.`
            : " No verified profile available."}
        </p>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
        <span className="inline-flex items-center gap-1.5 rounded-md border border-border px-2 py-1 text-[11px] uppercase tracking-[0.04em]">
          <span
            aria-hidden="true"
            className={`size-1.5 rounded-full ${status === "Saved" ? "bg-info" : "bg-text-muted"}`}
          />
          {status}
        </span>
        <span className="text-text-muted">Source: {job.source.label}</span>
        <ProvenanceBadge
          provenance={
            job.source.kind === "MANUAL" ? "user-provided" : "inferred"
          }
        />
        {job.source.provider === "himalayas" && (
          <a
            className="inline-flex min-h-11 items-center underline"
            href="https://himalayas.app"
            target="_blank"
            rel="noopener noreferrer"
          >
            Himalayas
          </a>
        )}
        {job.source.provider === "remotive" && (
          <a
            className="inline-flex min-h-11 items-center underline"
            href="https://remotive.com"
            target="_blank"
            rel="noopener noreferrer"
          >
            Remotive
          </a>
        )}
        {job.source.provider === "jobicy" && (
          <a
            className="inline-flex min-h-11 items-center underline"
            href="https://jobicy.com"
            target="_blank"
            rel="noopener noreferrer"
          >
            Jobicy
          </a>
        )}
        {job.source.provider === "remoteok" && (
          <a
            className="inline-flex min-h-11 items-center underline"
            href="https://remoteok.com"
            target="_blank"
            rel="noopener noreferrer"
          >
            Remote OK
          </a>
        )}
        {localDate(job.discoveredAt) === localDate() && (
          <span className="text-info">New today</span>
        )}
        <span className="text-text-muted">
          {new Intl.DateTimeFormat("en-IN", {
            timeZone: "Asia/Kolkata",
            dateStyle: "medium",
          }).format(job.discoveredAt)}
        </span>
      </div>
      <p className="mt-3 text-xs text-text-muted">
        Manual apply only. Nothing has been submitted.
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        {job.listingUrl ? (
          <Button asChild variant="secondary">
            <a href={job.listingUrl} target="_blank" rel="noopener noreferrer">
              Open original listing
              <ExternalLink size={14} aria-hidden="true" />
            </a>
          </Button>
        ) : (
          <span className="text-xs text-text-muted">
            Original listing URL <ProvenanceBadge provenance="unknown" />
          </span>
        )}
        {inspect && (
          <Button asChild variant="ghost">
            <Link href={`/discover/${job.id}`}>Inspect / edit</Link>
          </Button>
        )}
        <span
          tabIndex={0}
          title="Application preparation is enabled in a later phase."
          role="group"
          aria-label="Prepare application unavailable until the application preparation phase."
        >
          <Button variant="ghost" disabled>
            Prepare application
          </Button>
        </span>
      </div>
      <div className="mt-3">
        <JobActions
          id={job.id}
          saved={!!job.savedAt}
          hidden={!!job.dismissedAt || !!job.archivedAt}
        />
      </div>
    </article>
  );
}
