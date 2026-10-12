import "server-only";
import { z } from "zod";
import { requireWorkspace } from "@/lib/db";
import { profileFactsSchema } from "@/lib/profile-schema";
import { preferenceSchema, defaultPreferences } from "@/lib/preferences";
import {
  weightedMatch,
  weightedJobFromRevision,
} from "@/lib/weighted-matching";
import { extractResumeText } from "@/lib/resume-extraction";
import {
  draftContentSchema,
  prepareMaterials,
  providerSchema,
} from "@/lib/preparation";
import { selectMaterials } from "@/lib/preparation-provider";
import { InputError } from "@/lib/action-result";
const prepareSchema = z
  .object({
    jobId: z.uuid(),
    resumeVersionId: z.uuid().optional(),
    expectedRevision: z.number().int().nonnegative(),
    provider: providerSchema.default("off"),
    questions: z.array(z.string().trim().min(1).max(500)).max(20).default([]),
  })
  .strict();
export async function prepareDraft(input: unknown) {
  const parsed = prepareSchema.safeParse(input);
  if (!parsed.success)
    throw new InputError(
      "Check job, resume, provider and questions (up to 20 questions, 500 characters each). Reload if needed.",
    );
  const data = parsed.data;
  const { database, workspaceId } = await requireWorkspace();
  const initialLatest = await database.applicationDraft.findFirst({
    where: { workspaceId, jobId: data.jobId },
    orderBy: { revision: "desc" },
  });
  if (
    data.expectedRevision === 0 &&
    initialLatest &&
    initialLatest.operation !== "discard"
  )
    return initialLatest;
  if (
    data.expectedRevision > 0 &&
    (!initialLatest ||
      initialLatest.revision !== data.expectedRevision ||
      initialLatest.operation === "discard")
  )
    throw new InputError(
      "Draft changed in another tab or was discarded. Reload before preparing.",
    );
  const expectedRevision =
    data.expectedRevision === 0
      ? (initialLatest?.revision ?? 0)
      : data.expectedRevision;
  const [job, profile, preference] = await Promise.all([
    database.job.findFirst({
      where: { workspaceId, id: data.jobId },
      include: { latestRevision: true },
    }),
    database.profileVersion.findFirst({
      where: { workspaceId },
      orderBy: { revision: "desc" },
    }),
    database.preferenceVersion.findFirst({
      where: { workspaceId },
      orderBy: { revision: "desc" },
    }),
  ]);
  if (!job?.latestRevision || job.archivedAt || job.dismissedAt)
    throw new InputError("Restore this job before preparing an application.");
  if (!profile)
    throw new InputError("Review and save a verified profile first.");
  const revision = job.latestRevision;
  const facts = profileFactsSchema.parse(profile.facts);
  const values = preference
    ? preferenceSchema.parse(preference.values)
    : defaultPreferences;
  const match = weightedMatch(weightedJobFromRevision(revision), facts, values);
  if (match.flags.some((f) => f.status === "conflict"))
    throw new InputError(
      "Resolve the hard-filter conflicts shown on this job before preparing materials.",
    );
  const resumeId = data.resumeVersionId ?? profile.resumeVersionId;
  const resume = resumeId
    ? await database.resumeVersion.findFirst({
        where: { workspaceId, id: resumeId, revokedAt: null },
      })
    : await database.resumeVersion.findFirst({
        where: { workspaceId, revokedAt: null, isDefault: true },
      });
  if (!resume)
    throw new InputError(
      "Upload and select an available resume in Resume & profile first.",
    );
  let text = "";
  let extractionWarning: string | null = null;
  try {
    text = await extractResumeText(resume);
  } catch (error) {
    if (!(error instanceof InputError)) throw error;
    extractionWarning = error.message;
  }

  const prepared = prepareMaterials(facts, revision, text, data.questions);
  if (extractionWarning) prepared.content.unresolved.push(extractionWarning);
  if (data.provider !== "off") {
    const selection = await selectMaterials(data.provider, {
      sentences: prepared.sentences,
      originals: prepared.content.originals,
      skills: revision.skills,
    });
    prepared.content.letter = prepared.render(selection.sentences);
    prepared.content.order = selection.bullets;
    prepared.content.provider = data.provider;
  }
  prepared.content.matchSummary = JSON.stringify(match);
  const content = draftContentSchema.parse(prepared.content);
  return database.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "Workspace" WHERE id = ${workspaceId}::uuid FOR UPDATE`;
    const latest = await tx.applicationDraft.findFirst({
      where: { workspaceId, jobId: job.id },
      orderBy: { revision: "desc" },
    });
    if ((latest?.revision ?? 0) !== expectedRevision)
      throw new InputError(
        "Draft changed in another tab. Reload before preparing.",
      );
    const [freshJob, freshProfile, freshPreferences, freshResume] =
      await Promise.all([
        tx.job.findFirst({ where: { workspaceId, id: job.id } }),
        tx.profileVersion.findFirst({
          where: { workspaceId },
          orderBy: { revision: "desc" },
        }),
        tx.preferenceVersion.findFirst({
          where: { workspaceId },
          orderBy: { revision: "desc" },
        }),
        tx.resumeVersion.findFirst({
          where: { workspaceId, id: resume.id, revokedAt: null },
        }),
      ]);
    if (
      !freshResume ||
      freshJob?.latestRevisionNumber !== revision.revision ||
      freshJob.dismissedAt ||
      freshJob.archivedAt ||
      freshProfile?.id !== profile.id ||
      (freshPreferences?.id ?? null) !== (preference?.id ?? null)
    )
      throw new InputError(
        "Job, profile, preferences or resume changed during preparation. Reload and try again.",
      );
    const snapshotPreference =
      preference ??
      (await tx.preferenceVersion.create({
        data: { workspaceId, revision: 1, values, origin: "defaults" },
      }));
    return tx.applicationDraft.create({
      data: {
        workspaceId,
        jobId: job.id,
        jobRevisionId: revision.id,
        profileVersionId: profile.id,
        preferenceVersionId: snapshotPreference.id,
        resumeVersionId: resume.id,
        revision: expectedRevision + 1,
        operation:
          latest && latest.operation !== "discard" ? "regenerate" : "prepare",
        content,
      },
    });
  });
}
const editSchema = z
  .object({
    id: z.uuid(),
    expectedRevision: z.number().int().positive(),
    operation: z.enum(["edit", "discard"]),
    letter: z.string().max(20000).optional(),
    answers: z.array(z.string().max(5000)).max(30).optional(),
    order: z.array(z.number().int().nonnegative()).max(30).optional(),
    confirmed: z.boolean(),
  })
  .strict();
export async function reviseDraft(input: unknown) {
  const parsed = editSchema.safeParse(input);
  if (!parsed.success)
    throw new InputError(
      "Check the draft fields and resume bullet numbers before saving.",
    );
  const data = parsed.data;
  if (!data.confirmed)
    throw new InputError(
      "Confirm that edited materials contain only facts you can support.",
    );
  const { database, workspaceId } = await requireWorkspace();
  return database.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "Workspace" WHERE id = ${workspaceId}::uuid FOR UPDATE`;
    const draft = await tx.applicationDraft.findFirst({
      where: { workspaceId, id: data.id },
    });
    if (!draft) throw new InputError("Draft is unavailable.");
    const latest = await tx.applicationDraft.findFirst({
      where: { workspaceId, jobId: draft.jobId },
      orderBy: { revision: "desc" },
    });
    if (
      latest?.id !== draft.id ||
      draft.revision !== data.expectedRevision ||
      draft.operation === "discard"
    )
      throw new InputError(
        "Draft changed in another tab or was discarded. Reload before saving.",
      );
    const content = draftContentSchema.parse(draft.content);
    if (data.operation === "edit") {
      if (
        data.letter === undefined ||
        !data.answers ||
        data.answers.length !== content.answers.length ||
        !data.order
      )
        throw new InputError("Review the whole draft before saving.");
      if (data.letter !== content.letter) {
        content.letter = data.letter;
        content.letterProvenance = "user-provided";
      }
      content.answers = content.answers.map((a, i) =>
        data.answers?.[i] === a.value
          ? a
          : {
              ...a,
              value: data.answers?.[i] ?? "",
              provenance: data.answers?.[i] ? "user-provided" : "unknown",
            },
      );
      content.order = data.order;
      content.unresolved = [
        ...content.answers.filter((a) => !a.value).map((a) => a.question),
        ...content.unresolved.filter(
          (u) => !content.answers.some((a) => a.question === u),
        ),
      ];
    }
    const parsedContent = draftContentSchema.safeParse(content);
    if (!parsedContent.success)
      throw new InputError(
        "Emphasis must select unique existing bullet numbers; answers and letter must fit the displayed limits.",
      );
    const valid = parsedContent.data;
    return tx.applicationDraft.create({
      data: {
        workspaceId,
        jobId: draft.jobId,
        jobRevisionId: draft.jobRevisionId,
        profileVersionId: draft.profileVersionId,
        preferenceVersionId: draft.preferenceVersionId,
        resumeVersionId: draft.resumeVersionId,
        revision: draft.revision + 1,
        operation: data.operation,
        content: valid,
      },
    });
  });
}
