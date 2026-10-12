import "server-only";
import { requireWorkspace } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";
import { type JobFilters } from "@/lib/job-filters";
import { profileFactsSchema } from "@/lib/profile-schema";
import { jobEvidenceSchema } from "@/lib/job-evidence";
import { matchSkills } from "@/lib/matching";
import { jobInputSchema } from "@/lib/job-input";
export type JobWithRevision = Prisma.JobGetPayload<{
  include: { latestRevision: true; source: true };
}>;
export function jobDefaults(job: JobWithRevision) {
  const revision = job.latestRevision;
  return jobInputSchema.parse({
    jobId: job.id,
    expectedRevision: job.latestRevisionNumber ?? 1,
    listingUrl: job.listingUrl ?? "",
    title: revision?.title ?? "",
    company: revision?.company ?? "",
    location: revision?.location ?? "",
    description: revision?.description ?? "",
    workArrangement: revision?.workArrangement ?? "",
    employmentType: revision?.employmentType ?? "",
    compensationMin: revision?.compensationMin?.toString() ?? "",
    compensationMax: revision?.compensationMax?.toString() ?? "",
    currency: revision?.currency ?? "",
    compensationPeriod: revision?.compensationPeriod ?? "",
    experienceRequirement: revision?.experienceRequirement ?? "",
    // Do not expand a valid near-limit input when reconstructing the editor.
    skills: revision?.skills.join(",") ?? "",
  });
}
export async function queryJobs(filters: JobFilters, savedOnly = false) {
  const { database, workspaceId } = await requireWorkspace();
  const profile = await database.profileVersion.findFirst({
    where: { workspaceId },
    orderBy: { revision: "desc" },
  });
  const facts = profile ? profileFactsSchema.parse(profile.facts) : null;
  const where: Prisma.JobWhereInput = {
    workspaceId,
    ...(savedOnly
      ? { savedAt: { not: null }, archivedAt: null, dismissedAt: null }
      : {}),
    ...(filters.status === "active"
      ? { archivedAt: null, dismissedAt: null }
      : filters.status === "saved"
        ? { savedAt: { not: null }, archivedAt: null, dismissedAt: null }
        : filters.status === "dismissed"
          ? { dismissedAt: { not: null } }
          : filters.status === "archived"
            ? { archivedAt: { not: null } }
            : {}),
    ...(filters.source
      ? { source: { label: { contains: filters.source, mode: "insensitive" } } }
      : {}),
    ...(filters.from || filters.to
      ? {
          discoveredAt: {
            ...(filters.from
              ? { gte: new Date(`${filters.from}T00:00:00+05:30`) }
              : {}),
            ...(filters.to
              ? {
                  lt: new Date(
                    new Date(`${filters.to}T00:00:00+05:30`).getTime() +
                      86400000,
                  ),
                }
              : {}),
          },
        }
      : {}),
    latestRevision: {
      is: {
        ...(filters.role
          ? { title: { contains: filters.role, mode: "insensitive" } }
          : {}),
        ...(filters.company
          ? { company: { contains: filters.company, mode: "insensitive" } }
          : {}),
        ...(filters.location
          ? { location: { contains: filters.location, mode: "insensitive" } }
          : {}),
      },
    },
  };
  const jobs = await database.job.findMany({
    where,
    orderBy: [{ discoveredAt: "desc" }, { id: "asc" }],
    take: 1001,
    include: { latestRevision: true, source: true },
  });
  const bounded = jobs.slice(0, 1000).flatMap((job) => {
    const revision = job.latestRevision;
    if (!revision) return [];
    const match = matchSkills(revision.skills, facts);
    return [
      {
        job,
        revision,
        evidence: jobEvidenceSchema.parse(revision.provenance),
        match,
        profileRevision: profile?.revision ?? null,
      },
    ];
  });
  const filtered = bounded.filter(
    (entry) =>
      !(filters.minScore || filters.maxScore) ||
      (entry.match.score !== null &&
        (!filters.minScore || entry.match.score >= Number(filters.minScore)) &&
        (!filters.maxScore || entry.match.score <= Number(filters.maxScore))),
  );
  filtered.sort((a, b) =>
    filters.sort === "score"
      ? (b.match.score ?? -1) - (a.match.score ?? -1)
      : filters.sort === "company"
        ? (a.revision.company ?? "").localeCompare(b.revision.company ?? "")
        : filters.sort === "oldest"
          ? a.job.discoveredAt.getTime() - b.job.discoveredAt.getTime()
          : b.job.discoveredAt.getTime() - a.job.discoveredAt.getTime(),
  );
  const pages = Math.max(1, Math.ceil(filtered.length / 20));
  const page = Math.min(Number(filters.page), pages);
  return {
    entries: filtered.slice((page - 1) * 20, page * 20),
    total: filtered.length,
    pages,
    page,
    truncated: jobs.length > 1000,
    profileRevision: profile?.revision ?? null,
  };
}
export type JobEntry = Awaited<ReturnType<typeof queryJobs>>["entries"][number];
