import Link from "next/link";
import { ArrowRight, ShieldCheck, Database } from "lucide-react";
import { databaseStatus, requireWorkspace } from "@/lib/db";
import { todayInterval } from "@/lib/time";
import { queryJobs } from "@/lib/job-query";
import { defaultFilters } from "@/lib/job-filters";
import { JobCard } from "@/components/job-card";
import { Unavailable } from "@/components/unavailable";
export const dynamic = "force-dynamic";
export default async function Dashboard() {
  const status = await databaseStatus();
  let importedToday: number | null = null;
  let savedJobs: number | null = null;
  let preparedCount: number | null = null;
  if (status.state === "ready") {
    try {
      const { database, workspaceId } = await requireWorkspace();
      const day = todayInterval();
      [importedToday, savedJobs, preparedCount] = await Promise.all([
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
      ]);
    } catch {
      importedToday = null;
      savedJobs = null;
      preparedCount = null;
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
      value: null,
      caption: "Application tracking is enabled in a later phase.",
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
              {(metric.value === null && metric.label.startsWith("Jobs")) ||
              (metric.value === null && metric.label === "Saved jobs")
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
        <Unavailable
          title="Submission tracking is not enabled yet"
          description="Review prepared materials in Application queue. Application status and follow-ups arrive in Phase 7."
          phase="Application workflows"
        />
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
