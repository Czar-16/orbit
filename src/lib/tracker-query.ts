import "server-only";
import { Prisma } from "@/generated/prisma/client";
import { requireWorkspace } from "@/lib/db";
import { dateAtMidnight, trackerFilterSchema } from "@/lib/tracking";
import { todayInterval } from "@/lib/time";
export async function queryTracker(input: unknown) {
  const filters = trackerFilterSchema.parse(input);
  const { database, workspaceId } = await requireWorkspace();
  const where: Prisma.ApplicationWhereInput = {
    workspaceId,
    ...(filters.status === "all" ? {} : { status: filters.status }),
    ...(filters.minScore || filters.maxScore
      ? {
          matchScore: {
            not: null,
            ...(filters.minScore ? { gte: Number(filters.minScore) } : {}),
            ...(filters.maxScore ? { lte: Number(filters.maxScore) } : {}),
          },
        }
      : {}),
    ...(filters.from || filters.to
      ? {
          appliedAt: {
            ...(filters.from ? { gte: dateAtMidnight(filters.from) } : {}),
            ...(filters.to
              ? {
                  lt: new Date(dateAtMidnight(filters.to).getTime() + 86400000),
                }
              : {}),
          },
        }
      : {}),
    job: {
      ...(filters.source
        ? {
            source: {
              label: { contains: filters.source, mode: "insensitive" },
            },
          }
        : {}),
      latestRevision: {
        is: {
          ...(filters.role
            ? { title: { contains: filters.role, mode: "insensitive" } }
            : {}),
          ...(filters.company
            ? { company: { contains: filters.company, mode: "insensitive" } }
            : {}),
          ...(filters.location
            ? { location: { contains: filters.location, mode: "insensitive" } }
            : {}),
        },
      },
    },
  };
  return database.$transaction(
    async (tx) => {
      const total = await tx.application.count({ where });
      const pages = Math.max(1, Math.ceil(total / 20));
      const page = Math.min(Number(filters.page), pages);
      const orderBy: Prisma.ApplicationOrderByWithRelationInput[] =
        filters.sort === "score"
          ? [{ matchScore: { sort: "desc", nulls: "last" } }, { id: "asc" }]
          : filters.sort === "company"
            ? [
                {
                  job: {
                    latestRevision: { company: { sort: "asc", nulls: "last" } },
                  },
                },
                { id: "asc" },
              ]
            : [
                { updatedAt: filters.sort === "oldest" ? "asc" : "desc" },
                { id: "asc" },
              ];
      const entries = await tx.application.findMany({
        where,
        orderBy,
        skip: (page - 1) * 20,
        take: 20,
        include: {
          job: { include: { latestRevision: true, source: true } },
          selectedDraft: true,
          followUps: {
            where: { completedAt: null, cancelledAt: null },
            orderBy: { dueAt: "asc" },
          },
        },
      });
      const [profile, preference] = await Promise.all([
        tx.profileVersion.findFirst({
          where: { workspaceId },
          orderBy: { revision: "desc" },
          select: { id: true },
        }),
        tx.preferenceVersion.findFirst({
          where: { workspaceId },
          orderBy: { revision: "desc" },
          select: { id: true },
        }),
      ]);
      return {
        entries,
        total,
        pages,
        page,
        profileId: profile?.id ?? null,
        preferenceId: preference?.id ?? null,
      };
    },
    { isolationLevel: "RepeatableRead" },
  );
}
export async function trackingMetrics(now = new Date()) {
  const { database, workspaceId } = await requireWorkspace();
  const day = todayInterval(now);
  const pending = { workspaceId, completedAt: null, cancelledAt: null };
  return database.$transaction(
    async (tx) => {
      const [
        relevantToday,
        review,
        prepared,
        applied,
        interviews,
        rejections,
        overdue,
        upcoming,
        events,
        runs,
      ] = await Promise.all([
        tx.job.count({
          where: {
            workspaceId,
            processedRelevant: true,
            discoveredAt: { gte: day.start, lt: day.end },
          },
        }),
        tx.application.count({
          where: { workspaceId, status: "NEEDS_REVIEW" },
        }),
        tx.$queryRaw<
          { count: bigint }[]
        >`SELECT count(*) FROM "Application" a JOIN LATERAL (SELECT "operation" FROM "ApplicationDraft" d WHERE d."workspaceId"=a."workspaceId" AND d."jobId"=a."jobId" ORDER BY "revision" DESC LIMIT 1) d ON true WHERE a."workspaceId"=${workspaceId}::uuid AND d."operation" <> 'discard'`,
        tx.application.count({
          where: { workspaceId, appliedAt: { not: null } },
        }),
        tx.application.count({ where: { workspaceId, status: "INTERVIEW" } }),
        tx.application.count({ where: { workspaceId, status: "REJECTED" } }),
        tx.followUp.count({ where: { ...pending, dueAt: { lt: day.start } } }),
        tx.followUp.count({
          where: {
            ...pending,
            dueAt: {
              gte: day.start,
              lt: new Date(day.start.getTime() + 7 * 86400000),
            },
          },
        }),
        tx.applicationEvent.findMany({
          where: { workspaceId },
          orderBy: [{ recordedAt: "desc" }, { id: "desc" }],
          take: 10,
          include: {
            application: {
              include: { job: { include: { latestRevision: true } } },
            },
          },
        }),
        tx.discoveryRun.findMany({
          where: { workspaceId },
          orderBy: { startedAt: "desc" },
          take: 5,
          include: { source: true },
        }),
      ]);
      return {
        relevantToday,
        review,
        prepared: Number(prepared[0].count),
        applied,
        interviews,
        rejections,
        overdue,
        upcoming,
        events,
        runs,
      };
    },
    { isolationLevel: "RepeatableRead" },
  );
}
