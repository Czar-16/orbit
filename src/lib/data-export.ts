import "server-only";
import { requireWorkspace } from "@/lib/db";
export const exportEntities = [
  "workspace",
  "profiles",
  "resumes",
  "sources",
  "jobs",
  "jobRevisions",
  "matches",
  "preferences",
  "weightedMatches",
  "drafts",
  "applications",
  "events",
  "followUps",
  "discoveryRuns",
  "outboundLogs",
  "processingRuns",
  "discoveryAttempts",
] as const;
export type ExportEntity = (typeof exportEntities)[number];
export async function exportWorkspace() {
  const { database, workspaceId } = await requireWorkspace();
  return database.$transaction(
    async (tx) => {
      const where = { workspaceId };
      const [
        workspace,
        profiles,
        resumes,
        sources,
        jobs,
        jobRevisions,
        matches,
        preferences,
        weightedMatches,
        drafts,
        applications,
        events,
        followUps,
        discoveryRuns,
        outboundLogs,
        processingRuns,
        discoveryAttempts,
      ] = await Promise.all([
        tx.workspace.findMany({ where: { id: workspaceId } }),
        tx.profileVersion.findMany({ where, orderBy: { revision: "asc" } }),
        tx.resumeVersion.findMany({
          where,
          select: {
            id: true,
            workspaceId: true,
            roleCategory: true,
            isDefault: true,
            filename: true,
            mimeType: true,
            byteSize: true,
            sha256: true,
            createdAt: true,
            revokedAt: true,
          },
        }),
        tx.source.findMany({ where }),
        tx.job.findMany({ where }),
        tx.jobRevision.findMany({
          where,
          orderBy: [{ jobId: "asc" }, { revision: "asc" }],
        }),
        tx.matchResult.findMany({ where }),
        tx.preferenceVersion.findMany({ where, orderBy: { revision: "asc" } }),
        tx.weightedMatch.findMany({ where }),
        tx.applicationDraft.findMany({
          where,
          orderBy: [{ jobId: "asc" }, { revision: "asc" }],
        }),
        tx.application.findMany({ where }),
        tx.applicationEvent.findMany({
          where,
          orderBy: [{ applicationId: "asc" }, { sequence: "asc" }],
        }),
        tx.followUp.findMany({ where }),
        tx.discoveryRun.findMany({ where }),
        tx.outboundDataLog.findMany({ where }),
        tx.processingRun.findMany({ where }),
        tx.discoveryAttempt.findMany({ where }),
      ]);
      return {
        schemaVersion: 2,
        generatedAt: new Date().toISOString(),
        timezone: "Asia/Kolkata",
        notice:
          "Private local export. Resume bytes, storage paths and environment credentials excluded. Unknown values remain null. Not a restore file.",
        tables: {
          workspace,
          profiles,
          resumes,
          sources,
          jobs,
          jobRevisions,
          matches,
          preferences,
          weightedMatches,
          drafts,
          applications,
          events,
          followUps,
          discoveryRuns,
          outboundLogs,
          processingRuns,
          discoveryAttempts,
        },
      };
    },
    { isolationLevel: "RepeatableRead", timeout: 15000 },
  );
}
