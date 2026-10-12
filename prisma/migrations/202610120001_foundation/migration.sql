-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "SourceKind" AS ENUM ('MANUAL', 'OFFICIAL_API');

-- CreateEnum
CREATE TYPE "PolicyDecision" AS ENUM ('NOT_REVIEWED', 'ALLOWED', 'BLOCKED');

-- CreateEnum
CREATE TYPE "IntakeMethod" AS ENUM ('PASTED_URL', 'PASTED_DESCRIPTION', 'IMPORTED_FILE', 'PERMITTED_API');

-- CreateTable
CREATE TABLE "Workspace" (
    "id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Kolkata',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Workspace_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResumeVersion" (
    "id" UUID NOT NULL,
    "workspaceId" UUID NOT NULL,
    "storageKey" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "byteSize" INTEGER NOT NULL,
    "sha256" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMPTZ(3),

    CONSTRAINT "ResumeVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProfileVersion" (
    "id" UUID NOT NULL,
    "workspaceId" UUID NOT NULL,
    "revision" INTEGER NOT NULL,
    "schemaVersion" INTEGER NOT NULL DEFAULT 1,
    "facts" JSONB NOT NULL,
    "resumeVersionId" UUID,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProfileVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Source" (
    "id" UUID NOT NULL,
    "workspaceId" UUID NOT NULL,
    "identity" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "kind" "SourceKind" NOT NULL DEFAULT 'MANUAL',
    "endpoint" TEXT,
    "termsUrl" TEXT,
    "reviewedAt" TIMESTAMPTZ(3),
    "decision" "PolicyDecision" NOT NULL DEFAULT 'NOT_REVIEWED',
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Source_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Job" (
    "id" UUID NOT NULL,
    "workspaceId" UUID NOT NULL,
    "sourceId" UUID NOT NULL,
    "externalId" TEXT,
    "listingUrl" TEXT,
    "urlHash" TEXT,
    "discoveredAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "savedAt" TIMESTAMPTZ(3),
    "dismissedAt" TIMESTAMPTZ(3),
    "archivedAt" TIMESTAMPTZ(3),
    "latestRevisionNumber" INTEGER,

    CONSTRAINT "Job_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobRevision" (
    "id" UUID NOT NULL,
    "workspaceId" UUID NOT NULL,
    "jobId" UUID NOT NULL,
    "revision" INTEGER NOT NULL,
    "schemaVersion" INTEGER NOT NULL DEFAULT 1,
    "description" TEXT,
    "contentHash" TEXT NOT NULL,
    "capturedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "method" "IntakeMethod" NOT NULL,
    "title" TEXT,
    "company" TEXT,
    "location" TEXT,
    "workArrangement" TEXT,
    "employmentType" TEXT,
    "compensationMin" DECIMAL(14,2),
    "compensationMax" DECIMAL(14,2),
    "currency" TEXT,
    "compensationPeriod" TEXT,
    "experienceRequirement" TEXT,
    "skills" TEXT[],
    "provenance" JSONB NOT NULL,

    CONSTRAINT "JobRevision_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Workspace_key_key" ON "Workspace"("key");

-- CreateIndex
CREATE UNIQUE INDEX "ResumeVersion_storageKey_key" ON "ResumeVersion"("storageKey");

-- CreateIndex
CREATE INDEX "ResumeVersion_workspaceId_createdAt_idx" ON "ResumeVersion"("workspaceId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ResumeVersion_workspaceId_id_key" ON "ResumeVersion"("workspaceId", "id");

-- CreateIndex
CREATE INDEX "ProfileVersion_workspaceId_createdAt_idx" ON "ProfileVersion"("workspaceId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ProfileVersion_workspaceId_revision_key" ON "ProfileVersion"("workspaceId", "revision");

-- CreateIndex
CREATE UNIQUE INDEX "ProfileVersion_workspaceId_id_key" ON "ProfileVersion"("workspaceId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "Source_workspaceId_identity_key" ON "Source"("workspaceId", "identity");

-- CreateIndex
CREATE UNIQUE INDEX "Source_workspaceId_id_key" ON "Source"("workspaceId", "id");

-- CreateIndex
CREATE INDEX "Job_workspaceId_discoveredAt_idx" ON "Job"("workspaceId", "discoveredAt");

-- CreateIndex
CREATE INDEX "Job_workspaceId_savedAt_idx" ON "Job"("workspaceId", "savedAt");

-- CreateIndex
CREATE INDEX "Job_workspaceId_archivedAt_idx" ON "Job"("workspaceId", "archivedAt");

-- CreateIndex
CREATE INDEX "Job_workspaceId_sourceId_idx" ON "Job"("workspaceId", "sourceId");

-- CreateIndex
CREATE UNIQUE INDEX "Job_workspaceId_id_key" ON "Job"("workspaceId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "Job_workspaceId_sourceId_externalId_key" ON "Job"("workspaceId", "sourceId", "externalId");

-- CreateIndex
CREATE UNIQUE INDEX "Job_workspaceId_urlHash_key" ON "Job"("workspaceId", "urlHash");

-- CreateIndex
CREATE INDEX "JobRevision_workspaceId_title_idx" ON "JobRevision"("workspaceId", "title");

-- CreateIndex
CREATE INDEX "JobRevision_workspaceId_company_idx" ON "JobRevision"("workspaceId", "company");

-- CreateIndex
CREATE INDEX "JobRevision_workspaceId_location_idx" ON "JobRevision"("workspaceId", "location");

-- CreateIndex
CREATE INDEX "JobRevision_workspaceId_workArrangement_idx" ON "JobRevision"("workspaceId", "workArrangement");

-- CreateIndex
CREATE UNIQUE INDEX "JobRevision_workspaceId_jobId_revision_key" ON "JobRevision"("workspaceId", "jobId", "revision");

-- CreateIndex
CREATE UNIQUE INDEX "JobRevision_workspaceId_id_key" ON "JobRevision"("workspaceId", "id");

-- AddForeignKey
ALTER TABLE "ResumeVersion" ADD CONSTRAINT "ResumeVersion_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfileVersion" ADD CONSTRAINT "ProfileVersion_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfileVersion" ADD CONSTRAINT "ProfileVersion_workspaceId_resumeVersionId_fkey" FOREIGN KEY ("workspaceId", "resumeVersionId") REFERENCES "ResumeVersion"("workspaceId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Source" ADD CONSTRAINT "Source_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Job" ADD CONSTRAINT "Job_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Job" ADD CONSTRAINT "Job_workspaceId_sourceId_fkey" FOREIGN KEY ("workspaceId", "sourceId") REFERENCES "Source"("workspaceId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Job" ADD CONSTRAINT "Job_workspaceId_id_latestRevisionNumber_fkey" FOREIGN KEY ("workspaceId", "id", "latestRevisionNumber") REFERENCES "JobRevision"("workspaceId", "jobId", "revision") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "JobRevision" ADD CONSTRAINT "JobRevision_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobRevision" ADD CONSTRAINT "JobRevision_workspaceId_jobId_fkey" FOREIGN KEY ("workspaceId", "jobId") REFERENCES "Job"("workspaceId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Application-specific invariants are intentional custom migration constraints.
ALTER TABLE "Workspace" ADD CONSTRAINT "Workspace_timezone_check" CHECK (timezone = 'Asia/Kolkata');
ALTER TABLE "ResumeVersion" ADD CONSTRAINT "ResumeVersion_metadata_check" CHECK ("byteSize" > 0 AND "byteSize" <= 5242880 AND sha256 ~ '^[a-f0-9]{64}$' AND "storageKey" ~ '^[a-f0-9-]{36}\.(pdf|txt|docx)$' AND "mimeType" IN ('application/pdf','text/plain','application/vnd.openxmlformats-officedocument.wordprocessingml.document'));
ALTER TABLE "ProfileVersion" ADD CONSTRAINT "ProfileVersion_revision_check" CHECK (revision > 0 AND "schemaVersion" = 1 AND jsonb_typeof(facts) = 'object');
ALTER TABLE "Source" ADD CONSTRAINT "Source_permission_check" CHECK (
  (NOT enabled OR kind = 'MANUAL' OR (decision = 'ALLOWED' AND "reviewedAt" IS NOT NULL AND "termsUrl" IS NOT NULL AND endpoint IS NOT NULL))
  AND (lower(identity) NOT IN ('linkedin','indeed') OR (kind = 'MANUAL' AND NOT enabled AND endpoint IS NULL))
);
ALTER TABLE "Job" ADD CONSTRAINT "Job_url_check" CHECK (("listingUrl" IS NULL AND "urlHash" IS NULL) OR ("listingUrl" LIKE 'https://%' AND "urlHash" ~ '^[a-f0-9]{64}$'));
ALTER TABLE "JobRevision" ADD CONSTRAINT "JobRevision_values_check" CHECK (
 revision > 0 AND "schemaVersion" = 1 AND "contentHash" ~ '^[a-f0-9]{64}$'
 AND ("compensationMin" IS NULL OR "compensationMin" >= 0)
 AND ("compensationMax" IS NULL OR "compensationMax" >= 0)
 AND ("compensationMin" IS NULL OR "compensationMax" IS NULL OR "compensationMin" <= "compensationMax")
 AND (("compensationMin" IS NULL AND "compensationMax" IS NULL AND currency IS NULL AND "compensationPeriod" IS NULL)
 OR (("compensationMin" IS NOT NULL OR "compensationMax" IS NOT NULL) AND currency ~ '^[A-Z]{3}$' AND "compensationPeriod" IN ('hour','month','year')))
);
CREATE FUNCTION orbit_valid_evidence(e jsonb, unknown boolean) RETURNS boolean LANGUAGE sql IMMUTABLE AS $$
 SELECT COALESCE(jsonb_typeof(e) = 'object' AND e ?& ARRAY['provenance','basis','locator','confirmedAt','confirmedBy'] AND
 CASE WHEN unknown THEN e->>'provenance' = 'unknown' AND e->'basis' = 'null'::jsonb AND e->'locator' = 'null'::jsonb AND e->'confirmedAt' = 'null'::jsonb AND e->'confirmedBy' = 'null'::jsonb
 ELSE e->>'provenance' IN ('verified','user-provided','inferred') AND e->>'basis' IN ('user','resume','official','rule','ai')
 AND (e->>'basis' NOT IN ('rule','ai') OR e->>'provenance' = 'inferred')
 AND CASE WHEN e->>'provenance' = 'verified' THEN e->>'basis' IN ('user','resume','official') AND e->>'confirmedBy' = 'user' AND jsonb_typeof(e->'confirmedAt') = 'string'
 ELSE e->'confirmedAt' = 'null'::jsonb AND e->'confirmedBy' = 'null'::jsonb END END, false);
$$;
CREATE FUNCTION orbit_valid_job_provenance(values_json jsonb, evidence jsonb) RETURNS boolean LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE field record;
BEGIN
 IF jsonb_typeof(evidence) IS DISTINCT FROM 'object' THEN RETURN false; END IF;
 FOR field IN SELECT * FROM jsonb_each(values_json) LOOP
  IF NOT orbit_valid_evidence(evidence->field.key, field.value = 'null'::jsonb OR (field.key = 'skills' AND field.value = '[]'::jsonb)) THEN RETURN false; END IF;
 END LOOP;
 RETURN true;
END;
$$;
ALTER TABLE "JobRevision" ADD CONSTRAINT "JobRevision_provenance_check" CHECK (orbit_valid_job_provenance(jsonb_build_object(
 'title', title, 'company', company, 'location', location, 'workArrangement', "workArrangement", 'employmentType', "employmentType", 'compensationMin', "compensationMin", 'compensationMax', "compensationMax", 'currency', currency, 'compensationPeriod', "compensationPeriod", 'experienceRequirement', "experienceRequirement", 'skills', skills, 'description', description
), provenance));
