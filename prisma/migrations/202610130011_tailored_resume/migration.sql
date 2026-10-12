-- AlterTable
ALTER TABLE "ApplicationDraft" ADD COLUMN     "tailoredResumeVersionId" UUID;

-- CreateTable
CREATE TABLE "ResumeContentVersion" (
    "id" UUID NOT NULL,
    "workspaceId" UUID NOT NULL,
    "resumeVersionId" UUID NOT NULL,
    "profileVersionId" UUID NOT NULL,
    "revision" INTEGER NOT NULL,
    "schemaVersion" INTEGER NOT NULL DEFAULT 1,
    "structuredSource" JSONB NOT NULL,
    "contentHash" TEXT NOT NULL,
    "reviewStatus" TEXT NOT NULL,
    "confirmedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ResumeContentVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TailoredResumeVersion" (
    "id" UUID NOT NULL,
    "workspaceId" UUID NOT NULL,
    "jobId" UUID NOT NULL,
    "jobRevisionId" UUID NOT NULL,
    "resumeVersionId" UUID NOT NULL,
    "profileVersionId" UUID NOT NULL,
    "preferenceVersionId" UUID NOT NULL,
    "resumeContentVersionId" UUID NOT NULL,
    "originatingDraftId" UUID NOT NULL,
    "parentVersionId" UUID,
    "revision" INTEGER NOT NULL,
    "schemaVersion" INTEGER NOT NULL DEFAULT 1,
    "content" JSONB NOT NULL,
    "contentHash" TEXT NOT NULL,
    "generatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approval" JSONB,
    "approvedAt" TIMESTAMPTZ(3),

    CONSTRAINT "TailoredResumeVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResumeArtifact" (
    "id" UUID NOT NULL,
    "workspaceId" UUID NOT NULL,
    "tailoredResumeVersionId" UUID NOT NULL,
    "format" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "byteSize" INTEGER NOT NULL,
    "sha256" TEXT NOT NULL,
    "templateVersion" TEXT NOT NULL,
    "validation" JSONB NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ResumeArtifact_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ResumeContentVersion_workspaceId_resumeVersionId_revision_key" ON "ResumeContentVersion"("workspaceId", "resumeVersionId", "revision");

-- CreateIndex
CREATE UNIQUE INDEX "ResumeContentVersion_workspaceId_resumeVersionId_profileVer_key" ON "ResumeContentVersion"("workspaceId", "resumeVersionId", "profileVersionId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "TailoredResumeVersion_workspaceId_jobId_revision_key" ON "TailoredResumeVersion"("workspaceId", "jobId", "revision");

-- CreateIndex
CREATE UNIQUE INDEX "TailoredResumeVersion_workspaceId_id_key" ON "TailoredResumeVersion"("workspaceId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "TailoredResumeVersion_workspaceId_jobId_id_key" ON "TailoredResumeVersion"("workspaceId", "jobId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "TailoredResumeVersion_workspaceId_jobId_jobRevisionId_resum_key" ON "TailoredResumeVersion"("workspaceId", "jobId", "jobRevisionId", "resumeVersionId", "profileVersionId", "preferenceVersionId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "ResumeArtifact_storageKey_key" ON "ResumeArtifact"("storageKey");

-- CreateIndex
CREATE UNIQUE INDEX "ResumeArtifact_workspaceId_tailoredResumeVersionId_format_key" ON "ResumeArtifact"("workspaceId", "tailoredResumeVersionId", "format");

-- CreateIndex
CREATE UNIQUE INDEX "ApplicationDraft_workspaceId_jobId_jobRevisionId_resumeVers_key" ON "ApplicationDraft"("workspaceId", "jobId", "jobRevisionId", "resumeVersionId", "profileVersionId", "preferenceVersionId", "id");

-- AddForeignKey
ALTER TABLE "ApplicationDraft" ADD CONSTRAINT "ApplicationDraft_workspaceId_jobId_jobRevisionId_resumeVer_fkey" FOREIGN KEY ("workspaceId", "jobId", "jobRevisionId", "resumeVersionId", "profileVersionId", "preferenceVersionId", "tailoredResumeVersionId") REFERENCES "TailoredResumeVersion"("workspaceId", "jobId", "jobRevisionId", "resumeVersionId", "profileVersionId", "preferenceVersionId", "id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "ResumeContentVersion" ADD CONSTRAINT "ResumeContentVersion_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResumeContentVersion" ADD CONSTRAINT "ResumeContentVersion_workspaceId_resumeVersionId_fkey" FOREIGN KEY ("workspaceId", "resumeVersionId") REFERENCES "ResumeVersion"("workspaceId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResumeContentVersion" ADD CONSTRAINT "ResumeContentVersion_workspaceId_profileVersionId_fkey" FOREIGN KEY ("workspaceId", "profileVersionId") REFERENCES "ProfileVersion"("workspaceId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TailoredResumeVersion" ADD CONSTRAINT "TailoredResumeVersion_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TailoredResumeVersion" ADD CONSTRAINT "TailoredResumeVersion_workspaceId_jobId_fkey" FOREIGN KEY ("workspaceId", "jobId") REFERENCES "Job"("workspaceId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TailoredResumeVersion" ADD CONSTRAINT "TailoredResumeVersion_workspaceId_jobId_jobRevisionId_fkey" FOREIGN KEY ("workspaceId", "jobId", "jobRevisionId") REFERENCES "JobRevision"("workspaceId", "jobId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TailoredResumeVersion" ADD CONSTRAINT "TailoredResumeVersion_workspaceId_resumeVersionId_fkey" FOREIGN KEY ("workspaceId", "resumeVersionId") REFERENCES "ResumeVersion"("workspaceId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TailoredResumeVersion" ADD CONSTRAINT "TailoredResumeVersion_workspaceId_profileVersionId_fkey" FOREIGN KEY ("workspaceId", "profileVersionId") REFERENCES "ProfileVersion"("workspaceId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TailoredResumeVersion" ADD CONSTRAINT "TailoredResumeVersion_workspaceId_preferenceVersionId_fkey" FOREIGN KEY ("workspaceId", "preferenceVersionId") REFERENCES "PreferenceVersion"("workspaceId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TailoredResumeVersion" ADD CONSTRAINT "TailoredResumeVersion_workspaceId_resumeVersionId_profileV_fkey" FOREIGN KEY ("workspaceId", "resumeVersionId", "profileVersionId", "resumeContentVersionId") REFERENCES "ResumeContentVersion"("workspaceId", "resumeVersionId", "profileVersionId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TailoredResumeVersion" ADD CONSTRAINT "TailoredResumeVersion_workspaceId_jobId_jobRevisionId_resu_fkey" FOREIGN KEY ("workspaceId", "jobId", "jobRevisionId", "resumeVersionId", "profileVersionId", "preferenceVersionId", "originatingDraftId") REFERENCES "ApplicationDraft"("workspaceId", "jobId", "jobRevisionId", "resumeVersionId", "profileVersionId", "preferenceVersionId", "id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "TailoredResumeVersion" ADD CONSTRAINT "TailoredResumeVersion_workspaceId_jobId_parentVersionId_fkey" FOREIGN KEY ("workspaceId", "jobId", "parentVersionId") REFERENCES "TailoredResumeVersion"("workspaceId", "jobId", "id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "ResumeArtifact" ADD CONSTRAINT "ResumeArtifact_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResumeArtifact" ADD CONSTRAINT "ResumeArtifact_workspaceId_tailoredResumeVersionId_fkey" FOREIGN KEY ("workspaceId", "tailoredResumeVersionId") REFERENCES "TailoredResumeVersion"("workspaceId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;


ALTER TABLE "ResumeContentVersion" ADD CONSTRAINT "ResumeContent_review" CHECK (
  ("reviewStatus" = 'proposed' AND "confirmedAt" IS NULL) OR
  ("reviewStatus" = 'confirmed' AND "confirmedAt" IS NOT NULL));
ALTER TABLE "ResumeArtifact" ADD CONSTRAINT "ResumeArtifact_valid" CHECK (
  "format" IN ('PDF', 'DOCX') AND "byteSize" > 0 AND "byteSize" <= 5242880);
ALTER TABLE "TailoredResumeVersion" ADD CONSTRAINT "TailoredResume_approval_pair" CHECK (
  ("approval" IS NULL) = ("approvedAt" IS NULL));
CREATE FUNCTION orbit_resume_snapshot_immutable() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'Resume content and artifacts are immutable'; END; $$;
CREATE TRIGGER "ResumeContent_append_only" BEFORE UPDATE OR DELETE ON "ResumeContentVersion"
  FOR EACH ROW EXECUTE FUNCTION orbit_resume_snapshot_immutable();
CREATE TRIGGER "ResumeArtifact_append_only" BEFORE UPDATE OR DELETE ON "ResumeArtifact"
  FOR EACH ROW EXECUTE FUNCTION orbit_resume_snapshot_immutable();
CREATE FUNCTION orbit_tailored_approval_only() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'Tailored history is immutable'; END IF;
  IF OLD."approval" IS NOT NULL OR NEW."approval" IS NULL OR NEW."approvedAt" IS NULL
     OR (to_jsonb(OLD) - 'approval' - 'approvedAt') IS DISTINCT FROM (to_jsonb(NEW) - 'approval' - 'approvedAt') THEN
    RAISE EXCEPTION 'Only first approval may update a tailored snapshot';
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER "TailoredResume_approval_only" BEFORE UPDATE OR DELETE ON "TailoredResumeVersion"
  FOR EACH ROW EXECUTE FUNCTION orbit_tailored_approval_only();

ALTER TABLE "ApplicationDraft" DROP CONSTRAINT "ApplicationDraft_operation";
ALTER TABLE "ApplicationDraft" ADD CONSTRAINT "ApplicationDraft_operation" CHECK (
  "operation" IN ('prepare', 'edit', 'regenerate', 'discard', 'select-tailored-resume'));

ALTER TABLE "ResumeContentVersion" ADD CONSTRAINT "ResumeContent_metadata" CHECK (
  revision > 0 AND "schemaVersion" = 1 AND "contentHash" ~ '^[a-f0-9]{64}$' AND jsonb_typeof("structuredSource") = 'object');
ALTER TABLE "TailoredResumeVersion" ADD CONSTRAINT "TailoredResume_metadata" CHECK (
  revision > 0 AND "schemaVersion" = 1 AND "contentHash" ~ '^[a-f0-9]{64}$' AND jsonb_typeof(content) = 'object');
ALTER TABLE "ResumeArtifact" ADD CONSTRAINT "ResumeArtifact_metadata" CHECK (COALESCE(
  sha256 ~ '^[a-f0-9]{64}$' AND "templateVersion" = 'liberation-a4-v1'
  AND "storageKey" ~ '^[a-f0-9-]{36}\.(pdf|docx)$'
  AND jsonb_typeof(validation) = 'object' AND validation->>'passed' = 'true'
  AND ((format = 'PDF' AND "storageKey" LIKE '%.pdf' AND validation->>'validatorVersion' = 'pdf-layout-v1')
    OR (format = 'DOCX' AND "storageKey" LIKE '%.docx' AND validation->>'validatorVersion' = 'docx-text-v1')), false));
CREATE OR REPLACE FUNCTION orbit_tailored_approval_only() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE artifact_count integer;
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.approval IS NOT NULL OR NEW."approvedAt" IS NOT NULL THEN RAISE EXCEPTION 'Generate unapproved snapshots before approval'; END IF;
    IF NOT EXISTS (SELECT 1 FROM "ResumeContentVersion" s WHERE s.id = NEW."resumeContentVersionId" AND s."workspaceId" = NEW."workspaceId" AND s."reviewStatus" = 'confirmed') THEN
      RAISE EXCEPTION 'Reviewed source required';
    END IF;
    RETURN NEW;
  END IF;
  IF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'Tailored history is immutable'; END IF;
  IF OLD.approval IS NOT NULL OR NEW.approval IS NULL OR NEW."approvedAt" IS NULL
    OR (to_jsonb(OLD) - 'approval' - 'approvedAt') IS DISTINCT FROM (to_jsonb(NEW) - 'approval' - 'approvedAt') THEN
    RAISE EXCEPTION 'Only first approval may update a tailored snapshot';
  END IF;
  SELECT count(*) INTO artifact_count FROM "ResumeArtifact" a
    WHERE a."workspaceId" = NEW."workspaceId" AND a."tailoredResumeVersionId" = NEW.id
    AND a.sha256 = NEW.approval->'artifactHashes'->>a.format
    AND a."templateVersion" = NEW.approval->>'templateVersion' AND a.validation->>'passed' = 'true';
  IF artifact_count <> 2 OR COALESCE(NEW.approval->>'contentHash' <> NEW."contentHash", true)
    OR COALESCE(NEW.approval->>'pdfInspected' <> 'true', true) THEN RAISE EXCEPTION 'Exact validated content and artifact hashes required'; END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER "TailoredResume_approval_only" ON "TailoredResumeVersion";
CREATE TRIGGER "TailoredResume_approval_only" BEFORE INSERT OR UPDATE OR DELETE ON "TailoredResumeVersion"
  FOR EACH ROW EXECUTE FUNCTION orbit_tailored_approval_only();
