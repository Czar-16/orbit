import "server-only";
import { z } from "zod";
import { requireWorkspace } from "@/lib/db";
import { getPreferences } from "@/lib/preference-service";
import {
  sourceConfigSchema,
  sourceUrl,
  normalizeSourceJobs,
  sourceRelevant,
} from "@/lib/job-sources";
import { publicApiJson } from "@/lib/public-api";
import { importJobs } from "@/lib/job-service";
import { localDate, todayInterval } from "@/lib/time";
import { InputError } from "@/lib/action-result";
import { profileFactsSchema } from "@/lib/profile-schema";
import { weightedMatch, weightedJobSchema } from "@/lib/weighted-matching";
const labels = {
  himalayas: "Himalayas",
  remotive: "Remotive",
  jobicy: "Jobicy",
  remoteok: "Remote OK",
};
export async function ensureDiscoverySources() {
  const { database, workspaceId } = await requireWorkspace();
  for (const provider of [
    "himalayas",
    "remotive",
    "jobicy",
    "remoteok",
  ] as const) {
    await database.source.upsert({
      where: {
        workspaceId_identity: { workspaceId, identity: `api:${provider}` },
      },
      create: {
        workspaceId,
        identity: `api:${provider}`,
        label: labels[provider],
        kind: "OFFICIAL_API",
        provider,
        endpoint: sourceUrl(
          { provider, companyQuery: null },
          (await getPreferences()).values,
        ).origin,
        termsUrl:
          provider === "himalayas"
            ? "https://himalayas.app/api"
            : provider === "remotive"
              ? "https://github.com/remotive-com/remote-jobs-api"
              : provider === "jobicy"
                ? "https://github.com/Jobicy/remote-jobs-api"
                : "https://remoteok.com/faq",
        reviewedAt: new Date("2026-10-12T00:00:00Z"),
        decision: "ALLOWED",
        enabled: true,
      },
      update: {},
    });
  }
}
export async function sourceControls(input: unknown) {
  const data = z
    .discriminatedUnion("operation", [
      z
        .object({
          operation: z.literal("add"),
          provider: z.enum(["himalayas", "remotive"]),
          companyQuery: z
            .string()
            .trim()
            .min(1)
            .max(100)
            .regex(/^[a-zA-Z0-9][a-zA-Z0-9 ._-]*$/),
          name: z.string().trim().min(1).max(150),
        })
        .strict(),
      z
        .object({
          operation: z.enum(["enable", "disable", "remove"]),
          id: z.uuid(),
        })
        .strict(),
    ])
    .parse(input);
  const { database, workspaceId } = await requireWorkspace();
  if (data.operation === "add") {
    const total = await database.source.count({
      where: { workspaceId, kind: "OFFICIAL_API", removedAt: null },
    });
    if (total >= 8)
      throw new InputError(
        "At most eight active source queries. Disable or remove unused tracked companies.",
      );
    await database.source.upsert({
      where: {
        workspaceId_identity: {
          workspaceId,
          identity: `api:${data.provider}:${data.companyQuery.toLowerCase()}`,
        },
      },
      create: {
        workspaceId,
        identity: `api:${data.provider}:${data.companyQuery.toLowerCase()}`,
        label: `${labels[data.provider]} · ${data.name}`,
        kind: "OFFICIAL_API",
        endpoint: sourceUrl(
          { provider: data.provider, companyQuery: data.companyQuery },
          (await getPreferences()).values,
        ).origin,
        provider: data.provider,
        companyQuery: data.companyQuery,
        decision: "ALLOWED",
        enabled: true,
        reviewedAt: new Date("2026-10-12T00:00:00Z"),
        termsUrl:
          data.provider === "himalayas"
            ? "https://himalayas.app/api"
            : "https://github.com/remotive-com/remote-jobs-api",
      },
      update: { removedAt: null, enabled: true },
    });
    return;
  }
  const source = await database.source.findFirst({
    where: {
      workspaceId,
      id: data.id,
      kind: "OFFICIAL_API",
      decision: "ALLOWED",
    },
  });
  if (!source) throw new InputError("Source unavailable.");
  await database.source.update({
    where: { id: source.id },
    data:
      data.operation === "remove"
        ? { enabled: false, removedAt: new Date() }
        : { enabled: data.operation === "enable" },
  });
}
export async function discoveryState() {
  await ensureDiscoverySources();
  const { database, workspaceId } = await requireWorkspace();
  const day = todayInterval();
  return {
    sources: await database.source.findMany({
      where: { workspaceId, kind: "OFFICIAL_API", removedAt: null },
      include: { runs: { orderBy: { startedAt: "desc" }, take: 1 } },
      orderBy: { createdAt: "asc" },
    }),
    processed: await database.job.count({
      where: {
        workspaceId,
        processedRelevant: true,
        discoveredAt: { gte: day.start, lt: day.end },
      },
    }),
    preferences: (await getPreferences()).values,
  };
}
export async function runDiscovery(
  fetchJson: (url: URL) => Promise<unknown> = publicApiJson,
) {
  await ensureDiscoverySources();
  const { database, workspaceId } = await requireWorkspace();
  const prefs = (await getPreferences()).values;
  const latest = await database.profileVersion.findFirst({
    where: { workspaceId },
    orderBy: { revision: "desc" },
  });
  const profile = latest ? profileFactsSchema.parse(latest.facts) : null;
  const sources = await database.source.findMany({
    where: {
      workspaceId,
      enabled: true,
      removedAt: null,
      kind: "OFFICIAL_API",
      decision: "ALLOWED",
    },
    orderBy: { createdAt: "asc" },
  });
  const summaries: {
    source: string;
    state: string;
    fetched: number;
    imported: number;
    duplicates: number;
    error?: string;
  }[] = [];
  for (const source of sources) {
    const config = sourceConfigSchema.parse({
      provider: source.provider,
      companyQuery: source.companyQuery,
    });
    const reserved = await database.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "Workspace" WHERE id = ${workspaceId}::uuid FOR UPDATE`;
      const day = localDate();
      const interval = todayInterval();
      if (
        (await tx.job.count({
          where: {
            workspaceId,
            processedRelevant: true,
            discoveredAt: { gte: interval.start, lt: interval.end },
          },
        })) >= prefs.dailyLimit
      )
        return null;
      if (
        await tx.discoveryRun.findUnique({
          where: {
            workspaceId_sourceId_day: { workspaceId, sourceId: source.id, day },
          },
        })
      )
        return null;
      if (
        (await tx.discoveryRun.count({
          where: { workspaceId, provider: config.provider, day },
        })) >= 4
      )
        return null;
      const last = await tx.discoveryRun.findFirst({
        where: { workspaceId, provider: config.provider },
        orderBy: { startedAt: "desc" },
      });
      if (last && Date.now() - last.startedAt.getTime() < 31000) return null;
      return tx.discoveryRun.create({
        data: {
          workspaceId,
          sourceId: source.id,
          provider: config.provider,
          day,
          state: "running",
        },
      });
    });
    if (!reserved) {
      summaries.push({
        source: source.label,
        state: "skipped (daily cap, already attempted, or spacing)",
        fetched: 0,
        imported: 0,
        duplicates: 0,
      });
      continue;
    }
    try {
      const response = await fetchJson(sourceUrl(config, prefs));
      const normalized = normalizeSourceJobs(config.provider, response);
      const eligible = normalized
        .filter((j) => sourceRelevant(j, prefs))
        .filter(
          (j) =>
            !weightedMatch(
              weightedJobSchema.parse({
                compensationMin: j.compensationMin || null,
                compensationMax: j.compensationMax || null,
                title: j.title || null,
                location: j.location || null,
                workArrangement: j.workArrangement || null,
                employmentType: j.employmentType || null,
                description: j.description || null,
                experienceRequirement: j.experienceRequirement || null,
                skills: [],
                currency: j.currency || null,
                compensationPeriod: j.compensationPeriod || null,
              }),
              profile,
              prefs,
            ).flags.some((f) => f.status === "conflict"),
        );
      const imported = eligible.length
        ? await importJobs(
            eligible.map(({ jobId, expectedRevision, ...j }) => {
              void jobId;
              void expectedRevision;
              return j;
            }),
            undefined,
            {
              identity: source.identity,
              label: source.label,
              provider: config.provider,
            },
          )
        : { imported: 0, duplicates: 0 };
      await database.discoveryRun.update({
        where: { id: reserved.id },
        data: {
          state: "success",
          fetched: normalized.length,
          ...imported,
          finishedAt: new Date(),
        },
      });
      summaries.push({
        source: source.label,
        state: "success",
        fetched: normalized.length,
        ...imported,
      });
    } catch (error) {
      const detail =
        error instanceof InputError
          ? error.message
          : "Source response or intake failed validation. No successful sync is assumed.";
      await database.discoveryRun.update({
        where: { id: reserved.id },
        data: { state: "failed", error: detail, finishedAt: new Date() },
      });
      summaries.push({
        source: source.label,
        state: "failed",
        fetched: 0,
        imported: 0,
        duplicates: 0,
        error: detail,
      });
    }
  }
  return summaries;
}
