# Orbit

Local job application workspace through Phase 8. Private resumes, user-verified profiles, manual intake, seven-category deterministic matching, editable preferences, saved jobs, and permitted public-API discovery work locally without an AI key. Versioned application preparation/review works without AI; manual application tracking, notes, follow-ups and complete JSON/CSV export are available. Local Inngest daily scheduling, startup catch-up, bounded retries and daily processing summaries are available.

## Setup

Use Node.js 24 LTS and npm:

```sh
npm ci
npm run db:setup
npm run dev
```

Open the loopback URL printed by Next.js, normally http://127.0.0.1:3000. If that port is occupied, dev selects the next available port. Restart a previously running dev server after pulling these changes so it loads the updated dependencies and ignored local database configuration.

`db:setup` generates private random credentials in ignored `.env.local`, starts the dedicated PostgreSQL service on 127.0.0.1:55432, applies migrations, and initializes an empty local workspace. It never seeds personal facts or jobs. See [database setup](docs/DATABASE.md). The shell also runs without database configuration, showing setup-needed states; no AI key is required.

Start `npm run inngest:dev` in another terminal for daily scheduling. It binds to loopback port 8288 and registers Orbit on port 3000. See [scheduling setup and recovery](docs/SCHEDULING.md) for other app ports, daily caps and limitations.

Production locally:

```sh
npm run build
npm run start
```

Both app scripts bind to 127.0.0.1. No authentication is implemented; add real authentication before any remote exposure or tunneling. Keep database credentials, resumes, and private data out of Git.

## Available workflows

1. In Resume & profile, upload a private PDF or UTF-8 TXT file up to 5 MB. Extract local text or review proposed missing facts, check every field, and explicitly confirm/save it. No extracted facts are automatically saved or verified. Select a resume version or designate a default.
2. In Discover jobs, paste a public HTTPS URL, a description, or both; enter known employer-stated fields. URLs are validated through scheme/host/address checks, but listing pages are never fetched. A link-only import keeps unknown fields unknown.
3. Import a CSV or JSON list of up to 50 jobs and 1 MB. All rows validate before any write. Exact URL duplicates preserve existing records; description-only entries stay independent. See [manual intake and matching](docs/INTAKE.md).
4. Save, unsave, dismiss, archive, restore, inspect, and edit jobs. Edits create revisions with listing URL/source snapshots; older revisions show unknown listing history. Filters, sorting, and pagination persist in the URL; date filters and dashboard today use Asia/Kolkata.
5. In Settings, save matching preferences and weights. Seven categories use confirmed points out of 100 with visible unknown weight and a possible upper bound; missing information is never rescaled into a match. Explicit numeric experience, education level, absent skills, and verbatim project bullets require your confirmation in Profile. Match history pins job/profile/preference revisions. Skills coverage remains separately labeled.
6. Inspect a job to review mandatory/preferred/unclear wording and hard-filter flags. Missing skill confirmation never proves absence; preferred Java never rejects and undisclosed salary remains unknown.
7. Use **Run now** for local scheduled processing, or **Run manual discovery** for permitted Himalayas/Remotive/Jobicy/Remote OK public APIs. Settings allows source toggles and tracked company filters. Each query runs once per Kolkata day with four requests/provider/day and 31-second spacing. New relevant jobs share the configurable daily cap with manual intake. See [source permission review](docs/SOURCES.md). No listing page is fetched.
8. Review Today’s best matches, Save/Dismiss jobs, and open the exact returned original listing to apply manually. Prepare a truthful draft from your verified profile and chosen resume, review/edit/regenerate/save/discard versions in Application queue, and open the listing for manual submission. This never marks Applied.

9. In Tracker, explicitly confirm an application you submitted yourself and its Kolkata date, record later statuses, notes, next steps and follow-ups. History remains immutable. Settings exports complete JSON or CSV tables; see [tracking](docs/TRACKING.md) and [private backup/restore](docs/BACKUP.md).

Nothing is submitted. Open original listing is a normal user-controlled link. Prepare application generates materials; Run now queues internal processing; manual discovery ingests permitted listings. Authorized submission is disabled with an explanation. See [application preparation and optional AI data handling](docs/PREPARATION.md).

