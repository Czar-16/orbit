ALTER TABLE "MatchResult" DROP CONSTRAINT "MatchResult_score_check";
ALTER TABLE "MatchResult" ADD CONSTRAINT "MatchResult_score_check" CHECK (COALESCE(
 (score IS NULL OR score BETWEEN 0 AND 100) AND explanation->'score' = COALESCE(to_jsonb(score), 'null'::jsonb)
 AND "ruleVersion" = 'confirmed-skills-v1' AND explanation->>'ruleVersion' = "ruleVersion"
 AND jsonb_typeof(explanation->'matched') = 'array' AND jsonb_typeof(explanation->'missing') = 'array' AND jsonb_typeof(explanation->'unverified') = 'array'
 AND (explanation->'reason' = 'null'::jsonb OR jsonb_typeof(explanation->'reason') = 'string'), false));
