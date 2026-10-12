import "server-only";
import { createHash } from "node:crypto";
import { requireWorkspace } from "@/lib/db";
import type { JobRevision } from "@/generated/prisma/client";
import {
  weightedMatch,
  weightedJobFromRevision,
  WEIGHTED_RULE_VERSION,
} from "@/lib/weighted-matching";
import { preferenceSchema } from "@/lib/preferences";
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
import { todayInterval } from "@/lib/time";
import { defaultPreferences } from "@/lib/preferences";
import { InputError } from "@/lib/action-result";
import { sourceSnapshotSchema, captureManualSource } from "@/lib/job-history";
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
  revision: JobRevision,
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
  const preferences = await tx.preferenceVersion.findFirst({
    where: { workspaceId },
    orderBy: { revision: "desc" },
  });
  if (preferences) {
    const weighted = weightedMatch(
      weightedJobFromRevision(revision),
      profileFactsSchema.parse(profile.facts),
      preferenceSchema.parse(preferences.values),
    );
    await tx.weightedMatch.upsert({
      where: {
        workspaceId_jobRevisionId_profileVersionId_preferenceVersionId_ruleVersion:
          {
            workspaceId,
            jobRevisionId: revision.id,
            profileVersionId: profile.id,
            preferenceVersionId: preferences.id,
            ruleVersion: WEIGHTED_RULE_VERSION,
          },
      },
      create: {
        workspaceId,
        jobRevisionId: revision.id,
        profileVersionId: profile.id,
        preferenceVersionId: preferences.id,
        ruleVersion: WEIGHTED_RULE_VERSION,
        score: weighted.score,
        explanation: weighted,
      },
      update: {},
    });
  }
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
export async function importJobs(
  inputs: unknown,
  resolver?: AddressResolver,
  permitted?: {
    identity: string;
    label: string;
    provider: "himalayas" | "remotive" | "jobicy" | "remoteok";
  },
) {
  const parsed = jobBatchSchema.safeParse(inputs);
  if (!parsed.success)
    throw new InputError(
      `Check the import file: ${parsed.error.issues[0]?.message ?? "Invalid job list."}`,
    );
  const prepared = await Promise.all(
    parsed.data.map((input) => prepare(input, "IMPORTED_FILE", resolver)),
  );
  if (permitted) {
    sourceSnapshotSchema.parse({
      identity: permitted.identity,
      label: permitted.label,
      kind: "OFFICIAL_API",
      evidence: {
        provenance: "inferred",
        basis: "official",
        locator: "Permitted public API",
        confirmedAt: null,
        confirmedBy: null,
      },
    });
    for (const data of prepared) {
      data.listingUrl = data.input.listingUrl;
      data.urlHash = sha256(data.input.listingUrl);
      data.source = { identity: permitted.identity, label: permitted.label };
      for (const key of Object.keys(
        data.provenance,
      ) as (keyof typeof data.provenance)[]) {
        if (data.provenance[key].provenance !== "unknown")
          data.provenance[key] = {
            provenance: "inferred",
            basis: "official",
            locator: `${permitted.provider} public API: ${key}`,
            confirmedAt: null,
            confirmedBy: null,
          };
      }
    }
  }
  const { database, workspaceId } = await requireWorkspace();
  return database.$transaction(
    async (tx) => {
      await tx.$queryRaw`SELECT id FROM "Workspace" WHERE id = ${workspaceId}::uuid FOR UPDATE`;
      const prefsRecord = await tx.preferenceVersion.findFirst({
        where: { workspaceId },
        orderBy: { revision: "desc" },
      });
      const prefs = prefsRecord
        ? preferenceSchema.parse(prefsRecord.values)
        : defaultPreferences;
      const day = todayInterval();
      let relevantCount = await tx.job.count({
        where: {
          workspaceId,
          processedRelevant: true,
          discoveredAt: { gte: day.start, lt: day.end },
        },
      });
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
        const relevant =
          !!permitted ||
          (!!data.values.title &&
            (!prefs.roles.length ||
              prefs.roles.some((r) =>
                data.values.title?.toLowerCase().includes(r.toLowerCase()),
              )));
        if (relevant && relevantCount >= prefs.dailyLimit) {
          if (permitted) break;
          throw new InputError(
            "Daily relevant-job limit reached (Asia/Kolkata). No batch jobs were imported.",
          );
        }
        const source = await tx.source.upsert({
          where: {
            workspaceId_identity: {
              workspaceId,
              identity: data.source.identity,
            },
          },
          create: {
            workspaceId,
            ...data.source,
            ...(permitted
              ? {
                  kind: "OFFICIAL_API",
                  provider: permitted.provider,
                  decision: "ALLOWED",
                  enabled: true,
                }
              : {}),
          },
          update: {},
        });
        const job = await tx.job.create({
          data: {
            workspaceId,
            sourceId: source.id,
            processedRelevant: relevant,
            listingUrl: data.listingUrl,
            urlHash: data.urlHash,
          },
        });
        const revision = await tx.jobRevision.create({
          data: {
            workspaceId,
            jobId: job.id,
            revision: 1,
            schemaVersion: permitted ? 3 : 2,
            listingUrl: data.listingUrl,
            sourceSnapshot: permitted
              ? sourceSnapshotSchema.parse({
                  identity: source.identity,
                  label: source.label,
                  kind: source.kind,
                  evidence: {
                    provenance: "inferred",
                    basis: "official",
                    locator: "Permitted public API",
                    confirmedAt: null,
                    confirmedBy: null,
                  },
                })
              : captureManualSource(source),
            ...data.values,
            provenance: data.provenance,
            contentHash: data.contentHash,
            method: permitted ? "PERMITTED_API" : data.method,
          },
        });
        await tx.job.update({
          where: { id: job.id },
          data: { latestRevisionNumber: 1 },
        });
        await recordMatch(tx, workspaceId, revision);
        imported++;
        if (relevant) relevantCount++;
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
    const prefsRecord = await tx.preferenceVersion.findFirst({
      where: { workspaceId },
      orderBy: { revision: "desc" },
    });
    const prefs = prefsRecord
      ? preferenceSchema.parse(prefsRecord.values)
      : defaultPreferences;
    const relevant =
      !!data.values.title &&
      prefs.roles.some((r) =>
        data.values.title?.toLowerCase().includes(r.toLowerCase()),
      );
    if (!existing && relevant) {
      const day = todayInterval();
      if (
        (await tx.job.count({
          where: {
            workspaceId,
            processedRelevant: true,
            discoveredAt: { gte: day.start, lt: day.end },
          },
        })) >= prefs.dailyLimit
      )
        throw new InputError(
          "Daily relevant-job limit reached (Asia/Kolkata). Try tomorrow or adjust Settings.",
        );
    }
    const job =
      existing ??
      (await tx.job.create({
        data: {
          workspaceId,
          sourceId: source.id,
          processedRelevant: relevant,
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
        schemaVersion: 2,
        listingUrl: data.listingUrl,
        sourceSnapshot: captureManualSource(source),
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
    const revision = job.latestRevision;
    if (revision) {
      await database.$transaction((tx) =>
        recordMatch(tx, workspaceId, revision),
      );
      updated++;
    }
  }
  return { updated, profileRevision: profile.revision };
}
