import { describe, it, expect, afterAll } from "vitest";
import { requireWorkspace } from "@/lib/db";
import { savePreferences } from "@/lib/preference-service";
import { defaultPreferences } from "@/lib/preferences";
import { saveJob } from "@/lib/job-service";
import { emptyJob } from "@/lib/job-input";
import { saveProfile } from "@/lib/profile-service";
import { profileDefaults } from "@/lib/profile-input";
if (
  process.env.ORBIT_TEST_DATABASE !== "disposable" ||
  !process.env.DATABASE_URL?.endsWith("/orbit_test")
)
  throw new Error("Dedicated test database required");
afterAll(async () => {
  const { database } = await requireWorkspace();
  await database.$disconnect();
});
describe("weighted match versions", () => {
  it("pins preference/profile/job versions and rejects stale preferences", async () => {
    const { database, workspaceId } = await requireWorkspace();
    const current = await database.profileVersion.findFirst({
      where: { workspaceId },
      orderBy: { revision: "desc" },
    });
    await saveProfile({
      ...profileDefaults(undefined, current?.revision ?? 0),
      skills: "React",
      experienceYears: "0",
      confirmed: true,
    });
    const prior = await database.preferenceVersion.findFirst({
      where: { workspaceId },
      orderBy: { revision: "desc" },
    });
    const pref = await savePreferences({
      values: defaultPreferences,
      expectedRevision: prior?.revision ?? 0,
    });
    const saved = await saveJob({
      ...emptyJob,
      description: "React required. Minimum 5 years of experience required.",
      skills: "React",
    });
    const revision = await database.jobRevision.findFirstOrThrow({
      where: { jobId: saved.jobId },
    });
    const match = await database.weightedMatch.findFirstOrThrow({
      where: {
        jobRevisionId: revision.id,
        workspaceId,
        preferenceVersionId: pref.id,
      },
      orderBy: { createdAt: "desc" },
    });
    expect(match.preferenceVersionId).toBe(pref.id);
    expect(match.explanation).toMatchObject({
      flags: expect.arrayContaining([
        expect.objectContaining({ kind: "experience", status: "conflict" }),
      ]),
    });
    await expect(
      savePreferences({
        values: defaultPreferences,
        expectedRevision: prior?.revision ?? 0,
      }),
    ).rejects.toThrow("another tab");
    expect(
      await database.weightedMatch.findUnique({ where: { id: match.id } }),
    ).toEqual(match);
  });
});
