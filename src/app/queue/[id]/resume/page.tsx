import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { sourceForDraft } from "@/lib/resume-content-service";
import { sourceContentSchema } from "@/lib/resume-content";
import { profileFactsSchema } from "@/lib/profile-schema";
import { requireWorkspace } from "@/lib/db";
import {
  tailoredContentSchema,
  tailoringCandidates,
} from "@/lib/tailored-resume";
import { TailoredResumeReview } from "@/components/tailored-resume-review";
import { ResumeSourceReview } from "@/components/resume-source-review";
export const dynamic = "force-dynamic";
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ version?: string }>;
}) {
  const parsed = z.object({ id: z.uuid() }).safeParse(await params);
  if (!parsed.success) notFound();
  const { draft, source } = await sourceForDraft(parsed.data.id);
  const content = sourceContentSchema.parse(source.structuredSource);
  const { database, workspaceId } = await requireWorkspace();
  const [latestDraft, history, jobRevision, currentProfile, currentPreference] =
    await Promise.all([
      database.applicationDraft.findFirst({
        where: { workspaceId, jobId: draft.jobId },
        orderBy: { revision: "desc" },
      }),
      database.tailoredResumeVersion.findMany({
        where: { workspaceId, jobId: draft.jobId },
        orderBy: { revision: "desc" },
      }),
      database.jobRevision.findFirstOrThrow({
        where: { workspaceId, id: draft.jobRevisionId },
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
  const requested = (await searchParams).version;
  if (
    requested &&
    (!z.uuid().safeParse(requested).success ||
      !history.some((v) => v.id === requested))
  )
    notFound();
  const version =
    history.find(
      (v) => v.id === (requested ?? draft.tailoredResumeVersionId),
    ) ??
    history[0] ??
    null;
  const editable =
    latestDraft?.id === draft.id &&
    draft.operation !== "discard" &&
    !draft.resume.revokedAt;
  const versionSource = version
    ? await database.resumeContentVersion.findFirstOrThrow({
        where: { workspaceId, id: version.resumeContentVersionId },
      })
    : source;
  const versionProfile = version
    ? await database.profileVersion.findFirstOrThrow({
        where: { workspaceId, id: version.profileVersionId },
      })
    : draft.profile;
  const versionJob = version
    ? await database.jobRevision.findFirstOrThrow({
        where: { workspaceId, id: version.jobRevisionId },
      })
    : jobRevision;
  const comparisonCandidates = tailoringCandidates(
    sourceContentSchema.parse(versionSource.structuredSource),
    profileFactsSchema.parse(versionProfile.facts),
    versionJob.skills,
    versionJob.description,
  );
  const candidates = tailoringCandidates(
    content,
    profileFactsSchema.parse(draft.profile.facts),
    jobRevision.skills,
    jobRevision.description,
  );
  const job = await database.job.findFirstOrThrow({
    where: { workspaceId, id: draft.jobId },
  });
  return (
    <>
      <div className="page-heading">
        <h1>Tailored resume</h1>
        <p>
          Review the source, generate documents, then inspect and approve.
          Nothing is submitted.
        </p>
      </div>
      <Link
        className="inline-flex min-h-11 items-center underline mb-4"
        href={`/queue/${draft.id}`}
      >
        Back to application review
      </Link>
      <div className="grid min-w-0 gap-4 items-start lg:grid-cols-2">
        <section className="panel min-w-0">
          <h2 className="mb-4">Original resume</h2>
          <a
            href={`/api/resumes/${draft.resume.id}`}
            className="inline-flex min-h-11 items-center underline"
            target="_blank"
            rel="noreferrer"
          >
            Open original document
          </a>
          {draft.resume.mimeType === "application/pdf" &&
            !draft.resume.revokedAt && (
              <iframe
                className="w-full h-[36rem] border border-border rounded-xl"
                title="Original uploaded resume PDF"
                src={`/api/resumes/${draft.resume.id}?preview=1`}
              />
            )}
          <pre className="whitespace-pre-wrap break-words font-sans text-sm">
            {content.extractedText ||
              "No text extracted. Compare your manual reconstruction with the original document."}
          </pre>
        </section>
        <section className="panel min-w-0">
          <h2 className="mb-4">
            Source revision {source.revision} ·{" "}
            {source.reviewStatus === "confirmed"
              ? "Reviewed"
              : "Needs your input"}
          </h2>
          {source.reviewStatus === "confirmed" ? (
            <>
              <p>
                The source was reviewed and its facts confirmed. Original bytes
                remain unchanged.
              </p>
              <details className="mt-4">
                <summary className="min-h-11 cursor-pointer">
                  Correct authoritative source (creates a new revision)
                </summary>
                <ResumeSourceReview
                  key={source.id}
                  id={source.id}
                  revision={source.revision}
                  initial={content}
                  editable={editable}
                  facts={profileFactsSchema.parse(draft.profile.facts)}
                />
              </details>
            </>
          ) : (
            <ResumeSourceReview
              key={source.id}
              id={source.id}
              revision={source.revision}
              initial={content}
              editable={editable}
              facts={profileFactsSchema.parse(draft.profile.facts)}
            />
          )}
        </section>
      </div>
      {source.reviewStatus === "confirmed" && (
        <section className="panel mt-4 min-w-0">
          <h2 className="mb-4">Select, compare and approve</h2>
          <TailoredResumeReview
            key={`${source.id}-${version?.id ?? "new"}-${draft.id}`}
            draftId={draft.id}
            draftRevision={draft.revision}
            sourceId={source.id}
            sourceRevision={source.revision}
            candidates={candidates}
            comparisonCandidates={comparisonCandidates}
            expectedTailoredRevision={history[0]?.revision ?? 0}
            version={
              version
                ? {
                    id: version.id,
                    revision: version.revision,
                    contentHash: version.contentHash,
                    approved: !!version.approvedAt,
                    content: tailoredContentSchema.parse(version.content),
                    stale:
                      version.revision !== history[0]?.revision ||
                      version.resumeContentVersionId !== source.id ||
                      version.jobRevisionId !== draft.jobRevisionId ||
                      version.profileVersionId !== currentProfile?.id ||
                      version.preferenceVersionId !== currentPreference?.id ||
                      job.latestRevisionNumber !== versionJob.revision,
                  }
                : null
            }
            editable={editable}
            selectedId={draft.tailoredResumeVersionId}
          />
          <details className="mt-4">
            <summary className="min-h-11 cursor-pointer">
              Tailored document history
            </summary>
            <ul>
              {history.map((v) => (
                <li key={v.id}>
                  <Link
                    className="inline-flex min-h-11 items-center underline"
                    href={`/queue/${draft.id}/resume?version=${v.id}`}
                  >
                    Revision {v.revision} ·{" "}
                    {v.approvedAt ? "Approved" : "Unapproved"}
                    {v.id === draft.tailoredResumeVersionId
                      ? " · Selected"
                      : ""}
                  </Link>
                </li>
              ))}
            </ul>
          </details>
        </section>
      )}
    </>
  );
}
