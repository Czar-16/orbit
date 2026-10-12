import { processingState } from "@/lib/processing-service";
import { validateEnvironment } from "@/lib/env";
import { ProcessingRefresh } from "@/components/processing-refresh";
export async function ProcessingSummary() {
  const run = await processingState();
  const enabled =
    validateEnvironment(process.env).ORBIT_SCHEDULER_ENABLED === "true";
  return (
    <section
      className="panel mb-4"
      aria-label="Daily processing"
      aria-live="polite"
    >
      <ProcessingRefresh
        active={
          enabled &&
          !!run &&
          ["queued", "running"].includes(run.state) &&
          !run.error
        }
      />
      <h2 className="mb-3">Daily processing</h2>
      <p className="text-sm text-text-muted">
        {enabled
          ? "Scheduled daily at 09:00 Asia/Kolkata, with startup catch-up."
          : "Scheduling disabled."}{" "}
        Keep Orbit, PostgreSQL and the local Inngest server running.
      </p>
      {run ? (
        <>
          <p className="mt-3 font-bold">
            {run.day} · {run.state}
            {run.state === "running" &&
            run.leaseExpiresAt &&
            run.leaseExpiresAt < new Date()
              ? " · interrupted; use Run now"
              : ""}
          </p>
          <p className="mt-2 text-sm text-text-muted">
            Fetched {run.fetched} · Imported {run.imported} · Duplicates{" "}
            {run.duplicates} · Filtered {run.filtered} · Cap-skipped{" "}
            {run.skipped} · Existing jobs matched {run.matched}
          </p>
          <p className="mt-2 text-sm text-text-muted">
            Trigger: {run.trigger} · Worker attempts: {run.attemptCount}/3 ·
            Recorded cap at start: {run.dailyLimit}. Counts finalize after
            source processing; the intake ledger enforces the current cap.
          </p>
          {run.finishedAt && (
            <p className="mt-2 text-sm text-text-muted">
              Finished{" "}
              {new Intl.DateTimeFormat("en-IN", {
                timeZone: "Asia/Kolkata",
                dateStyle: "medium",
                timeStyle: "short",
              }).format(run.finishedAt)}
            </p>
          )}
          {run.error && <p className="field-error mt-2">{run.error}</p>}
          {!run.profileVersionId && (
            <p className="field-hint mt-2">
              No verified profile at run start. Jobs remain unscored until you
              save your verified profile.
            </p>
          )}
        </>
      ) : (
        <p className="mt-3 text-sm text-text-muted">
          No daily processing record yet. Use Run now to queue today&apos;s
          work.
        </p>
      )}
    </section>
  );
}
