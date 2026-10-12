import { spawnSync } from "node:child_process";
import { randomBytes, randomUUID } from "node:crypto";
const container = `orbit-test-${randomUUID()}`;
const password = randomBytes(24).toString("hex");
function run(command: string, args: string[], env = process.env) {
  const result = spawnSync(command, args, { stdio: "inherit", env });
  if (result.status !== 0) throw new Error(`Test step failed: ${command}`);
}
try {
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
  const portResult = spawnSync("docker", ["port", container, "5432"], {
    encoding: "utf8",
  });
  const port = portResult.stdout.trim().split(":").at(-1);
  if (!port || !/^\d+$/.test(port))
    throw new Error("Test database port could not be resolved.");
  let ready = false;
  for (let attempt = 0; attempt < 60; attempt++) {
    const result = spawnSync(
      "docker",
      ["exec", container, "pg_isready", "-U", "orbit", "-d", "orbit_test"],
      { stdio: "ignore" },
    );
    if (result.status === 0) {
      ready = true;
      break;
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  if (!ready) throw new Error("Disposable test database did not become ready.");
  const env = {
    ...process.env,
    DATABASE_URL: `postgresql://orbit:${password}@127.0.0.1:${port}/orbit_test`,
    ORBIT_TEST_DATABASE: "disposable",
    ORBIT_MODE: "local",
  };
  run("npx", ["prisma", "migrate", "deploy"], env);
  run("npx", ["vitest", "run", "--config", "vitest.db.config.ts"], env);
} finally {
  spawnSync("docker", ["rm", "--force", "--volumes", container], {
    stdio: "ignore",
  });
}
