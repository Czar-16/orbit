import "server-only";
import { createHash } from "node:crypto";
import { requireWorkspace } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";
import {
  jobInputSchema,
  jobBatchSchema,
  uniqueSkills,
  type JobInput,
} from "@/lib/job-input";
import { validateListingUrl, type AddressResolver } from "@/lib/url-validation";
import { jobEvidenceSchema } from "@/lib/job-evidence";
import { providedEvidence, unknownEvidence } from "@/lib/provenance";
import { profileFactsSchema } from "@/lib/profile-schema";
import { matchSkills, MATCH_RULE_VERSION } from "@/lib/matching";
import { InputError } from "@/lib/action-result";
const sha256 = (value: string) =>
  createHash("sha256").update(value).digest("hex");
function identifySource(url: string) {
  const hostname = url ? new URL(url).hostname.toLowerCase() : "";
  if (hostname === "linkedin.com" || hostname.endsWith(".linkedin.com"))
    return { identity: "linkedin", label: "LinkedIn (manual)" };
  if (
    hostname === "indeed.com" ||
    hostname.endsWith(".indeed.com") ||
    /(^|\.)indeed\.[a-z]{2,3}(\.[a-z]{2})?$/.test(hostname)
  )
    return { identity: "indeed", label: "Indeed (manual)" };
  return hostname
    ? { identity: `manual:${hostname}`, label: hostname }
    : { identity: "manual", label: "Manual import" };
}
async function prepare(
  input: JobInput,
  method: "PASTED_URL" | "PASTED_DESCRIPTION" | "IMPORTED_FILE",
  resolver?: AddressResolver,
) {
  const listingUrl = input.listingUrl
    ? await validateListingUrl(input.listingUrl, resolver)
    : null;
  const values = {
    title: input.title || null,
    company: input.company || null,
    location: input.location || null,
    workArrangement: input.workArrangement || null,
    employmentType: input.employmentType || null,
    compensationMin: input.compensationMin || null,
    compensationMax: input.compensationMax || null,
    currency: input.currency || null,
    compensationPeriod: input.compensationPeriod || null,
    experienceRequirement: input.experienceRequirement || null,
    skills: uniqueSkills(input.skills),
    description: input.description || null,
  };
  const provenance = jobEvidenceSchema.parse(
    Object.fromEntries(
      [...Object.entries(values), ["listingUrl", listingUrl]].map(
        ([field, value]) => [
          field,
          value === null || (Array.isArray(value) && !value.length)
            ? unknownEvidence()
            : providedEvidence(`Manual intake: ${field}`),
        ],
      ),
    ),
  );
  return {
    input,
    listingUrl,
    urlHash: listingUrl ? sha256(listingUrl) : null,
    source: identifySource(listingUrl ?? ""),
    values,
    provenance,
    contentHash: sha256(JSON.stringify({ values, listingUrl })),
    method,
  };
}
async function recordMatch(
  tx: Prisma.TransactionClient,
  workspaceId: string,
  revision: { id: string; skills: string[] },
) {
  const profile = await tx.profileVersion.findFirst({
    where: { workspaceId },
    orderBy: { revision: "desc" },
  });
  if (!profile) return;
  const explanation = matchSkills(
    revision.skills,
    profileFactsSchema.parse(profile.facts),
  );
  await tx.matchResult.upsert({
    where: {
      workspaceId_jobRevisionId_profileVersionId_ruleVersion: {
        workspaceId,
        jobRevisionId: revision.id,
        profileVersionId: profile.id,
        ruleVersion: MATCH_RULE_VERSION,
      },
    },
    create: {
      workspaceId,
      jobRevisionId: revision.id,
      profileVersionId: profile.id,
      ruleVersion: MATCH_RULE_VERSION,
      score: explanation.score,
      explanation,
    },
    update: {},
  });
}
export async function importJobs(inputs: unknown, resolver?: AddressResolver) {
  const parsed = jobBatchSchema.safeParse(inputs);
  if (!parsed.success)
    throw new InputError(
      `Check the import file: ${parsed.error.issues[0]?.message ?? "Invalid job list."}`,
    );
  const prepared = await Promise.all(
    parsed.data.map((input) => prepare(input, "IMPORTED_FILE", resolver)),
  );
  const { database, workspaceId } = await requireWorkspace();
  return database.$transaction(
    async (tx) => {
      await tx.$queryRaw`SELECT id FROM "Workspace" WHERE id = ${workspaceId}::uuid FOR UPDATE`;
      let imported = 0;
      let duplicates = 0;
      for (const data of prepared) {
        if (
          data.urlHash &&
          (await tx.job.findUnique({
            where: {
              workspaceId_urlHash: { workspaceId, urlHash: data.urlHash },
            },
          }))
        ) {
          duplicates++;
          continue;
        }
        const source = await tx.source.upsert({
          where: {
            workspaceId_identity: {
              workspaceId,
              identity: data.source.identity,
            },
          },
          create: { workspaceId, ...data.source },
          update: {},
        });
        const job = await tx.job.create({
          data: {
            workspaceId,
            sourceId: source.id,
            listingUrl: data.listingUrl,
            urlHash: data.urlHash,
          },
        });
        const revision = await tx.jobRevision.create({
          data: {
            workspaceId,
            jobId: job.id,
            revision: 1,
            ...data.values,
            provenance: data.provenance,
            contentHash: data.contentHash,
            method: data.method,
          },
        });
        await tx.job.update({
          where: { id: job.id },
          data: { latestRevisionNumber: 1 },
        });
        await recordMatch(tx, workspaceId, revision);
        imported++;
      }
      return { imported, duplicates };
    },
    { timeout: 15000 },
  );
}
export async function saveJob(input: unknown, resolver?: AddressResolver) {
  const parsed = jobInputSchema.safeParse(input);
  if (!parsed.success)
    throw new InputError(
      parsed.error.issues[0]?.message ?? "Check the job fields.",
    );
  const data = await prepare(
    parsed.data,
    parsed.data.listingUrl ? "PASTED_URL" : "PASTED_DESCRIPTION",
    resolver,
  );
  const { database, workspaceId } = await requireWorkspace();
  return database.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "Workspace" WHERE id = ${workspaceId}::uuid FOR UPDATE`;
    const duplicate = data.urlHash
      ? await tx.job.findUnique({
          where: {
            workspaceId_urlHash: { workspaceId, urlHash: data.urlHash },
          },
        })
      : null;
    if (duplicate && duplicate.id !== data.input.jobId) {
      if (data.input.jobId)
        throw new InputError(
          "That listing URL already belongs to another imported job. No jobs were merged.",
        );
      return {
        jobId: duplicate.id,
        duplicate: true,
        revision: duplicate.latestRevisionNumber ?? 1,
      };
    }
    const source = await tx.source.upsert({
      where: {
        workspaceId_identity: { workspaceId, identity: data.source.identity },
      },
      create: { workspaceId, ...data.source },
      update: {},
    });
    const existing = data.input.jobId
      ? await tx.job.findFirst({ where: { workspaceId, id: data.input.jobId } })
      : null;
    if (data.input.jobId && !existing)
      throw new InputError("This job is unavailable in your workspace.");
    if (
      existing &&
      existing.latestRevisionNumber !== data.input.expectedRevision
    )
      throw new InputError(
        "This job changed in another tab. Reload before saving.",
      );
    const job =
      existing ??
      (await tx.job.create({
        data: {
          workspaceId,
          sourceId: source.id,
          listingUrl: data.listingUrl,
          urlHash: data.urlHash,
        },
      }));
    const revision = (existing?.latestRevisionNumber ?? 0) + 1;
    const created = await tx.jobRevision.create({
      data: {
        workspaceId,
        jobId: job.id,
        revision,
        ...data.values,
        provenance: data.provenance,
        contentHash: data.contentHash,
        method: data.method,
      },
    });
    await tx.job.update({
      where: { id: job.id },
      data: {
        sourceId: source.id,
        listingUrl: data.listingUrl,
        urlHash: data.urlHash,
        latestRevisionNumber: revision,
      },
    });
    await recordMatch(tx, workspaceId, created);
    return { jobId: job.id, duplicate: false, revision };
  });
}
export async function setJobState(input: unknown) {
  const { z } = await import("zod");
  const data = z
    .object({
      id: z.uuid(),
      operation: z.enum(["save", "unsave", "dismiss", "restore", "archive"]),
    })
    .strict()
    .safeParse(input);
  if (!data.success) throw new InputError("Invalid job action.");
  const { database, workspaceId } = await requireWorkspace();
  const operation = data.data.operation;
  const update =
    operation === "save"
      ? { savedAt: new Date(), dismissedAt: null, archivedAt: null }
      : operation === "unsave"
        ? { savedAt: null }
        : operation === "dismiss"
          ? { dismissedAt: new Date(), savedAt: null }
          : operation === "archive"
            ? { archivedAt: new Date(), savedAt: null }
            : { dismissedAt: null, archivedAt: null };
  const result = await database.job.updateMany({
    where: { workspaceId, id: data.data.id },
    data: update,
  });
  if (result.count !== 1)
    throw new InputError("This job is unavailable in your workspace.");
}
export async function refreshMatches() {
  const { database, workspaceId } = await requireWorkspace();
  const profile = await database.profileVersion.findFirst({
    where: { workspaceId },
    orderBy: { revision: "desc" },
  });
  if (!profile)
    throw new InputError(
      "Save your verified profile before recording matches.",
    );
  const jobs = await database.job.findMany({
    where: { workspaceId, archivedAt: null },
    orderBy: { discoveredAt: "desc" },
    take: 200,
    include: { latestRevision: true },
  });
  let updated = 0;
  for (const job of jobs) {
    if (job.latestRevision) {
      const explanation = matchSkills(
        job.latestRevision.skills,
        profileFactsSchema.parse(profile.facts),
      );
      await database.matchResult.upsert({
        where: {
          workspaceId_jobRevisionId_profileVersionId_ruleVersion: {
            workspaceId,
            jobRevisionId: job.latestRevision.id,
            profileVersionId: profile.id,
            ruleVersion: MATCH_RULE_VERSION,
          },
        },
        create: {
          workspaceId,
          jobRevisionId: job.latestRevision.id,
          profileVersionId: profile.id,
          ruleVersion: MATCH_RULE_VERSION,
          score: explanation.score,
          explanation,
        },
        update: {},
      });
      updated++;
    }
  }
  return { updated, profileRevision: profile.revision };
}
