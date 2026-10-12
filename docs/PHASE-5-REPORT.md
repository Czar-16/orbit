# Phase 5: permitted discovery

Completed 2026-10-12. Latest user instructions waive approval waits through Phase 6, permit choosing public APIs subject to AGENTS.md, request GitHub pushes after each phase, and request fresh context for each new phase. Phase 5 was already active when the fresh-context request arrived; Phase 6 will start in a separate fresh task after this phase is pushed.

## Completed

- Reviewed API-specific permissions/general terms for candidate sources and recorded decisions in SOURCES.md before enabling adapters. Enabled Himalayas, Remotive, Jobicy and Remote OK public APIs only after the user requested a broader platform review. No paid source, LinkedIn/Indeed automation, undocumented endpoint, listing-page fetching, or submission.
- Added fixed-host HTTPS JSON requests with public-address DNS checks, pinned-IP/TLS servername connections, refused redirects, 3-second DNS / 15-second request bounds and 2 MB response limit. Zod validates source shapes and normalized intake; HTML/instructions stay inert text. Apply URLs are retained exactly; API candidates with invalid/private/prohibited-platform links are skipped and no apply page is fetched.
- Added reviewed Source provider/company filter metadata and soft removal, persistent DiscoveryRun attempts, source health/error display, enable/disable controls, and Tracked Companies using the permitted public APIs' company filters. Each query runs at most once/day; at most four calls/provider/day with 31-second spacing. Success/failure/running attempts persist across restarts. No automatic failure retry or quota bypass.
- Routed selected API jobs through the existing atomic intake/dedupe/matching pipeline. API revisions use schemaVersion 3 with official-interface evidence labeled Inferred; manual schemaVersion 2 and legacy unknown history remain preserved. Structured Himalayas/Jobicy salary/currency/supported period fields can be mapped without guesses; free-form Remotive salaries remain unknown.
- Shared a default configurable 20 newly admitted relevant jobs/Kolkata-day cap with manual role-matching intake. Admission markers do not reset on dismiss/archive; duplicates/edits do not count again. Manual over-cap batches roll back. API batches stop at remaining capacity.
- Discover defaults to weighted sorting, adds New today badges, and shows source health/Run Now. Dashboard displays today's top ten candidates from real records. No fake dashboard fixtures or personal facts were inserted.

## Real permitted-interface result

`NODE_OPTIONS=--conditions=react-server npx tsx scripts/discovery-check.ts` made real queries to the keyless sources on 2026-10-12. The second run checked the newly added sources and skipped the first two under their persistent once/day quota:

| Source | Valid normalized records fetched | New relevant listings imported | Duplicates |
| --- | --- | --- | --- |
| Himalayas | 20 | 5 | 0 |
| Remotive | 15 | 1 | 0 |
| Jobicy | 20 | 0 | 0 |
| Remote OK | 20 | 3 | 0 |

All four interfaces returned successfully and the shared intake stored nine actual listings in the dedicated local Orbit database. No resume/profile fact was created or changed. API salary mapping was subsequently extended using the documented optional fields and fixtures; the run is not repeated to evade the once/day quota. Jobicy returned valid data but no rows passed the selected role/seniority/geography/conflict prefilters; zero imports is a real result, not a failure. No Adzuna/Jooble/OpenAI/Ollama credentials were configured; their values were never printed. Source names/attribution and exact original links are shown in the app. These results establish this permitted sync, not job eligibility or application submission.

## Files

Phase 5 changed prisma/schema.prisma and added prisma/migrations/202610120007_discovery/migration.sql; added src/lib/{public-api,job-sources,discovery-service}.ts, src/app/discover/discovery-actions.ts, src/components/discovery-controls.tsx and scripts/discovery-check.ts; updated src/lib/{job-service,job-history}.ts, src/components/{job-card,job-filters}.tsx, src/app/{page.tsx,discover/page.tsx,settings/page.tsx}; added tests/{job-sources,public-api}.test.ts and tightened profile-input/profile tests for contradictory skill aliases and the experience bound and tests/db/discovery.test.ts; updated README.md, docs/{SOURCES,INTAKE,DATABASE,PROMPT-ALIGNMENT,NEXT-CONTEXT}.md and added this report. The commit also includes completed Phase 4 files enumerated in PHASE-4-WEIGHTED-REPORT.md and the earlier supplementary-review report because the push instruction arrived during Phase 5. next-env.d.ts pre-existing development references are preserved/excluded.

## Verification

Installed dependency versions were inspected; no new dependency/service was added. Formatting used pinned Prettier 3.9.10. Final checks:

| Command | Result |
| --- | --- |
| npm run lint | Passed |
| npm run typecheck | Passed |
| npm test | Passed: 142 tests / 18 files |
| npm run test:db | Passed: 31 tests / 6 files in disposable PostgreSQL, removed afterward |
| npm run build | Passed |
| npm run db:setup | Passed: tested discovery migration applied to guarded local Orbit Compose database |
| git diff --check | Passed |

Tests cover source normalization, malformed/untrusted text, salary periods, prohibited/private URLs, expired dates, preference queries, fixed-host/DNS boundaries, failed-run truthfulness, once/day replay protection, company control lifecycle, permitted provenance/history/deduplication, and shared-cap atomic behavior. API test descriptions are synthetic replacements in documented protocol shapes; they are not claimed as real employer data or seeded into the normal database.

## Limits and next phase

The app now finds and ranks public-API listings without manual job searching when Run Now is used. Scheduled daily discovery and startup catch-up remain Phase 8. Queries inspect only the first 20 records, use title/seniority/location prefilters, and may miss other relevant jobs. Unknown profiles/qualifications remain unscored or uncertain, never guessed. Salary compatibility/expiry/eligibility is not employer-verified. ATS integrations, Adzuna/Jooble, We Work Remotely, Naukri and Wellfound are explicitly unavailable with manual import as fallback; Tracked Companies uses Himalayas/Remotive filters rather than unapproved ATS endpoints. Running attempts after a crash remain visible and consume quota for that day. Visual 320/768/1280px acceptance remains outstanding; no browser automation was performed. Restart an existing dev server to load the new Prisma client.

Phase 6 is the main usable application workflow milestone: prepare tailored materials from verified facts, select/order original project/resume bullets, review unknown answers and the selected resume, save versioned drafts, and open the original listing for manual submission. Off/default deterministic mode must work without keys; hosted/local AI adapters are optional and require validated output and outbound data logs. Nothing may infer Applied or claim an untested integration works. Phase 7 adds tracking/follow-ups; Phase 8 adds scheduling. Continue Phase 6 in a fresh task, with no approval question, after committing/pushing this phase.
