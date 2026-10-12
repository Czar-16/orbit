import { afterEach, describe, it, expect, vi } from "vitest";
const mocks = vi.hoisted(() => ({ create: vi.fn(), update: vi.fn() }));
vi.mock("@/lib/db", () => ({
  requireWorkspace: async () => ({
    workspaceId: "fixture-workspace",
    database: { outboundDataLog: mocks },
  }),
}));
import { selectMaterials } from "@/lib/preparation-provider";
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});
const input = {
  sentences: ["Verified synthetic project."],
  originals: ["Original synthetic bullet."],
  skills: ["React"],
};
describe("optional provider boundaries (mocked protocol, no real integration claim)", () => {
  it("off mode requires no env, request, or outbound log", async () => {
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    expect(await selectMaterials("off", input)).toEqual({
      sentences: [0],
      bullets: [0],
    });
    expect(fetch).not.toHaveBeenCalled();
    expect(mocks.create).not.toHaveBeenCalled();
  });
  it("refuses hosted spending unless explicitly enabled", async () => {
    vi.stubEnv("OPENAI_MODEL", "fixture-model");
    vi.stubEnv("OPENAI_API_KEY", "fixture-secret");
    vi.stubEnv("ORBIT_ALLOW_PAID_AI", "false");
    await expect(selectMaterials("openai", input)).rejects.toThrow(
      "paid-AI opt-in",
    );
    expect(mocks.create).not.toHaveBeenCalled();
  });
  it("logs field names before fixed loopback requests and rejects hallucinated output", async () => {
    vi.stubEnv("OLLAMA_MODEL", "fixture-model");
    mocks.create.mockResolvedValue({ id: "fixture-log" });
    mocks.update.mockResolvedValue({});
    const fetch = vi.fn(async (url: string, options: RequestInit) => {
      expect(mocks.create).toHaveBeenCalled();
      expect(url).toBe("http://127.0.0.1:11434/api/generate");
      expect(options.redirect).toBe("error");
      return new Response(
        JSON.stringify({
          done: true,
          response: JSON.stringify({ sentences: [99], bullets: [] }),
        }),
      );
    });
    vi.stubGlobal("fetch", fetch);
    await expect(selectMaterials("ollama", input)).rejects.toThrow(
      "unsupported content",
    );
    expect(mocks.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ result: "failed" }),
      }),
    );
    expect(JSON.stringify(mocks.create.mock.calls)).not.toContain(
      "Verified synthetic project.",
    );
  });
  it("accepts bounded valid Responses output but never model-written claims", async () => {
    vi.stubEnv("OPENAI_MODEL", "fixture-model");
    vi.stubEnv("OPENAI_API_KEY", "fixture-secret");
    vi.stubEnv("ORBIT_ALLOW_PAID_AI", "true");
    mocks.create.mockResolvedValue({ id: "fixture-log" });
    mocks.update.mockResolvedValue({});
    const fetch = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            status: "completed",
            output: [
              {
                type: "message",
                content: [
                  {
                    type: "output_text",
                    text: '{"sentences":[0],"bullets":[0]}',
                  },
                ],
              },
            ],
          }),
        ),
    );
    vi.stubGlobal("fetch", fetch);
    expect(await selectMaterials("openai", input)).toEqual({
      sentences: [0],
      bullets: [0],
    });
    expect(fetch.mock.calls).toHaveLength(1);
    expect(mocks.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ result: "succeeded" }),
      }),
    );
  });
  it("keeps interrupted or failed requests honest", async () => {
    vi.stubEnv("OLLAMA_MODEL", "fixture-model");
    mocks.create.mockResolvedValue({ id: "fixture-log" });
    mocks.update.mockResolvedValue({});
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("Provider failed with sensitive payload");
      }),
    );
    await expect(selectMaterials("ollama", input)).rejects.toThrow(
      "No draft was saved",
    );
    expect(JSON.stringify(mocks.update.mock.calls)).not.toContain(
      "sensitive payload",
    );
  });
});
