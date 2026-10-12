-- CreateEnum
CREATE TYPE "ApplicationStatus" AS ENUM ('DISCOVERED', 'SAVED', 'NEEDS_REVIEW', 'DRAFT_READY', 'READY_TO_APPLY', 'APPLIED', 'INTERVIEW', 'OFFER', 'REJECTED', 'WITHDRAWN', 'ARCHIVED');

-- CreateTable
CREATE TABLE "Application" (
    "id" UUID NOT NULL,
    "workspaceId" UUID NOT NULL,
    "jobId" UUID NOT NULL,
    "status" "ApplicationStatus" NOT NULL DEFAULT 'DISCOVERED',
    "previousStatus" "ApplicationStatus",
    "revision" INTEGER NOT NULL DEFAULT 1,
    "selectedDraftId" UUID,
    "appliedAt" TIMESTAMPTZ(3),
    "confirmedAt" TIMESTAMPTZ(3),
    "appliedProvenance" TEXT,
    "nextStep" TEXT,
    "matchScore" INTEGER,
    "matchSnapshot" JSONB,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Application_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApplicationEvent" (
    "id" UUID NOT NULL,
    "workspaceId" UUID NOT NULL,
    "applicationId" UUID NOT NULL,
    "sequence" INTEGER NOT NULL,
    "kind" TEXT NOT NULL,
    "previousStatus" "ApplicationStatus",
    "newStatus" "ApplicationStatus",
    "note" TEXT,
    "details" JSONB NOT NULL,
    "origin" TEXT NOT NULL,
    "occurredAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "recordedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApplicationEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FollowUp" (
    "id" UUID NOT NULL,
    "workspaceId" UUID NOT NULL,
    "applicationId" UUID NOT NULL,
    "label" TEXT NOT NULL,
    "dueAt" TIMESTAMPTZ(3) NOT NULL,
    "completedAt" TIMESTAMPTZ(3),
    "cancelledAt" TIMESTAMPTZ(3),
    "revision" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "FollowUp_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Application_workspaceId_status_updatedAt_idx" ON "Application"("workspaceId", "status", "updatedAt");

-- CreateIndex
CREATE INDEX "Application_workspaceId_appliedAt_idx" ON "Application"("workspaceId", "appliedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Application_workspaceId_jobId_key" ON "Application"("workspaceId", "jobId");

-- CreateIndex
CREATE UNIQUE INDEX "Application_workspaceId_id_key" ON "Application"("workspaceId", "id");

-- CreateIndex
CREATE INDEX "ApplicationEvent_workspaceId_recordedAt_idx" ON "ApplicationEvent"("workspaceId", "recordedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ApplicationEvent_workspaceId_applicationId_sequence_key" ON "ApplicationEvent"("workspaceId", "applicationId", "sequence");

-- CreateIndex
CREATE INDEX "FollowUp_workspaceId_dueAt_idx" ON "FollowUp"("workspaceId", "dueAt");

-- CreateIndex
CREATE INDEX "FollowUp_workspaceId_applicationId_idx" ON "FollowUp"("workspaceId", "applicationId");

-- CreateIndex
CREATE UNIQUE INDEX "FollowUp_workspaceId_id_key" ON "FollowUp"("workspaceId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "ApplicationDraft_workspaceId_jobId_id_key" ON "ApplicationDraft"("workspaceId", "jobId", "id");

-- AddForeignKey
ALTER TABLE "Application" ADD CONSTRAINT "Application_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Application" ADD CONSTRAINT "Application_workspaceId_jobId_fkey" FOREIGN KEY ("workspaceId", "jobId") REFERENCES "Job"("workspaceId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Application" ADD CONSTRAINT "Application_workspaceId_jobId_selectedDraftId_fkey" FOREIGN KEY ("workspaceId", "jobId", "selectedDraftId") REFERENCES "ApplicationDraft"("workspaceId", "jobId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicationEvent" ADD CONSTRAINT "ApplicationEvent_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicationEvent" ADD CONSTRAINT "ApplicationEvent_workspaceId_applicationId_fkey" FOREIGN KEY ("workspaceId", "applicationId") REFERENCES "Application"("workspaceId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FollowUp" ADD CONSTRAINT "FollowUp_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FollowUp" ADD CONSTRAINT "FollowUp_workspaceId_applicationId_fkey" FOREIGN KEY ("workspaceId", "applicationId") REFERENCES "Application"("workspaceId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;


ALTER TABLE "Application" ADD CONSTRAINT "Application_revision" CHECK ("revision" > 0),
ADD CONSTRAINT "Application_score" CHECK ("matchScore" BETWEEN 0 AND 100),
ADD CONSTRAINT "Application_confirmation" CHECK (
 ("appliedAt" IS NULL AND "confirmedAt" IS NULL AND "appliedProvenance" IS NULL AND "status" NOT IN ('APPLIED','INTERVIEW','OFFER','REJECTED','WITHDRAWN')) OR
 ("appliedAt" IS NOT NULL AND "confirmedAt" IS NOT NULL AND "appliedProvenance" = 'user-provided' AND "appliedAt" <= "confirmedAt" AND "status" IN ('APPLIED','INTERVIEW','OFFER','REJECTED','WITHDRAWN','ARCHIVED'))
),
ADD CONSTRAINT "Application_archive" CHECK (("status" = 'ARCHIVED') = ("previousStatus" IS NOT NULL) AND ("previousStatus" IS NULL OR "previousStatus" <> 'ARCHIVED')),
ADD CONSTRAINT "Application_ready_draft" CHECK ("status" NOT IN ('DRAFT_READY','READY_TO_APPLY') OR "selectedDraftId" IS NOT NULL);
ALTER TABLE "ApplicationEvent" ADD CONSTRAINT "ApplicationEvent_sequence" CHECK ("sequence" > 0),
ADD CONSTRAINT "ApplicationEvent_origin" CHECK ("origin" IN ('user-provided','system','migration')),
ADD CONSTRAINT "ApplicationEvent_note" CHECK (length("note") <= 5000);
ALTER TABLE "FollowUp" ADD CONSTRAINT "FollowUp_revision" CHECK ("revision" > 0),
ADD CONSTRAINT "FollowUp_label" CHECK (length("label") BETWEEN 1 AND 300),
ADD CONSTRAINT "FollowUp_exclusive" CHECK ("completedAt" IS NULL OR "cancelledAt" IS NULL),
ADD CONSTRAINT "FollowUp_kolkata_midnight" CHECK (("dueAt" AT TIME ZONE 'Asia/Kolkata')::time = '00:00:00'::time);

-- Honest observable baseline, never reconstructed submission history.
WITH baseline AS (
 SELECT j.*, d."id" AS draft_id,
 CASE WHEN d."id" IS NOT NULL THEN 'DRAFT_READY' WHEN j."savedAt" IS NOT NULL THEN 'SAVED' ELSE 'DISCOVERED' END AS underlying
 FROM "Job" j LEFT JOIN LATERAL (
  SELECT "id", "operation" FROM "ApplicationDraft" WHERE "workspaceId"=j."workspaceId" AND "jobId"=j."id" ORDER BY "revision" DESC LIMIT 1
 ) latest ON true LEFT JOIN "ApplicationDraft" d ON d."id"=latest."id" AND latest."operation" <> 'discard'
)
INSERT INTO "Application" ("id","workspaceId","jobId","status","previousStatus","selectedDraftId","updatedAt")
SELECT gen_random_uuid(), "workspaceId", "id", (CASE WHEN "archivedAt" IS NOT NULL THEN 'ARCHIVED' ELSE underlying END)::"ApplicationStatus",
 CASE WHEN "archivedAt" IS NOT NULL THEN underlying::"ApplicationStatus" ELSE NULL END, draft_id, CURRENT_TIMESTAMP FROM baseline;

WITH ranked AS (
 SELECT m.*, row_number() OVER (PARTITION BY m."workspaceId", m."jobRevisionId" ORDER BY m."createdAt" DESC, m."id" DESC) AS n FROM "WeightedMatch" m
)
UPDATE "Application" a SET "matchScore"=m."score", "matchSnapshot"=jsonb_build_object('kind','recorded-match','id',m."id",'jobRevisionId',m."jobRevisionId",'profileVersionId',m."profileVersionId",'preferenceVersionId',m."preferenceVersionId",'ruleVersion',m."ruleVersion")
FROM "Job" j JOIN "JobRevision" r ON r."jobId"=j."id" AND r."revision"=j."latestRevisionNumber" AND r."workspaceId"=j."workspaceId" JOIN ranked m ON m."jobRevisionId"=r."id" AND m.n=1
WHERE a."jobId"=j."id" AND a."workspaceId"=j."workspaceId" AND a."selectedDraftId" IS NULL;

UPDATE "Application" a SET "matchScore"=CASE WHEN pg_input_is_valid(d."content"->>'matchSummary','jsonb') THEN
 CASE WHEN ((d."content"->>'matchSummary')::jsonb->>'score') ~ '^(100|[0-9]{1,2})$' THEN ((d."content"->>'matchSummary')::jsonb->>'score')::integer ELSE NULL END
 ELSE NULL END,
 "matchSnapshot"=jsonb_build_object('kind','draft','id',d."id",'jobRevisionId',d."jobRevisionId",'profileVersionId',d."profileVersionId",'preferenceVersionId',d."preferenceVersionId",'draftRevision',d."revision")
FROM "ApplicationDraft" d WHERE a."selectedDraftId"=d."id";
INSERT INTO "ApplicationEvent" ("id","workspaceId","applicationId","sequence","kind","newStatus","details","origin")
SELECT gen_random_uuid(), "workspaceId", "id", 1, 'migration-baseline', "status", '{"notice":"Observable state at migration; no historical submission inferred."}'::jsonb, 'migration' FROM "Application";
CREATE FUNCTION orbit_preserve_application_event() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Application event history is append-only'; END; $$;
CREATE TRIGGER "ApplicationEvent_append_only" BEFORE UPDATE OR DELETE ON "ApplicationEvent" FOR EACH ROW EXECUTE FUNCTION orbit_preserve_application_event();

CREATE FUNCTION orbit_preserve_application_confirmation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF OLD."appliedAt" IS NOT NULL AND (
  NEW."appliedAt" IS DISTINCT FROM OLD."appliedAt" OR
  NEW."confirmedAt" IS DISTINCT FROM OLD."confirmedAt" OR
  NEW."appliedProvenance" IS DISTINCT FROM OLD."appliedProvenance" OR
  NEW."selectedDraftId" IS DISTINCT FROM OLD."selectedDraftId"
 ) THEN RAISE EXCEPTION 'Original manual application confirmation and selected submission draft are immutable'; END IF;
 RETURN NEW;
END; $$;
CREATE TRIGGER "Application_preserve_confirmation" BEFORE UPDATE ON "Application" FOR EACH ROW EXECUTE FUNCTION orbit_preserve_application_confirmation();
