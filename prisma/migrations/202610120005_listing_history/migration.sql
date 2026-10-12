-- AlterTable
ALTER TABLE "JobRevision" ADD COLUMN     "listingUrl" TEXT,
ADD COLUMN     "sourceSnapshot" JSONB,
ALTER COLUMN "schemaVersion" SET DEFAULT 2;

-- Retain existing value checks while allowing snapshot-bearing revisions.
ALTER TABLE "JobRevision" DROP CONSTRAINT "JobRevision_values_check";
ALTER TABLE "JobRevision" ADD CONSTRAINT "JobRevision_values_check" CHECK (
 revision > 0 AND "schemaVersion" IN (1, 2) AND "contentHash" ~ '^[a-f0-9]{64}$'
 AND ("compensationMin" IS NULL OR "compensationMin" >= 0)
 AND ("compensationMax" IS NULL OR "compensationMax" >= 0)
 AND ("compensationMin" IS NULL OR "compensationMax" IS NULL OR "compensationMin" <= "compensationMax")
 AND (("compensationMin" IS NULL AND "compensationMax" IS NULL AND currency IS NULL AND "compensationPeriod" IS NULL)
 OR (("compensationMin" IS NOT NULL OR "compensationMax" IS NOT NULL) AND currency ~ '^[A-Z]{3}$' AND "compensationPeriod" IN ('hour','month','year')))
);

-- Legacy rows intentionally retain SQL NULL snapshots; lost history is not backfilled.
CREATE FUNCTION orbit_valid_manual_source_snapshot(snapshot jsonb) RETURNS boolean LANGUAGE sql IMMUTABLE AS $$
 SELECT COALESCE(jsonb_typeof(snapshot) = 'object'
 AND snapshot ?& ARRAY['identity','label','kind','evidence']
 AND snapshot - ARRAY['identity','label','kind','evidence']::text[] = '{}'::jsonb
 AND jsonb_typeof(snapshot->'identity') = 'string' AND length(trim(snapshot->>'identity')) BETWEEN 1 AND 300
 AND jsonb_typeof(snapshot->'label') = 'string' AND length(trim(snapshot->>'label')) BETWEEN 1 AND 300
 AND snapshot->>'kind' = 'MANUAL'
 AND orbit_valid_evidence(snapshot->'evidence', false)
 AND snapshot->'evidence'->>'provenance' = 'user-provided'
 AND snapshot->'evidence'->>'basis' = 'user'
 AND (snapshot->'evidence'->'locator' = 'null'::jsonb OR (jsonb_typeof(snapshot->'evidence'->'locator') = 'string' AND length(snapshot->'evidence'->>'locator') <= 500))
 AND (snapshot->'evidence') - ARRAY['provenance','basis','locator','confirmedAt','confirmedBy']::text[] = '{}'::jsonb, false);
$$;
ALTER TABLE "JobRevision" ADD CONSTRAINT "JobRevision_listing_snapshot_check" CHECK (COALESCE(
 CASE WHEN "schemaVersion" = 1 THEN "listingUrl" IS NULL AND "sourceSnapshot" IS NULL
 WHEN "schemaVersion" = 2 THEN orbit_valid_manual_source_snapshot("sourceSnapshot")
 AND ("listingUrl" IS NULL OR ("listingUrl" LIKE 'https://%' AND length("listingUrl") <= 2048))
 AND orbit_valid_evidence(provenance->'listingUrl', "listingUrl" IS NULL)
 AND ("listingUrl" IS NULL OR (provenance->'listingUrl'->>'provenance' = 'user-provided' AND provenance->'listingUrl'->>'basis' = 'user'))
 ELSE false END, false));
