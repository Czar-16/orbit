import { beforeEach, expect, it, vi } from "vitest";
const { requireWorkspace, readResume } = vi.hoisted(() => ({
  requireWorkspace: vi.fn(),
  readResume: vi.fn(),
}));
vi.mock("@/lib/db", () => ({ requireWorkspace }));
vi.mock("@/lib/resume-storage", () => ({ readResume }));
import { GET } from "@/app/api/resumes/[id]/route";
const id = "12345678-1234-4234-8234-123456789abc";
const params = { params: Promise.resolve({ id }) };
beforeEach(() => vi.clearAllMocks());
it("rejects cross-origin downloads before accessing private storage", async () => {
  const rejected: Record<string, string>[] = [
    { origin: "https://foreign.example" },
    { referer: "https://foreign.example/resume" },
    { "sec-fetch-site": "cross-site" },
    { host: "foreign.example" },
  ];
  for (const headers of rejected) {
    const response = await GET(
      new Request(`http://localhost:3000/api/resumes/${id}`, {
        headers: { host: "localhost:3000", ...headers },
      }),
      params,
    );
    expect(response.status).toBe(403);
  }
  expect(requireWorkspace).not.toHaveBeenCalled();
  expect(readResume).not.toHaveBeenCalled();
});
it("scopes a local download to an unrevoked workspace resume and disables caching", async () => {
  const findFirst = vi.fn().mockResolvedValue({
    storageKey: `${id}.txt`,
    filename: "resume.txt",
    mimeType: "text/plain",
  });
  requireWorkspace.mockResolvedValue({
    database: { resumeVersion: { findFirst } },
    workspaceId: "workspace",
  });
  readResume.mockResolvedValue(new TextEncoder().encode("Synthetic resume"));
  const response = await GET(
    new Request(`http://localhost:3000/api/resumes/${id}`, {
      headers: { host: "localhost:3000", origin: "http://localhost:3000" },
    }),
    params,
  );
  expect(response.status).toBe(200);
  expect(findFirst).toHaveBeenCalledWith({
    where: { workspaceId: "workspace", id, revokedAt: null },
  });
  expect(response.headers.get("cache-control")).toBe("private, no-store");
  expect(response.headers.get("x-content-type-options")).toBe("nosniff");
  expect(await response.text()).toBe("Synthetic resume");
});
