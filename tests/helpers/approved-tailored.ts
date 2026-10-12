import type { ApplicationDraft } from "@/generated/prisma/client";
import { requireWorkspace } from "@/lib/db";
import { sourceForDraft, reviewSource } from "@/lib/resume-content-service";
import { sourceContentSchema, profileConflicts } from "@/lib/resume-content";
import { profileFactsSchema } from "@/lib/profile-schema";
import {
  generateTailoredResume,
  approveTailoredResume,
  selectTailoredResume,
} from "@/lib/tailored-resume-service";
import { createInspectionReceipt } from "@/lib/resume-inspection";
// Synthetic fixtures only. These calls represent explicit source review/inspection by a test user.
export async function approvedSyntheticDraft(
  draft: ApplicationDraft,
  generatedKeys: string[],
) {
  const { database, workspaceId } = await requireWorkspace();
  const setup = await sourceForDraft(draft.id);
  let source = setup.source;
  if (source.reviewStatus !== "confirmed") {
    const content = sourceContentSchema.parse(source.structuredSource);
    const facts = profileFactsSchema.parse(setup.draft.profile.facts);
    const item = (
      id: string,
      text: string,
      section: "contact" | "projects",
      kind: "text" | "entry",
    ) => ({
      id,
      original: "",
      text,
      section,
      kind,
      line: 0,
      entryId: null,
      excluded: false,
      exclusionReason: "",
      confirmed: true,
    });
    if (!content.items.some((i) => i.section === "contact"))
      content.items.unshift(
        item(
          "manual-test-name",
          facts.name.value ?? "Synthetic Candidate",
          "contact",
          "text",
        ),
      );
    if (
      facts.email.value &&
      !content.items.some((i) => i.text.includes(facts.email.value!))
    )
      content.items.splice(
        1,
        0,
        item("manual-test-email", facts.email.value, "contact", "text"),
      );
    const hasUnlinked = content.items.some(
      (i) => i.kind === "bullet" && !i.entryId,
    );
    if (hasUnlinked)
      content.items.splice(
        2,
        0,
        item("manual-test-entry", "Synthetic project", "projects", "entry"),
      );
    content.items.forEach((i) => {
      i.confirmed = true;
      if (i.section === "other") i.section = "projects";
      if (i.kind === "bullet" && !i.entryId) {
        i.section = "projects";
        i.entryId = "manual-test-entry";
      }
    });
    for (const conflict of profileConflicts(content, facts))
      content.conflictResolutions[conflict.id] =
        "Synthetic test user compared and confirmed these exact source facts against the pinned profile.";
    source = await reviewSource({
      id: source.id,
      expectedRevision: source.revision,
      content,
      confirmed: true,
    });
  }
  const latest = await database.tailoredResumeVersion.findFirst({
    where: { workspaceId, jobId: draft.jobId },
    orderBy: { revision: "desc" },
  });
  const version = await generateTailoredResume({
    draftId: draft.id,
    expectedDraftRevision: draft.revision,
    sourceId: source.id,
    expectedSourceRevision: source.revision,
    expectedTailoredRevision: latest?.revision ?? 0,
    parentId: null,
  });
  const artifacts = await database.resumeArtifact.findMany({
    where: { workspaceId, tailoredResumeVersionId: version.id },
  });
  generatedKeys.push(...artifacts.map((a) => a.storageKey));
  await approveTailoredResume(
    {
      id: version.id,
      expectedRevision: version.revision,
      expectedContentHash: version.contentHash,
      pdfInspected: true,
    },
    createInspectionReceipt(
      version.id,
      artifacts.find((a) => a.format === "PDF")!.sha256,
    ),
  );
  return selectTailoredResume({
    draftId: draft.id,
    expectedDraftRevision: draft.revision,
    versionId: version.id,
  });
}
