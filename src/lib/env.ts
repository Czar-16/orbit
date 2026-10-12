import { z } from "zod";
const environmentSchema = z.object({
  ORBIT_MODE: z.literal("local").default("local"),
  NODE_ENV: z.enum(["development", "production", "test"]).optional(),
});
export function validateEnvironment(input: Record<string, string | undefined>) {
  const result = environmentSchema.safeParse(input);
  if (!result.success) {
    const fields = result.error.issues
      .map((issue) => issue.path.join("."))
      .join(", ");
    throw new Error(
      `Invalid environment configuration: ${fields}. Orbit Phase 1 requires ORBIT_MODE=local and a valid NODE_ENV. See .env.example.`,
    );
  }
  return result.data;
}
