import { config } from "dotenv";
import { defineConfig } from "prisma/config";
import { validateEnvironment } from "./src/lib/env";
config({ path: ".env.local", quiet: true });
const environment = validateEnvironment(process.env);
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  ...(environment.DATABASE_URL
    ? { datasource: { url: environment.DATABASE_URL } }
    : {}),
});
