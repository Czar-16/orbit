-- Close SQL NULL loopholes and validate profile evidence at the database boundary.
ALTER TABLE "Job" DROP CONSTRAINT "Job_url_check";
ALTER TABLE "Job" ADD CONSTRAINT "Job_url_check" CHECK (COALESCE(("listingUrl" IS NULL AND "urlHash" IS NULL) OR ("listingUrl" LIKE 'https://%' AND "urlHash" ~ '^[a-f0-9]{64}$'), false));
ALTER TABLE "JobRevision" ADD CONSTRAINT "JobRevision_compensation_complete" CHECK (
 ("compensationMin" IS NULL AND "compensationMax" IS NULL AND currency IS NULL AND "compensationPeriod" IS NULL)
 OR COALESCE(("compensationMin" IS NOT NULL OR "compensationMax" IS NOT NULL) AND currency ~ '^[A-Z]{3}$' AND "compensationPeriod" IN ('hour','month','year'), false)
);
CREATE FUNCTION orbit_valid_fact(fact jsonb) RETURNS boolean LANGUAGE sql IMMUTABLE AS $$
 SELECT COALESCE(jsonb_typeof(fact) = 'object' AND fact ?& ARRAY['value','evidence']
 AND (fact->'value' = 'null'::jsonb OR (jsonb_typeof(fact->'value') = 'string' AND length(trim(fact->>'value')) BETWEEN 1 AND 5000))
 AND orbit_valid_evidence(fact->'evidence', fact->'value' = 'null'::jsonb), false);
$$;
CREATE FUNCTION orbit_valid_profile(facts jsonb) RETURNS boolean LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE field text; skill jsonb;
BEGIN
 IF jsonb_typeof(facts) IS DISTINCT FROM 'object' THEN RETURN false; END IF;
 FOREACH field IN ARRAY ARRAY['name','email','location','headline','experience','education','desiredRoles'] LOOP
  IF NOT orbit_valid_fact(facts->field) THEN RETURN false; END IF;
 END LOOP;
 IF jsonb_typeof(facts->'skills') IS DISTINCT FROM 'array' OR jsonb_array_length(facts->'skills') > 100 THEN RETURN false; END IF;
 FOR skill IN SELECT value FROM jsonb_array_elements(facts->'skills') LOOP
  IF NOT orbit_valid_fact(skill) THEN RETURN false; END IF;
 END LOOP;
 RETURN true;
END;
$$;
ALTER TABLE "ProfileVersion" ADD CONSTRAINT "ProfileVersion_facts_check" CHECK (orbit_valid_profile(facts));
