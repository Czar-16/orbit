import { jobEvidenceSchema } from "@/lib/job-evidence";
import { unknownEvidence } from "@/lib/provenance";
import { emptyProfile } from "@/lib/profile-schema";
import { readFile, readdir } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { Client } from "pg";
import { it, expect } from "vitest";
if (
  process.env.ORBIT_TEST_DATABASE !== "disposable" ||
  !process.env.DATABASE_URL?.endsWith("/orbit_test")
)
  throw new Error("Disposable test DB required");
it("preserves legacy ready/applied records and adds nullable draft references without invented approval", async () => {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  const schema = `tailored_${randomUUID().replaceAll("-", "_")}`;
  await client.connect();
  try {
    await client.query("BEGIN");
    await client.query(`CREATE SCHEMA ${schema}`);
    await client.query(`SET LOCAL search_path TO ${schema}`);
    const migrations = (await readdir("prisma/migrations"))
      .filter((name) => /^\d/.test(name))
      .sort();
    for (const migration of migrations.filter(
      (name) => name !== "202610130011_tailored_resume",
    ))
      await client.query(
        await readFile(`prisma/migrations/${migration}/migration.sql`, "utf8"),
      );
    const workspace = randomUUID(),
      source = randomUUID(),
      resume = randomUUID(),
      profile = randomUUID(),
      preference = randomUUID();
    await client.query(
      'INSERT INTO "Workspace" (id,key,"updatedAt") VALUES ($1,\'synthetic-tailored-migration\',now())',
      [workspace],
    );
    await client.query(
      "INSERT INTO \"Source\" (id,\"workspaceId\",identity,label) VALUES ($1,$2,'manual','Synthetic')",
      [source, workspace],
    );
    await client.query(
      'INSERT INTO "ResumeVersion" (id,"workspaceId","storageKey",filename,"mimeType","byteSize",sha256) VALUES ($1,$2,$3,\'synthetic.txt\',\'text/plain\',1,$4)',
      [resume, workspace, `${resume}.txt`, "a".repeat(64)],
    );
    await client.query(
      'INSERT INTO "ProfileVersion" (id,"workspaceId",revision,facts) VALUES ($1,$2,1,$3)',
      [profile, workspace, emptyProfile()],
    );
    await client.query(
      'INSERT INTO "PreferenceVersion" (id,"workspaceId",revision,values) VALUES ($1,$2,1,\'{}\')',
      [preference, workspace],
    );
    for (const status of ["READY_TO_APPLY", "APPLIED"]) {
      const job = randomUUID(),
        revision = randomUUID(),
        draft = randomUUID(),
        app = randomUUID();
      await client.query(
        'INSERT INTO "Job" (id,"workspaceId","sourceId") VALUES ($1,$2,$3)',
        [job, workspace, source],
      );
      await client.query(
        'INSERT INTO "JobRevision" (id,"workspaceId","jobId",revision,"schemaVersion","contentHash",method,skills,provenance) VALUES ($1,$2,$3,1,1,$4,\'PASTED_DESCRIPTION\',\'{}\',$5)',
        [
          revision,
          workspace,
          job,
          "b".repeat(64),
          Object.fromEntries(
            Object.keys(jobEvidenceSchema.shape).map((key) => [
              key,
              unknownEvidence(),
            ]),
          ),
        ],
      );
      await client.query(
        'INSERT INTO "ApplicationDraft" (id,"workspaceId","jobId","jobRevisionId","profileVersionId","preferenceVersionId","resumeVersionId",revision,operation,content) VALUES ($1,$2,$3,$4,$5,$6,$7,1,\'prepare\',\'{"legacy":"preserved"}\')',
        [draft, workspace, job, revision, profile, preference, resume],
      );
      await client.query(
        'INSERT INTO "Application" (id,"workspaceId","jobId",status,"selectedDraftId","updatedAt","appliedAt","confirmedAt","appliedProvenance") VALUES ($1,$2,$3,$4,$5,now(),$6,$6,$7)',
        [
          app,
          workspace,
          job,
          status,
          draft,
          status === "APPLIED" ? new Date("2026-01-01T00:00:00Z") : null,
          status === "APPLIED" ? "user-provided" : null,
        ],
      );
    }
    const before = (
      await client.query('SELECT * FROM "Application" ORDER BY status')
    ).rows;
    await client.query(
      await readFile(
        "prisma/migrations/202610130011_tailored_resume/migration.sql",
        "utf8",
      ),
    );
    expect(
      (await client.query('SELECT * FROM "Application" ORDER BY status')).rows,
    ).toEqual(before);
    const drafts = (
      await client.query(
        'SELECT content,"tailoredResumeVersionId" FROM "ApplicationDraft"',
      )
    ).rows;
    expect(drafts).toHaveLength(2);
    expect(
      drafts.every(
        (d) =>
          d.tailoredResumeVersionId === null &&
          d.content.legacy === "preserved",
      ),
    ).toBe(true);
    expect(
      (
        await client.query(
          'SELECT count(*)::int AS count FROM "TailoredResumeVersion"',
        )
      ).rows[0].count,
    ).toBe(0);
  } finally {
    await client.query("ROLLBACK");
    await client.end();
  }
});
