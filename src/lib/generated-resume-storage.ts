import "server-only";
import { mkdir, realpath, open, unlink, chmod } from "node:fs/promises";
import { constants } from "node:fs";
import { join, resolve } from "node:path";
import { z } from "zod";
const keySchema = z.string().regex(/^[a-f0-9-]{36}\.(pdf|docx)$/);
const root = resolve(
  process.cwd(),
  process.env.ORBIT_TEST_DATABASE === "disposable"
    ? ".test-private/generated-documents"
    : "private/generated-documents",
);
async function privateRoot() {
  await mkdir(root, { recursive: true, mode: 0o700 });
  if ((await realpath(root)) !== root)
    throw new Error("Generated document storage must not use symlinks.");
  await chmod(root, 0o700);
}
export async function writeGeneratedResume(key: string, bytes: Uint8Array) {
  if (!bytes.length || bytes.length > 5242880)
    throw new Error("Document size is invalid.");
  await privateRoot();
  const path = join(root, keySchema.parse(key));
  const file = await open(
    path,
    constants.O_CREAT |
      constants.O_EXCL |
      constants.O_WRONLY |
      constants.O_NOFOLLOW,
    0o600,
  );
  try {
    await file.writeFile(bytes);
    await file.sync();
  } catch (error) {
    await unlink(path).catch(() => undefined);
    throw error;
  } finally {
    await file.close();
  }
}
export async function readGeneratedResume(key: string) {
  await privateRoot();
  const file = await open(
    join(root, keySchema.parse(key)),
    constants.O_RDONLY | constants.O_NOFOLLOW,
  );
  try {
    const stats = await file.stat();
    if (!stats.isFile() || stats.size < 1 || stats.size > 5242880)
      throw new Error("Invalid generated document.");
    return await file.readFile();
  } finally {
    await file.close();
  }
}
export async function removeGeneratedResume(key: string) {
  await privateRoot();
  await unlink(join(root, keySchema.parse(key)));
}
