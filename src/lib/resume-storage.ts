import "server-only";
import { mkdir, realpath, open, unlink } from "node:fs/promises";
import { constants } from "node:fs";
import { resolve, join } from "node:path";
import { z } from "zod";
const keySchema = z.string().regex(/^[a-f0-9-]{36}\.(pdf|txt)$/);
const root =
  process.env.ORBIT_TEST_DATABASE === "disposable"
    ? resolve(process.cwd(), ".test-private/resumes")
    : resolve(process.cwd(), "private/resumes");
async function privateRoot() {
  await mkdir(root, { recursive: true, mode: 0o700 });
  if ((await realpath(root)) !== root)
    throw new Error("Private storage must not use symlinked directories.");
}
export async function writeResume(key: string, bytes: Uint8Array) {
  await privateRoot();
  const filename = join(root, keySchema.parse(key));
  const file = await open(
    filename,
    constants.O_CREAT |
      constants.O_EXCL |
      constants.O_WRONLY |
      constants.O_NOFOLLOW,
    0o600,
  );
  try {
    await file.writeFile(bytes);
  } catch (error) {
    await file.close();
    await unlink(filename).catch(() => undefined);
    throw error;
  } finally {
    await file.close();
  }
}
export async function readResume(key: string) {
  await privateRoot();
  const filename = join(root, keySchema.parse(key));
  const file = await open(filename, constants.O_RDONLY | constants.O_NOFOLLOW);
  try {
    const stats = await file.stat();
    if (!stats.isFile() || stats.size > 5 * 1024 * 1024)
      throw new Error("Invalid private document.");
    return await file.readFile();
  } finally {
    await file.close();
  }
}
export async function removeResume(key: string) {
  await privateRoot();
  await unlink(join(root, keySchema.parse(key)));
}