## Checks

```sh
npm run lint
npm run typecheck
npm test
npm run test:db
npm run build
npm run test:scheduler # disposable real local Inngest check; ports 3178/8288 must be free
```

ESLint runs separately from the Next.js build. Unit/DOM tests cover navigation, confirmation/failure states, input/provenance validation, URLs, matching, filters, and Asia/Kolkata boundaries. Real integration tests use their own disposable PostgreSQL container and ignored temporary private storage, never the app database. Tests do not automate a browser or contact job listing pages.

Prisma generation runs during postinstall, typecheck, and build. Generated clients are ignored. next/font fetches Geist Sans/Mono during build and serves them locally at runtime. Private/environment files are excluded from build tracing.

## Review in your browser

At 320px, 768px, and 1280px check navigation, form wrapping, job cards, sticky list headers, dialogs, and no horizontal overflow. Use Tab/Shift+Tab for visible focus, the skip link, More-sheet focus containment/Escape return, and job confirmation cancellation. Check that unsaved edits warn before leaving through navigation links or unloading. SPA history navigation remains unverified.

After entering your own verified skills, import a real description with manually supplied required skills. Check the matching/missing explanation, save and find it in Saved jobs, edit a revision, refresh filters, and confirm that dashboard counts reflect actual records. A LinkedIn/Indeed URL must never fetch its page. Applied must appear only after your explicit manual confirmation.

Manual visual/keyboard inspection was not performed in this tool session. DOM and HTTP checks do not replace it.

## Limits

PDF/TXT only; local bounded extraction with human review, no DOCX/OCR. Requirement classification uses a bounded English rule vocabulary. No resume removal/redaction UI yet. CSV and JSON imports support the documented fields. Lists sort and score-filter within the 1,000 most recent records matching database filters; manual match refresh handles up to 200 recent unarchived jobs; daily processing checks all unarchived jobs in cursor batches. Missing job/profile information requires your input. Authorized submissions remain disabled. Local scheduling requires Orbit, PostgreSQL and the Inngest dev server to stay running. Tracking follow-ups are local reminders with no notification delivery. Buffered export is intended for a local workspace; use pg_dump for large backups. Optional AI adapters are implemented but real-provider untested; default preparation is deterministic. Resume emphasis is a selection/order display, not an exported replacement PDF. Discovery currently requests only the first 20 records per query. ATS board ingestion and credentialed Adzuna/Jooble adapters remain disabled where permission/configuration is unresolved. Unknown salary fields, unsupported pay periods and free-form Remotive salary text are not guessed.

Production dependencies audit clean. Five high-severity entries remain in the development lint chain (eslint-config-next → Next lint plugin → fast-glob → micromatch → braces); npm has no compatible patch. ESLint 9.39.5 remains required by current plugin peer ranges despite its deprecation. Scoped Prisma-tooling overrides are explained in docs/DATABASE.md and verified through real generation/migration tests.

## Reports and project map

- [Phase 2 database report](docs/PHASE-2.md)
- [Phase 3 resume/profile report](docs/PHASE-3.md)
- [Phase 4 intake/matching report](docs/PHASE-4.md)
- [Private profile details](docs/PROFILE.md)
- [Source register](docs/SOURCES.md)
- `src/app`: routes, server actions, private attachment download, loading/error states.
- `src/lib`: server-only storage/database services, Zod contracts, provenance, filters, matching, and time helpers.
- `prisma`: schema and migrations; `scripts`: local setup/disposable tests.
- `tests`: unit/DOM and real database checks.

DESIGN.md remains the AMOLED UI contract. AGENTS.md remains the compliance/truth/security contract. The user approved the Phase 7 tracking model and implementation. Phase boundaries still require a report and approval before proceeding. Prior instructions request a push after each completed phase and a fresh context for the next phase. Model/source decisions and phase checks remain documented. See [Phase 4 report](docs/PHASE-4-WEIGHTED-REPORT.md), [Phase 5 report](docs/PHASE-5-REPORT.md), [Phase 6 report](docs/PHASE-6-REPORT.md), [Phase 7 report](docs/PHASE-7-REPORT.md), and [next-context handoff](docs/NEXT-CONTEXT.md).
