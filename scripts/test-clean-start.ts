// Fresh dependency install and production HTTP acceptance, never the user database.
import assert from "node:assert/strict";
import { spawn, spawnSync, type ChildProcess } from "node:child_process";
import { randomBytes, randomUUID } from "node:crypto";
import { cp, mkdir, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { createServer } from "node:net";
const root = process.cwd();
const temp = await mkdtemp(join(tmpdir(), "orbit-clean-"));
const container = `orbit-clean-${randomUUID()}`;
const password = randomBytes(24).toString("hex");
let app: ChildProcess | undefined;
const env: NodeJS.ProcessEnv = {
  NODE_ENV: "production",
  PATH: process.env.PATH,
  HOME: process.env.HOME,
  ORBIT_MODE: "local",
  ORBIT_SCHEDULER_ENABLED: "false",
  ORBIT_ALLOW_PAID_AI: "false",
  NEXT_TELEMETRY_DISABLED: "1",
};
function run(command: string, args: string[], cwd = temp) {
  const result = spawnSync(command, args, { cwd, env, stdio: "inherit" });
  if (result.status !== 0)
    throw new Error(`Clean-start step failed: ${command}`);
}
async function until(check: () => Promise<boolean>, label: string) {
  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    if (await check()) return;
    await new Promise((done) => setTimeout(done, 500));
  }
  throw new Error(`Timed out: ${label}`);
}
try {
  const files = spawnSync("git", ["ls-files", "-z"], {
    cwd: root,
    encoding: "utf8",
  });
  assert.equal(files.status, 0);
  for (const file of files.stdout.split("\0").filter(Boolean)) {
    assert(!file.startsWith(".env") || file === ".env.example");
    assert(!file.startsWith("private/") && !file.startsWith("src/generated/"));
    await mkdir(dirname(join(temp, file)), { recursive: true });
    await cp(join(root, file), join(temp, file));
  }
  run("npm", ["ci", "--include=dev"]);
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
  const mapped = spawnSync("docker", ["port", container, "5432"], {
    encoding: "utf8",
  });
  const port = mapped.stdout.trim().split(":").at(-1);
  assert(port && /^\d+$/.test(port));
  await until(
    async () =>
      spawnSync(
        "docker",
        ["exec", container, "pg_isready", "-U", "orbit", "-d", "orbit_test"],
        { stdio: "ignore" },
      ).status === 0,
    "PostgreSQL",
  );
  env.DATABASE_URL = `postgresql://orbit:${password}@127.0.0.1:${port}/orbit_test`;
  run("npm", ["run", "db:migrate"]);
  // Only an empty workspace, no jobs, personal facts, enabled sources or run records.
  run("docker", [
    "exec",
    container,
    "psql",
    "-U",
    "orbit",
    "-d",
    "orbit_test",
    "-v",
    "ON_ERROR_STOP=1",
    "-c",
    `INSERT INTO "Workspace" (id, key, "createdAt", "updatedAt") VALUES ('${randomUUID()}', 'local', NOW(), NOW())`,
  ]);
  run("npm", ["run", "build"]);
  const server = createServer();
  await new Promise<void>((done) => server.listen(0, "127.0.0.1", done));
  const address = server.address();
  assert(address && typeof address !== "string");
  const appPort = address.port;
  await new Promise<void>((done) => server.close(() => done()));
  app = spawn(
    process.execPath,
    [
      join(temp, "node_modules/next/dist/bin/next"),
      "start",
      "--hostname",
      "127.0.0.1",
      "--port",
      String(appPort),
    ],
    { cwd: temp, env, stdio: "ignore" },
  );
  const base = `http://127.0.0.1:${appPort}`;
  await until(async () => {
    try {
      return (await fetch(base)).ok;
    } catch {
      return false;
    }
  }, "production app");
  for (const route of [
    "/",
    "/discover",
    "/saved",
    "/queue",
    "/tracker",
    "/profile",
    "/settings",
  ]) {
    const response = await fetch(base + route);
    assert.equal(response.status, 200, route);
    assert(
      !/Internal Server Error|Application error/.test(await response.text()),
      route,
    );
  }
  const snapshot = await fetch(base + "/api/export");
  assert.equal(snapshot.status, 200);
  const data = (await snapshot.json()) as { tables: Record<string, unknown[]> };
  for (const [table, rows] of Object.entries(data.tables))
    if (table !== "workspace" && table !== "sources")
      assert.equal(rows.length, 0, table);
  for (const route of [
    "/api/export",
    `/api/resumes/${randomUUID()}`,
    "/api/inngest",
  ])
    assert.equal(
      (
        await fetch(base + route, {
          headers: { origin: "https://foreign.example" },
        })
      ).status,
      403,
      route,
    );
  assert.equal((await fetch(base + "/api/export?format=invalid")).status, 400);
  assert.equal(
    (await fetch(base + `/api/resumes/${randomUUID()}`)).status,
    404,
  );
  // Exercise documented custom-format restore with synthetic empty-workspace data.
  const dump = spawnSync(
    "docker",
    [
      "exec",
      container,
      "pg_dump",
      "-U",
      "orbit",
      "-d",
      "orbit_test",
      "--format=custom",
    ],
    { maxBuffer: 20 * 1024 * 1024 },
  );
  assert.equal(dump.status, 0);
  run("docker", [
    "exec",
    container,
    "createdb",
    "-U",
    "orbit",
    "orbit_restore",
  ]);
  const restored = spawnSync(
    "docker",
    [
      "exec",
      "-i",
      container,
      "pg_restore",
      "-U",
      "orbit",
      "-d",
      "orbit_restore",
      "--no-owner",
      "--exit-on-error",
    ],
    { input: dump.stdout },
  );
  assert.equal(restored.status, 0);
  const counts = spawnSync(
    "docker",
    [
      "exec",
      container,
      "psql",
      "-U",
      "orbit",
      "-d",
      "orbit_restore",
      "-At",
      "-c",
      'SELECT COUNT(*) FROM "_prisma_migrations"; SELECT COUNT(*) FROM "Workspace"; SELECT COUNT(*) FROM "Job";',
    ],
    { encoding: "utf8" },
  );
  assert.equal(counts.status, 0);
  assert.equal(counts.stdout.trim(), "10\n1\n0");
  console.log(
    "Passed: fresh npm ci, ten migrations, empty workspace, production build, seven HTTP pages, private endpoint guards, export validation and isolated pg_dump/pg_restore. Scheduler disabled; zero source/AI calls.",
  );
} finally {
  if (app && app.exitCode === null) {
    app.kill("SIGTERM");
    await new Promise<void>((done) => {
      const timer = setTimeout(() => {
        app?.kill("SIGKILL");
        done();
      }, 3000);
      app!.once("exit", () => {
        clearTimeout(timer);
        done();
      });
    });
  }
  spawnSync("docker", ["rm", "--force", "--volumes", container], {
    stdio: "ignore",
  });
  await rm(temp, { recursive: true, force: true });
}
