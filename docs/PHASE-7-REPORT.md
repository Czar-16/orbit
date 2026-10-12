# Phase 7: tracking and export

Completed 2026-10-12 after the user's explicit approval of PHASE-7-MODEL.md (“yes proceed”). Phase 6 base 7b92c32 and proposal d617acc were inspected. Main matched origin/main before this phase commit. No Phase 8 work was started.

## Delivered

- Application/ApplicationEvent/FollowUp, workspace/job/draft ownership, immutable confirmation and event history, honest legacy migration baselines, expected-revision checks and atomic workspace-locked changes.
- Manual-only Applied confirmation and Kolkata application date; enforced transition graph; notes, next steps and follow-up create/edit/complete/cancel. Submission dates and selected draft survive later preparation/statuses. Nothing submits externally.
- Preparation/job-state integration; Ready to apply checks current reviewed materials and unresolved answers. Draft edits, profile/preferences changes and dismissal invalidate readiness. Restore rechecks saved readiness, returning Needs review when stale while recording the prior state.
- Tracker/detail with provenance, URL-backed filters, database pagination, pinned match versions/staleness and full paginated history. Real dashboard metrics, recent events and discovery summaries.
- Complete repeatable-read JSON and separate CSV tables for all 15 entities, formula escaping, attachment/no-store headers, local Host/Origin/Referer checks, private resume-path/byte exclusions. Backup/restore instructions in BACKUP.md.

## Files changed

- Schema: prisma/schema.prisma; prisma/migrations/202610120009_tracking/migration.sql.
- Services: src/lib/{tracking,tracking-service,tracker-query,data-export,export-format,job-service,draft-service,profile-service,preference-service}.ts.
- Routes: src/app/tracker/{page,loading,actions}.tsx/ts; src/app/tracker/[id]/{page,loading}.tsx; src/app/api/export/route.ts; src/app/page.tsx; src/app/settings/page.tsx; src/app/{discover,profile,queue}/actions.ts.
- Components: src/components/{application-status,tracking-controls}.tsx.
- Tests: tests/tracking.test.ts; tests/tracking-controls.test.tsx; tests/db/{tracking,tracking-migration}.test.ts.
- Docs: DESIGN.md; README.md; docs/{DATABASE,NEXT-CONTEXT,PHASE-7-MODEL,PROMPT-ALIGNMENT,TRACKING,BACKUP,PHASE-7-REPORT}.md.

No dependencies changed. Installed versions were inspected with npm ls --depth=0. SQL was generated with installed Prisma 7.10.0 migrate diff and extended with integrity/backfill triggers. Formatting used pinned Prettier 3.9.10 and Prisma formatting, retaining unrelated existing schema formatting. Original next-env.d.ts content was saved/restored and excluded from the commit.

## Verification

| Command/check                      | Final result                                                                                                                                 |
| ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| npm run lint                       | Passed, no warnings                                                                                                                          |
| npm run typecheck                  | Passed                                                                                                                                       |
| npm test                           | Passed: 164 tests / 23 files                                                                                                                 |
| npm run test:db                    | Passed: 51 tests / 9 files; nine migrations deployed to disposable PostgreSQL; container removed                                             |
| npm run build                      | Passed; tracker/detail/export routes built                                                                                                   |
| npm run db:setup                   | Passed; tracking migration applied to guarded dedicated local Compose database                                                               |
| npm audit --omit=dev               | Passed: zero production vulnerabilities                                                                                                      |
| git diff --check                   | Passed                                                                                                                                       |
| Local production HTTP on port 3107 | Dashboard/Tracker/Settings/Discover/Queue/detail returned 200 with expected UI; JSON/CSV downloads succeeded with private attachment headers |
| Export security checks             | Invalid/duplicate query parameters: 400; foreign Origin, raw HTTP Host and cross-site fetch context: 403                                     |
| Invalid tracker ID                 | Expected Page not found UI in Next streamed HTTP 200 response                                                                                |

The real local export contains nine existing jobs, nine corresponding applications and nine labeled migration baseline events; zero confirmed submissions. Read-only HTTP checks preserved job/draft/application/event/follow-up/log/run counts. No synthetic facts/jobs/drafts were seeded into the normal database. No discovery, AI, external submission or original-listing request was made. The temporary production server was stopped.

Tests cover all status pairs, confirmation/future-date rules, Kolkata boundaries, stale/concurrent commands and rollback, readiness/input invalidation, archive restore, pinned submission drafts, notes/follow-up history, ownership, SQL confirmation immutability, append-only events, observed migration backfill (active/discarded/saved/archived/dismissed), filtering before pagination, metrics and export completeness/escaping/access controls. Early fixture failures were corrected. Production HTTP exposed NextRequest's loopback hostname normalization; the guard was fixed and an actual NextRequest regression test added. The raw Host check uses Node HTTP because fetch overrides that header. No success claim rests on a failed attempted check.

## Limits and stop point

Manual visual/keyboard acceptance at 320/768/1280 remains outstanding; automated DOM/HTTP checks do not establish it. Existing SPA-history unsaved-edit handling and resume removal/redaction remain outstanding. Ready to apply requires all displayed unanswered questions and warnings resolved; never invent sensitive answers to clear this gate. Follow-ups are local reminders without notification/message delivery. Exports are buffered in memory and not restore/import files; use documented pg_dump for large/full backups including resume bytes. No backup was restored over user data. Real AI providers remain untested. Existing development lint advisories and the pg adapter concurrency deprecation remain documented; no lint/type errors were suppressed.

Phase 7 is committed/pushed after this report; consult git log for the exact commit. STOP before Phase 8 as AGENTS.md requires. Next phase, only after approval: Inngest daily scheduling/startup catch-up, idempotency/retries and real processing summaries.
