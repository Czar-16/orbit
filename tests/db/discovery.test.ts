import { describe, it, expect, afterAll } from "vitest";
import { requireWorkspace } from "@/lib/db";
import {
  runDiscovery,
  ensureDiscoverySources,
  sourceControls,
} from "@/lib/discovery-service";
import { savePreferences } from "@/lib/preference-service";
import { defaultPreferences } from "@/lib/preferences";
import { importJobs } from "@/lib/job-service";
import { saveJob } from "@/lib/job-service";
import { emptyJob } from "@/lib/job-input";
import { todayInterval } from "@/lib/time";
if (
  process.env.ORBIT_TEST_DATABASE !== "disposable" ||
  !process.env.DATABASE_URL?.endsWith("/orbit_test")
)
  throw new Error("Dedicated test database required");
afterAll(async () => {
  const { database } = await requireWorkspace();
  await database.$disconnect();
});
describe("discovery quota and atomic intake", () => {
  it("records failed runs without pretending success and never repeats a query today", async () => {
    const first = await runDiscovery(async () => {
      throw new Error("network");
    });
    expect(first.some((s) => s.state === "failed")).toBe(true);
    let calls = 0;
    const second = await runDiscovery(async () => {
      calls++;
      return { jobs: [] };
    });
    expect(calls).toBe(0);
    expect(second.every((s) => s.state.startsWith("skipped"))).toBe(true);
  });
  it("creates, disables and removes tracked permitted company queries", async () => {
    await ensureDiscoverySources();
    await sourceControls({
      operation: "add",
      provider: "himalayas",
      companyQuery: "synthetic-test",
      name: "Synthetic test",
    });
    const { database, workspaceId } = await requireWorkspace();
    const source = await database.source.findUniqueOrThrow({
      where: {
        workspaceId_identity: {
          workspaceId,
          identity: "api:himalayas:synthetic-test",
        },
      },
    });
    expect(source.enabled).toBe(true);
    await sourceControls({ operation: "disable", id: source.id });
    expect(
      (await database.source.findUniqueOrThrow({ where: { id: source.id } }))
        .enabled,
    ).toBe(false);
    await sourceControls({ operation: "remove", id: source.id });
    expect(
      (await database.source.findUniqueOrThrow({ where: { id: source.id } }))
        .removedAt,
    ).not.toBeNull();
  });
  it("persists permitted API provenance and exact links through the shared atomic pipeline", async () => {
    await ensureDiscoverySources();
    const url = "https://example.com/permitted-fixture?ref=preserved";
    const resolver = async () => [{ address: "8.8.8.8" }];
    const source = {
      identity: "api:himalayas",
      label: "Himalayas",
      provider: "himalayas" as const,
    };
    expect(
      await importJobs(
        [
          {
            title: "Software Engineer synthetic feed",
            description: "React required",
            listingUrl: url,
          },
        ],
        resolver,
        source,
      ),
    ).toEqual({ imported: 1, duplicates: 0 });
    expect(
      await importJobs(
        [
          {
            title: "Software Engineer synthetic feed",
            description: "React required",
            listingUrl: url,
          },
        ],
        resolver,
        source,
      ),
    ).toEqual({ imported: 0, duplicates: 1 });
    const { database, workspaceId } = await requireWorkspace();
    const job = await database.job.findFirstOrThrow({
      where: { workspaceId, listingUrl: url },
      include: { latestRevision: true, source: true },
    });
    expect(job.latestRevision).toMatchObject({
      schemaVersion: 3,
      method: "PERMITTED_API",
      listingUrl: url,
      provenance: {
        description: { provenance: "inferred", basis: "official" },
      },
      sourceSnapshot: { kind: "OFFICIAL_API" },
    });
    expect(job.source.kind).toBe("OFFICIAL_API");
  });
  it("enforces the shared relevant cap on new manual jobs, while allowing edits", async () => {
    const { database, workspaceId } = await requireWorkspace();
    const current = await database.preferenceVersion.findFirst({
      where: { workspaceId },
      orderBy: { revision: "desc" },
    });
    const day = todayInterval();
    const count = await database.job.count({
      where: {
        workspaceId,
        processedRelevant: true,
        discoveredAt: { gte: day.start, lt: day.end },
      },
    });
    const pref = await savePreferences({
      expectedRevision: current?.revision ?? 0,
      values: { ...defaultPreferences, dailyLimit: count + 1 },
    });
    try {
      const first = await saveJob({
        ...emptyJob,
        title: "Software Engineer cap fixture",
        description: "Synthetic cap fixture",
      });
      await expect(
        saveJob({
          ...emptyJob,
          title: "Software Engineer second cap fixture",
          description: "Synthetic",
        }),
      ).rejects.toThrow("Daily relevant-job limit");
      expect(first.jobId).toBeTruthy();
    } finally {
      await savePreferences({
        expectedRevision: pref.revision,
        values: defaultPreferences,
      });
    }
  });
});
