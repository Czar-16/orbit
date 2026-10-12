import type { Metadata } from "next";
import Link from "next/link";
import { z } from "zod";
import { notFound } from "next/navigation";
import { databaseStatus, requireWorkspace } from "@/lib/db";
import { weightedExplanationSchema } from "@/lib/weighted-matching";
import { draftContentSchema } from "@/lib/preparation";
import { validateEnvironment } from "@/lib/env";
import { readListingHistory } from "@/lib/job-history";
import { jobEvidenceSchema } from "@/lib/job-evidence";
import { DraftReview } from "@/components/draft-review";
import { PrepareButton } from "@/components/prepare-button";
import { Unavailable } from "@/components/unavailable";
import { ProvenanceBadge } from "@/components/provenance-badge";
import { Button } from "@/components/ui/button";
export const metadata: Metadata = { title: "Review application" };
export const dynamic = "force-dynamic";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const parsed = z.object({ id: z.uuid() }).safeParse(await params);
  if (!parsed.success) notFound();
  const status = await databaseStatus();
  if (status.state !== "ready")
    return (
      <Unavailable
        title="Database unavailable"
        description={status.detail}
        phase="Local database setup"
      />
    );
  const { database, workspaceId } = await requireWorkspace();
  const draft = await database.applicationDraft.findFirst({
    where: { workspaceId, id: parsed.data.id },
    include: {
      jobRevision: true,
      resume: true,
      profile: true,
      preference: true,
      job: true,
    },
  });
  if (!draft) notFound();
  const [history, resumes, currentProfile, currentPreference] =
    await Promise.all([
      database.applicationDraft.findMany({
        where: { workspaceId, jobId: draft.jobId },
        orderBy: { revision: "desc" },
        select: { id: true, revision: true, operation: true, createdAt: true },
      }),
      database.resumeVersion.findMany({
        where: { workspaceId, revokedAt: null },
        orderBy: { createdAt: "desc" },
        select: { id: true, filename: true, roleCategory: true },
      }),
      database.profileVersion.findFirst({
        where: { workspaceId },
        orderBy: { revision: "desc" },
        select: { id: true },
      }),
      database.preferenceVersion.findFirst({
        where: { workspaceId },
        orderBy: { revision: "desc" },
        select: { id: true },
      }),
    ]);
  const content = draftContentSchema.parse(draft.content);
  const listingHistory = readListingHistory(draft.jobRevision);
  const savedMatch = weightedExplanationSchema.parse(
    JSON.parse(content.matchSummary),
  );
  const evidence = jobEvidenceSchema.parse(draft.jobRevision.provenance);
  const env = validateEnvironment(process.env);
  const editable = history[0]?.id === draft.id && draft.operation !== "discard";
  const stale =
    draft.job.latestRevisionNumber !== draft.jobRevision.revision ||
    currentProfile?.id !== draft.profileVersionId ||
    currentPreference?.id !== draft.preferenceVersionId;
  return (
    <>
      <div className="page-heading">
        <h1>Review application</h1>
        <p>
          Draft revision {draft.revision} · {draft.operation}. Nothing has been
          submitted. You submit on the employer&apos;s site yourself.
        </p>
      </div>
      <p className="panel sticky top-14 z-20 mb-4 text-sm">
        Nothing has been submitted. You submit on the employer&apos;s site
        yourself.
      </p>
      {!editable && (
        <section className="panel mb-4">
          <p className="text-warning">
            {draft.operation === "discard"
              ? "Discarded. History preserved."
              : "Historical revision. Open the latest revision to edit."}
          </p>
          {history[0]?.id !== draft.id && (
            <Link
              className="inline-flex min-h-11 items-center underline"
              href={`/queue/${history[0].id}`}
            >
              Open latest revision
            </Link>
          )}
          {draft.operation === "discard" && (
            <PrepareButton jobId={draft.jobId} />
          )}
        </section>
      )}
      {stale && (
        <p className="mb-4 text-warning">
          Job, profile or preferences have newer versions. This draft preserves
          its original facts; regenerate to use current versions.
        </p>
      )}
      <div className="grid min-w-0 items-start gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <DraftReview
          key={draft.id}
          id={draft.id}
          jobId={draft.jobId}
          revision={draft.revision}
          content={content}
          editable={editable}
          resumes={resumes}
          selectedResume={draft.resumeVersionId}
          providers={{
            openai:
              !!env.OPENAI_API_KEY &&
              !!env.OPENAI_MODEL &&
              env.ORBIT_ALLOW_PAID_AI === "true",
            ollama: !!env.OLLAMA_MODEL,
          }}
        />
        <aside className="panel min-w-0 lg:sticky lg:top-20">
          <h2 className="mb-4">Application context</h2>
          <dl className="space-y-4 text-sm">
            <div>
              <dt className="text-text-muted">Role</dt>
              <dd className="break-words">
                {draft.jobRevision.title ?? "Needs your input"}{" "}
                <ProvenanceBadge provenance={evidence.title.provenance} />
              </dd>
            </div>
            <div>
              <dt className="text-text-muted">Company</dt>
              <dd className="break-words">
                {draft.jobRevision.company ?? "Needs your input"}{" "}
                <ProvenanceBadge provenance={evidence.company.provenance} />
              </dd>
            </div>
            <div>
              <dt className="text-text-muted">Selected resume</dt>
              <dd className="break-words">
                {draft.resume.filename}{" "}
                <ProvenanceBadge provenance="user-provided" />
              </dd>
              <dd className="mt-1 break-all font-mono text-xs">
                Version {draft.resume.id}
              </dd>
              <dd>
                <a
                  className="inline-flex min-h-11 items-center underline"
                  href={`/api/resumes/${draft.resume.id}`}
                  download
                >
                  Download original resume
                </a>
              </dd>
            </div>
            <div>
              <dt className="text-text-muted">Fact snapshots</dt>
              <dd>
                Profile revision {draft.profile.revision} · Preferences revision{" "}
                {draft.preference.revision} · Job revision{" "}
                {draft.jobRevision.revision}
              </dd>
            </div>
          </dl>
          <details className="mt-4">
            <summary className="min-h-11 cursor-pointer text-sm">
              Saved match explanation <ProvenanceBadge provenance="inferred" />
            </summary>
            <p className="text-sm">
              {savedMatch.score ?? "Unavailable"} confirmed points / 100 ·{" "}
              {savedMatch.evaluatedWeight} weight evaluated · possible upper
              bound {savedMatch.upperBound}. Prioritization aid, not a
              guarantee.
            </p>
            <ul className="mt-3 space-y-3 text-sm">
              {savedMatch.categories.map((c) => (
                <li key={c.category}>
                  {c.category}: {Math.round(c.points * 10) / 10}/{c.weight} ·{" "}
                  {c.status}
                  <p className="text-xs text-text-muted">{c.explanation}</p>
                </li>
              ))}
            </ul>
            {savedMatch.flags.map((f, i) => (
              <p className="mt-3 text-sm text-warning" key={i}>
                {f.explanation}
              </p>
            ))}
          </details>
          <p className="mt-4 text-sm">
            Source:{" "}
            {listingHistory?.source.label ?? "Unknown historical source"}{" "}
            <ProvenanceBadge
              provenance={
                listingHistory?.source.evidence.provenance ?? "unknown"
              }
            />
          </p>
          <h3 className="mt-4 text-sm font-semibold">Missing information</h3>
          <ul className="mt-2 list-inside list-disc space-y-2 text-sm text-warning">
            {content.unresolved.map((u, i) => (
              <li key={i}>{u} · Needs your input</li>
            ))}
          </ul>
          <p className="mt-4 text-sm text-text-muted">
            Manual apply only. No authorized submission integration is
            available. Preparing, saving, or opening a link never marks Applied.
          </p>
          {draft.jobRevision.listingUrl && (
            <Button asChild className="mt-4" variant="secondary">
              <a
                className="max-w-full"
                href={draft.jobRevision.listingUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                Open original listing
              </a>
            </Button>
          )}
          <p className="mt-2 break-all text-xs text-text-muted">
            {draft.jobRevision.listingUrl ?? "Source URL needs your input"}{" "}
            <ProvenanceBadge provenance={evidence.listingUrl.provenance} />
          </p>
          <div
            className="mt-4"
            title="No authorized submission integration exists. Open the original listing and submit manually."
          >
            <Button disabled variant="secondary">
              Authorized submission unavailable
            </Button>
          </div>
          <h3 className="mt-4 text-sm font-semibold">Revision history</h3>
          <ul className="text-sm">
            {history.map((h) => (
              <li key={h.id}>
                <Link
                  className="inline-flex min-h-11 items-center underline"
                  href={`/queue/${h.id}`}
                >
                  Revision {h.revision} · {h.operation}
                </Link>
              </li>
            ))}
          </ul>
        </aside>
      </div>
    </>
  );
}
