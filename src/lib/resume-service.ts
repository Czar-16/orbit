import "server-only";
import { randomUUID, createHash } from "node:crypto";
import { requireWorkspace } from "@/lib/db";
import { validateResume, resumeMetadataSchema } from "@/lib/resume-validation";
import { writeResume, removeResume } from "@/lib/resume-storage";
import { InputError } from "@/lib/action-result";
export async function uploadResume(file: File) {
  const metadata = resumeMetadataSchema.safeParse({
    name: file.name,
    size: file.size,
    type: file.type,
  });
  if (!metadata.success)
    throw new InputError(
      "Upload a PDF or UTF-8 TXT document with a safe filename, up to 5 MB.",
    );
  const { database, workspaceId } = await requireWorkspace();
  const bytes = new Uint8Array(await file.arrayBuffer());
  let valid: ReturnType<typeof validateResume>;
  try {
    valid = validateResume(metadata.data, bytes);
  } catch {
    throw new InputError(
      "File contents, extension, and type must match a PDF or readable UTF-8 TXT document.",
    );
  }
  const storageKey = `${randomUUID()}.${valid.extension}`;
  await writeResume(storageKey, bytes);
  try {
    return await database.resumeVersion.create({
      data: {
        workspaceId,
        storageKey,
        filename: valid.name,
        mimeType: valid.type,
        byteSize: valid.size,
        sha256: createHash("sha256").update(bytes).digest("hex"),
      },
    });
  } catch (error) {
    await removeResume(storageKey);
    throw error;
  }
}
