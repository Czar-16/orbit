import Link from "next/link";
import { ClipboardList } from "lucide-react";
import type { Metadata } from "next";
import { trackerFilterSchema, statuses, statusLabels } from "@/lib/tracking";
import { queryTracker } from "@/lib/tracker-query";
import { ApplicationStatusBadge } from "@/components/application-status";
import { ProvenanceBadge } from "@/components/provenance-badge";
import { jobEvidenceSchema } from "@/lib/job-evidence";
import { localDate } from "@/lib/time";
import { Button } from "@/components/ui/button";
export const metadata: Metadata = { title: "Application tracker" };
export const dynamic = "force-dynamic";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const parsed = trackerFilterSchema.safeParse(await searchParams);
  if (!parsed.success)
    return (
      <div className="panel">
        <h1>Check tracker filters</h1>
        <p>Use valid status, score and date ranges.</p>
        <Link href="/tracker" className="underline">
          Reset filters
        </Link>
      </div>
    );
  const filters = parsed.data;
  let result;
  try {
    result = await queryTracker(filters);
  } catch {
    return (
      <div className="panel">
        <h1>Application tracker unavailable</h1>
        <p>
          Start the local database and run npm run db:setup. No successful query
          is assumed.
        </p>
      </div>
    );
  }
  const pageUrl = (page: number) =>
    `/tracker?${new URLSearchParams({ ...filters, page: String(page) })}`;
  return (
    <>
      <div className="page-heading">
        <h1>Application tracker</h1>
        <p>
          Record applications you submitted yourself, and keep notes and
          follow-ups.
        </p>
      </div>
      <form method="get" action="/tracker" className="panel mb-4">
        <h2 className="mb-4">Filter applications</h2>
        <div className="form-grid">
          {(
            [
              ["role", "Role"],
              ["company", "Company"],
              ["location", "Location"],
              ["source", "Source"],
              ["minScore", "Minimum pinned score"],
              ["maxScore", "Maximum pinned score"],
              ["from", "Applied from"],
              ["to", "Applied through"],
            ] as const
          ).map(([key, label]) => (
            <div key={key}>
              <label htmlFor={`filter-${key}`} className="field-label">
                {label}
              </label>
              <input
                id={`filter-${key}`}
                name={key}
                className="field-input"
                defaultValue={filters[key]}
                type={
                  key === "from" || key === "to"
                    ? "date"
                    : key.includes("Score")
                      ? "number"
                      : "text"
                }
                min={key.includes("Score") ? 0 : undefined}
                max={key.includes("Score") ? 100 : undefined}
              />
            </div>
          ))}
          <div>
            <label htmlFor="filter-status" className="field-label">
              Application status
            </label>
            <select
              id="filter-status"
              name="status"
              defaultValue={filters.status}
              className="field-input"
            >
              <option value="all">All</option>
              {statuses.map((s) => (
                <option key={s} value={s}>
                  {statusLabels[s]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="filter-sort" className="field-label">
              Sort
            </label>
            <select
              id="filter-sort"
              name="sort"
              defaultValue={filters.sort}
              className="field-input"
            >
              <option value="newest">Updated newest first</option>
              <option value="oldest">Updated oldest first</option>
              <option value="score">Pinned score</option>
              <option value="company">Company</option>
            </select>
          </div>
        </div>
        <div className="mt-4 flex gap-2">
          <Button variant="secondary">Apply filters</Button>
          <Button asChild variant="ghost">
            <Link href="/tracker">Reset</Link>
          </Button>
        </div>
        <p className="field-hint">
          Dates use Asia/Kolkata. Scores use the selected draft snapshot or
          latest recorded match for the current listing revision; unknown scores
          never satisfy a range. Job visibility and application status are
          separate.
        </p>
      </form>
      <p className="sticky top-14 z-10 mb-4 border border-border bg-surface p-3 text-sm">
        {result.total} applications · page {result.page} of {result.pages}
      </p>
      <div className="space-y-4">
        {result.entries.map((app) => {
          const job = app.job.latestRevision;
          const evidence = job ? jobEvidenceSchema.parse(job.provenance) : null;
          const snapshot =
            app.matchSnapshot &&
            typeof app.matchSnapshot === "object" &&
            !Array.isArray(app.matchSnapshot)
              ? app.matchSnapshot
              : null;
          const stale =
            snapshot &&
            (snapshot.jobRevisionId !== job?.id ||
              snapshot.profileVersionId !== result.profileId ||
              snapshot.preferenceVersionId !== result.preferenceId);
          return (
            <article
              key={app.id}
              className="panel space-y-3 [overflow-wrap:anywhere]"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2>
                  <Link
                    href={`/tracker/${app.id}`}
                    className="underline underline-offset-4"
                  >
                    {job?.title ?? "Unknown role"}
                  </Link>{" "}
                  <ProvenanceBadge
                    provenance={evidence?.title.provenance ?? "unknown"}
                  />
                </h2>
                <ApplicationStatusBadge status={app.status} />
              </div>
              <p className="flex flex-wrap items-center gap-2 text-sm">
                {job?.company ?? "Unknown company"}
                <ProvenanceBadge
                  provenance={evidence?.company.provenance ?? "unknown"}
                />{" "}
                · {job?.location ?? "Unknown location"}
                <ProvenanceBadge
                  provenance={evidence?.location.provenance ?? "unknown"}
                />
              </p>
              <p className="text-sm text-text-muted">
                Source: {app.job.source.label}{" "}
                <ProvenanceBadge
                  provenance={
                    app.job.source.kind === "MANUAL"
                      ? "user-provided"
                      : "inferred"
                  }
                />{" "}
                · Job visibility:{" "}
                {app.job.archivedAt
                  ? "Archived"
                  : app.job.dismissedAt
                    ? "Dismissed"
                    : "Active"}
              </p>
              <p className="text-sm">
                Pinned score: {app.matchScore ?? "Unknown"}{" "}
                <ProvenanceBadge
                  provenance={app.matchScore === null ? "unknown" : "inferred"}
                />{" "}
                ·{" "}
                {snapshot
                  ? snapshot.kind === "draft"
                    ? "Selected draft"
                    : "Recorded match"
                  : "No recorded match"}
                {stale
                  ? " · Stale: listing, profile or preferences changed"
                  : ""}
              </p>
              <p className="field-hint">
                Prioritization aid, not a guarantee. Profile version:{" "}
                {String(snapshot?.profileVersionId ?? "Unknown")} · Preference
                version: {String(snapshot?.preferenceVersionId ?? "Unknown")}
              </p>
              <p className="text-sm">
                Applied:{" "}
                {app.appliedAt
                  ? `${localDate(app.appliedAt)} · Manually confirmed`
                  : "Not confirmed"}
              </p>
              {app.nextStep && (
                <p className="whitespace-pre-wrap break-words text-sm">
                  Next step: {app.nextStep} · User-provided
                </p>
              )}
              {app.followUps[0] && (
                <p className="text-sm text-warning">
                  Next follow-up: {localDate(app.followUps[0].dueAt)} ·{" "}
                  {app.followUps[0].label}
                </p>
              )}
            </article>
          );
        })}
        {!result.entries.length && (
          <div className="panel empty-state">
            <ClipboardList
              size={28}
              className="text-text-muted"
              aria-hidden="true"
            />
            <p>
              No applications match these filters. Reset your filters or import
              a job to get started.
            </p>
            <Link
              href="/discover"
              className="inline-flex min-h-11 items-center underline"
            >
              Import a job
            </Link>
          </div>
        )}
      </div>
      <nav
        aria-label="Tracker pagination"
        className="mt-4 flex flex-wrap gap-4"
      >
        {result.page > 1 && (
          <Link
            className="inline-flex min-h-11 items-center underline"
            href={pageUrl(result.page - 1)}
          >
            Previous
          </Link>
        )}
        {result.page < result.pages && (
          <Link
            className="inline-flex min-h-11 items-center underline"
            href={pageUrl(result.page + 1)}
          >
            Next
          </Link>
        )}
      </nav>
      <section className="panel mt-4">
        <h2>Export your data</h2>
        <p className="mt-2 text-sm text-text-muted">
          Downloads contain private profile, drafts and history. Resume bytes
          and internal paths are excluded.
        </p>
        <Link
          href="/settings#data-export"
          className="inline-flex min-h-11 items-center underline"
        >
          Export and backup options
        </Link>
      </section>
    </>
  );
}
