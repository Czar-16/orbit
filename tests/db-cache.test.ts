import { afterEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  created: vi.fn(),
  disconnected: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("@/generated/prisma/client", () => ({
  PrismaClient: class {
    processingRun = { findUnique: vi.fn() };
    $disconnect = mocks.disconnected;
    constructor() {
      mocks.created();
    }
  },
}));
vi.mock("@prisma/adapter-pg", () => ({ PrismaPg: class {} }));
import { getDatabase } from "@/lib/db";
afterEach(() => {
  Reflect.deleteProperty(globalThis, "orbitDatabase");
  Reflect.deleteProperty(globalThis, "orbitDatabaseConstructor");
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});
describe("database client cache after schema regeneration", () => {
  it("replaces a pre-upgrade cached client without scheduling or querying anything", async () => {
    vi.stubEnv(
      "DATABASE_URL",
      "postgresql://synthetic:synthetic@127.0.0.1:5432/orbit_test",
    );
    const disconnect = vi.fn().mockResolvedValue(undefined);
    Reflect.set(globalThis, "orbitDatabase", { $disconnect: disconnect });
    const current = getDatabase();
    expect(current?.processingRun).toBeDefined();
    expect(disconnect).toHaveBeenCalledOnce();
    expect(mocks.created).toHaveBeenCalledOnce();
    expect(getDatabase()).toBe(current);
    expect(mocks.created).toHaveBeenCalledOnce();
  });
  it("replaces a client from an older generated constructor", () => {
    vi.stubEnv(
      "DATABASE_URL",
      "postgresql://synthetic:synthetic@127.0.0.1:5432/orbit_test",
    );
    const first = getDatabase();
    Reflect.set(globalThis, "orbitDatabaseConstructor", class OldClient {});
    expect(getDatabase()).not.toBe(first);
    expect(mocks.disconnected).toHaveBeenCalledOnce();
  });
});
