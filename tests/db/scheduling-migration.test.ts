import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { Client } from "pg";
import { expect, it } from "vitest";
if (
  process.env.ORBIT_TEST_DATABASE !== "disposable" ||
  !process.env.DATABASE_URL?.endsWith("/orbit_test")
)
  throw new Error("Disposable test database required");
it("preserves observed legacy discovery runs without inventing attempts or daily completion", async () => {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  const schema = `scheduling_${randomUUID().replaceAll("-", "_")}`;
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
      "202610120009_tracking",
    ])
      await client.query(
        await readFile(`prisma/migrations/${migration}/migration.sql`, "utf8"),
      );
    const workspace = randomUUID(),
      source = randomUUID(),
      run = randomUUID();
    await client.query(
      'INSERT INTO "Workspace" (id,key,"updatedAt") VALUES ($1,\'synthetic legacy scheduling\',now())',
      [workspace],
    );
    await client.query(
      "INSERT INTO \"Source\" (id,\"workspaceId\",identity,label) VALUES ($1,$2,'synthetic legacy source','Synthetic legacy source')",
      [source, workspace],
    );
    await client.query(
      'INSERT INTO "DiscoveryRun" (id,"workspaceId","sourceId",provider,day,state,fetched,imported,duplicates,"finishedAt") VALUES ($1,$2,$3,\'himalayas\',\'2026-01-01\',\'success\',9,3,2,now())',
      [run, workspace, source],
    );
    await client.query(
      await readFile(
        "prisma/migrations/202610130010_scheduling/migration.sql",
        "utf8",
      ),
    );
    expect(
      (
        await client.query(
          'SELECT state,fetched,imported,duplicates,"processingRunId","attemptCount","lastAttemptAt" FROM "DiscoveryRun" WHERE id=$1',
          [run],
        )
      ).rows[0],
    ).toEqual({
      state: "success",
      fetched: 9,
      imported: 3,
      duplicates: 2,
      processingRunId: null,
      attemptCount: 0,
      lastAttemptAt: null,
    });
    expect(
      (
        await client.query(
          'SELECT count(*)::int AS count FROM "DiscoveryAttempt"',
        )
      ).rows[0].count,
    ).toBe(0);
    expect(
      (await client.query('SELECT count(*)::int AS count FROM "ProcessingRun"'))
        .rows[0].count,
    ).toBe(0);
  } finally {
    await client.query("ROLLBACK");
    await client.end();
  }
});
