import "server-only";
import { inngest } from "@/inngest/client";
import { ensureDailyRun } from "@/lib/processing-service";
import { canClaim, MAX_PROCESSING_ATTEMPTS } from "@/lib/processing";
import { requireWorkspace } from "@/lib/db";
import { validateEnvironment } from "@/lib/env";

export async function dispatchDaily(
  trigger: "startup" | "manual" | "scheduled",
) {
  if (validateEnvironment(process.env).ORBIT_SCHEDULER_ENABLED === "false")
    return {
      state: "disabled",
      message:
        "Daily scheduling is disabled. Manual discovery remains available.",
    };
  const run = await ensureDailyRun(trigger);
  if (["success", "partial"].includes(run.state))
    return {
      state: run.state,
      message: `Today's processing is ${run.state}. No daily allowance was reset.`,
    };
  if (!canClaim(run, "dispatch"))
    return {
      state: run.state,
      message:
        run.attemptCount >= MAX_PROCESSING_ATTEMPTS
          ? "Bounded processing attempts exhausted. Check the recorded failure and local Inngest history."
          : "Today's processing is already running.",
    };
  const { database } = await requireWorkspace();
  try {
    // Resending is intentional: a lost delivery acknowledgement must not strand
    // work. DB claims make concurrent deliveries safe; each execution is bounded.
    await inngest.send({
      name: "orbit/daily.requested",
      data: { runId: run.id },
    });
    await database.processingRun.updateMany({
      where: { id: run.id, state: "queued" },
      data: { error: null },
    });
    return {
      state: "queued",
      message:
        "Daily processing queued on the local Inngest server. No completion is assumed; see daily progress.",
    };
  } catch {
    await database.processingRun.updateMany({
      where: { id: run.id, state: "queued" },
      data: {
        error:
          "Local Inngest unavailable. Start npm run inngest:dev, then use Run now. Manual discovery is available.",
      },
    });
    return {
      state: "unavailable",
      message:
        "Local Inngest unavailable. Start npm run inngest:dev, then use Run now, or run manual discovery.",
    };
  }
}

let nextCatchUpAt = 0;
export async function startupCatchUp() {
  if (!process.env.DATABASE_URL || Date.now() < nextCatchUpAt) return;
  nextCatchUpAt = Date.now() + 60_000;
  try {
    await dispatchDaily("startup");
  } catch {
    // Missing migrations/database must not stop the local UI or imply success.
    console.warn(
      "Orbit catch-up pending: check local database, migrations and Inngest.",
    );
  }
}
