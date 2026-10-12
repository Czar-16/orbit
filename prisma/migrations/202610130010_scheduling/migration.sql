-- AlterTable
ALTER TABLE "DiscoveryRun" ADD COLUMN     "attemptCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "filtered" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "lastAttemptAt" TIMESTAMPTZ(3),
ADD COLUMN     "leaseExpiresAt" TIMESTAMPTZ(3),
ADD COLUMN     "processingRunId" UUID,
ADD COLUMN     "skipped" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "ProcessingRun" (
    "id" UUID NOT NULL,
    "workspaceId" UUID NOT NULL,
    "day" VARCHAR(10) NOT NULL,
    "trigger" TEXT NOT NULL,
    "state" TEXT NOT NULL DEFAULT 'queued',
    "revision" INTEGER NOT NULL DEFAULT 1,
    "queuedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMPTZ(3),
    "finishedAt" TIMESTAMPTZ(3),
    "leaseExpiresAt" TIMESTAMPTZ(3),
    "executionId" TEXT,
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,
    "fetched" INTEGER NOT NULL DEFAULT 0,
    "imported" INTEGER NOT NULL DEFAULT 0,
    "duplicates" INTEGER NOT NULL DEFAULT 0,
    "filtered" INTEGER NOT NULL DEFAULT 0,
    "matched" INTEGER NOT NULL DEFAULT 0,
    "skipped" INTEGER NOT NULL DEFAULT 0,
    "dailyLimit" INTEGER NOT NULL,
    "profileVersionId" UUID,
    "preferenceVersionId" UUID,

    CONSTRAINT "ProcessingRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DiscoveryAttempt" (
    "id" UUID NOT NULL,
    "workspaceId" UUID NOT NULL,
    "discoveryRunId" UUID NOT NULL,
    "number" INTEGER NOT NULL,
    "reservedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMPTZ(3),
    "state" TEXT NOT NULL DEFAULT 'reserved',
    "error" TEXT,

    CONSTRAINT "DiscoveryAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProcessingRun_workspaceId_state_day_idx" ON "ProcessingRun"("workspaceId", "state", "day");

-- CreateIndex
CREATE UNIQUE INDEX "ProcessingRun_workspaceId_day_key" ON "ProcessingRun"("workspaceId", "day");

-- CreateIndex
CREATE UNIQUE INDEX "ProcessingRun_workspaceId_id_key" ON "ProcessingRun"("workspaceId", "id");

-- CreateIndex
CREATE INDEX "DiscoveryAttempt_workspaceId_reservedAt_idx" ON "DiscoveryAttempt"("workspaceId", "reservedAt");

-- CreateIndex
CREATE UNIQUE INDEX "DiscoveryAttempt_workspaceId_discoveryRunId_number_key" ON "DiscoveryAttempt"("workspaceId", "discoveryRunId", "number");

-- CreateIndex
CREATE UNIQUE INDEX "DiscoveryRun_workspaceId_id_key" ON "DiscoveryRun"("workspaceId", "id");

-- AddForeignKey
ALTER TABLE "DiscoveryRun" ADD CONSTRAINT "DiscoveryRun_workspaceId_processingRunId_fkey" FOREIGN KEY ("workspaceId", "processingRunId") REFERENCES "ProcessingRun"("workspaceId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcessingRun" ADD CONSTRAINT "ProcessingRun_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcessingRun" ADD CONSTRAINT "ProcessingRun_workspaceId_profileVersionId_fkey" FOREIGN KEY ("workspaceId", "profileVersionId") REFERENCES "ProfileVersion"("workspaceId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcessingRun" ADD CONSTRAINT "ProcessingRun_workspaceId_preferenceVersionId_fkey" FOREIGN KEY ("workspaceId", "preferenceVersionId") REFERENCES "PreferenceVersion"("workspaceId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiscoveryAttempt" ADD CONSTRAINT "DiscoveryAttempt_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiscoveryAttempt" ADD CONSTRAINT "DiscoveryAttempt_workspaceId_discoveryRunId_fkey" FOREIGN KEY ("workspaceId", "discoveryRunId") REFERENCES "DiscoveryRun"("workspaceId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- These checks apply to new orchestration records, preserving observed legacy runs.
ALTER TABLE "ProcessingRun" ADD CONSTRAINT "processing_values" CHECK (
 "state" IN ('queued','running','success','partial','failed') AND
 "trigger" IN ('scheduled','startup','manual') AND
 "day" ~ '^\d{4}-\d{2}-\d{2}$' AND "revision" > 0 AND
 "attemptCount" BETWEEN 0 AND 3 AND "dailyLimit" BETWEEN 1 AND 100 AND
 "fetched" >= 0 AND "imported" >= 0 AND "duplicates" >= 0 AND
 "filtered" >= 0 AND "matched" >= 0 AND "skipped" >= 0 AND
 ("state" NOT IN ('success','partial','failed') OR "finishedAt" IS NOT NULL) AND
 ("state" <> 'running' OR ("startedAt" IS NOT NULL AND "leaseExpiresAt" IS NOT NULL AND "executionId" IS NOT NULL)) AND
 ("error" IS NULL OR length("error") <= 2000)
);
ALTER TABLE "DiscoveryRun" ADD CONSTRAINT "discovery_attempt_values" CHECK (
 "attemptCount" >= 0 AND "filtered" >= 0 AND "skipped" >= 0 AND
 ("attemptCount" = 0 OR ("fetched" >= 0 AND "imported" >= 0 AND "duplicates" >= 0 AND "lastAttemptAt" IS NOT NULL AND
 ("state" = 'running' OR "finishedAt" IS NOT NULL)))
);
ALTER TABLE "DiscoveryAttempt" ADD CONSTRAINT "attempt_values" CHECK (
 "number" > 0 AND "state" IN ('reserved','success','failed','unknown') AND
 (("state" = 'reserved' AND "finishedAt" IS NULL) OR ("state" <> 'reserved' AND "finishedAt" IS NOT NULL)) AND
 ("error" IS NULL OR length("error") <= 2000)
);
CREATE FUNCTION orbit_attempt_immutable() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'Discovery attempts are retained'; END IF;
 IF OLD."state" <> 'reserved' OR NEW."workspaceId" <> OLD."workspaceId" OR NEW."discoveryRunId" <> OLD."discoveryRunId" OR NEW."number" <> OLD."number" OR NEW."reservedAt" <> OLD."reservedAt" THEN
  RAISE EXCEPTION 'Discovery attempt history is immutable';
 END IF;
 RETURN NEW;
END;
$$;
CREATE TRIGGER discovery_attempt_immutable BEFORE UPDATE OR DELETE ON "DiscoveryAttempt" FOR EACH ROW EXECUTE FUNCTION orbit_attempt_immutable();
