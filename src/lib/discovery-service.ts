import "server-only";
import { z } from "zod";
import { requireWorkspace } from "@/lib/db";
import { getPreferences } from "@/lib/preference-service";
import { sourceUrl } from "@/lib/job-sources";
import { publicApiJson } from "@/lib/public-api";
import { todayInterval } from "@/lib/time";
import { InputError } from "@/lib/action-result";
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
// Synchronous fallback uses exactly the same reservations as the daily worker.
export async function runDiscovery(
  fetchJson: (url: URL) => Promise<unknown> = publicApiJson,
) {
  const { enabledSources, processSource } =
    await import("@/lib/source-processing");
  const sources = await enabledSources();
  const summaries = [];
  for (const source of sources) {
    const result = await processSource(source.id, undefined, fetchJson);
    summaries.push(result);
  }
  return summaries;
}
