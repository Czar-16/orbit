# Listing history phase report

Completed 2026-10-12 after approval of the listing-history proposal through the user's “continue” instruction.

## Completed

- Added nullable listingUrl/sourceSnapshot fields to JobRevision. New revisions default to schemaVersion 2; existing revisions retain version 1 and unknown snapshots.
- Both single-job edits/imports and CSV/JSON batch imports capture validated source identity, label, kind, and User-provided evidence in the existing transaction. URL changes or removal and later source-label changes do not overwrite older snapshots.
- Added database constraints for snapshot shape, evidence, supported versions, and listing-URL provenance while retaining the existing salary/value/provenance checks and ownership/deletion relations.
- Job detail now displays source and listing URL per revision, explicitly distinguishes no URL supplied from unavailable legacy history, and labels the latest description/URL as current. Historical URLs are plain text and trigger no fetch or submission.
- Added regression coverage for URL A → URL B → no URL, source-label changes, stale-tab rollback, duplicate rejection, batch snapshots, malformed/false evidence rejection, preserved match history, and a real legacy-schema upgrade.
- Applied the tested migration to the guarded dedicated local Orbit Compose database with npm run db:setup. No personal facts, jobs, drafts, or application records were created by this phase outside disposable tests.

## Files changed in this phase

- `prisma/schema.prisma`
- `prisma/migrations/202610120005_listing_history/migration.sql` (new)
- `src/lib/job-history.ts` (new)
- `src/lib/job-service.ts`
- `src/components/job-revision-history.tsx` (new)
- `src/app/discover/[id]/page.tsx`
- `tests/job-history.test.tsx` (new)
- `tests/db/jobs.test.ts`
- `tests/db/foundation.test.ts`
- `tests/db/listing-migration.test.ts` (new)
- `README.md`
- `docs/INTAKE.md`
- `docs/DATABASE.md`
- `docs/PROMPT-ALIGNMENT.md`
- `docs/LISTING-HISTORY-PHASE.md` (this report)

Earlier continuation changes and the pre-existing generated next-env.d.ts development references are preserved. No dependency changes, commits, or pushes were performed.

## Commands and verification

Inspected current implementation, migration constraints, design/approved proposal, and installed versions using file reads, rg, git, and npm ls --depth=0. Consulted the [Prisma v7 migrate diff documentation](https://www.prisma.io/docs/cli/v7/migrate/diff) and generated SQL column/default changes using `npx prisma migrate diff --from-schema /tmp/orbit-before-history.prisma --to-schema prisma/schema.prisma --script --output prisma/migrations/202610120005_listing_history/migration.sql`. Custom integrity constraints were added explicitly. Formatting used pinned Prettier 3.9.10 without adding a dependency.

| Command | Final result |
| --- | --- |
| `npm run db:generate` | Passed |
| `npm run db:validate` | Passed |
| `npm run lint` | Passed |
| `npm run typecheck` | Passed |
| `npm test` | Passed: 91 tests / 13 files |
| `npm run test:db` | Passed: 26 tests / 4 files; all five migrations deployed to a disposable PostgreSQL container, then container removed |
| `npm run db:setup` | Passed: new migration deployed to dedicated local Orbit database; workspace ready |
| `npm run build` | Passed |
| `git diff --check` | Passed |

The initial disposable migration test caught JSON operator precedence in a custom constraint; parentheses fixed it before local deployment. A subsequent history fixture used a reserved .example hostname that URL validation correctly rejected; fixtures now use example.com subdomains with a stubbed public-address resolver. The final database suite passed without weakening validation. Final lint/type/unit/build checks passed after the last code edits.

The legacy upgrade test replays the first four migrations in a transaction-isolated schema, creates a legacy record, applies the fifth migration, verifies every prior field is preserved with NULL snapshots and schemaVersion 1, and rolls back the entire isolated schema. No external listing pages are contacted by the tests.

## Limits and next phase

Historical identities lost before this migration remain unavailable; the app does not manufacture them. Snapshots currently support manual source records only. Visual review at 320/768/1280px remains outstanding; DOM checks do not establish visual acceptance. Restart an already-running app to load the regenerated Prisma client.

The expanded PROMPT definition of done remains incomplete: weighted matching/preferences, mandatory/preferred detection and hard filters, resume extraction, approved discovery, drafting, tracking, export, and scheduling still need work. The next phase should address full deterministic matching, beginning with explicit requirement classification and realistic fixtures; any new preference/profile schema needs the required model proposal approval before implementation.

Stop for approval as AGENTS.md requires: “STOP after each phase report and wait for the user's approval before starting the next phase.”
