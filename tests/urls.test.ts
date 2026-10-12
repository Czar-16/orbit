import { describe, it, expect, vi } from "vitest";
import { validateListingUrl, isPublicAddress } from "@/lib/url-validation";
describe("manual listing URL validation", () => {
  it.each([
    "http://example.com/jobs/1",
    "https://localhost/jobs/1",
    "https://127.0.0.1/x",
    "https://2130706433/x",
    "https://0x7f000001/x",
    "https://169.254.169.254/latest/meta-data",
    "https://100.100.100.200/",
    "https://[::1]/",
    "https://[::ffff:127.0.0.1]/",
    "https://[fd00::1]/",
    "https://user:secret@example.com/x",
    "https://example.com:8443/x",
    "https://metadata.google.internal/x",
    "not a url",
  ])("blocks unsafe URL %s before resolving", async (url) => {
    const resolver = vi.fn().mockResolvedValue([{ address: "8.8.8.8" }]);
    await expect(validateListingUrl(url, resolver)).rejects.toThrow();
    expect(resolver).not.toHaveBeenCalled();
  });
  it("blocks public names resolving to private or mixed addresses", async () => {
    await expect(
      validateListingUrl("https://jobs.company.com/", async () => [
        { address: "8.8.8.8" },
        { address: "10.0.0.1" },
      ]),
    ).rejects.toThrow("validated as public");
  });
  it("preserves query identity and resolves without fetching pages", async () => {
    const resolver = vi.fn().mockResolvedValue([{ address: "8.8.8.8" }]);
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    expect(
      await validateListingUrl(
        "https://www.linkedin.com/jobs/view/1?ref=manual&job=1",
        resolver,
      ),
    ).toBe("https://www.linkedin.com/jobs/view/1?ref=manual&job=1");
    expect(resolver).toHaveBeenCalledWith("www.linkedin.com");
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });
  it("blocks reserved and non-public address families", () => {
    for (const address of [
      "0.0.0.0",
      "10.1.2.3",
      "172.16.0.1",
      "192.168.0.1",
      "100.64.0.1",
      "224.0.0.1",
      "203.0.113.1",
      "2001:db8::1",
      "fe80::1",
    ])
      expect(isPublicAddress(address)).toBe(false);
    expect(isPublicAddress("8.8.8.8")).toBe(true);
  });
});
