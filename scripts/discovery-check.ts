import { config } from "dotenv";
import { runDiscovery } from "../src/lib/discovery-service";
import { requireWorkspace } from "../src/lib/db";
// Explicit operational check against permitted public APIs; no test fixtures or submissions.
config({ path: ".env.local", quiet: true });
try {
  console.log(JSON.stringify(await runDiscovery(), null, 2));
} finally {
  const { database } = await requireWorkspace();
  await database.$disconnect();
}
