import "server-only";
import { z } from "zod";
import type { Prisma } from "@/generated/prisma/client";
import { requireWorkspace } from "@/lib/db";
import { ensureDiscoverySources } from "@/lib/discovery-service";
import { getPreferences } from "@/lib/preference-service";
import { localDate, todayInterval } from "@/lib/time";
import {
  sourceConfigSchema,
  sourceUrl,
  normalizeSourceJobs,
  sourceRelevant,
} from "@/lib/job-sources";
import { weightedMatch, weightedJobSchema } from "@/lib/weighted-matching";
import { profileFactsSchema } from "@/lib/profile-schema";
import { publicApiJson } from "@/lib/public-api";
import { importJobs } from "@/lib/job-service";
import { InputError } from "@/lib/action-result";
import type { AddressResolver } from "@/lib/url-validation";

export async function enabledSources() {
  await ensureDiscoverySources();
  const { database, workspaceId } = await requireWorkspace();
  return database.source.findMany({
    where: {
      workspaceId,
      enabled: true,
      removedAt: null,
      kind: "OFFICIAL_API",
      decision: "ALLOWED",
    },
    orderBy: { createdAt: "asc" },
  });
}

export async function processSource(
  input: unknown,
  processingRunId?: string,
  fetchJson: (url: URL) => Promise<unknown> = publicApiJson,
  resolver?: AddressResolver,
  executionId?: string,
) {
  const sourceId = z.uuid().parse(input);
  if (processingRunId) z.uuid().parse(processingRunId);
  const { database, workspaceId } = await requireWorkspace();
  const source = await database.source.findFirstOrThrow({
    where: { workspaceId, id: sourceId },
  });
  const config = sourceConfigSchema.parse({
    provider: source.provider,
    companyQuery: source.companyQuery,
  });
  const prefs = (await getPreferences()).values;
  const day = localDate();
  const reservation = await database.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "Workspace" WHERE id=${workspaceId}::uuid FOR UPDATE`;
    const currentSource = await tx.source.findUniqueOrThrow({
      where: { id: sourceId },
    });
    if (
      !currentSource.enabled ||
      currentSource.removedAt ||
      currentSource.decision !== "ALLOWED"
    )
      return { reason: "source disabled" };
    if (processingRunId) {
      const processing = await tx.processingRun.findFirst({
        where: { workspaceId, id: processingRunId },
      });
      if (
        !processing ||
        processing.day !== day ||
        processing.state !== "running" ||
        (executionId && processing.executionId !== executionId)
      )
        return { reason: "processing day ended or run inactive" };
      await tx.processingRun.update({
        where: { id: processing.id },
        data: { leaseExpiresAt: new Date(Date.now() + 600_000) },
      });
    }
    const prior = await tx.discoveryRun.findUnique({
      where: { workspaceId_sourceId_day: { workspaceId, sourceId, day } },
    });
    if (prior) {
      // An uncertain request is never issued again. An expired reservation becomes
      // an explicit failure; an in-flight request remains owned by its reservation.
      if (
        prior.state === "running" &&
        (!prior.leaseExpiresAt || prior.leaseExpiresAt.getTime() <= Date.now())
      ) {
        const error =
          "Interrupted request; outcome unknown. No repeat request today.";
        await tx.discoveryRun.update({
          where: { id: prior.id },
          data: {
            state: "failed",
            error,
            finishedAt: new Date(),
            leaseExpiresAt: null,
          },
        });
        await tx.discoveryAttempt.updateMany({
          where: { discoveryRunId: prior.id, state: "reserved" },
          data: { state: "unknown", error, finishedAt: new Date() },
        });
      }
      if (processingRunId && !prior.processingRunId)
        await tx.discoveryRun.update({
          where: { id: prior.id },
          data: { processingRunId },
        });
      return {
        reason: "already attempted today",
        waitMs:
          prior.state === "running" &&
          prior.leaseExpiresAt &&
          prior.leaseExpiresAt.getTime() > Date.now()
            ? prior.leaseExpiresAt.getTime() - Date.now()
            : 0,
      };
    }
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
      return { reason: "daily relevant-job cap" };
    // Legacy runs also consume quota: do not invent request-attempt history.
    const providerRuns = await tx.discoveryRun.findMany({
      where: { workspaceId, provider: config.provider, day },
    });
    if (
      providerRuns.reduce(
        (count, run) => count + Math.max(1, run.attemptCount),
        0,
      ) >= 4
    )
      return { reason: "provider daily quota" };
    if (providerRuns.some((run) => run.error?.includes("rate limit")))
      return { reason: "provider rate limit; stopped today" };
    const last = await tx.discoveryRun.findFirst({
      where: { workspaceId, provider: config.provider },
      orderBy: { startedAt: "desc" },
    });
    const lastTime = last?.lastAttemptAt ?? last?.startedAt;
    if (lastTime && Date.now() - lastTime.getTime() < 31_000)
      return {
        reason: "provider spacing",
        waitMs: 31_000 - (Date.now() - lastTime.getTime()),
      };
    const run = await tx.discoveryRun.create({
      data: {
        workspaceId,
        sourceId,
        provider: config.provider,
        day,
        state: "running",
        processingRunId,
        attemptCount: 1,
        lastAttemptAt: new Date(),
        leaseExpiresAt: new Date(Date.now() + 120_000),
      },
    });
    const attempt = await tx.discoveryAttempt.create({
      data: { workspaceId, discoveryRunId: run.id, number: 1 },
    });
    return { run, attempt };
  });
  if (!("run" in reservation) || !reservation.run)
    return {
      source: source.label,
      state: `skipped (${reservation.reason})`,
      fetched: 0,
      imported: 0,
      duplicates: 0,
      waitMs: reservation.waitMs ?? 0,
    };
  const { run, attempt } = reservation;
  let fetched = 0,
    filtered = 0;
  try {
    const latest = await database.profileVersion.findFirst({
      where: { workspaceId },
      orderBy: { revision: "desc" },
    });
    const profile = latest ? profileFactsSchema.parse(latest.facts) : null;
    const normalized = normalizeSourceJobs(
      config.provider,
      await fetchJson(sourceUrl(config, prefs)),
    );
    fetched = normalized.length;
    const eligible = normalized
      .filter((j) => sourceRelevant(j, prefs))
      .filter(
        (j) =>
          !weightedMatch(
            weightedJobSchema.parse({
              title: j.title || null,
              location: j.location || null,
              workArrangement: j.workArrangement || null,
              employmentType: j.employmentType || null,
              description: j.description || null,
              experienceRequirement: j.experienceRequirement || null,
              skills: [],
              compensationMin: j.compensationMin || null,
              compensationMax: j.compensationMax || null,
              currency: j.currency || null,
              compensationPeriod: j.compensationPeriod || null,
            }),
            profile,
            prefs,
          ).flags.some((f) => f.status === "conflict"),
      );
    filtered = normalized.length - eligible.length;
    const complete = async (
      tx: Prisma.TransactionClient,
      counts: { imported: number; duplicates: number; skipped: number },
    ) => {
      const current = await tx.discoveryRun.findUniqueOrThrow({
        where: { id: run.id },
      });
      if (
        current.state !== "running" ||
        current.leaseExpiresAt!.getTime() <= Date.now()
      )
        throw new InputError(
          "Request reservation expired. No import was committed.",
        );
      if (localDate() !== day)
        throw new InputError("Processing day ended. No import was committed.");
      if (processingRunId && executionId) {
        const owner = await tx.processingRun.findUniqueOrThrow({
          where: { id: processingRunId },
        });
        if (owner.state !== "running" || owner.executionId !== executionId)
          throw new InputError(
            "Processing lease changed. No import was committed.",
          );
      }
      await tx.discoveryRun.update({
        where: { id: run.id },
        data: {
          state: "success",
          fetched: normalized.length,
          filtered: normalized.length - eligible.length,
          ...counts,
          finishedAt: new Date(),
          leaseExpiresAt: null,
        },
      });
      await tx.discoveryAttempt.update({
        where: { id: attempt.id },
        data: { state: "success", finishedAt: new Date() },
      });
    };
    const result = eligible.length
      ? await importJobs(
          eligible.map(({ jobId, expectedRevision, ...job }) => {
            void jobId;
            void expectedRevision;
            return job;
          }),
          resolver,
          {
            identity: source.identity,
            label: source.label,
            provider: config.provider,
          },
          { day, commit: complete },
        )
      : await database.$transaction(async (tx) => {
          await tx.$queryRaw`SELECT id FROM "Workspace" WHERE id=${workspaceId}::uuid FOR UPDATE`;
          await complete(tx, { imported: 0, duplicates: 0, skipped: 0 });
          return { imported: 0, duplicates: 0 };
        });
    return {
      source: source.label,
      state: "success",
      fetched: normalized.length,
      ...result,
      waitMs: 0,
    };
  } catch (error) {
    const detail =
      error instanceof InputError
        ? error.message
        : "Source response or intake failed validation. No successful sync is assumed.";
    await database.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "Workspace" WHERE id=${workspaceId}::uuid FOR UPDATE`;
      await tx.discoveryRun.updateMany({
        where: { id: run.id, state: "running" },
        data: {
          state: "failed",
          fetched,
          filtered,
          error: detail,
          finishedAt: new Date(),
          leaseExpiresAt: null,
        },
      });
      await tx.discoveryAttempt.updateMany({
        where: { id: attempt.id, state: "reserved" },
        data: { state: "failed", error: detail, finishedAt: new Date() },
      });
    });
    return {
      source: source.label,
      state: "failed",
      fetched,
      imported: 0,
      duplicates: 0,
      error: detail,
      waitMs: 0,
    };
  }
}
