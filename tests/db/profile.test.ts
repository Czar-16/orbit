import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { requireWorkspace } from "@/lib/db";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import { saveProfile } from "@/lib/profile-service";
import { uploadResume } from "@/lib/resume-service";
import { GET as downloadResume } from "@/app/api/resumes/[id]/route";
import { readResume, removeResume } from "@/lib/resume-storage";
import { profileDefaults } from "@/lib/profile-input";
import { profileFactsSchema } from "@/lib/profile-schema";
if (
  process.env.ORBIT_TEST_DATABASE !== "disposable" ||
  !process.env.DATABASE_URL?.endsWith("/orbit_test")
)
  throw new Error("Dedicated disposable database required.");
afterAll(async () => {
  const { database } = await requireWorkspace();
  await database.$disconnect();
});
beforeAll(async () => {
  const db = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  });
  try {
    await db.workspace.upsert({
      where: { key: "local" },
      create: { key: "local" },
      update: {},
    });
  } finally {
    await db.$disconnect();
  }
});
describe("private profile persistence", () => {
  it("blocks remote host headers and invalid identifiers", async () => {
    const invalid = {
      params: Promise.resolve({ id: "../../private/resumes" }),
    };
    expect(
      (
        await downloadResume(
          new Request("http://example.com/api/resumes/invalid", {
            headers: { host: "example.com" },
          }),
          invalid,
        )
      ).status,
    ).toBe(403);
    expect(
      (
        await downloadResume(
          new Request("http://localhost/api/resumes/invalid", {
            headers: { host: "localhost" },
          }),
          invalid,
        )
      ).status,
    ).toBe(404);
  });
  it("stores an actual private document with opaque metadata", async () => {
    const text = "Test-only document, not an app resume.";
    const record = await uploadResume(
      new File([text], "test-resume.txt", { type: "text/plain" }),
    );
    try {
      expect(record.storageKey).not.toContain("test-resume");
      expect((await readResume(record.storageKey)).toString()).toBe(text);
      const response = await downloadResume(
        new Request(`http://127.0.0.1/api/resumes/${record.id}`, {
          headers: { host: "127.0.0.1" },
        }),
        { params: Promise.resolve({ id: record.id }) },
      );
      expect(response.status).toBe(200);
      expect(response.headers.get("Content-Disposition")).toContain(
        "attachment",
      );
      expect(response.headers.get("Cache-Control")).toBe("private, no-store");
      expect(response.headers.get("X-Content-Type-Options")).toBe("nosniff");
      expect(await response.text()).toBe(text);
    } finally {
      await removeResume(record.storageKey);
      const { database } = await requireWorkspace();
      await database.resumeVersion.update({
        where: { id: record.id },
        data: { revokedAt: new Date() },
      });
    }
  });
  it("creates verified revisions and rejects stale edits", async () => {
    const { database, workspaceId } = await requireWorkspace();
    const current = await database.profileVersion.findFirst({
      where: { workspaceId },
      orderBy: { revision: "desc" },
    });
    const input = {
      ...profileDefaults(undefined, current?.revision ?? 0),
      skills: "TypeScript, React",
      confirmed: true,
    };
    const profile = await saveProfile(input);
    expect(
      profileFactsSchema
        .parse(profile.facts)
        .skills.map((skill) => skill.value),
    ).toEqual(["TypeScript", "React"]);
    await expect(saveProfile(input)).rejects.toThrow("another tab");
  });
  it("rejects unavailable resume references and arbitrary storage keys", async () => {
    const { database, workspaceId } = await requireWorkspace();
    const current = await database.profileVersion.findFirst({
      where: { workspaceId },
      orderBy: { revision: "desc" },
    });
    await expect(
      saveProfile({
        ...profileDefaults(undefined, current?.revision ?? 0),
        resumeVersionId: "00000000-0000-4000-8000-000000000001",
        confirmed: true,
      }),
    ).rejects.toThrow("no longer available");
    await expect(readResume("../../public/resume.txt")).rejects.toThrow();
  });
});
