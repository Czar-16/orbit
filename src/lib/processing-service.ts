import "server-only";
import { z } from "zod";
import { requireWorkspace } from "@/lib/db";
import { getPreferences } from "@/lib/preference-service";
import { localDate } from "@/lib/time";
import {
  processingTriggerSchema,
  PROCESSING_LEASE_MS,
  canClaim,
} from "@/lib/processing";

export async function ensureDailyRun(input: unknown) {
  const trigger = processingTriggerSchema.parse(input);
  const { database, workspaceId } = await requireWorkspace();
  const preferences = await getPreferences();
  const profile = await database.profileVersion.findFirst({
    where: { workspaceId },
    orderBy: { revision: "desc" },
  });
  // An old day's unfinished work is a failure observation, never a backfill.
  return database.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "Workspace" WHERE id=${workspaceId}::uuid FOR UPDATE`;
    const pinnedPreferences =
      (await tx.preferenceVersion.findFirst({
        where: { workspaceId },
        orderBy: { revision: "desc" },
      })) ??
      (await tx.preferenceVersion.create({
        data: {
          workspaceId,
          revision: 1,
          origin: "defaults",
          values: preferences.values,
        },
      }));
    const interrupted = await tx.discoveryRun.findMany({
      where: { workspaceId, day: { lt: localDate() }, state: "running" },
    });
    for (const source of interrupted) {
      const error =
        "Processing day ended with an interrupted request; outcome unknown. No repeat request.";
      await tx.discoveryRun.update({
        where: { id: source.id },
        data: {
          state: "failed",
          error,
          finishedAt: new Date(),
          leaseExpiresAt: null,
        },
      });
      await tx.discoveryAttempt.updateMany({
        where: { discoveryRunId: source.id, state: "reserved" },
        data: { state: "unknown", error, finishedAt: new Date() },
      });
    }
    await tx.processingRun.updateMany({
      where: {
        workspaceId,
        day: { lt: localDate() },
        state: { in: ["queued", "running"] },
      },
      data: {
        state: "failed",
        error:
          "Processing day ended before completion. Today's run uses its own allowance; missed days are not replayed.",
        finishedAt: new Date(),
        leaseExpiresAt: null,
        revision: { increment: 1 },
      },
    });
    return tx.processingRun.upsert({
      where: { workspaceId_day: { workspaceId, day: localDate() } },
      create: {
        workspaceId,
        day: localDate(),
        trigger,
        dailyLimit: preferences.values.dailyLimit,
        preferenceVersionId: pinnedPreferences.id,
        profileVersionId: profile?.id,
      },
      update: {},
    });
  });
}

export async function claimProcessing(input: unknown, execution: unknown) {
  const id = z.uuid().parse(input),
    executionId = z.string().min(1).max(200).parse(execution);
  const { database, workspaceId } = await requireWorkspace();
  return database.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "Workspace" WHERE id=${workspaceId}::uuid FOR UPDATE`;
    const run = await tx.processingRun.findFirst({
      where: { workspaceId, id },
    });
    if (!run || run.day !== localDate() || !canClaim(run, executionId))
      return null;
    return tx.processingRun.update({
      where: { id },
      data: {
        state: "running",
        executionId,
        startedAt: run.startedAt ?? new Date(),
        finishedAt: null,
        leaseExpiresAt: new Date(Date.now() + PROCESSING_LEASE_MS),
        attemptCount:
          run.attemptCount + (run.executionId === executionId ? 0 : 1),
        error: null,
        revision: { increment: 1 },
      },
    });
  });
}

export async function finishProcessing(
  input: unknown,
  execution: unknown,
  failed = false,
) {
  const id = z.uuid().parse(input),
    executionId = z.string().min(1).max(200).parse(execution);
  const { database, workspaceId } = await requireWorkspace();
  return database.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "Workspace" WHERE id=${workspaceId}::uuid FOR UPDATE`;
    const run = await tx.processingRun.findFirst({
      where: { workspaceId, id },
    });
    if (!run || run.executionId !== executionId || run.state !== "running")
      return null;
    const sources = await tx.discoveryRun.findMany({
      where: { workspaceId, processingRunId: id },
    });
    const incomplete = sources.some((s) => s.state !== "success");
    const counters = sources.reduce(
      (sum, s) => ({
        fetched: sum.fetched + s.fetched,
        imported: sum.imported + s.imported,
        duplicates: sum.duplicates + s.duplicates,
        filtered: sum.filtered + s.filtered,
        skipped: sum.skipped + s.skipped,
      }),
      { fetched: 0, imported: 0, duplicates: 0, filtered: 0, skipped: 0 },
    );
    return tx.processingRun.update({
      where: { id },
      data: {
        ...counters,
        state: failed ? "failed" : incomplete ? "partial" : "success",
        error: failed
          ? "Processing interrupted after bounded retries. Check the local Inngest run and use Run now to recover remaining work."
          : incomplete
            ? "Some source requests failed or remain uncertain. See source history; requests are not repeated today."
            : null,
        finishedAt: new Date(),
        leaseExpiresAt: null,
        revision: { increment: 1 },
      },
    });
  });
}

export async function processingState() {
  const { database, workspaceId } = await requireWorkspace();
  const run = await database.processingRun.findUnique({
    where: { workspaceId_day: { workspaceId, day: localDate() } },
  });
  return run;
}
