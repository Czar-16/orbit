import { readFile } from "node:fs/promises";
import { randomUUID, createHash } from "node:crypto";
import { Client } from "pg";
import { expect, it } from "vitest";
import { unknownEvidence, providedEvidence } from "@/lib/provenance";
import { jobEvidenceSchema } from "@/lib/job-evidence";

if (
  process.env.ORBIT_TEST_DATABASE !== "disposable" ||
  !process.env.DATABASE_URL?.endsWith("/orbit_test")
)
  throw new Error("Dedicated test database required.");

it("upgrades real legacy rows without inventing historical URL/source or changing their content", async () => {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  // Generated identifier only; this isolated schema is rolled back with all its data.
  const schema = `history_${randomUUID().replaceAll("-", "_")}`;
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
    ]) {
      await client.query(
        await readFile(`prisma/migrations/${migration}/migration.sql`, "utf8"),
      );
    }
    const workspaceId = randomUUID(),
      sourceId = randomUUID(),
      jobId = randomUUID(),
      revisionId = randomUUID();
    const hash = createHash("sha256")
      .update("Legacy supplied text")
      .digest("hex");
    const evidence = Object.fromEntries(
      Object.keys(jobEvidenceSchema.shape).map((field) => [
        field,
        field === "description"
          ? providedEvidence("Legacy supplied text")
          : unknownEvidence(),
      ]),
    );
    await client.query(
      'INSERT INTO "Workspace" (id, key, "updatedAt") VALUES ($1, $2, now())',
      [workspaceId, "legacy"],
    );
    await client.query(
      'INSERT INTO "Source" (id, "workspaceId", identity, label) VALUES ($1, $2, $3, $4)',
      [sourceId, workspaceId, "manual", "Current source"],
    );
    await client.query(
      'INSERT INTO "Job" (id, "workspaceId", "sourceId", "listingUrl", "urlHash") VALUES ($1, $2, $3, $4, $5)',
      [jobId, workspaceId, sourceId, "https://example.com/current", hash],
    );
    await client.query(
      'INSERT INTO "JobRevision" (id, "workspaceId", "jobId", revision, description, "contentHash", method, skills, provenance) VALUES ($1, $2, $3, 1, $4, $5, $6, $7, $8)',
      [
        revisionId,
        workspaceId,
        jobId,
        "Legacy supplied text",
        hash,
        "PASTED_DESCRIPTION",
        [],
        evidence,
      ],
    );
    const before = (
      await client.query('SELECT * FROM "JobRevision" WHERE id = $1', [
        revisionId,
      ])
    ).rows[0];
    await client.query(
      await readFile(
        "prisma/migrations/202610120005_listing_history/migration.sql",
        "utf8",
      ),
    );
    const after = (
      await client.query('SELECT * FROM "JobRevision" WHERE id = $1', [
        revisionId,
      ])
    ).rows[0];
    expect(after).toEqual({
      ...before,
      listingUrl: null,
      sourceSnapshot: null,
    });
    expect(after.schemaVersion).toBe(1);
    const columns = await client.query(
      "SELECT column_default FROM information_schema.columns WHERE table_schema = $1 AND table_name = 'JobRevision' AND column_name = 'schemaVersion'",
      [schema],
    );
    expect(columns.rows[0].column_default).toBe("2");
  } finally {
    await client.query("ROLLBACK");
    await client.end();
  }
});
