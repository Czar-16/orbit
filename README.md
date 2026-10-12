# Orbit

Local job application workspace, implemented through Phase 4. Seven main pages provide private resumes, user-verified profiles, manual job intake, saved jobs, and deterministic skills matching. Application preparation, application tracking, background runs, AI, and external integrations remain unavailable.

## Setup

Use Node.js 24 LTS and npm:

```sh
npm ci
npm run db:setup
npm run dev
```

Open the loopback URL printed by Next.js, normally http://127.0.0.1:3000. If that port is occupied, dev selects the next available port. Restart a previously running dev server after pulling these changes so it loads the updated dependencies and ignored local database configuration.

`db:setup` generates private random credentials in ignored `.env.local`, starts the dedicated PostgreSQL service on 127.0.0.1:55432, applies migrations, and initializes an empty local workspace. It never seeds personal facts or jobs. See [database setup](docs/DATABASE.md). The shell also runs without database configuration, showing setup-needed states; no AI key is required.

Production locally:

```sh
npm run build
npm run start
```

Both app scripts bind to 127.0.0.1. No authentication is implemented; add real authentication before any remote exposure or tunneling. Keep database credentials, resumes, and private data out of Git.

## Available workflows

1. In Resume & profile, upload a private PDF or UTF-8 TXT file up to 5 MB. No document facts are automatically extracted. Enter accurate profile facts and skills yourself, then explicitly confirm and save them.
2. In Discover jobs, paste a public HTTPS URL, a description, or both; enter known employer-stated fields. URLs are validated through scheme/host/address checks, but listing pages are never fetched. A link-only import keeps unknown fields unknown.
3. Import a JSON list of up to 50 jobs and 1 MB. All rows validate before any write. Exact URL duplicates preserve existing records; description-only entries stay independent. See [manual intake and matching](docs/INTAKE.md).
4. Save, unsave, dismiss, archive, restore, inspect, and edit jobs. Edits create revisions. Filters, sorting, and pagination persist in the URL; date filters and dashboard today use Asia/Kolkata.
5. Skills coverage compares supplied job requirements against explicitly verified profile skills. It works without AI, explains missing/unverified skills, and leaves unknown inputs unscored. Scores do not assess experience, salary, eligibility, or employer accuracy. Matches are pinned to job/profile revisions; list display recalculates against your latest profile.

Nothing is submitted. Open original listing is a normal user-controlled link. Prepare application and Run now remain disabled with explanations.

## Checks

```sh
npm run lint
npm run typecheck
npm test
npm run test:db
npm run build
```

ESLint runs separately from the Next.js build. Unit/DOM tests cover navigation, confirmation/failure states, input/provenance validation, URLs, matching, filters, and Asia/Kolkata boundaries. Real integration tests use their own disposable PostgreSQL container and ignored temporary private storage, never the app database. Tests do not automate a browser or contact job listing pages.

Prisma generation runs during postinstall, typecheck, and build. Generated clients are ignored. next/font fetches Geist Sans/Mono during build and serves them locally at runtime. Private/environment files are excluded from build tracing.

## Review in your browser

At 320px, 768px, and 1280px check navigation, form wrapping, job cards, sticky list headers, dialogs, and no horizontal overflow. Use Tab/Shift+Tab for visible focus, the skip link, More-sheet focus containment/Escape return, and job confirmation cancellation. Check that unsaved edits warn before leaving through navigation links or unloading. SPA history navigation remains unverified.

After entering your own verified skills, import a real description with manually supplied required skills. Check the matching/missing explanation, save and find it in Saved jobs, edit a revision, refresh filters, and confirm that dashboard counts reflect actual records. A LinkedIn/Indeed URL must never fetch its page. No workflow should claim Applied.

Manual visual/keyboard inspection was not performed in this tool session. DOM and HTTP checks do not replace it.

## Limits

PDF/TXT only; no DOCX parsing or automatic resume/job extraction. No resume removal/redaction UI yet. JSON import supports the documented fields; no CSV parser. Lists sort and score-filter within the 1,000 most recent records matching database filters; recording matches handles up to 200 recent unarchived jobs. Missing job/profile information requires your input. Application preparation/tracking, authorized submissions, public API/feed intake, Inngest runs, and AI are future work.

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

DESIGN.md remains the AMOLED UI contract. AGENTS.md remains the compliance/truth/security contract. The user authorized continuous work through Phase 4 and commit/push after each phase. Work stops after the Phase 4 report for review before the next phase.
