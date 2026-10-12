import { config } from "dotenv";
import { randomBytes } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { validateEnvironment } from "../src/lib/env";
config({ path: ".env.local", quiet: true });
const url = process.env.DATABASE_URL;
if (!url) {
  const password = randomBytes(32).toString("hex");
  const existing = existsSync(".env.local")
    ? readFileSync(".env.local", "utf8")
    : "";
  if (/^\s*(DATABASE_URL|ORBIT_DB_PASSWORD)\s*=/m.test(existing))
    throw new Error(
      "Existing database configuration requires review; no credentials were overwritten.",
    );
  writeFileSync(
    ".env.local",
    existing +
      `\nORBIT_MODE=local\nORBIT_DB_PASSWORD=${password}\nDATABASE_URL=postgresql://orbit:${password}@127.0.0.1:55432/orbit\n`,
    { mode: 0o600 },
  );
  config({ path: ".env.local", quiet: true, override: true });
}
const environment = validateEnvironment(process.env);
if (!environment.DATABASE_URL) throw new Error("Local database URL required.");
const target = new URL(environment.DATABASE_URL);
if (
  target.hostname !== "127.0.0.1" ||
  target.port !== "55432" ||
  target.pathname !== "/orbit" ||
  target.username !== "orbit" ||
  !process.env.ORBIT_DB_PASSWORD ||
  decodeURIComponent(target.password) !== process.env.ORBIT_DB_PASSWORD
)
  throw new Error(
    "db:setup manages only the dedicated Orbit Compose database on 127.0.0.1:55432/orbit. Use documented migration commands for an explicitly configured existing instance.",
  );
function run(command: string, args: string[]) {
  const result = spawnSync(command, args, {
    stdio: "inherit",
    env: process.env,
  });
  if (result.status !== 0)
    throw new Error(`Database setup step failed: ${command}`);
}
run("docker", [
  "compose",
  "--env-file",
  ".env.local",
  "up",
  "-d",
  "--wait",
  "postgres",
]);
run("npx", ["prisma", "migrate", "deploy"]);
const database = new PrismaClient({
  adapter: new PrismaPg({ connectionString: environment.DATABASE_URL }),
});
try {
  await database.workspace.upsert({
    where: { key: "local" },
    create: { key: "local" },
    update: {},
  });
  console.log(
    "Local database and workspace are ready. Restart Orbit to load local configuration.",
  );
} finally {
  await database.$disconnect();
}
