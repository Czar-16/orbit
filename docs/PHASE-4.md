# Phase 4 report: manual job intake, saved jobs, and deterministic matching

Completed on 2026-10-12 under the user’s instruction to continue through Phase 4 and commit/push after every phase. Phases 2 and 3 were committed and pushed before this phase. No next phase has started.

## Delivered

- Manual intake from a pasted URL, description, or both; atomic JSON lists up to 50 rows/1 MB. Public HTTPS/address validation uses DNS only, never a listing-page request or redirects.
- User-provided provenance for entered job fields, Unknown for missing fields, no employer-verification claims, and React-escaped untrusted descriptions. Exact normalized URL duplicates preserve existing records; description-only records remain separate.
- Save/unsave, confirmed dismiss/archive, restore, inspect/edit, immutable job revisions, stale-tab rejection, and source records that remain manual/disabled. No application status or submission is created.
- Discover/Saved card lists with URL-backed role/company/location/source/status/score/date filters, sorting, pagination, truncation disclosure, and sticky headers. Source/compensation/requirement provenance remains visible.
- Deterministic confirmed-skills coverage with documented aliases, matched/missing/unverified explanations, nullable unknown scores, rule-versioned persisted results tied to job/profile revisions, and an explicit capped recording action. JavaScript does not imply Java/Spring Boot; legal/eligibility facts are never inferred. No AI key required.
- Real database-backed dashboard import-today and saved counters; UTC timestamps and Asia/Kolkata day boundaries. Application counters, Prepare application, and Run now remain unavailable.
- Available Import job navigation after a real setup check; route-shaped loading states; confirmation focus return; errors visible inside dialogs; shared inline error icons; updated design/setup/source/intake documentation.

## Verification

| Command/check | Final result |
| --- | --- |
| npm run lint | Passed, no warnings/errors |
| npm run typecheck | Passed, including generated Prisma/Next types |
| npm test | Passed: 71 tests across 11 files |
| npm run test:db | Passed: 21 real PostgreSQL tests across 3 files |
| npm run build | Passed: seven main routes, inspect route, private attachment route, and not-found route; no build warnings |
| npm run db:setup | Passed: all four migrations deployed to the dedicated local database |
| npm audit --omit=dev | 0 production vulnerabilities |
| Local HTTP smoke checks | Seven main routes returned 200 with expected live states; invalid filter ranges showed an error; invalid resume ID/unknown top-level paths returned 404; invalid job ID rendered the not-found UI |
| Build/privacy inspection | Private/environment paths absent from production trace manifests; generated database credential absent from inspected server/static artifacts, with values withheld |
| git diff --exit-code on AGENTS.md/skill files | Unchanged |
| git check-ignore on local secrets/private fixtures | Ignored correctly |
| App database count-only query | 0 jobs, 0 profiles, 0 resumes: no demo/test records seeded |

Tests exercise public/private/metadata/reserved/mapped address boundaries, mixed DNS responses, exact query preservation without HTTP fetching, unverified-skill exclusion, Java/JavaScript separation, unknown vs real-zero scores, atomic batch rejection, duplicate preservation, revision history/conflicts, save/dismiss/restore filtering, score constraints, cross-workspace match relations, and dialog cancellation/error focus behavior. Integration fixtures and private test files stay in disposable test resources, never the normal app database.

Prisma/model/dependency versions were inspected before use. Matching-table SQL was generated from the schema diff; custom constraints were applied in a separate follow-up migration. Initial typecheck findings were fixed at their source (literal rule-version typing and an unsupported testing-library option). No lint/type errors were suppressed. Formatting used pinned Prettier. The final TypeScript/lint/unit/build checks passed after UI changes; database checks passed after the final database/service changes.

## Limits

- Manual browser inspection at 320px, 768px, and 1280px remains outstanding; no browser automation was used. DOM keyboard/focus tests and HTTP checks do not establish visual correctness. Unsaved-change guards cover links/unload; SPA history navigation remains unverified.
- Scores measure manually supplied skills requirements against verified personal skills only. No automatic job/resume extraction, experience/compensation/eligibility scoring, AI, CSV parser, employer verification, public API/feed ingestion, authorized submissions, application preparation/tracking, or Inngest execution is implemented.
- Lists cap recent database-filtered candidates at 1,000 before skills filtering/sorting; recording matches handles up to 200 recent unarchived jobs. Both limits are disclosed.
- Private resume upload is PDF/TXT only; no removal/redaction UI yet. No authentication/remote exposure.
- Next streamed detail not-found pages can carry HTTP 200 after streaming begins; the not-found UI renders correctly. Invalid attachment IDs and unknown top-level routes return 404.
- Five development lint-chain audit entries remain; production audit is clean. Prior scoped Prisma-tooling fixes are documented in DATABASE.md.

## Changed files

- `DESIGN.md`
- `README.md`
- `docs/INTAKE.md`
- `docs/PHASE-4.md`
- `docs/SOURCES.md`
- `package-lock.json`
- `package.json`
- `prisma/migrations/202610120003_matching/migration.sql`
- `prisma/migrations/202610120004_match_integrity/migration.sql`
- `prisma/schema.prisma`
- `src/app/discover/[id]/loading.tsx`
- `src/app/discover/[id]/page.tsx`
- `src/app/discover/actions.ts`
- `src/app/discover/loading.tsx`
- `src/app/discover/page.tsx`
- `src/app/globals.css`
- `src/app/layout.tsx`
- `src/app/page.tsx`
- `src/app/profile/loading.tsx`
- `src/app/saved/loading.tsx`
- `src/app/saved/page.tsx`
- `src/app/settings/page.tsx`
- `src/components/app-shell.tsx`
- `src/components/field-message.tsx`
- `src/components/job-actions.tsx`
- `src/components/job-card.tsx`
- `src/components/job-file-import.tsx`
- `src/components/job-filters.tsx`
- `src/components/job-import-form.tsx`
- `src/components/job-list.tsx`
- `src/components/profile-form.tsx`
- `src/hooks/use-unsaved-changes.ts`
- `src/lib/db.ts`
- `src/lib/job-evidence.ts`
- `src/lib/job-filters.ts`
- `src/lib/job-input.ts`
- `src/lib/job-query.ts`
- `src/lib/job-service.ts`
- `src/lib/matching.ts`
- `src/lib/url-validation.ts`
- `tests/db/jobs.test.ts`
- `tests/job-actions.test.tsx`
- `tests/job-input.test.ts`
- `tests/matching.test.ts`
- `tests/navigation.test.tsx`
- `tests/urls.test.ts`
- `vitest.config.ts`

## Review boundary

### Follow-up inspection (2026-10-12)

Reviewed the pushed Phase 4 implementation at `e79d856`. Fixed one concrete editing gap: reconstructing comma-separated skills added spaces, which could push a valid 3,000-character import over the editor's validation limit. The editor now reconstructs skills without expanding the input. A disposable PostgreSQL regression test imports, reopens, and edits an entry at that limit.

Changed files: `src/lib/job-query.ts`, `tests/db/jobs.test.ts`, and this report. Re-ran `npm run lint`, `npm run typecheck`, `npm test` (71 tests / 11 files), `npm run test:db` (22 tests / 3 files), and `npm run build`; all passed. Existing generated `next-env.d.ts` dev references are preserved outside the commit. Private data was not modified. The limitations above remain, including outstanding manual visual review. No Phase 5 work started.

Commit and push follow the completed checks. Restart the running dev server, then review your own profile/resume, a real manually supplied job, save/restore/edit/filter behavior, and skills explanations using README.md. Stop after this report and wait for approval before the next phase (application preparation is the proposed next workflow).
