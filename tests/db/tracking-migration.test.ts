import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { emptyProfile } from "@/lib/profile-schema";
import { jobEvidenceSchema } from "@/lib/job-evidence";
import { unknownEvidence, providedEvidence } from "@/lib/provenance";
import { Client } from "pg";
import { expect, it } from "vitest";
if (
  process.env.ORBIT_TEST_DATABASE !== "disposable" ||
  !process.env.DATABASE_URL?.endsWith("/orbit_test")
)
  throw new Error("Disposable test DB required");
it("backfills observed legacy states and pinned draft scores with an honest migration baseline", async () => {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  const schema = `tracking_${randomUUID().replaceAll("-", "_")}`;
  await client.connect();
  try {
    await client.query("BEGIN");
    await client.query(`CREATE SCHEMA ${schema}`);
    await client.query(`SET LOCAL search_path TO ${schema}`);
    for (const migration of [
      "202610120001_foundation",
      "202610120002_integrity",
      "202610120003_matching",
      "202610120004_match_integrity",
      "202610120005_listing_history",
      "202610120006_weighted_matching",
      "202610120007_discovery",
      "202610120008_preparation",
    ])
      await client.query(
        await readFile(`prisma/migrations/${migration}/migration.sql`, "utf8"),
      );
    const workspace = randomUUID(),
      source = randomUUID(),
      resume = randomUUID(),
      profile = randomUUID(),
      preference = randomUUID();
    await client.query(
      'INSERT INTO "Workspace" (id,key,"updatedAt") VALUES ($1,\'legacy\',now())',
      [workspace],
    );
    await client.query(
      "INSERT INTO \"Source\" (id,\"workspaceId\",identity,label) VALUES ($1,$2,'manual','Synthetic baseline source')",
      [source, workspace],
    );
    await client.query(
      'INSERT INTO "ResumeVersion" (id,"workspaceId","storageKey",filename,"mimeType","byteSize",sha256) VALUES ($1,$2,$3,\'synthetic.txt\',\'text/plain\',1,$4)',
      [resume, workspace, `${resume}.txt`, "a".repeat(64)],
    );
    await client.query(
      'INSERT INTO "ProfileVersion" (id,"workspaceId",revision,facts,"resumeVersionId") VALUES ($1,$2,1,$4,$3)',
      [profile, workspace, resume, emptyProfile()],
    );
    await client.query(
      'INSERT INTO "PreferenceVersion" (id,"workspaceId",revision,values) VALUES ($1,$2,1,\'{}\')',
      [preference, workspace],
    );
    for (const kind of [
      "discovered",
      "saved",
      "dismissed",
      "draft",
      "archived-draft",
      "discarded",
    ]) {
      const job = randomUUID(),
        revision = randomUUID();
      await client.query(
        'INSERT INTO "Job" (id,"workspaceId","sourceId","savedAt","dismissedAt","archivedAt") VALUES ($1,$2,$3,$4,$5,$6)',
        [
          job,
          workspace,
          source,
          kind === "saved" ? new Date() : null,
          kind === "dismissed" ? new Date() : null,
          kind === "archived-draft" ? new Date() : null,
        ],
      );
      await client.query(
        'INSERT INTO "JobRevision" (id,"workspaceId","jobId",revision,"schemaVersion",title,"contentHash",method,skills,provenance) VALUES ($1,$2,$3,1,1,$4,$5,\'PASTED_DESCRIPTION\',\'{}\',$6)',
        [
          revision,
          workspace,
          job,
          kind,
          "b".repeat(64),
          Object.fromEntries(
            Object.keys(jobEvidenceSchema.shape).map((key) => [
              key,
              key === "title"
                ? providedEvidence("Synthetic legacy title")
                : unknownEvidence(),
            ]),
          ),
        ],
      );
      await client.query(
        'UPDATE "Job" SET "latestRevisionNumber"=1 WHERE id=$1',
        [job],
      );
      if (kind === "saved")
        await client.query(
          'INSERT INTO "WeightedMatch" (id,"workspaceId","jobRevisionId","profileVersionId","preferenceVersionId","ruleVersion",score,explanation) VALUES ($1,$2,$3,$4,$5,\'weighted-v1\',73,$6)',
          [
            randomUUID(),
            workspace,
            revision,
            profile,
            preference,
            {
              score: 73,
              ruleVersion: "weighted-v1",
              categories: Array.from({ length: 7 }, () => ({})),
              flags: [],
            },
          ],
        );
      if (["draft", "archived-draft", "discarded"].includes(kind)) {
        await client.query(
          'INSERT INTO "ApplicationDraft" (id,"workspaceId","jobId","jobRevisionId","profileVersionId","preferenceVersionId","resumeVersionId",revision,operation,content) VALUES ($1,$2,$3,$4,$5,$6,$7,1,\'prepare\',$8)',
          [
            randomUUID(),
            workspace,
            job,
            revision,
            profile,
            preference,
            resume,
            { matchSummary: JSON.stringify({ score: 42 }) },
          ],
        );
        if (kind === "discarded")
          await client.query(
            'INSERT INTO "ApplicationDraft" (id,"workspaceId","jobId","jobRevisionId","profileVersionId","preferenceVersionId","resumeVersionId",revision,operation,content) VALUES ($1,$2,$3,$4,$5,$6,$7,2,\'discard\',\'{}\')',
            [
              randomUUID(),
              workspace,
              job,
              revision,
              profile,
              preference,
              resume,
            ],
          );
      }
    }
    await client.query(
      await readFile(
        "prisma/migrations/202610120009_tracking/migration.sql",
        "utf8",
      ),
    );
    const rows = (
      await client.query(
        'SELECT a.*,r.title FROM "Application" a JOIN "JobRevision" r ON r."jobId"=a."jobId"',
      )
    ).rows;
    expect(rows).toHaveLength(6);
    for (const row of rows) {
      expect(row.status).toBe(
        row.title === "saved"
          ? "SAVED"
          : row.title === "archived-draft"
            ? "ARCHIVED"
            : row.title === "draft"
              ? "DRAFT_READY"
              : "DISCOVERED",
      );
      expect(row.appliedAt).toBeNull();
      expect(row.confirmedAt).toBeNull();
      if (["draft", "archived-draft"].includes(row.title)) {
        expect(row.matchScore).toBe(42);
        expect(row.matchSnapshot.kind).toBe("draft");
      } else expect(row.selectedDraftId).toBeNull();
      if (row.title === "archived-draft")
        expect(row.previousStatus).toBe("DRAFT_READY");
    }
    const events = (await client.query('SELECT * FROM "ApplicationEvent"'))
      .rows;
    expect(events).toHaveLength(6);
    for (const event of events) {
      expect(event.sequence).toBe(1);
      expect(event.origin).toBe("migration");
      expect(event.kind).toBe("migration-baseline");
      expect(event.details.notice).toContain("no historical submission");
    }
  } finally {
    await client.query("ROLLBACK");
    await client.end();
  }
});
