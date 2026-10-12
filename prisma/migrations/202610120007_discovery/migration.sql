-- AlterTable
ALTER TABLE "Source" ADD COLUMN     "companyQuery" TEXT,
ADD COLUMN     "provider" TEXT,
ADD COLUMN     "removedAt" TIMESTAMPTZ(3);

-- AlterTable
ALTER TABLE "Job" ADD COLUMN     "processedRelevant" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "DiscoveryRun" (
    "id" UUID NOT NULL,
    "workspaceId" UUID NOT NULL,
    "sourceId" UUID NOT NULL,
    "provider" TEXT NOT NULL,
    "day" VARCHAR(10) NOT NULL,
    "state" TEXT NOT NULL,
    "fetched" INTEGER NOT NULL DEFAULT 0,
    "imported" INTEGER NOT NULL DEFAULT 0,
    "duplicates" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,
    "startedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMPTZ(3),

    CONSTRAINT "DiscoveryRun_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DiscoveryRun_workspaceId_provider_day_idx" ON "DiscoveryRun"("workspaceId", "provider", "day");

-- CreateIndex
CREATE UNIQUE INDEX "DiscoveryRun_workspaceId_sourceId_day_key" ON "DiscoveryRun"("workspaceId", "sourceId", "day");

-- AddForeignKey
ALTER TABLE "DiscoveryRun" ADD CONSTRAINT "DiscoveryRun_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiscoveryRun" ADD CONSTRAINT "DiscoveryRun_workspaceId_sourceId_fkey" FOREIGN KEY ("workspaceId", "sourceId") REFERENCES "Source"("workspaceId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DiscoveryRun" ADD CONSTRAINT "DiscoveryRun_state_check" CHECK (state IN ('running','success','failed') AND fetched >= 0 AND imported >= 0 AND duplicates >= 0 AND day ~ '^\d{4}-\d{2}-\d{2}$');
ALTER TABLE "JobRevision" DROP CONSTRAINT "JobRevision_values_check";
ALTER TABLE "JobRevision" ADD CONSTRAINT "JobRevision_values_check" CHECK (revision > 0 AND "schemaVersion" IN (1,2,3) AND "contentHash" ~ '^[a-f0-9]{64}$' AND ("compensationMin" IS NULL OR "compensationMin" >= 0) AND ("compensationMax" IS NULL OR "compensationMax" >= 0) AND ("compensationMin" IS NULL OR "compensationMax" IS NULL OR "compensationMin" <= "compensationMax"));
ALTER TABLE "JobRevision" DROP CONSTRAINT "JobRevision_listing_snapshot_check";
ALTER TABLE "JobRevision" ADD CONSTRAINT "JobRevision_listing_snapshot_check" CHECK (COALESCE(CASE
 WHEN "schemaVersion" = 1 THEN "listingUrl" IS NULL AND "sourceSnapshot" IS NULL
 WHEN "schemaVersion" = 2 THEN orbit_valid_manual_source_snapshot("sourceSnapshot") AND orbit_valid_evidence(provenance->'listingUrl', "listingUrl" IS NULL) AND ("listingUrl" IS NULL OR (provenance->'listingUrl'->>'provenance' = 'user-provided' AND provenance->'listingUrl'->>'basis' = 'user'))
 WHEN "schemaVersion" = 3 THEN "sourceSnapshot"->>'kind' = 'OFFICIAL_API' AND "sourceSnapshot"->'evidence'->>'provenance' = 'inferred' AND "sourceSnapshot"->'evidence'->>'basis' = 'official' AND orbit_valid_evidence("sourceSnapshot"->'evidence',false) AND orbit_valid_evidence(provenance->'listingUrl',"listingUrl" IS NULL) AND ("listingUrl" IS NULL OR (provenance->'listingUrl'->>'provenance'='inferred' AND provenance->'listingUrl'->>'basis'='official')) AND method = 'PERMITTED_API'
 ELSE false END AND ("listingUrl" IS NULL OR ("listingUrl" LIKE 'https://%' AND length("listingUrl") <= 2048)), false));
