// @vitest-environment node
import { it, expect, afterAll } from "vitest";
import { randomUUID } from "node:crypto";
import { symlink, stat, unlink, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  writeGeneratedResume,
  readGeneratedResume,
  removeGeneratedResume,
} from "@/lib/generated-resume-storage";
const keys: string[] = [];
afterAll(async () => {
  for (const key of keys)
    await removeGeneratedResume(key).catch(() => undefined);
});
it("uses private exclusive writes and rejects traversal, symlinks and oversized output", async () => {
  const key = `${randomUUID()}.pdf`;
  keys.push(key);
  await writeGeneratedResume(
    key,
    new TextEncoder().encode("Synthetic generated document"),
  );
  expect((await readGeneratedResume(key)).toString()).toBe(
    "Synthetic generated document",
  );
  const root = resolve(process.cwd(), "private/generated-documents");
  expect((await stat(resolve(root, key))).mode & 0o777).toBe(0o600);
  expect((await stat(root)).mode & 0o777).toBe(0o700);
  await expect(
    writeGeneratedResume(key, new Uint8Array([1])),
  ).rejects.toThrow();
  await expect(readGeneratedResume("../../.env.local")).rejects.toThrow();
  await expect(
    writeGeneratedResume(`${randomUUID()}.pdf`, new Uint8Array(5242881)),
  ).rejects.toThrow("size");
  const linked = `${randomUUID()}.pdf`;
  keys.push(linked);
  await symlink(resolve(root, key), resolve(root, linked));
  await expect(readGeneratedResume(linked)).rejects.toThrow();
  await unlink(resolve(root, linked));
  expect((await readFile(resolve(root, key))).toString()).toBe(
    "Synthetic generated document",
  );
});
