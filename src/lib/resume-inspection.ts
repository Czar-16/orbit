import "server-only";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { z } from "zod";
const shared = globalThis as unknown as {
  orbitResumeInspectionSecret?: Buffer;
};
function secret() {
  return (shared.orbitResumeInspectionSecret ??= randomBytes(32));
}
const inspectionSchema = z
  .object({
    versionId: z.uuid(),
    pdfHash: z.string().regex(/^[a-f0-9]{64}$/),
    expires: z.number().int(),
  })
  .strict();
export function inspectionCookie(id: string) {
  return `orbit-resume-inspection-${z.uuid().parse(id)}`;
}
export function createInspectionReceipt(versionId: string, pdfHash: string) {
  const body = Buffer.from(
    JSON.stringify(
      inspectionSchema.parse({
        versionId,
        pdfHash,
        expires: Date.now() + 3600000,
      }),
    ),
  ).toString("base64url");
  return `${body}.${createHmac("sha256", secret()).update(body).digest("hex")}`;
}
export function validInspectionReceipt(
  receipt: string | undefined,
  versionId: string,
  pdfHash: string,
) {
  if (!receipt || receipt.length > 1000) return false;
  try {
    const [body, signature] = receipt.split(".");
    if (!/^[a-f0-9]{64}$/.test(signature ?? "")) return false;
    const expected = createHmac("sha256", secret()).update(body).digest();
    if (!timingSafeEqual(expected, Buffer.from(signature, "hex"))) return false;
    const data = inspectionSchema.parse(
      JSON.parse(Buffer.from(body, "base64url").toString()),
    );
    return (
      data.versionId === versionId &&
      data.pdfHash === pdfHash &&
      data.expires > Date.now()
    );
  } catch {
    return false;
  }
}
