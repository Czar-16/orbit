import "server-only";
import { createHash } from "node:crypto";
// PostgreSQL JSONB does not preserve object key order. Hash canonical JSON,
// while preserving array order (including item selection and duplicate bullets).
export function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value !== null && typeof value === "object")
    return `{${Object.entries(value)
      .filter(([, item]) => item !== undefined)
      .sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0)
      .map(([key, item]) => `${JSON.stringify(key)}:${canonicalJson(item)}`)
      .join(",")}}`;
  const result = JSON.stringify(value);
  if (result === undefined)
    throw new Error("Content cannot contain undefined.");
  return result;
}
export function contentHash(value: unknown) {
  return createHash("sha256").update(canonicalJson(value)).digest("hex");
}
