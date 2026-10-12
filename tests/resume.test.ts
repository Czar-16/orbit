import { describe, it, expect } from "vitest";
import {
  validateResume,
  resumeMetadataSchema,
  MAX_RESUME_BYTES,
} from "@/lib/resume-validation";
describe("private document validation", () => {
  it("accepts readable UTF-8 TXT", () => {
    const bytes = new TextEncoder().encode("User supplied resume");
    expect(
      validateResume(
        { name: "resume.txt", type: "text/plain", size: bytes.length },
        bytes,
      ).extension,
    ).toBe("txt");
  });
  it.each([
    "../resume.txt",
    "folder/resume.txt",
    "folder\\resume.txt",
    ".hidden.txt",
    "a..txt",
  ])("rejects unsafe filename %s", (name) => {
    expect(
      resumeMetadataSchema.safeParse({ name, type: "text/plain", size: 1 })
        .success,
    ).toBe(false);
  });
  it("rejects unsupported types and oversize files before processing bytes", () => {
    expect(
      resumeMetadataSchema.safeParse({
        name: "resume.docx",
        type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        size: 1,
      }).success,
    ).toBe(false);
    expect(
      resumeMetadataSchema.safeParse({
        name: "resume.txt",
        type: "text/plain",
        size: MAX_RESUME_BYTES + 1,
      }).success,
    ).toBe(false);
  });
  it("rejects spoofed PDF and mismatched extension", () => {
    const bytes = new TextEncoder().encode("not a PDF");
    expect(() =>
      validateResume(
        { name: "resume.pdf", type: "application/pdf", size: bytes.length },
        bytes,
      ),
    ).toThrow();
    expect(() =>
      validateResume(
        { name: "resume.pdf", type: "text/plain", size: bytes.length },
        bytes,
      ),
    ).toThrow();
  });
  it("rejects binary text and invalid UTF-8", () => {
    expect(() =>
      validateResume(
        { name: "resume.txt", type: "text/plain", size: 1 },
        new Uint8Array([0]),
      ),
    ).toThrow();
    expect(() =>
      validateResume(
        { name: "resume.txt", type: "text/plain", size: 1 },
        new Uint8Array([255]),
      ),
    ).toThrow();
  });
});
