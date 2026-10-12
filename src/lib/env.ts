import { z } from "zod";
export const localDatabaseUrlSchema = z
  .string()
  .url()
  .refine((value) => {
    try {
      const url = new URL(value);
      return (
        ["postgres:", "postgresql:"].includes(url.protocol) &&
        ["127.0.0.1", "localhost", "[::1]"].includes(url.hostname) &&
        !!url.username &&
        !!url.password &&
        /^\/[A-Za-z0-9_]+$/.test(url.pathname) &&
        !url.search &&
        !url.hash
      );
    } catch {
      return false;
    }
  }, "Use a credentialed loopback PostgreSQL URL without query parameters.");
const environmentSchema = z.object({
  ORBIT_SCHEDULER_ENABLED: z.enum(["true", "false"]).default("true"),
  OPENAI_API_KEY: z.string().min(1).max(500).optional(),
  OPENAI_MODEL: z
    .string()
    .regex(/^[A-Za-z0-9._:-]{1,100}$/)
    .optional(),
  OLLAMA_MODEL: z
    .string()
    .regex(/^[A-Za-z0-9._:-]{1,100}$/)
    .optional(),
  ORBIT_ALLOW_PAID_AI: z.enum(["false", "true"]).default("false"),
  ORBIT_MODE: z.literal("local").default("local"),
  NODE_ENV: z.enum(["development", "production", "test"]).optional(),
  DATABASE_URL: localDatabaseUrlSchema.optional(),
});
export function validateEnvironment(input: Record<string, string | undefined>) {
  const result = environmentSchema.safeParse(input);
  if (!result.success) {
    const fields = result.error.issues
      .map((issue) => issue.path.join("."))
      .join(", ");
    throw new Error(
      `Invalid environment configuration: ${fields}. Use local mode and a valid local PostgreSQL URL, or omit DATABASE_URL. See .env.example.`,
    );
  }
  return result.data;
}
