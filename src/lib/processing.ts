import { z } from "zod";
export const processingEventSchema = z.object({ runId: z.uuid() }).strict();
export const processingTriggerSchema = z.enum([
  "scheduled",
  "startup",
  "manual",
]);
export const PROCESSING_LEASE_MS = 600_000;
export const MAX_PROCESSING_ATTEMPTS = 3;
export function canClaim(
  run: {
    state: string;
    executionId: string | null;
    leaseExpiresAt: Date | null;
    attemptCount: number;
  },
  executionId: string,
  now = new Date(),
) {
  if (["success", "partial"].includes(run.state)) return false;
  if (run.state === "running" && run.executionId === executionId) return true;
  return (
    run.attemptCount < MAX_PROCESSING_ATTEMPTS &&
    (!run.leaseExpiresAt || run.leaseExpiresAt <= now)
  );
}
