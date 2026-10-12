import { describe, it, expect } from "vitest";
import { validateEnvironment } from "@/lib/env";
describe("startup environment", () => {
  it("starts locally without database or AI credentials", () => {
    expect(validateEnvironment({})).toEqual({ ORBIT_MODE: "local" });
  });
  it("accepts the production local shell", () => {
    expect(
      validateEnvironment({ NODE_ENV: "production", ORBIT_MODE: "local" })
        .ORBIT_MODE,
    ).toBe("local");
  });
  it.each([
    { ORBIT_MODE: "remote" },
    { ORBIT_MODE: "" },
    { NODE_ENV: "preview" },
  ])("rejects invalid configuration %j", (input) => {
    expect(() => validateEnvironment(input)).toThrow(
      "Invalid environment configuration",
    );
  });
  it("does not expose invalid values or secrets", () => {
    expect(() =>
      validateEnvironment({
        ORBIT_MODE: "secret-value",
        API_KEY: "private-key",
      }),
    ).toThrow("Invalid environment configuration");
    try {
      validateEnvironment({
        ORBIT_MODE: "secret-value",
        API_KEY: "private-key",
      });
    } catch (error) {
      expect(String(error)).not.toMatch(/secret-value|private-key/);
    }
  });
});

describe("database URL boundaries", () => {
  it("accepts a credentialed loopback database", () => {
    expect(
      validateEnvironment({
        DATABASE_URL: "postgresql://orbit:private@127.0.0.1:55432/orbit",
      }).DATABASE_URL,
    ).toBeDefined();
  });
  it.each([
    "https://example.com/db",
    "postgresql://orbit:private@remote.example/orbit",
    "postgresql://orbit:private@127.0.0.1/orbit?host=remote.example",
    "postgresql://orbit@127.0.0.1/orbit",
  ])("rejects unsupported database URL without exposing it", (url) => {
    expect(() => validateEnvironment({ DATABASE_URL: url })).toThrow(
      "DATABASE_URL",
    );
    expect(() => validateEnvironment({ DATABASE_URL: url })).not.toThrow(
      "private",
    );
  });
});
