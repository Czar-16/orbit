// @vitest-environment node
import { it, expect, vi } from "vitest";
import { randomUUID } from "node:crypto";
const mock = vi.hoisted(() => ({
  mkdir: vi.fn(),
  realpath: vi.fn(),
  chmod: vi.fn(),
  open: vi.fn(),
  unlink: vi.fn(),
}));
vi.mock("node:fs/promises", () => mock);
import { writeGeneratedResume } from "@/lib/generated-resume-storage";
it("removes partial files after write failure and closes the handle", async () => {
  mock.realpath.mockImplementation(async (path) => path);
  const close = vi.fn(),
    writeFile = vi
      .fn()
      .mockRejectedValue(new Error("Synthetic disk write failure"));
  mock.open.mockResolvedValue({ writeFile, close, sync: vi.fn() });
  mock.unlink.mockResolvedValue(undefined);
  const key = `${randomUUID()}.pdf`;
  await expect(
    writeGeneratedResume(key, new Uint8Array([1, 2])),
  ).rejects.toThrow("write failure");
  expect(mock.unlink).toHaveBeenCalledWith(expect.stringContaining(key));
  expect(close).toHaveBeenCalledOnce();
});
