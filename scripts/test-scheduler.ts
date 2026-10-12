// Real local Inngest smoke test. All state is disposable; external sources are
// disabled before Orbit starts. No fixture is written to the normal database.
import { spawn, spawnSync, type ChildProcess } from "node:child_process";
import { randomBytes, randomUUID } from "node:crypto";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { Inngest } from "inngest";
import { defaultPreferences } from "../src/lib/preferences";
import { emptyProfile } from "../src/lib/profile-schema";
import { unknownEvidence, providedEvidence } from "../src/lib/provenance";
import { jobEvidenceSchema } from "../src/lib/job-evidence";
import { localDate } from "../src/lib/time";
import assert from "node:assert/strict";

const container = `orbit-scheduler-test-${randomUUID()}`;
const password = randomBytes(24).toString("hex");
const root = process.cwd();
const temp = await mkdtemp(resolve(tmpdir(), "orbit-scheduler-"));
const nextEnvBefore = await readFile(resolve(root, "next-env.d.ts"), "utf8");
let database: PrismaClient | undefined;
const children: ChildProcess[] = [];
function run(command: string, args: string[], env = process.env) {
  const result = spawnSync(command, args, { stdio: "inherit", env });
  if (result.status !== 0) throw new Error(`Smoke step failed: ${command}`);
}
async function until(
  check: () => Promise<boolean>,
  label: string,
  limit = 60_000,
) {
  const end = Date.now() + limit;
  while (Date.now() < end) {
    if (await check()) return;
    await new Promise((done) => setTimeout(done, 500));
  }
  throw new Error(`Timed out: ${label}`);
}
async function portFree(port: number) {
  const { createServer } = await import("node:net");
  const server = createServer();
  await new Promise<void>((done, reject) => {
    server.once("error", reject);
    server.listen(port, "127.0.0.1", done);
  });
  await new Promise<void>((done) => server.close(() => done()));
}
try {
  await portFree(8288);
  await portFree(3178);
  run("docker", [
    "run",
    "--detach",
    "--name",
    container,
    "--label",
    "orbit.disposable-test=true",
    "-p",
    "127.0.0.1::5432",
    "-e",
    "POSTGRES_DB=orbit_test",
    "-e",
    "POSTGRES_USER=orbit",
    "-e",
    `POSTGRES_PASSWORD=${password}`,
    "postgres:18.6-alpine",
  ]);
  const result = spawnSync("docker", ["port", container, "5432"], {
    encoding: "utf8",
  });
  const port = result.stdout.trim().split(":").at(-1);
  if (!port || !/^\d+$/.test(port))
    throw new Error("Disposable database port missing");
  await until(
    async () =>
      spawnSync(
        "docker",
        ["exec", container, "pg_isready", "-U", "orbit", "-d", "orbit_test"],
        { stdio: "ignore" },
      ).status === 0,
    "PostgreSQL ready",
  );
  const env = {
    ...process.env,
    DATABASE_URL: `postgresql://orbit:${password}@127.0.0.1:${port}/orbit_test`,
    ORBIT_TEST_DATABASE: "disposable",
    ORBIT_MODE: "local",
    ORBIT_SCHEDULER_ENABLED: "true",
    INNGEST_CONFIG_DIR: resolve(temp, "config"),
  };
  run("npx", ["prisma", "migrate", "deploy"], env);
  database = new PrismaClient({
    adapter: new PrismaPg({ connectionString: env.DATABASE_URL }),
  });
  const workspace = await database.workspace.create({ data: { key: "local" } });
  await database.preferenceVersion.create({
    data: {
      workspaceId: workspace.id,
      revision: 1,
      values: defaultPreferences,
    },
  });
  await database.profileVersion.create({
    data: { workspaceId: workspace.id, revision: 1, facts: emptyProfile() },
  });
  for (const provider of ["himalayas", "remotive", "jobicy", "remoteok"])
    await database.source.create({
      data: {
        workspaceId: workspace.id,
        identity: `api:${provider}`,
        label: `${provider} disabled smoke fixture`,
        provider,
        kind: "OFFICIAL_API",
        enabled: false,
      },
    });
  const source = await database.source.create({
    data: {
      workspaceId: workspace.id,
      identity: "manual",
      label: "Synthetic smoke manual source",
    },
  });
  const job = await database.job.create({
    data: { workspaceId: workspace.id, sourceId: source.id },
  });
  const provenance = jobEvidenceSchema.parse(
    Object.fromEntries(
      [
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
        "listingUrl",
      ].map((field) => [
        field,
        field === "description"
          ? providedEvidence("Synthetic test text")
          : unknownEvidence(),
      ]),
    ),
  );
  await database.jobRevision.create({
    data: {
      workspaceId: workspace.id,
      jobId: job.id,
      revision: 1,
      schemaVersion: 2,
      sourceSnapshot: {
        identity: "manual",
        label: source.label,
        kind: "MANUAL",
        evidence: providedEvidence("Synthetic test source"),
      },
      method: "PASTED_DESCRIPTION",
      description: "Synthetic manual job; no personal facts",
      contentHash: "a".repeat(64),
      provenance,
    },
  });
  await database.job.update({
    where: { id: job.id },
    data: { latestRevisionNumber: 1 },
  });
  // A sequence survives transaction rollback: force two real scoring failures,
  // then verify the local runtime retries the step and commits exactly once.
  await database.$executeRawUnsafe(
    "CREATE SEQUENCE synthetic_scheduler_retries",
  );
  await database.$executeRawUnsafe(
    `CREATE FUNCTION synthetic_scheduler_retry() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF nextval('synthetic_scheduler_retries') <= 2 THEN RAISE EXCEPTION 'Synthetic retry fixture'; END IF; RETURN NEW; END; $$`,
  );
  await database.$executeRawUnsafe(
    'CREATE TRIGGER synthetic_scheduler_retry BEFORE INSERT ON "WeightedMatch" FOR EACH ROW EXECUTE FUNCTION synthetic_scheduler_retry()',
  );
  const app = spawn(
    process.execPath,
    [
      resolve(root, "node_modules/next/dist/bin/next"),
      "start",
      "--hostname",
      "127.0.0.1",
      "--port",
      "3178",
    ],
    { cwd: root, env, stdio: ["ignore", "pipe", "pipe"] },
  );
  children.push(app);
  let appLog = "";
  app.stdout?.on("data", (data: Buffer) => {
    appLog += data.toString();
  });
  app.stderr?.on("data", (data: Buffer) => {
    appLog += data.toString();
  });
  await until(async () => {
    try {
      return (await fetch("http://127.0.0.1:3178/api/inngest")).ok;
    } catch {
      return false;
    }
  }, "Orbit startup");
  const pending = await database.processingRun.findUniqueOrThrow({
    where: { workspaceId_day: { workspaceId: workspace.id, day: localDate() } },
  });
  assert.equal(pending.state, "queued");
  assert.match(pending.error ?? "", /unavailable/);
  console.log(
    "Passed: real app startup creates today's catch-up; unavailable local runtime stays pending.",
  );
  const cli = spawn(
    resolve(root, "node_modules/.bin/inngest-cli"),
    [
      "dev",
      "--host",
      "127.0.0.1",
      "--no-discovery",
      "--retry-interval",
      "1",
      "--sdk-url",
      "http://127.0.0.1:3178/api/inngest",
    ],
    { cwd: temp, env, stdio: ["ignore", "pipe", "pipe"] },
  );
  children.push(cli);
  let cliLog = "";
  cli.stdout?.on("data", (data: Buffer) => {
    cliLog += data.toString();
  });
  cli.stderr?.on("data", (data: Buffer) => {
    cliLog += data.toString();
  });
  await until(async () => {
    try {
      return (await fetch("http://127.0.0.1:8288")).ok;
    } catch {
      return false;
    }
  }, "Inngest local runtime");
  // Allow the CLI's SDK registration to finish, then use its actual event API.
  await new Promise((done) => setTimeout(done, 1500));
  const client = new Inngest({
    id: "orbit-local-smoke",
    isDev: true,
    baseUrl: "http://127.0.0.1:8288",
    eventKey: "orbit-local-only",
  });
  await client.send({
    name: "orbit/daily.requested",
    data: { runId: pending.id },
  });
  try {
    await until(
      async () =>
        (
          await database!.processingRun.findUniqueOrThrow({
            where: { id: pending.id },
          })
        ).state === "success",
      "real durable daily execution",
    );
  } catch (error) {
    // Logs contain only synthetic disposable fixtures. Do not print env/URLs.
    await writeFile(resolve(temp, "app.log"), appLog);
    await writeFile(resolve(temp, "inngest.log"), cliLog);
    console.error(`Synthetic smoke logs retained at ${temp}`);
    throw error;
  }
  const completed = await database.processingRun.findUniqueOrThrow({
    where: { id: pending.id },
  });
  assert.equal(completed.trigger, "startup");
  assert.equal(completed.matched, 1);
  assert.equal(completed.imported, 0);
  assert.equal(completed.attemptCount, 1);
  assert.equal(await database.discoveryAttempt.count(), 0);
  assert.equal(await database.weightedMatch.count(), 1);
  const attempts = await database.$queryRawUnsafe<{ last_value: bigint }[]>(
    "SELECT last_value FROM synthetic_scheduler_retries",
  );
  assert.equal(Number(attempts[0].last_value), 3);
  await client.send({
    name: "orbit/daily.requested",
    data: { runId: pending.id },
  });
  await new Promise((done) => setTimeout(done, 2500));
  assert.equal(
    (
      await database.processingRun.findUniqueOrThrow({
        where: { id: pending.id },
      })
    ).attemptCount,
    1,
  );
  assert.equal(await database.weightedMatch.count(), 1);
  const page = await fetch("http://127.0.0.1:3178/discover");
  assert.equal(page.status, 200);
  assert.match(await page.text(), /Daily processing/);
  const blocked = await fetch("http://127.0.0.1:3178/api/inngest", {
    headers: { origin: "https://evil.example" },
  });
  assert.equal(blocked.status, 403);
  // Exercise the real onFailure callback after two retries, with a separate
  // synthetic run and a permanent database-step fault.
  await database.$executeRawUnsafe(
    'DROP TRIGGER synthetic_scheduler_retry ON "WeightedMatch"',
  );
  await database.$executeRawUnsafe(
    `CREATE FUNCTION synthetic_scheduler_failure() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Synthetic permanent fault'; END; $$`,
  );
  await database.$executeRawUnsafe(
    'CREATE TRIGGER synthetic_scheduler_failure BEFORE INSERT ON "WeightedMatch" FOR EACH ROW EXECUTE FUNCTION synthetic_scheduler_failure()',
  );
  const secondJob = await database.job.create({
    data: { workspaceId: workspace.id, sourceId: source.id },
  });
  await database.jobRevision.create({
    data: {
      workspaceId: workspace.id,
      jobId: secondJob.id,
      revision: 1,
      schemaVersion: 2,
      method: "PASTED_DESCRIPTION",
      sourceSnapshot: {
        identity: "manual",
        label: source.label,
        kind: "MANUAL",
        evidence: providedEvidence("Synthetic test source"),
      },
      description: "Synthetic manual job; no personal facts",
      contentHash: "b".repeat(64),
      provenance,
    },
  });
  await database.job.update({
    where: { id: secondJob.id },
    data: { latestRevisionNumber: 1 },
  });
  await database.processingRun.update({
    where: { id: pending.id },
    data: { day: "2026-01-01" },
  });
  const failing = await database.processingRun.upsert({
    where: { workspaceId_day: { workspaceId: workspace.id, day: localDate() } },
    create: {
      workspaceId: workspace.id,
      day: localDate(),
      trigger: "manual",
      dailyLimit: 20,
    },
    update: {},
  });
  await client.send({
    name: "orbit/daily.requested",
    data: { runId: failing.id },
  });
  await until(
    async () =>
      (
        await database!.processingRun.findUniqueOrThrow({
          where: { id: failing.id },
        })
      ).state === "failed",
    "bounded retries and durable onFailure reporting",
  );
  assert.equal(
    (
      await database.processingRun.findUniqueOrThrow({
        where: { id: failing.id },
      })
    ).matched,
    0,
  );
  assert.equal(await database.weightedMatch.count(), 1);
  console.log(
    "Passed: real local SDK registration, event delivery, durable execution, two retries then atomic scoring, replay protection, exhausted-retry failure reporting, progress HTTP and cross-origin rejection. Zero source requests.",
  );
} finally {
  for (const child of children.reverse()) {
    child.kill("SIGTERM");
    await new Promise<void>((done) => {
      if (child.exitCode !== null) return done();
      const timer = setTimeout(() => {
        child.kill("SIGKILL");
        done();
      }, 3000);
      child.once("exit", () => {
        clearTimeout(timer);
        done();
      });
    });
  }
  await database?.$disconnect();
  spawnSync("docker", ["rm", "--force", "--volumes", container], {
    stdio: "ignore",
  });
  await writeFile(resolve(root, "next-env.d.ts"), nextEnvBefore);
  // Retain logs on failure only; no local database credentials are persisted.
  if (
    await readFile(resolve(temp, "app.log"), "utf8").then(
      () => false,
      () => true,
    )
  )
    await rm(temp, { recursive: true, force: true });
}
