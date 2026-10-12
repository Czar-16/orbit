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
