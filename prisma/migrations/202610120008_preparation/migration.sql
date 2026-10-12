-- AlterTable
ALTER TABLE "ResumeVersion" ADD COLUMN     "isDefault" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "roleCategory" TEXT;

-- AlterTable
ALTER TABLE "PreferenceVersion" ADD COLUMN     "origin" TEXT NOT NULL DEFAULT 'user';

-- CreateTable
CREATE TABLE "ApplicationDraft" (
    "id" UUID NOT NULL,
    "workspaceId" UUID NOT NULL,
    "jobId" UUID NOT NULL,
    "jobRevisionId" UUID NOT NULL,
    "profileVersionId" UUID NOT NULL,
    "preferenceVersionId" UUID NOT NULL,
    "resumeVersionId" UUID NOT NULL,
    "revision" INTEGER NOT NULL,
    "operation" TEXT NOT NULL,
    "content" JSONB NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApplicationDraft_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OutboundDataLog" (
    "id" UUID NOT NULL,
    "workspaceId" UUID NOT NULL,
    "feature" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "fields" TEXT[],
    "result" TEXT NOT NULL DEFAULT 'attempted',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMPTZ(3),

    CONSTRAINT "OutboundDataLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ApplicationDraft_workspaceId_createdAt_idx" ON "ApplicationDraft"("workspaceId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ApplicationDraft_workspaceId_jobId_revision_key" ON "ApplicationDraft"("workspaceId", "jobId", "revision");

-- CreateIndex
CREATE UNIQUE INDEX "ApplicationDraft_workspaceId_id_key" ON "ApplicationDraft"("workspaceId", "id");

-- CreateIndex
CREATE INDEX "OutboundDataLog_workspaceId_createdAt_idx" ON "OutboundDataLog"("workspaceId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "JobRevision_workspaceId_jobId_id_key" ON "JobRevision"("workspaceId", "jobId", "id");

-- AddForeignKey
ALTER TABLE "ApplicationDraft" ADD CONSTRAINT "ApplicationDraft_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicationDraft" ADD CONSTRAINT "ApplicationDraft_workspaceId_jobId_fkey" FOREIGN KEY ("workspaceId", "jobId") REFERENCES "Job"("workspaceId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicationDraft" ADD CONSTRAINT "ApplicationDraft_workspaceId_jobId_jobRevisionId_fkey" FOREIGN KEY ("workspaceId", "jobId", "jobRevisionId") REFERENCES "JobRevision"("workspaceId", "jobId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicationDraft" ADD CONSTRAINT "ApplicationDraft_workspaceId_profileVersionId_fkey" FOREIGN KEY ("workspaceId", "profileVersionId") REFERENCES "ProfileVersion"("workspaceId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicationDraft" ADD CONSTRAINT "ApplicationDraft_workspaceId_preferenceVersionId_fkey" FOREIGN KEY ("workspaceId", "preferenceVersionId") REFERENCES "PreferenceVersion"("workspaceId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicationDraft" ADD CONSTRAINT "ApplicationDraft_workspaceId_resumeVersionId_fkey" FOREIGN KEY ("workspaceId", "resumeVersionId") REFERENCES "ResumeVersion"("workspaceId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OutboundDataLog" ADD CONSTRAINT "OutboundDataLog_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE UNIQUE INDEX "ResumeVersion_one_default" ON "ResumeVersion" ("workspaceId") WHERE "isDefault" = true AND "revokedAt" IS NULL;
ALTER TABLE "ApplicationDraft" ADD CONSTRAINT "ApplicationDraft_positive_revision" CHECK ("revision" > 0), ADD CONSTRAINT "ApplicationDraft_operation" CHECK ("operation" IN ('prepare','edit','regenerate','discard'));
ALTER TABLE "OutboundDataLog" ADD CONSTRAINT "OutboundDataLog_result" CHECK ("result" IN ('attempted','succeeded','failed'));
ALTER TABLE "PreferenceVersion" ADD CONSTRAINT "PreferenceVersion_origin" CHECK ("origin" IN ('user','defaults'));
CREATE FUNCTION orbit_preserve_draft() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Application draft history is append-only'; END; $$;
CREATE TRIGGER "ApplicationDraft_append_only" BEFORE UPDATE OR DELETE ON "ApplicationDraft" FOR EACH ROW EXECUTE FUNCTION orbit_preserve_draft();
