import { beforeAll, afterAll, describe, it, expect } from "vitest";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import { randomUUID, createHash } from "node:crypto";
import { unknownEvidence, providedEvidence } from "@/lib/provenance";
import { databaseStatus } from "@/lib/db";
import { emptyProfile } from "@/lib/profile-schema";
if (
  process.env.ORBIT_TEST_DATABASE !== "disposable" ||
  !process.env.DATABASE_URL?.endsWith("/orbit_test")
)
  throw new Error(
    "Integration tests require the dedicated disposable test database.",
  );
const database = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});
const hash = createHash("sha256").update("test input").digest("hex");
let workspaceId: string;
let otherWorkspaceId: string;
let sourceId: string;
let jobId: string;
const fields = [
  "title",
  "company",
  "location",
  "workArrangement",
  "employmentType",
  "compensationMin",
  "compensationMax",
  "currency",
  "compensationPeriod",
  "experienceRequirement",
  "skills",
  "description",
];
function revision(revisionNumber: number) {
  return {
    workspaceId,
    jobId,
    revision: revisionNumber,
    method: "PASTED_URL" as const,
    contentHash: hash,
    skills: [],
    provenance: Object.fromEntries(
      fields.map((field) => [field, unknownEvidence()]),
    ),
  };
}
beforeAll(async () => {
  workspaceId = (await database.workspace.create({ data: { key: "foundation" } }))
    .id;
  otherWorkspaceId = (
    await database.workspace.create({ data: { key: "other" } })
  ).id;
  sourceId = (
    await database.source.create({
      data: { workspaceId, identity: "manual", label: "Manual" },
    })
  ).id;
  jobId = (await database.job.create({ data: { workspaceId, sourceId } })).id;
});
afterAll(async () => {
  await database.$disconnect();
});
describe("database foundation", () => {
  it("stores unknown fields and pins a real revision", async () => {
    await database.jobRevision.create({ data: revision(1) });
    const job = await database.job.update({
      where: { id: jobId },
      data: { latestRevisionNumber: 1 },
      include: { latestRevision: true },
    });
    expect(job.latestRevision?.title).toBeNull();
  });
  it("rejects invalid latest pointers and duplicate revisions", async () => {
    await expect(
      database.job.update({
        where: { id: jobId },
        data: { latestRevisionNumber: 99 },
      }),
    ).rejects.toThrow();
    await expect(
      database.jobRevision.create({ data: revision(1) }),
    ).rejects.toThrow();
  });
  it("rejects cross-workspace source links", async () => {
    await expect(
      database.job.create({
        data: { workspaceId: otherWorkspaceId, sourceId },
      }),
    ).rejects.toThrow();
  });
  it("enforces nullable values and provenance together", async () => {
    await expect(
      database.jobRevision.create({
        data: { ...revision(2), title: "Unproven title" },
      }),
    ).rejects.toThrow();
    await expect(
      database.jobRevision.create({ data: { ...revision(2), provenance: {} } }),
    ).rejects.toThrow();
    const entry = revision(2);
    entry.provenance.title = providedEvidence("user entry");
    expect(
      (
        await database.jobRevision.create({
          data: { ...entry, title: "User supplied title" },
        })
      ).title,
    ).toBe("User supplied title");
  });
  it("rejects a resume from another workspace", async () => {
    const resume = await database.resumeVersion.create({
      data: {
        workspaceId: otherWorkspaceId,
        storageKey: `${randomUUID()}.txt`,
        filename: "test.txt",
        mimeType: "text/plain",
        byteSize: 5,
        sha256: hash,
      },
    });
    await expect(
      database.profileVersion.create({
        data: {
          workspaceId,
          revision: 1,
          resumeVersionId: resume.id,
          facts: emptyProfile(),
        },
      }),
    ).rejects.toThrow();
  });
  it("enforces version uniqueness and restrictive deletion", async () => {
    await database.profileVersion.create({
      data: { workspaceId, revision: 1, facts: emptyProfile() },
    });
    await expect(
      database.profileVersion.create({
        data: { workspaceId, revision: 1, facts: emptyProfile() },
      }),
    ).rejects.toThrow();
    await expect(
      database.source.delete({ where: { id: sourceId } }),
    ).rejects.toThrow();
    await expect(
      database.jobRevision.deleteMany({
        where: { workspaceId, jobId, revision: 1 },
      }),
    ).rejects.toThrow();
  });
  it("deduplicates exact supplied URLs within the workspace", async () => {
    await database.job.create({
      data: {
        workspaceId,
        sourceId,
        listingUrl: "https://example.com/jobs/1",
        urlHash: hash,
      },
    });
    await expect(
      database.job.create({
        data: {
          workspaceId,
          sourceId,
          listingUrl: "https://example.com/jobs/1",
          urlHash: hash,
        },
      }),
    ).rejects.toThrow();
  });
  it("cannot enable unreviewed APIs or LinkedIn API intake", async () => {
    await expect(
      database.source.create({
        data: {
          workspaceId,
          identity: "unreviewed-api",
          label: "API",
          kind: "OFFICIAL_API",
          enabled: true,
        },
      }),
    ).rejects.toThrow();
    await expect(
      database.source.create({
        data: {
          workspaceId,
          identity: "linkedin",
          label: "LinkedIn",
          kind: "OFFICIAL_API",
        },
      }),
    ).rejects.toThrow();
  });
  it("rejects incomplete URL pairs, compensation, and profile evidence", async () => {
    await expect(database.job.create({ data: { workspaceId, sourceId, listingUrl: "https://example.com/partial" } })).rejects.toThrow();
    const data = revision(3);
    data.provenance.compensationMin = providedEvidence("user entry");
    await expect(database.jobRevision.create({ data: { ...data, compensationMin: 100 } })).rejects.toThrow();
    await expect(database.profileVersion.create({ data: { workspaceId, revision: 2, facts: {} } })).rejects.toThrow();
  });
  it("reports real database readiness and missing configuration separately", async () => {
    await database.workspace.upsert({ where: { key: "local" }, create: { key: "local" }, update: {} });
    expect((await databaseStatus()).state).toBe("ready");
    const original = process.env.DATABASE_URL;
    try { delete process.env.DATABASE_URL; expect((await databaseStatus()).state).toBe("missing"); }
    finally { process.env.DATABASE_URL = original; }
  });

});
