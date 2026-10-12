import { beforeAll, afterAll, describe, it, expect } from "vitest";
import { randomUUID } from "node:crypto";
import { getDatabase, requireWorkspace } from "@/lib/db";
import {
  ensureDailyRun,
  claimProcessing,
  finishProcessing,
} from "@/lib/processing-service";
import { ensureDiscoverySources } from "@/lib/discovery-service";
import { processSource } from "@/lib/source-processing";
import { processMatchBatch, saveJob } from "@/lib/job-service";
import { defaultPreferences } from "@/lib/preferences";
import { savePreferences } from "@/lib/preference-service";
import { saveProfile } from "@/lib/profile-service";
import { profileDefaults } from "@/lib/profile-input";
import { emptyJob } from "@/lib/job-input";
import { localDate } from "@/lib/time";
import { InputError } from "@/lib/action-result";
if (
  process.env.ORBIT_TEST_DATABASE !== "disposable" ||
  !process.env.DATABASE_URL?.endsWith("/orbit_test")
)
  throw new Error("Disposable test DB required");
let priorId: string | undefined;
let workspaceId: string;
const runIds: string[] = [];
const resolver = async () => [{ address: "8.8.8.8" }];
const fixture = {
  jobs: [
    {
      title: "Software Engineer synthetic scheduling",
      companyName: "Synthetic scheduling",
      description: "React required. Paid remote software development in India.",
      applicationLink: "https://example.com/scheduling-fixture",
      locationRestrictions: ["India"],
      employmentType: "Full Time",
    },
  ],
};
beforeAll(async () => {
  const db = getDatabase()!;
  const prior = await db.workspace.findUnique({ where: { key: "local" } });
  priorId = prior?.id;
  if (prior)
    await db.workspace.update({
      where: { id: prior.id },
      data: { key: `scheduling-prior-${prior.id}` },
    });
  workspaceId = (await db.workspace.create({ data: { key: "local" } })).id;
  await saveProfile({
    ...profileDefaults(undefined, 0),
    skills: "React",
    confirmed: true,
  });
  await ensureDiscoverySources();
});
afterAll(async () => {
  const db = getDatabase()!;
  await db.workspace.update({
    where: { id: workspaceId },
    data: { key: `scheduling-fixtures-${workspaceId}` },
  });
  if (priorId)
    await db.workspace.update({
      where: { id: priorId },
      data: { key: "local" },
    });
  else await db.workspace.create({ data: { key: "local" } });
  await db.$disconnect();
});
async function source(provider = "himalayas", suffix = randomUUID()) {
  return getDatabase()!.source.create({
    data: {
      workspaceId,
      identity: `api:${provider}:${suffix}`,
      label: "Synthetic scheduling source",
      kind: "OFFICIAL_API",
      provider,
      companyQuery: null,
      enabled: true,
      decision: "ALLOWED",
      reviewedAt: new Date(),
      termsUrl: "https://example.com/synthetic-api-permission",
      endpoint: "https://example.com/synthetic-api",
    },
  });
}
async function ageProvider(provider: string) {
  await getDatabase()!.discoveryRun.updateMany({
    where: { workspaceId, provider },
    data: {
      startedAt: new Date(Date.now() - 60_000),
      lastAttemptAt: new Date(Date.now() - 60_000),
    },
  });
}
describe("durable daily orchestration", () => {
  it("deduplicates concurrent startup/manual runs and claims", async () => {
    const runs = await Promise.all([
      ensureDailyRun("startup"),
      ensureDailyRun("manual"),
    ]);
    expect(runs[0].id).toBe(runs[1].id);
    expect(
      await getDatabase()!.preferenceVersion.findUniqueOrThrow({
        where: { id: runs[0].preferenceVersionId! },
      }),
    ).toMatchObject({ origin: "defaults", revision: 1 });
    runIds.push(runs[0].id);
    const claims = await Promise.all([
      claimProcessing(runs[0].id, "first"),
      claimProcessing(runs[0].id, "second"),
    ]);
    expect(claims.filter(Boolean)).toHaveLength(1);
  });
  it("imports a recorded response and commits source success atomically; replay sends no request", async () => {
    const s = await source();
    const result = await processSource(
      s.id,
      runIds[0],
      async () => fixture,
      resolver,
    );
    expect(result).toMatchObject({ state: "success", imported: 1 });
    const db = getDatabase()!;
    const run = await db.discoveryRun.findFirstOrThrow({
      where: { workspaceId, sourceId: s.id },
    });
    expect(run.imported).toBe(1);
    expect(
      await db.discoveryAttempt.count({
        where: { discoveryRunId: run.id, state: "success" },
      }),
    ).toBe(1);
    let calls = 0;
    await processSource(
      s.id,
      runIds[0],
      async () => {
        calls++;
        return fixture;
      },
      resolver,
    );
    expect(calls).toBe(0);
    expect(
      (await db.discoveryRun.findUniqueOrThrow({ where: { id: run.id } }))
        .imported,
    ).toBe(1);
    await expect(
      db.discoveryAttempt.updateMany({
        where: { discoveryRunId: run.id },
        data: { state: "failed", error: "changed" },
      }),
    ).rejects.toThrow();
  });
  it("holds provider spacing and four-attempt quota even when source requests fail", async () => {
    const db = getDatabase()!;
    const s = await source();
    let calls = 0;
    const response = await processSource(
      s.id,
      runIds[0],
      async () => {
        calls++;
        return fixture;
      },
      resolver,
    );
    expect(response.waitMs).toBeGreaterThan(0);
    expect(calls).toBe(0);
    for (let i = 0; i < 3; i++) {
      await ageProvider("himalayas");
      const next = i === 0 ? s : await source();
      expect(
        (
          await processSource(next.id, runIds[0], async () => {
            throw new Error("network");
          })
        ).state,
      ).toBe("failed");
    }
    await ageProvider("himalayas");
    expect(
      (
        await processSource((await source()).id, runIds[0], async () => {
          calls++;
          return fixture;
        })
      ).state,
    ).toContain("quota");
    expect(calls).toBe(0);
    expect(await db.discoveryAttempt.count({ where: { workspaceId } })).toBe(4);
  });
  it("recovers an expired uncertain reservation without repeating its HTTP request", async () => {
    const db = getDatabase()!;
    const s = await source("remoteok");
    const run = await db.discoveryRun.create({
      data: {
        workspaceId,
        sourceId: s.id,
        provider: "remoteok",
        day: localDate(),
        state: "running",
        processingRunId: runIds[0],
        attemptCount: 1,
        lastAttemptAt: new Date(Date.now() - 180_000),
        leaseExpiresAt: new Date(Date.now() - 60_000),
      },
    });
    await db.discoveryAttempt.create({
      data: { workspaceId, discoveryRunId: run.id, number: 1 },
    });
    let calls = 0;
    await processSource(s.id, runIds[0], async () => {
      calls++;
      return [];
    });
    expect(calls).toBe(0);
    expect(
      (await db.discoveryRun.findUniqueOrThrow({ where: { id: run.id } }))
        .state,
    ).toBe("failed");
    expect(
      (
        await db.discoveryAttempt.findFirstOrThrow({
          where: { discoveryRunId: run.id },
        })
      ).state,
    ).toBe("unknown");
  });
  it("rolls back intake and marks failure for an invalid listing URL", async () => {
    const s = await source("jobicy");
    const db = getDatabase()!;
    const before = await db.job.count({ where: { workspaceId } });
    const result = await processSource(
      s.id,
      runIds[0],
      async () => ({
        jobs: [
          {
            id: 1,
            jobTitle: "Software Engineer",
            companyName: "Synthetic",
            jobDescription: "Paid software development in India",
            url: "https://example.com/private-fixture",
            jobGeo: "India",
          },
        ],
      }),
      async () => [{ address: "127.0.0.1" }],
    );
    expect(result.state).toBe("failed");
    expect(await db.job.count({ where: { workspaceId } })).toBe(before);
    expect(
      (await db.discoveryRun.findFirstOrThrow({ where: { sourceId: s.id } }))
        .imported,
    ).toBe(0);
  });
  it("uses the shared manual cap without resetting it during retries", async () => {
    const db = getDatabase()!;
    const pref = await db.preferenceVersion.findFirstOrThrow({
      where: { workspaceId },
      orderBy: { revision: "desc" },
    });
    const saved = await savePreferences({
      expectedRevision: pref.revision,
      values: { ...defaultPreferences, dailyLimit: 1 },
    });
    let calls = 0;
    expect(
      (
        await processSource(
          (await source("remotive")).id,
          runIds[0],
          async () => {
            calls++;
            return { jobs: [] };
          },
        )
      ).state,
    ).toContain("cap");
    expect(calls).toBe(0);
    await expect(
      saveJob({
        ...emptyJob,
        title: "Software Engineer manual cap",
        description: "Synthetic",
      }),
    ).rejects.toThrow("Daily relevant-job limit");
    await savePreferences({
      expectedRevision: saved.revision,
      values: defaultPreferences,
    });
  });
  it("stops a rate-limited provider without sending another query", async () => {
    const s = await source("remotive");
    expect(
      (
        await processSource(s.id, runIds[0], async () => {
          throw new InputError("Source rate limit reached. No retry today.");
        })
      ).state,
    ).toBe("failed");
    await ageProvider("remotive");
    let calls = 0;
    const other = await source("remotive");
    expect(
      (
        await processSource(other.id, runIds[0], async () => {
          calls++;
          return { jobs: [] };
        })
      ).state,
    ).toContain("rate limit");
    expect(calls).toBe(0);
  });
  it("recovers expired worker leases and fences the previous execution", async () => {
    const db = getDatabase()!;
    await db.processingRun.update({
      where: { id: runIds[0] },
      data: { leaseExpiresAt: new Date(Date.now() - 1) },
    });
    const recovered = await claimProcessing(runIds[0], "recovered");
    expect(recovered?.attemptCount).toBe(2);
    expect(await finishProcessing(runIds[0], "first")).toBeNull();
  });
  it("processes stale manual matches once and preserves the daily intake count", async () => {
    const { database } = await requireWorkspace();
    const job = await saveJob({
      ...emptyJob,
      description: "Synthetic manual scheduling fixture",
      skills: "React",
    });
    const profile = await database.profileVersion.findFirstOrThrow({
      where: { workspaceId },
      orderBy: { revision: "desc" },
    });
    await saveProfile({
      ...profileDefaults(undefined, profile.revision),
      skills: "React, TypeScript",
      confirmed: true,
    });
    const count = await database.job.count({ where: { workspaceId } });
    await processMatchBatch(runIds[0]);
    const matched = (
      await database.processingRun.findUniqueOrThrow({
        where: { id: runIds[0] },
      })
    ).matched;
    expect(matched).toBeGreaterThan(0);
    await processMatchBatch(runIds[0]);
    expect(
      (
        await database.processingRun.findUniqueOrThrow({
          where: { id: runIds[0] },
        })
      ).matched,
    ).toBe(matched);
    expect(await database.job.count({ where: { workspaceId } })).toBe(count);
    expect(
      await database.weightedMatch.count({
        where: { jobRevision: { jobId: job.jobId } },
      }),
    ).toBe(2);
  });
  it("finalizes honest partial counts and protects ownership and completed-day replay", async () => {
    expect(await finishProcessing(runIds[0], "wrong-owner")).toBeNull();
    const run = await getDatabase()!.processingRun.findUniqueOrThrow({
      where: { id: runIds[0] },
    });
    const completed = await finishProcessing(run.id, run.executionId!);
    expect(completed).toMatchObject({
      state: "partial",
      fetched: 2,
      imported: 1,
    });
    expect(await claimProcessing(run.id, "another")).toBeNull();
  });
  it("rejects old-day runs, foreign workspaces and invalid SQL counters", async () => {
    const db = getDatabase()!;
    const old = await db.processingRun.create({
      data: {
        workspaceId,
        day: "2026-01-01",
        trigger: "startup",
        dailyLimit: 20,
      },
    });
    expect(await claimProcessing(old.id, "old")).toBeNull();
    const other = await db.workspace.create({
      data: { key: `foreign-${randomUUID()}` },
    });
    const foreign = await db.processingRun.create({
      data: {
        workspaceId: other.id,
        day: localDate(),
        trigger: "manual",
        dailyLimit: 20,
      },
    });
    expect(await claimProcessing(foreign.id, "foreign")).toBeNull();
    await expect(
      db.processingRun.update({
        where: { id: old.id },
        data: { imported: -1 },
      }),
    ).rejects.toThrow();
    const s = await source("remotive");
    await expect(
      db.discoveryRun.create({
        data: {
          workspaceId,
          sourceId: s.id,
          processingRunId: foreign.id,
          day: "2026-01-01",
          provider: "remotive",
          state: "failed",
          finishedAt: new Date(),
        },
      }),
    ).rejects.toThrow();
    await ensureDailyRun("startup");
    expect(
      (await db.processingRun.findUniqueOrThrow({ where: { id: old.id } }))
        .state,
    ).toBe("failed");
  });
});
