import "server-only";
import { cron, eventType, NonRetriableError } from "inngest";
import { inngest } from "@/inngest/client";
import { processingEventSchema } from "@/lib/processing";
import {
  ensureDailyRun,
  claimProcessing,
  finishProcessing,
} from "@/lib/processing-service";
import { enabledSources, processSource } from "@/lib/source-processing";
import { processMatchBatch } from "@/lib/job-service";
import { validateEnvironment } from "@/lib/env";

const dailyRequested = eventType("orbit/daily.requested", {
  schema: processingEventSchema,
});
export const scheduledDiscovery = inngest.createFunction(
  {
    id: "daily-schedule",
    retries: 2,
    triggers: [cron("TZ=Asia/Kolkata 0 9 * * *")],
  },
  async ({ step }) => {
    if (validateEnvironment(process.env).ORBIT_SCHEDULER_ENABLED === "false")
      return { state: "disabled" };
    const run = await step.run("daily-record", () =>
      ensureDailyRun("scheduled"),
    );
    await step.sendEvent("request-daily-processing", {
      name: dailyRequested.name,
      data: { runId: run.id },
    });
    return { state: "queued", runId: run.id };
  },
);

export const dailyProcessing = inngest.createFunction(
  {
    id: "daily-processing",
    retries: 2,
    concurrency: { limit: 1 },
    triggers: [dailyRequested],
    onFailure: async ({ event }) => {
      const parsed = processingEventSchema.safeParse(event.data.event.data);
      if (parsed.success) {
        // The failed execution can only close a record it owns.
        await finishProcessing(parsed.data.runId, event.data.run_id, true);
      }
    },
  },
  async ({ event, step, runId }) => {
    if (validateEnvironment(process.env).ORBIT_SCHEDULER_ENABLED === "false")
      return { state: "disabled" };
    const data = processingEventSchema.safeParse(event.data);
    if (!data.success)
      throw new NonRetriableError("Invalid local processing event.");
    const claimed = await step.run("claim-daily-record", () =>
      claimProcessing(data.data.runId, runId),
    );
    if (!claimed)
      return {
        state: "skipped",
        reason: "already completed, running, expired day or attempt limit",
      };
    const sources = await step.run("enabled-sources", () => enabledSources());
    for (const source of sources) {
      const result = await step.run(`source-${source.id}`, () =>
        processSource(source.id, claimed.id, undefined, undefined, runId),
      );
      if (result.waitMs > 0) {
        await step.sleep(
          `spacing-${source.id}`,
          `${Math.ceil(result.waitMs / 1000) + 1}s`,
        );
        await step.run(`spaced-source-${source.id}`, () =>
          processSource(source.id, claimed.id, undefined, undefined, runId),
        );
      }
    }
    let cursor: string | undefined;
    do {
      const batch = await step.run(`matches-${cursor ?? "first"}`, () =>
        processMatchBatch(claimed.id, cursor, runId),
      );
      cursor = batch.cursor ?? undefined;
    } while (cursor);
    const result = await step.run("finish-daily-record", () =>
      finishProcessing(claimed.id, runId),
    );
    return { state: result?.state ?? "superseded", runId: claimed.id };
  },
);

export const functions = [scheduledDiscovery, dailyProcessing];
