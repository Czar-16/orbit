// @vitest-environment node
import { it, expect, vi } from "vitest";
import { randomUUID } from "node:crypto";
import {
  createInspectionReceipt,
  validInspectionReceipt,
} from "@/lib/resume-inspection";
it("binds PDF inspection to exact version/hash and rejects forged or expired receipts", () => {
  const id = randomUUID(),
    hash = "a".repeat(64),
    receipt = createInspectionReceipt(id, hash);
  expect(validInspectionReceipt(receipt, id, hash)).toBe(true);
  expect(validInspectionReceipt(receipt, randomUUID(), hash)).toBe(false);
  expect(validInspectionReceipt(receipt, id, "b".repeat(64))).toBe(false);
  expect(validInspectionReceipt(receipt + "tamper", id, hash)).toBe(false);
  expect(validInspectionReceipt(undefined, id, hash)).toBe(false);
  vi.spyOn(Date, "now").mockReturnValue(Date.now() + 3600001);
  expect(validInspectionReceipt(receipt, id, hash)).toBe(false);
  vi.restoreAllMocks();
});
