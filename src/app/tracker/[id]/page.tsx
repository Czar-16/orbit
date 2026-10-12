import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { requireWorkspace } from "@/lib/db";
import { localDate } from "@/lib/time";
import { ApplicationStatusBadge } from "@/components/application-status";
import { TrackingControls } from "@/components/tracking-controls";
import { ProvenanceBadge } from "@/components/provenance-badge";
import { jobEvidenceSchema } from "@/lib/job-evidence";
export const dynamic = "force-dynamic";
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const parsed = z.object({ id: z.uuid() }).safeParse(await params);
  if (!parsed.success) notFound();
  const pageInput = z
    .object({
      page: z
        .string()
        .regex(/^[1-9]\d{0,4}$/)
        .default("1"),
    })
    .strict()
    .safeParse(await searchParams);
  if (!pageInput.success)
    return (
      <p className="panel">
        Check the history page number.{" "}
        <Link href={`/tracker/${parsed.data.id}`} className="underline">
          Reset history
        </Link>
      </p>
    );
  const { database, workspaceId } = await requireWorkspace();
  const app = await database.application.findFirst({
    where: { workspaceId, id: parsed.data.id },
    include: {
      job: { include: { latestRevision: true, source: true } },
      selectedDraft: true,
      followUps: { orderBy: [{ dueAt: "asc" }, { id: "asc" }] },
    },
  });
  if (!app) notFound();
  const count = await database.applicationEvent.count({
    where: { workspaceId, applicationId: app.id },
  });
  const pages = Math.max(1, Math.ceil(count / 50));
  const page = Math.min(Number(pageInput.data.page), pages);
  const events = await database.applicationEvent.findMany({
    where: { workspaceId, applicationId: app.id },
    orderBy: { sequence: "desc" },
    skip: (page - 1) * 50,
    take: 50,
  });
  const job = app.job.latestRevision;
  const evidence = job ? jobEvidenceSchema.parse(job.provenance) : null;
  return (
    <>
      <div className="page-heading [overflow-wrap:anywhere]">
        <h1>{job?.title ?? "Unknown role"}</h1>
        <p>{job?.company ?? "Unknown company"}</p>
      </div>
      <section className="panel mb-4 space-y-3 [overflow-wrap:anywhere]">
        <ApplicationStatusBadge status={app.status} />
        {app.status === "READY_TO_APPLY" &&
          !app.selectedDraft?.tailoredResumeVersionId && (
            <p className="text-warning">
              This historical ready record needs tailored-resume review.
              Generate, inspect, approve and select a resume before finalizing
              readiness again. Historical submission evidence is preserved.
            </p>
          )}
        <p className="flex flex-wrap gap-2 text-sm">
          Company{" "}
          <ProvenanceBadge
            provenance={evidence?.company.provenance ?? "unknown"}
          />
          Role{" "}
          <ProvenanceBadge
            provenance={evidence?.title.provenance ?? "unknown"}
          />
          Source: {app.job.source.label}
        </p>
        <p className="text-sm">
          Applied: {app.appliedAt ? localDate(app.appliedAt) : "Not confirmed"}{" "}
          <ProvenanceBadge
            provenance={app.appliedAt ? "user-provided" : "unknown"}
          />
        </p>
        {app.confirmedAt && (
          <p className="field-hint">
            Manually confirmed at {app.confirmedAt.toISOString()}; this records
            your report of submission.
          </p>
        )}
        {app.previousStatus && (
          <p className="field-hint">
            Status before archive:{" "}
            {app.previousStatus.replaceAll("_", " ").toLowerCase()}
          </p>
        )}
        <p className="field-hint">
          Job visibility:{" "}
          {app.job.archivedAt
            ? "Archived"
            : app.job.dismissedAt
              ? "Dismissed"
              : "Active"}
          . Tracking status is stored separately.
        </p>
        <div className="flex flex-wrap gap-4">
          <Link
            href={`/discover/${app.jobId}`}
            className="inline-flex min-h-11 items-center underline"
          >
            Inspect current job
          </Link>
          {app.selectedDraftId && (
            <Link
              href={`/queue/${app.selectedDraftId}`}
              className="inline-flex min-h-11 items-center underline"
            >
              Review selected draft revision {app.selectedDraft?.revision}
            </Link>
          )}
          {app.job.listingUrl && (
            <a
              href={app.job.listingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 items-center underline"
            >
              Open original listing
            </a>
          )}
          <Link
            href="/tracker"
            className="inline-flex min-h-11 items-center underline"
          >
            Back to tracker
          </Link>
        </div>
      </section>
      <div className="dashboard-grid">
        <TrackingControls
          key={app.revision}
          id={app.id}
          revision={app.revision}
          status={app.status}
          nextStep={app.nextStep ?? ""}
          today={localDate()}
          followUps={app.followUps.map((f) => ({
            id: f.id,
            revision: f.revision,
            label: f.label,
            date: localDate(f.dueAt),
            state: f.completedAt
              ? "Completed"
              : f.cancelledAt
                ? "Cancelled"
                : "Pending",
          }))}
        />
        <section className="panel space-y-4 min-w-0">
          <h2>Immutable event history</h2>
          <p className="field-hint">
            Page {page} of {pages}. Migration baselines describe observed state
            only. Notes and status reports are user-provided.
          </p>
          {events.map((event) => (
            <article key={event.id} className="border-b border-border pb-4">
              <h3 className="text-sm">
                #{event.sequence} · {event.kind.replaceAll("-", " ")}
              </h3>
              <p className="field-hint">
                {event.recordedAt.toLocaleString("en-IN", {
                  timeZone: "Asia/Kolkata",
                })}{" "}
                Asia/Kolkata · {event.origin}
              </p>
              <p className="field-hint">
                Occurred:{" "}
                {event.occurredAt.toLocaleString("en-IN", {
                  timeZone: "Asia/Kolkata",
                })}{" "}
                Asia/Kolkata
              </p>
              {event.note && (
                <p className="whitespace-pre-wrap break-words text-sm">
                  {event.note}
                </p>
              )}
              {event.newStatus && (
                <ApplicationStatusBadge status={event.newStatus} />
              )}
              <details className="mt-2">
                <summary className="cursor-pointer text-sm">
                  Saved details
                </summary>
                <pre className="mt-2 whitespace-pre-wrap break-all text-sm text-text-muted">
                  {JSON.stringify(event.details, null, 2)}
                </pre>
              </details>
            </article>
          ))}
          <nav className="flex gap-4" aria-label="History pagination">
            {page > 1 && (
              <Link
                href={`?page=${page - 1}`}
                className="inline-flex min-h-11 items-center underline"
              >
                Newer events
              </Link>
            )}
            {page < pages && (
              <Link
                href={`?page=${page + 1}`}
                className="inline-flex min-h-11 items-center underline"
              >
                Older events
              </Link>
            )}
          </nav>
        </section>
      </div>
      <p className="sticky bottom-20 z-10 mt-4 border border-border bg-surface p-3 text-sm lg:bottom-0">
        Nothing is submitted by tracking actions. You submit on the employer’s
        site yourself.
      </p>
    </>
  );
}
