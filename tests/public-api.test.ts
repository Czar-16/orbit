import { describe, it, expect, vi } from "vitest";
const mocks = vi.hoisted(() => ({ lookup: vi.fn(), request: vi.fn() }));
vi.mock("node:dns/promises", () => ({ lookup: mocks.lookup }));
vi.mock("node:https", () => ({ request: mocks.request }));
import { publicApiJson } from "@/lib/public-api";
describe("official API fetch boundaries", () => {
  it("rejects arbitrary hosts, custom ports and non-HTTPS before network access", async () => {
    mocks.request.mockClear();
    for (const url of [
      "http://himalayas.app/jobs/api",
      "https://evil.example.com/api",
      "https://himalayas.app:8443/jobs/api",
    ]) {
      await expect(publicApiJson(new URL(url))).rejects.toThrow(
        "Unsupported API",
      );
    }
    expect(mocks.request).not.toHaveBeenCalled();
  });
  it("blocks private and mixed public/private DNS answers", async () => {
    mocks.request.mockClear();
    for (const addresses of [
      [{ address: "127.0.0.1", family: 4 }],
      [
        { address: "8.8.8.8", family: 4 },
        { address: "169.254.169.254", family: 4 },
      ],
    ]) {
      mocks.lookup.mockResolvedValueOnce(addresses);
      await expect(
        publicApiJson(new URL("https://himalayas.app/jobs/api")),
      ).rejects.toThrow("not public");
    }
    expect(mocks.request).not.toHaveBeenCalled();
  });
});
