-- CreateTable
CREATE TABLE "MatchResult" (
    "id" UUID NOT NULL,
    "workspaceId" UUID NOT NULL,
    "jobRevisionId" UUID NOT NULL,
    "profileVersionId" UUID NOT NULL,
    "ruleVersion" TEXT NOT NULL,
    "score" INTEGER,
    "explanation" JSONB NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MatchResult_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MatchResult_workspaceId_createdAt_idx" ON "MatchResult"("workspaceId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "MatchResult_workspaceId_jobRevisionId_profileVersionId_rule_key" ON "MatchResult"("workspaceId", "jobRevisionId", "profileVersionId", "ruleVersion");

-- AddForeignKey
ALTER TABLE "MatchResult" ADD CONSTRAINT "MatchResult_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchResult" ADD CONSTRAINT "MatchResult_workspaceId_jobRevisionId_fkey" FOREIGN KEY ("workspaceId", "jobRevisionId") REFERENCES "JobRevision"("workspaceId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchResult" ADD CONSTRAINT "MatchResult_workspaceId_profileVersionId_fkey" FOREIGN KEY ("workspaceId", "profileVersionId") REFERENCES "ProfileVersion"("workspaceId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "MatchResult" ADD CONSTRAINT "MatchResult_score_check" CHECK (
 (score IS NULL OR score BETWEEN 0 AND 100) AND COALESCE(explanation->'score' = COALESCE(to_jsonb(score), 'null'::jsonb), false)
 AND "ruleVersion" = 'confirmed-skills-v1' AND explanation->>'ruleVersion' = "ruleVersion"
 AND jsonb_typeof(explanation->'matched') = 'array' AND jsonb_typeof(explanation->'missing') = 'array' AND jsonb_typeof(explanation->'unverified') = 'array'
);
