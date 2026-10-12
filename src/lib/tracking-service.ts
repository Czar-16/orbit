import "server-only";
import { checkedArtifacts } from "@/lib/tailored-artifacts";
import { z } from "zod";
import {
  Prisma,
  type Application,
  type ApplicationDraft,
} from "@/generated/prisma/client";
import { requireWorkspace } from "@/lib/db";
import { InputError } from "@/lib/action-result";
import {
  appliedDate,
  dateAtMidnight,
  requireTransition,
  trackingCommandSchema,
  type TrackingStatus,
} from "@/lib/tracking";
import { draftContentSchema } from "@/lib/preparation";
export async function appendTrackingEvent(
  tx: Prisma.TransactionClient,
  app: Application,
  kind: string,
  origin: "system" | "user-provided",
  data: Prisma.ApplicationUncheckedUpdateInput = {},
  details: Prisma.InputJsonValue = {},
  note: string | null = null,
  occurredAt = new Date(),
) {
  const updated = await tx.application.update({
    where: { id: app.id },
    data: { ...data, revision: app.revision + 1 },
  });
  await tx.applicationEvent.create({
    data: {
      workspaceId: app.workspaceId,
      applicationId: app.id,
      sequence: updated.revision,
      kind,
      previousStatus: app.status,
      newStatus: updated.status,
      origin,
      note,
      details,
      occurredAt,
    },
  });
  return updated;
}
export async function invalidateReadiness(
  tx: Prisma.TransactionClient,
  workspaceId: string,
  kind: "profile-changed" | "preferences-changed",
  versionId: string,
) {
  const ready = await tx.application.findMany({
    where: { workspaceId, status: "READY_TO_APPLY", appliedAt: null },
  });
  for (const app of ready)
    await appendTrackingEvent(
      tx,
      app,
      kind,
      "system",
      { status: "NEEDS_REVIEW" },
      {
        versionId,
        notice:
          "Saved inputs changed; review a current draft before marking ready.",
      },
    );
}
export async function ensureTracking(
  tx: Prisma.TransactionClient,
  workspaceId: string,
  jobId: string,
) {
  const existing = await tx.application.findUnique({
    where: { workspaceId_jobId: { workspaceId, jobId } },
  });
  if (existing) return existing;
  const app = await tx.application.create({ data: { workspaceId, jobId } });
  await tx.applicationEvent.create({
    data: {
      workspaceId,
      applicationId: app.id,
      sequence: 1,
      kind: "import",
      newStatus: "DISCOVERED",
      origin: "system",
      details: { notice: "Job imported; nothing submitted." },
    },
  });
  return app;
}
export function draftMatchProjection(draft: ApplicationDraft) {
  const content = draftContentSchema.parse(draft.content);
  let score: number | null = null;
  try {
    const parsed = z
      .object({ score: z.number().int().min(0).max(100).nullable() })
      .safeParse(JSON.parse(content.matchSummary));
    if (parsed.success) score = parsed.data.score;
  } catch {
    /* Plain historical summaries have no numeric score. */
  }
  return {
    matchScore: score,
    matchSnapshot: {
      kind: "draft",
      id: draft.id,
      jobRevisionId: draft.jobRevisionId,
      profileVersionId: draft.profileVersionId,
      preferenceVersionId: draft.preferenceVersionId,
      draftRevision: draft.revision,
    },
  };
}
export async function trackDraft(
  tx: Prisma.TransactionClient,
  draft: ApplicationDraft,
) {
  const app = await ensureTracking(tx, draft.workspaceId, draft.jobId);
  // Submission evidence and the selected submission draft survive all later preparation.
  if (app.appliedAt || app.status === "ARCHIVED")
    return appendTrackingEvent(
      tx,
      app,
      `draft-${draft.operation}`,
      "system",
      {},
      { draftId: draft.id, preservedTrackingStatus: true },
    );
  let projection: Prisma.ApplicationUncheckedUpdateInput =
    draftMatchProjection(draft);
  if (draft.operation === "discard") {
    const job = await tx.job.findUniqueOrThrow({
      where: { id: draft.jobId },
      include: { latestRevision: true },
    });
    const match = job.latestRevision
      ? await tx.weightedMatch.findFirst({
          where: {
            workspaceId: draft.workspaceId,
            jobRevisionId: job.latestRevision.id,
          },
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        })
      : null;
    projection = {
      matchScore: match?.score ?? null,
      matchSnapshot: match
        ? {
            kind: "recorded-match",
            id: match.id,
            jobRevisionId: match.jobRevisionId,
            profileVersionId: match.profileVersionId,
            preferenceVersionId: match.preferenceVersionId,
            ruleVersion: match.ruleVersion,
          }
        : Prisma.DbNull,
    };
  }
  return appendTrackingEvent(
    tx,
    app,
    `draft-${draft.operation}`,
    "system",
    {
      status: draft.operation === "discard" ? "NEEDS_REVIEW" : "DRAFT_READY",
      selectedDraftId: draft.operation === "discard" ? null : draft.id,
      ...projection,
    },
    { draftId: draft.id },
  );
}
export async function trackJobState(
  tx: Prisma.TransactionClient,
  workspaceId: string,
  jobId: string,
  operation: "save" | "unsave" | "dismiss" | "restore" | "archive",
) {
  const app = await ensureTracking(tx, workspaceId, jobId);
  let data: Prisma.ApplicationUncheckedUpdateInput = {};
  if (!app.appliedAt) {
    if (operation === "dismiss" && app.status === "READY_TO_APPLY")
      data = { status: "NEEDS_REVIEW" };
    if (operation === "archive" && app.status !== "ARCHIVED")
      data = { status: "ARCHIVED", previousStatus: app.status };
    if (
      (operation === "restore" || operation === "save") &&
      app.status === "ARCHIVED"
    )
      data = {
        status: app.previousStatus ?? "DISCOVERED",
        previousStatus: null,
      };
    if (operation === "save" && ["DISCOVERED", "SAVED"].includes(app.status))
      data = { status: "SAVED" };
    if (
      (operation === "unsave" || operation === "dismiss") &&
      app.status === "SAVED"
    )
      data = { status: "DISCOVERED" };
  }
  if (data.status === "READY_TO_APPLY" || data.status === "DRAFT_READY") {
    try {
      await readyDraft(
        tx,
        { ...app, status: data.status, previousStatus: null },
        data.status === "READY_TO_APPLY",
      );
    } catch (error) {
      if (!(error instanceof InputError)) throw error;
      data.status = "NEEDS_REVIEW";
    }
  }
  return appendTrackingEvent(
    tx,
    app,
    `job-${operation}`,
    "user-provided",
    data,
    { notice: "Job visibility is separate from application progress." },
  );
}
async function readyDraft(
  tx: Prisma.TransactionClient,
  app: Application,
  fullyReviewed = true,
) {
  const latest = await tx.applicationDraft.findFirst({
    where: { workspaceId: app.workspaceId, jobId: app.jobId },
    orderBy: { revision: "desc" },
    include: { resume: true, job: true },
  });
  if (
    !latest ||
    latest.id !== app.selectedDraftId ||
    latest.operation === "discard" ||
    latest.resume.revokedAt ||
    latest.job.archivedAt ||
    latest.job.dismissedAt
  )
    throw new InputError(
      "Review a current active draft and restore the job first.",
    );
  const [profile, preference, revision] = await Promise.all([
    tx.profileVersion.findFirst({
      where: { workspaceId: app.workspaceId },
      orderBy: { revision: "desc" },
    }),
    tx.preferenceVersion.findFirst({
      where: { workspaceId: app.workspaceId },
      orderBy: { revision: "desc" },
    }),
    tx.jobRevision.findFirst({
      where: {
        workspaceId: app.workspaceId,
        jobId: app.jobId,
        revision: latest.job.latestRevisionNumber ?? 0,
      },
    }),
  ]);
  const content = draftContentSchema.parse(latest.content);
  if (
    profile?.id !== latest.profileVersionId ||
    preference?.id !== latest.preferenceVersionId ||
    revision?.id !== latest.jobRevisionId ||
    (fullyReviewed &&
      (!content.letter.trim() ||
        content.unresolved.length ||
        content.answers.some((a) => !a.value.trim())))
  )
    throw new InputError(
      "Resolve missing answers and draft warnings, then review a draft using the current job, profile and preferences.",
    );
  if (fullyReviewed) {
    if (!latest.tailoredResumeVersionId)
      throw new InputError(
        "Generate, inspect, approve and select a tailored resume before marking Ready to apply.",
      );
    const { version } = await checkedArtifacts(
      tx,
      app.workspaceId,
      latest.tailoredResumeVersionId,
      true,
    );
    const source = await tx.resumeContentVersion.findFirst({
      where: {
        workspaceId: app.workspaceId,
        resumeVersionId: latest.resumeVersionId,
      },
      orderBy: { revision: "desc" },
    });
    if (
      !source ||
      source.reviewStatus !== "confirmed" ||
      source.id !== version.resumeContentVersionId
    )
      throw new InputError(
        "The reviewed source changed. Generate, approve and select a new tailored version.",
      );
  }
}
export async function trackingCommand(input: unknown) {
  const parsed = trackingCommandSchema.safeParse(input);
  if (!parsed.success)
    throw new InputError(
      "Check tracking fields, dates and confirmation. Reload if needed.",
    );
  const data = parsed.data;
  const { database, workspaceId } = await requireWorkspace();
  return database.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "Workspace" WHERE id=${workspaceId}::uuid FOR UPDATE`;
    const app = await tx.application.findFirst({
      where: { workspaceId, id: data.id },
    });
    if (!app)
      throw new InputError("Application is unavailable in this workspace.");
    if (app.revision !== data.expectedRevision)
      throw new InputError(
        "Tracking changed in another tab. Reload before saving.",
      );
    if (data.operation === "status") {
      requireTransition(app.status, data.status);
      if (!data.confirmed)
        throw new InputError(
          "Confirm this status change after reviewing the application.",
        );
      const update: Prisma.ApplicationUncheckedUpdateInput = {
        status: data.status,
      };
      let occurredAt = new Date();
      if (data.status === "APPLIED") {
        occurredAt = appliedDate(data.date, data.confirmed);
        update.appliedAt = occurredAt;
        update.confirmedAt = new Date();
        update.appliedProvenance = "user-provided";
      }
      if (data.status === "READY_TO_APPLY" || data.status === "DRAFT_READY")
        await readyDraft(tx, app, data.status === "READY_TO_APPLY");
      if (
        ["INTERVIEW", "OFFER", "REJECTED", "WITHDRAWN"].includes(data.status) &&
        !app.appliedAt
      )
        throw new InputError("Confirm your application first.");
      if (data.status === "ARCHIVED") update.previousStatus = app.status;
      return appendTrackingEvent(
        tx,
        app,
        data.status === "APPLIED" ? "manual-applied" : "status",
        "user-provided",
        update,
        { confirmed: true },
        null,
        occurredAt,
      );
    }
    if (data.operation === "restore") {
      if (app.status !== "ARCHIVED" || !app.previousStatus)
        throw new InputError("Only archived applications can be restored.");
      let target: TrackingStatus = app.previousStatus;
      // Archived drafts may have changed or been revoked. Readiness needs a fresh review.
      if (target === "READY_TO_APPLY" || target === "DRAFT_READY") {
        try {
          await readyDraft(tx, app, target === "READY_TO_APPLY");
        } catch (error) {
          if (!(error instanceof InputError)) throw error;
          target = "NEEDS_REVIEW";
        }
      }
      return appendTrackingEvent(
        tx,
        app,
        "restore",
        "user-provided",
        {
          status: target,
          previousStatus: null,
        },
        {
          recordedPreviousStatus: app.previousStatus,
          readinessRecheck:
            target !== app.previousStatus ? "Needs review" : "Passed",
        },
      );
    }
    if (data.operation === "note")
      return appendTrackingEvent(
        tx,
        app,
        "note",
        "user-provided",
        {},
        {},
        data.note,
      );
    if (data.operation === "nextStep")
      return appendTrackingEvent(
        tx,
        app,
        "next-step",
        "user-provided",
        { nextStep: data.nextStep || null },
        { value: data.nextStep || null },
      );
    if (data.operation === "followUp") {
      if (!!data.followUpId !== !!data.followUpRevision)
        throw new InputError("Reload the follow-up before editing.");
      const dueAt = dateAtMidnight(data.date);
      let followUp;
      if (data.followUpId) {
        const current = await tx.followUp.findFirst({
          where: { workspaceId, applicationId: app.id, id: data.followUpId },
        });
        if (
          !current ||
          current.revision !== data.followUpRevision ||
          current.completedAt ||
          current.cancelledAt
        )
          throw new InputError(
            "Follow-up changed or is closed. Reload before editing.",
          );
        followUp = await tx.followUp.update({
          where: { id: current.id },
          data: { label: data.label, dueAt, revision: current.revision + 1 },
        });
      } else
        followUp = await tx.followUp.create({
          data: {
            workspaceId,
            applicationId: app.id,
            label: data.label,
            dueAt,
          },
        });
      return appendTrackingEvent(
        tx,
        app,
        data.followUpId ? "follow-up-edited" : "follow-up-created",
        "user-provided",
        {},
        {
          followUpId: followUp.id,
          label: data.label,
          dueAt: dueAt.toISOString(),
        },
      );
    }
    const followUp = await tx.followUp.findFirst({
      where: { workspaceId, applicationId: app.id, id: data.followUpId },
    });
    if (
      !followUp ||
      followUp.revision !== data.followUpRevision ||
      followUp.completedAt ||
      followUp.cancelledAt
    )
      throw new InputError(
        "Follow-up changed or is closed. Reload before saving.",
      );
    await tx.followUp.update({
      where: { id: followUp.id },
      data: {
        revision: followUp.revision + 1,
        ...(data.operation === "completeFollowUp"
          ? { completedAt: new Date() }
          : { cancelledAt: new Date() }),
      },
    });
    return appendTrackingEvent(
      tx,
      app,
      data.operation === "completeFollowUp"
        ? "follow-up-completed"
        : "follow-up-cancelled",
      "user-provided",
      {},
      { followUpId: followUp.id },
    );
  });
}
