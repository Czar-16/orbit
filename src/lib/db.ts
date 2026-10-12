import "server-only";
import { cache } from "react";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import { validateEnvironment } from "@/lib/env";
const globalDatabase = globalThis as unknown as {
  orbitDatabase?: PrismaClient;
};
export function getDatabase() {
  const { DATABASE_URL } = validateEnvironment(process.env);
  if (!DATABASE_URL) return null;
  if (!globalDatabase.orbitDatabase) {
    globalDatabase.orbitDatabase = new PrismaClient({
      adapter: new PrismaPg({
        connectionString: DATABASE_URL,
        max: 5,
        connectionTimeoutMillis: 2500,
        idleTimeoutMillis: 10000,
        options: "-c timezone=UTC -c statement_timeout=5000",
      }),
    });
  }
  return globalDatabase.orbitDatabase;
}
export const databaseStatus = cache(async function databaseStatus() {
  const database = getDatabase();
  if (!database)
    return {
      state: "missing" as const,
      label: "Not configured",
      detail: "Run npm run db:setup, then restart Orbit.",
    };
  try {
    await database.$queryRaw`SELECT 1`;
    const workspace = await database.workspace.findUnique({
      where: { key: "local" },
    });
    if (!workspace)
      return {
        state: "pending" as const,
        label: "Workspace setup pending",
        detail: "Run npm run db:setup to create the local workspace.",
      };
    return {
      state: "ready" as const,
      label: "Connected",
      detail: "A real query to the local database succeeded.",
    };
  } catch {
    return {
      state: "unavailable" as const,
      label: "Unavailable",
      detail:
        "Start the local database and apply migrations with npm run db:setup. No successful connection is assumed.",
    };
  }
});
export async function requireWorkspace() {
  const database = getDatabase();
  if (!database)
    throw new Error(
      "Database setup is required. Run npm run db:setup and restart Orbit.",
    );
  const workspace = await database.workspace.findUnique({
    where: { key: "local" },
  });
  if (!workspace)
    throw new Error("The local workspace is missing. Run npm run db:setup.");
  return { database, workspaceId: workspace.id };
}
