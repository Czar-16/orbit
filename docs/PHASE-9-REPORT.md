# Phase 9: hardening and documentation

Completed after the user's “start the phase 9” approval. No schema, migration, dependency-version or architecture change.

## Completed

- Resume downloads now use the same loopback/same-origin Host, URL, Origin, Referer and Fetch Metadata guard as exports and local Inngest. Cross-site requests are rejected before database/private file access. Workspace/revocation restrictions and private/no-store/nosniff attachment responses remain; unavailable responses also disable caching.
- Added route regressions for rejected foreign-origin requests and a valid workspace-scoped synthetic attachment.
- Added npm run test:clean-start: tracked source copied into an isolated temporary directory, fresh npm ci, disposable PostgreSQL with all ten migrations and an empty workspace, production build/start, seven real HTTP page checks, endpoint origin guards, invalid export and missing-resume responses, custom pg_dump/pg_restore into another empty database with exact migration/workspace/job counts. It copies no ignored secrets/resumes/dependencies/builds. All temporary services/files were removed.
- Documented architecture, data flow, provenance, local trust boundaries, environment variables, command/migration map, recovery and manual/internal/restricted/external operation classification. Updated README, source audit, backup verification and alignment/handoff.
- Reviewed product networking, server-action/service validation, URL/DNS boundaries, private storage, ownership/immutable history, manual Applied confirmation, disabled submission and dependency/Git ignore boundaries. No prohibited scraping, browser automation, platform private endpoint, evasion or unauthorized external submission mechanism found. Static theme bootstrap uses a fixed script; job text is not executed. Raw unsafe SQL calls in scheduler smoke fixtures contain fixed synthetic DDL and are confined to disposable tests, not user-input product paths.

No live-source request, AI call, personal-data fixture, quota reset, application submission, normal database migration/restore or new source activation occurred. Existing source terms decisions remain unchanged; this phase is an operation audit, not a renewed terms review. No screen/theme change was made. Existing DESIGN.md describes user-approved light/dark behavior, which differs from the supplied AMOLED-only AGENTS rule; resolving that existing inconsistency is outside this hardening phase and remains an explicit limitation.

## Files changed

- src/app/api/resumes/[id]/route.ts
- tests/resume-route.test.ts
- scripts/test-clean-start.ts
- package.json (new acceptance command; lockfile/dependency versions unchanged)
- README.md
- docs/ARCHITECTURE.md, docs/OPERATIONS.md
- docs/SOURCES.md, docs/BACKUP.md, docs/PROMPT-ALIGNMENT.md
- docs/PHASE-9-REPORT.md, docs/NEXT-CONTEXT.md

Generated next-env.d.ts changes were restored/excluded. Normal private files and database were preserved.

## Commands and results

| Command | Final result |
| --- | --- |
| npm ls --depth=0 | Installed direct versions match pins; three existing extraneous optional WASM packages |
| npm run lint | Passed |
| npm run typecheck | Passed |
| npm test | Passed: 182 tests / 27 files |
| npm run test:db | Passed: 63 tests / 11 files, all ten migrations on disposable PostgreSQL |
| npm run build | Passed |
| npm run test:clean-start | Passed: fresh dependencies, migrations, empty workspace, build, seven pages, endpoint checks and isolated dump/restore |
| npm audit --omit=dev | Passed: zero production vulnerabilities |
| git diff --check | Passed |

Inspection used rg, installed versions, git status/log/remotes, source/file reads, ignore checks and loopback port inspection. Pinned Prettier 3.9.10 formatted new TS files. First checks exposed two test-code TypeScript errors (Next's required NODE_ENV declaration and an inferred header union); both fixed directly without suppression. First clean-start assertion used workspaces instead of the actual workspace export table; corrected and full isolated acceptance rerun passed. No interrupted/failed check is counted as passing.

The separate npm run test:scheduler was not rerun: port 8288 already belongs to the user's running local Inngest service. That service was left untouched. Phase 8's real-runtime verification remains the last scheduler integration evidence; this phase changed no scheduler behavior. Unit/database scheduling tests passed again. Fresh-install audit confirms five existing high-severity development lint-chain entries; production audit remains clean. Existing pg concurrent-query deprecation remains.

## Limits and stop point

Clean-start acceptance verifies the documented existing-instance migration path at a random loopback port, not db:setup on the occupied normal database port. It initializes only a synthetic empty workspace. Restore verification uses synthetic data and does not validate real personal backups or resume-byte recovery. Seven successful page requests are HTTP acceptance, not visual/keyboard inspection. Manual checks at 320/768/1280 and SPA-history unsaved-edit handling remain unverified.

Optional real AI providers remain untested. Existing bounded PDF extraction is not an OS sandbox; no DOCX/OCR, resume removal/redaction or exported tailored PDF. List/search/import limits remain documented. No auth, authorized submission, notification delivery, boot service or missed-day scheduling backlog. Orbit, PostgreSQL and Inngest must stay running for local scheduling. Original listing navigation and preparation never mark Applied; explicit manual confirmation is required.

Phase 9 is the final planned phase. Stop after this report; further work requires a new user-approved scope. No claim that every expanded definition-of-done item or manual acceptance step is fulfilled.
