import Link from "next/link";
import { ArrowRight, ShieldCheck, Database, Activity, Search, Clock3 } from "lucide-react";
import { databaseStatus, requireWorkspace } from "@/lib/db";
import { todayInterval } from "@/lib/time";
import { queryJobs } from "@/lib/job-query";
import { defaultFilters } from "@/lib/job-filters";
import { JobCard } from "@/components/job-card";
import { trackingMetrics } from "@/lib/tracker-query";
import { ApplicationStatusBadge } from "@/components/application-status";
export const dynamic = "force-dynamic";
export default async function Dashboard() {
  const status = await databaseStatus();
  let importedToday: number | null = null;
  let savedJobs: number | null = null;
  let preparedCount: number | null = null;
  let tracking: Awaited<ReturnType<typeof trackingMetrics>> | null = null;
  if (status.state === "ready") {
    try {
      const { database, workspaceId } = await requireWorkspace();
      const day = todayInterval();
      [importedToday, savedJobs, preparedCount, tracking] = await Promise.all([
        database.job.count({
          where: { workspaceId, discoveredAt: { gte: day.start, lt: day.end } },
        }),
        database.job.count({
          where: {
            workspaceId,
            savedAt: { not: null },
            archivedAt: null,
            dismissedAt: null,
          },
        }),
        database.applicationDraft.count({
          where: { workspaceId, operation: "prepare" },
        }),
        trackingMetrics(),
      ]);
    } catch {
      importedToday = null;
      savedJobs = null;
      preparedCount = null;
      tracking = null;
    }
  }
  const best =
    status.state === "ready"
      ? await queryJobs({
          ...defaultFilters,
          sort: "score",
          from: new Intl.DateTimeFormat("en-CA", {
            timeZone: "Asia/Kolkata",
          }).format(new Date()),
        })
      : null;
  const metrics = [
    {
      label: "Jobs imported today",
      value: importedToday,
      caption: "Manual/API intake recorded today in Asia/Kolkata.",
    },
    {
      label: "Saved jobs",
      value: savedJobs,
      caption: "Active jobs you saved for later.",
    },
    {
      label: "Applications prepared",
      value: preparedCount,
      caption:
        "Preparation events; includes preparing again after discard. No submissions.",
    },
    {
      label: "Applications confirmed",
      value: tracking?.applied ?? null,
      caption:
        "Manually confirmed submissions, including later statuses and archive.",
    },
    {
      label: "Relevant jobs today",
      value: tracking?.relevantToday ?? null,
      caption: "Recorded relevant intake in Asia/Kolkata.",
    },
    {
      label: "Awaiting review",
      value: tracking?.review ?? null,
      caption: "Applications currently marked Needs review.",
    },
    {
      label: "Active drafts",
      value: tracking?.prepared ?? null,
      caption: "Unique jobs whose latest draft has not been discarded.",
    },
    {
      label: "Current interviews",
      value: tracking?.interviews ?? null,
      caption: "Current Interview status.",
    },
    {
      label: "Current rejections",
      value: tracking?.rejections ?? null,
      caption: "Current Rejected status.",
    },
    {
      label: "Overdue follow-ups",
      value: tracking?.overdue ?? null,
      caption: "Pending follow-ups before today in Asia/Kolkata.",
    },
    {
      label: "Upcoming follow-ups",
      value: tracking?.upcoming ?? null,
      caption: "Pending follow-ups from today through the next six days.",
    },
  ];
  return (
    <>
      <div className="page-heading">
        <h1>Dashboard</h1>
        <p>Your application workspace, at a glance.</p>
      </div>
      <div className="setup-banner">
        <Database size={20} aria-hidden="true" />
        <div>
          <h2>
            {status.state === "ready" ? "Local workspace ready" : status.label}
          </h2>
          <p>
            {status.detail} Application preparation is available; submission is
            manual.
          </p>
        </div>
        <Link
          href="/settings"
          className="inline-flex min-h-11 shrink-0 items-center text-sm underline underline-offset-4"
        >
          Setup status
        </Link>
      </div>
      <section aria-label="Dashboard metrics" className="metrics">
        {metrics.map((metric) => (
          <article className="panel metric" key={metric.label}>
            <h2>{metric.label}</h2>
            <p className="metric-value">{metric.value ?? "Unavailable"}</p>
            <p className="text-xs text-text-muted">
              {metric.value === null
                ? "Requires a successful database query."
                : metric.caption}
            </p>
          </article>
        ))}
      </section>
      {best && (
        <section className="mb-4">
          <h2 className="mb-4">Today’s best matches</h2>
          {best.entries.length ? (
            <div className="space-y-4">
              {best.entries.slice(0, 10).map((entry) => (
                <JobCard key={entry.job.id} entry={entry} />
              ))}
            </div>
          ) : (
            <p className="panel text-text-muted">
              No jobs imported today. Run permitted discovery or import a job.
            </p>
          )}
        </section>
      )}
      <div className="dashboard-grid">
        <section className="panel activity-panel" aria-labelledby="recent-activity-heading">
          <div className="activity-heading">
            <span className="activity-heading-icon"><Activity size={20} aria-hidden="true" /></span>
            <div>
              <h2 id="recent-activity-heading">Recent activity</h2>
              <p className="activity-caption">Application updates and discovery runs.</p>
            </div>
          </div>
          {!tracking ? (
            <p className="activity-empty">
              Activity unavailable. Requires a successful database query.
            </p>
          ) : (
            <>
              {!tracking.events.length && (
                <p className="activity-empty">No tracking events recorded.</p>
              )}
              <ul className="activity-feed" aria-label="Application updates">
                {tracking.events.map((event) => (
                  <li key={event.id} className="activity-item">
                    <span className="activity-marker" aria-hidden="true"><Activity size={16} /></span>
                    <article className="activity-entry">
                      <div className="activity-title-row">
                        <Link href={`/tracker/${event.applicationId}`} className="activity-job-link">
                          <span>{event.application.job.latestRevision?.title ?? "Unknown role"}</span>
                          <ArrowRight size={16} aria-hidden="true" />
                        </Link>
                        {event.newStatus && <ApplicationStatusBadge status={event.newStatus} />}
                      </div>
                      <p className="activity-description">
                        {event.kind.replaceAll("-", " ")} · {event.origin}
                      </p>
                      <time className="activity-time" dateTime={event.recordedAt.toISOString()}>
                        <Clock3 size={14} aria-hidden="true" />
                        {event.recordedAt.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })} Asia/Kolkata
                      </time>
                    </article>
                  </li>
                ))}
              </ul>
              <div className="activity-discovery">
                <h3><Search size={18} aria-hidden="true" />Recent discovery runs</h3>
                {!tracking.runs.length && <p className="activity-caption">No discovery runs recorded.</p>}
                <ul className="activity-run-list" aria-label="Recent discovery runs">
                  {tracking.runs.map((run) => (
                    <li key={run.id} className="activity-run">
                      <div className="activity-run-heading">
                        <span className="font-bold">{run.source.label}</span>
                        <span className="activity-run-state">{run.state}</span>
                      </div>
                      <p className="activity-caption">{run.day}</p>
                      <p className="activity-run-counts">
                        <span>Fetched <strong>{run.fetched}</strong></span>
                        <span>Imported <strong>{run.imported}</strong></span>
                        <span>Duplicates <strong>{run.duplicates}</strong></span>
                      </p>
                      {run.error && <p className="activity-run-error">{run.error}</p>}
                    </li>
                  ))}
                </ul>
              </div>
            </>
          )}
          <div className="activity-footer">
            <Link href="/tracker" className="activity-tracker-link">
              Open application tracker <ArrowRight size={16} aria-hidden="true" />
            </Link>
          </div>
        </section>
        <section className="panel">
          <h2 className="mb-4 flex items-center gap-2">
            <ShieldCheck size={18} aria-hidden="true" />
            You stay in control
          </h2>
          <div className="space-y-4 text-sm text-text-muted">
            <p>
              LinkedIn and Indeed jobs are added manually, by pasting a link or
              description or importing your own list. No listing pages are
              fetched.
            </p>
            <p>
              Preparing an application never submits it. Applied status requires
              your confirmation or a trustworthy authorized integration result.
            </p>
            <p>
              Matching compares supplied job requirements with verified profile
              skills. It works without an AI key and does not confirm employer
              claims.
            </p>
          </div>
          <Link
            href="/discover"
            className="mt-6 inline-flex min-h-11 items-center gap-2 text-sm underline underline-offset-4"
          >
            Import and review jobs
            <ArrowRight size={15} aria-hidden="true" />
          </Link>
        </section>
      </div>
    </>
  );
}
