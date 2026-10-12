-- CreateTable
CREATE TABLE "PreferenceVersion" (
    "id" UUID NOT NULL,
    "workspaceId" UUID NOT NULL,
    "revision" INTEGER NOT NULL,
    "values" JSONB NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PreferenceVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WeightedMatch" (
    "id" UUID NOT NULL,
    "workspaceId" UUID NOT NULL,
    "jobRevisionId" UUID NOT NULL,
    "profileVersionId" UUID NOT NULL,
    "preferenceVersionId" UUID NOT NULL,
    "ruleVersion" TEXT NOT NULL,
    "score" INTEGER,
    "explanation" JSONB NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WeightedMatch_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PreferenceVersion_workspaceId_revision_key" ON "PreferenceVersion"("workspaceId", "revision");

-- CreateIndex
CREATE UNIQUE INDEX "PreferenceVersion_workspaceId_id_key" ON "PreferenceVersion"("workspaceId", "id");

-- CreateIndex
CREATE INDEX "WeightedMatch_workspaceId_createdAt_idx" ON "WeightedMatch"("workspaceId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "WeightedMatch_workspaceId_jobRevisionId_profileVersionId_pr_key" ON "WeightedMatch"("workspaceId", "jobRevisionId", "profileVersionId", "preferenceVersionId", "ruleVersion");

-- AddForeignKey
ALTER TABLE "PreferenceVersion" ADD CONSTRAINT "PreferenceVersion_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WeightedMatch" ADD CONSTRAINT "WeightedMatch_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WeightedMatch" ADD CONSTRAINT "WeightedMatch_workspaceId_jobRevisionId_fkey" FOREIGN KEY ("workspaceId", "jobRevisionId") REFERENCES "JobRevision"("workspaceId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WeightedMatch" ADD CONSTRAINT "WeightedMatch_workspaceId_profileVersionId_fkey" FOREIGN KEY ("workspaceId", "profileVersionId") REFERENCES "ProfileVersion"("workspaceId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WeightedMatch" ADD CONSTRAINT "WeightedMatch_workspaceId_preferenceVersionId_fkey" FOREIGN KEY ("workspaceId", "preferenceVersionId") REFERENCES "PreferenceVersion"("workspaceId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PreferenceVersion" ADD CONSTRAINT "PreferenceVersion_revision_check" CHECK (revision > 0 AND jsonb_typeof(values) = 'object');
ALTER TABLE "WeightedMatch" ADD CONSTRAINT "WeightedMatch_score_check" CHECK (COALESCE((score IS NULL OR score BETWEEN 0 AND 100) AND explanation->'score' = COALESCE(to_jsonb(score), 'null'::jsonb) AND "ruleVersion" = 'weighted-v1' AND explanation->>'ruleVersion' = "ruleVersion" AND jsonb_typeof(explanation->'categories') = 'array' AND jsonb_array_length(explanation->'categories') = 7 AND jsonb_typeof(explanation->'flags') = 'array', false));
