import { describe, expect, it, vi, afterEach } from "vitest";
import { canClaim, processingEventSchema } from "@/lib/processing";
import { localDate, todayInterval } from "@/lib/time";
import { inngest } from "@/inngest/client";
import { validateEnvironment } from "@/lib/env";
import { GET } from "@/app/api/inngest/route";
import { NextRequest } from "next/server";
afterEach(() => vi.unstubAllGlobals());
describe("daily processing boundaries", () => {
  it("allows lease recovery but blocks competing and completed executions", () => {
    const run = {
      state: "running",
      executionId: "first",
      leaseExpiresAt: new Date("2026-10-13T10:00Z"),
      attemptCount: 1,
    };
    expect(canClaim(run, "second", new Date("2026-10-13T09:00Z"))).toBe(false);
    expect(canClaim(run, "first", new Date("2026-10-13T09:00Z"))).toBe(true);
    expect(canClaim(run, "second", new Date("2026-10-13T10:01Z"))).toBe(true);
    for (const state of ["success", "partial"])
      expect(canClaim({ ...run, state }, "first")).toBe(false);
    expect(
      canClaim(
        { ...run, state: "failed", leaseExpiresAt: null, attemptCount: 3 },
        "second",
      ),
    ).toBe(false);
  });
  it("uses Kolkata midnight and rejects untrusted event fields", () => {
    expect(localDate(new Date("2026-10-12T18:29:59Z"))).toBe("2026-10-12");
    expect(localDate(new Date("2026-10-12T18:30:00Z"))).toBe("2026-10-13");
    expect(
      todayInterval(new Date("2026-10-12T18:30:00Z")).start.toISOString(),
    ).toBe("2026-10-12T18:30:00.000Z");
    expect(processingEventSchema.safeParse({ runId: "bad" }).success).toBe(
      false,
    );
    expect(
      processingEventSchema.safeParse({
        runId: "92a3840a-8865-4369-b0f8-519811164bbb",
        workspaceId: "injected",
      }).success,
    ).toBe(false);
    expect(() =>
      validateEnvironment({ ORBIT_SCHEDULER_ENABLED: "maybe" }),
    ).toThrow();
  });
  it("uses only the fixed local Inngest endpoint even with cloud environment settings", async () => {
    const send = vi.fn(
      async () =>
        new Response(JSON.stringify({ ids: ["test-event"], status: 200 }), {
          headers: { "content-type": "application/json" },
        }),
    );
    vi.stubGlobal("fetch", send);
    await inngest.send({
      name: "orbit/daily.requested",
      data: { runId: "92a3840a-8865-4369-b0f8-519811164bbb" },
    });
    expect(send).toHaveBeenCalled();
    for (const [url, options] of send.mock.calls as unknown as [
      string,
      RequestInit,
    ][]) {
      expect(new URL(url).origin).toBe("http://127.0.0.1:8288");
      expect(options.redirect).toBe("error");
    }
  });
  it("rejects foreign hosts and cross-site calls before Inngest executes", async () => {
    const cases: Record<string, string>[] = [
      { host: "evil.test" },
      { host: "localhost:3000", origin: "https://evil.test" },
      { host: "localhost:3000", "x-forwarded-host": "evil.test" },
    ];
    for (const headers of cases) {
      expect(
        (
          await GET(
            new NextRequest("http://localhost:3000/api/inngest", { headers }),
          )
        ).status,
      ).toBe(403);
    }
  });
  it("accepts Next's matching forwarded local host for SDK discovery", async () => {
    const response = await GET(
      new NextRequest("http://localhost:3000/api/inngest", {
        headers: {
          host: "127.0.0.1:3000",
          "x-forwarded-host": "127.0.0.1:3000",
        },
      }),
    );
    expect(response.status).toBe(200);
  });
});
