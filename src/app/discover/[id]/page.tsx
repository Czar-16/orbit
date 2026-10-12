import type { Metadata } from "next";
import { z } from "zod";
import { notFound } from "next/navigation";
import { requireWorkspace, databaseStatus } from "@/lib/db";
import { Unavailable } from "@/components/unavailable";
import { jobDefaults } from "@/lib/job-query";
import { profileFactsSchema } from "@/lib/profile-schema";
import { jobEvidenceSchema } from "@/lib/job-evidence";
import { matchSkills } from "@/lib/matching";
import { JobCard } from "@/components/job-card";
import { JobImportForm } from "@/components/job-import-form";
import { ProvenanceBadge } from "@/components/provenance-badge";
import { JobRevisionHistory } from "@/components/job-revision-history";
import { RequirementReview } from "@/components/requirement-review";
import { getPreferences } from "@/lib/preference-service";
import {
  weightedMatch,
  weightedJobFromRevision,
} from "@/lib/weighted-matching";
import { analyzeRequirements } from "@/lib/requirement-analysis";
export const metadata: Metadata = { title: "Inspect job" };
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
  const job = await database.job.findFirst({
    where: { workspaceId, id: parsed.data.id },
    include: { latestRevision: true, source: true },
  });
  if (!job || !job.latestRevision) notFound();
  const profile = await database.profileVersion.findFirst({
    where: { workspaceId },
    orderBy: { revision: "desc" },
  });
  const facts = profile ? profileFactsSchema.parse(profile.facts) : null;
  const revision = job.latestRevision;
  const preferences = await getPreferences();
  const evidence = jobEvidenceSchema.parse(revision.provenance);
  const history = await database.jobRevision.findMany({
    where: { workspaceId, jobId: job.id },
    orderBy: { revision: "desc" },
    select: {
      revision: true,
      capturedAt: true,
      method: true,
      schemaVersion: true,
      listingUrl: true,
      sourceSnapshot: true,
    },
  });
  return (
    <>
      <div className="page-heading">
        <h1>Inspect job</h1>
        <p>
          Revision {revision.revision}. Manual apply only; nothing has been
          submitted.
        </p>
      </div>
      <JobCard
        inspect={false}
        entry={{
          job,
          revision,
          evidence,
          match: matchSkills(revision.skills, facts),
          weighted: weightedMatch(
            weightedJobFromRevision(revision),
            facts,
            preferences.values,
          ),
          profileRevision: profile?.revision ?? null,
        }}
      />
      <RequirementReview
        analysis={analyzeRequirements(
          {
            description: revision.description,
            experienceRequirement: revision.experienceRequirement,
          },
          facts,
        )}
      />
      <section className="panel mt-4">
        <h2 className="mb-4 flex flex-wrap items-center gap-2">
          Current supplied description{" "}
          <ProvenanceBadge provenance={evidence.description.provenance} />
        </h2>
        {revision.description ? (
          <p className="max-w-[70ch] whitespace-pre-wrap break-words text-sm">
            {revision.description}
          </p>
        ) : (
          <p className="text-sm text-text-muted">
            Needs your input. Pasting a URL does not fetch its description.
          </p>
        )}
        {job.listingUrl && (
          <p className="mt-4 break-all font-mono text-xs text-text-muted">
            Current listing URL: {job.listingUrl}{" "}
            <ProvenanceBadge provenance={evidence.listingUrl.provenance} />
          </p>
        )}
      </section>
      <section className="panel mt-4">
        <h2 className="mb-4">Edit supplied job details</h2>
        <JobImportForm defaults={jobDefaults(job)} />
      </section>
      <JobRevisionHistory history={history} />
    </>
  );
}
