# PROMPT alignment review

Reviewed against the existing implementation on 2026-10-12. Previous phase numbers describe the old scope; they do not establish completion of the expanded PROMPT.md.

| Requested area | Current behavior and remaining work |
| --- | --- |
| Foundation and database | Local Next.js/PostgreSQL/Prisma foundation exists. Additional workflow tables need an approved model proposal before schema changes. |
| Resume and profile | Private PDF/TXT upload, immutable versions, and explicit profile verification exist. PDF extraction with review, role-category/default resumes, selection/ordering recommendations, and resume management remain incomplete. Maximum-length profile skills reopening is fixed in this continuation. |
| Manual intake | Paste and atomic JSON intake exist; CSV is added in this continuation. URL validation does DNS checks only; listing pages are never fetched. Tracking-parameter canonicalization and suitable company/title deduplication still need careful design without merging distinct roles. Historical URL/source snapshots now persist on new revisions; older history remains honestly unknown. |
| Matching | Verified-skills coverage works without AI. Seven weighted categories, editable preferences/weights, mandatory/preferred detection, hard filters, and 12–15 realistic description fixtures remain missing. Current scores must continue to be labeled skills coverage until this is implemented. |
| Discovery | No automatic source is enabled. Review current official documentation/terms, document results in SOURCES.md, and show results for approval before enabling an adapter. Source quotas, tracked companies, real sync validation, inbox source health, and today's best matches remain missing. |
| Preparation | Prepare application remains disabled. Off/hosted/local providers, truthful versioned drafts, resume-emphasis diff, answers needing input, review/edit/regenerate/discard, and outbound data logging remain missing. |
| Tracking | Save/dismiss/archive are job states only. Application transitions, manually confirmed Applied, events, notes, follow-ups, full dashboard metrics, and JSON/CSV export remain missing. |
| Scheduling | Inngest, daily discovery, startup catch-up, a shared Asia/Kolkata daily cap, idempotency/retries, and Run now remain missing. |
| Hardening | Existing validation, private storage, local binding, and automated checks exist. Clean-start acceptance, backup/restore guidance, completed-workflow security checks, and manual visual acceptance at 320/768/1280px remain outstanding. |

The app currently supports manual import, skills scoring, and saving. It does not yet meet the expanded definition of done. No automatic application submission exists.

## Proposed next phase: preserve listing history

Status: approved by the user’s “continue” instruction and implemented in the listing-history phase. The design below records the approved scope.

Keep Workspace → Job → immutable JobRevision relations and the current Job → Source relation. Add two nullable snapshot fields to JobRevision: `listingUrl` (the URL supplied for that revision) and `sourceSnapshot` (validated JSON containing source identity, label, kind, and provenance). New writes use schemaVersion 2 and record both snapshots in the same transaction as the content revision and latest-job update. Source snapshots intentionally retain the historical label even if the mutable Source record later changes.

Existing revisions remain schemaVersion 1 with unavailable snapshots; do not copy today's Job URL/source onto an older revision or claim lost data is recoverable. A null snapshot means historical identity is unknown. A schemaVersion 2 revision can intentionally have no supplied URL while retaining a manual-source snapshot. Current job identity and unknown historical identity must be displayed separately.

Use the existing restrictive ownership/deletion relationships and indexes; no new table, external service, or secrets are required. Validate snapshots with Zod, reject malformed source metadata, and add database constraints consistent with the existing revision-integrity checks. Test URL A → URL B → no URL, original revision preservation, stale-tab conflicts, duplicate rejection with no partial writes, both single and batch creation, and migration of legacy records with unknown history. Do not alter existing match/profile revisions.

Implemented the migration, transactional snapshot writes, provenance-aware history UI, and regression tests. Then stop for phase review. Completing full matching should precede enabling discovery; resume extraction and preparation also remain separate phases.

PROMPT.md section 13 requires: “Before writing the schema, explain the proposed models and relations, then wait for my OK.” AGENTS.md also requires stopping after each phase report for approval. These are the approval boundaries for the next phase.
