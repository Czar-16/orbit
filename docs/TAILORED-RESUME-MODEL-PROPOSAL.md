# Tailored resume persistence proposal

Status: approved by the user on 2026-10-13; implemented as an additive Prisma/PostgreSQL extension. See TAILORED-RESUMES.md for the workflow and verification report.

## Proposed records

All IDs are UUIDs, timestamps are UTC `Timestamptz(3)`, JSON is JSONB, and deletion uses Restrict. Every record belongs to a workspace. Content is validated with strict Zod schemas before persistence.

| Record | Proposed fields |
| --- | --- |
| ResumeContentVersion | id, workspaceId, resumeVersionId, profileVersionId, revision, schemaVersion, structuredSource, contentHash, reviewStatus, confirmedAt, createdAt |
| TailoredResumeVersion | id, workspaceId, jobId, jobRevisionId, resumeVersionId, resumeContentVersionId, profileVersionId, preferenceVersionId, originatingDraftId, parentVersionId (nullable), revision, schemaVersion, content, contentHash, generatedAt, approval (nullable JSON), approvedAt (nullable) |
| ResumeArtifact | id, workspaceId, tailoredResumeVersionId, format (PDF or DOCX), storageKey, byteSize, sha256, templateVersion, validation, createdAt |
| ApplicationDraft extension | tailoredResumeVersionId (nullable), with all existing records retaining null |

ResumeContentVersion has unique `(workspaceId, resumeVersionId, revision)` and `(workspaceId, resumeVersionId, profileVersionId, id)` keys. TailoredResumeVersion has unique `(workspaceId, jobId, revision)` and a compatibility key containing workspace, job, job revision, original resume, profile, preference, and id. Artifacts have a unique storage key and unique `(workspaceId, tailoredResumeVersionId, format)` key.

## Database consistency

Composite foreign keys scope originals, profiles, preferences, jobs, and job revisions to the workspace. The source-content relation also pins the original resume and profile. The originating draft relation pins workspace, job, job revision, original resume, profile, and preference. The optional selected tailored version on a draft uses the same compatibility fields. Parent versions must share the workspace and job. Add supporting unique keys to ApplicationDraft as needed; do not remove its existing keys or change historical records.

The draft-to-tailored relation is optional, so generation starts from an existing draft without a tailored selection. Selection appends a new draft that points to the generated version; the generated version continues to reference its originating draft. No backfill invents approval for legacy drafts.

## Immutable content and approval

Source review saves a new content snapshot with stable item IDs, original text, line locations, sections, entry relationships, uncertain/unmapped text, and explicit conflict resolutions. Review status is proposed or confirmed; confirmed snapshots require every unresolved item to be accounted for. A subsequent correction appends a revision, never rewrites the confirmed content.

Tailored snapshots store selected item IDs, ordering, original wording, manual wording, per-item factual confirmations, explicit profile-fact additions, and provenance. Editing or regenerating appends an unapproved version with a parent link. Employment chronology and protected facts remain constrained by the reviewed source/profile.

Approval is the sole permitted update to a tailored record: an atomic null-to-approved transition after inspection of its actual PDF. It records the content hash, both artifact hashes, template version, validation versions, and inspection confirmation. Duplicate or stale approvals fail. Artifact records and files are immutable. Database triggers will reject content mutation and approval replacement; application checks alone are insufficient for immutable snapshots.

## Files and validation

Original ResumeVersion records and bytes remain unchanged. Generated files use a separate private directory, UUID storage keys, exclusive writes, 0700 directories and 0600 files. Persistence failure removes only newly created outputs. No generated document enters public storage.

Both formats derive from one content snapshot. A bounded local process generates and validates PDF/DOCX before artifact persistence. Final download requires approval, successful validation, and freshly verified file hashes. PDF geometric validation applies only to the PDF; editable DOCX may reflow.

## Compatibility and rollout

The migration adds tables, constraints, and a nullable draft column. Historical applications and exports remain readable. New Ready to Apply transitions require a compatible approved tailored version with two valid artifacts. Existing Ready to Apply records show a review warning and must pass these checks if finalized again; historical Applied records are preserved.

JSON exports include content snapshots, tailored versions, artifact metadata, and approval records, but never private file bytes or filesystem paths. Full backups require both the original-resume and generated-document directories alongside the database dump.

## Verification after approval

Implement the three authorized phases, running lint, typecheck, unit tests, isolated database tests, and production build after each. Migration tests cover legacy null references and rejection of cross-workspace or incompatible references. Acceptance tests cover source traceability, protected facts, document validation, storage and route isolation, stale actions, approval hashes, and exact draft selection. Manual document and responsive keyboard inspection remains required; no browser automation or live job-platform calls.
