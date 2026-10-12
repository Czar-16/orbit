# Phase 6: application preparation

Completed 2026-10-12 in the user-requested fresh context, under the explicit instruction to continue without approval questions through Phase 6. Existing Phase 4+5 commit ba7c59b/main was confirmed before editing. Phase 6 is committed/pushed after verification; do not start Phase 7 automatically.

## Delivered

- Eligible job cards now offer Prepare application. Deterministic mode uses user-verified profile facts and the selected/private default resume, saves a real draft and opens review. An initial repeat opens the active draft instead of generating silently. Hidden jobs and hard-filter conflicts require resolution. No AI key is required.
- Application queue and responsive review show saved job/company provenance, exact selected resume version/download, profile/job/preference snapshots, readable saved weighted match explanation, unresolved questions, source attribution/URL, policy restrictions and a sticky Nothing has been submitted notice. Authorized submission is explicitly disabled. Opening links never updates job/application state.
- Letter and supported answer generation uses verified facts only; unknown/sensitive/custom questions stay empty with Needs your input. Manual edits require factual confirmation and retain User-provided provenance. Additional employer questions are supported on regeneration. No Java/Spring Boot skill, employment, metrics, dates, compensation, availability or legal answer is invented.
- Selection/order-only emphasis compares exact verified project bullets found in the chosen extracted resume, preserving original order and showing recommended order/omissions. Users may select/reorder indexes, never rewrite original bullets. Original uploaded bytes remain unchanged.
- Save, regenerate, discard and prepare-after-discard append immutable revisions. Stale tabs and concurrent saves are rejected under a workspace lock. SQL composite foreign keys enforce workspace ownership and the exact job/revision relation; an append-only SQL trigger protects draft history. Linked profile/job/preference/resume versions remain preserved. Defaults preference snapshots explicitly say defaults, not user-saved choices.
- Private local PDF/TXT extraction and proposed-fact review, with no automatic personal-fact persistence or overwrite. unpdf 1.8.1 was selected from current official docs and installed API inspection. PDF extraction runs in a separate bounded Node process with no inherited secrets; 15-second deadline, 30-page/100,000-character limits, 128 MB V8 heap setting, eval disabled. Successful synthetic-PDF parsing and malformed-PDF fallback were actually tested. Extraction failure preserves the original and allows verified-profile preparation, with unavailable emphasis flagged.
- Resume role labels/default metadata and one-active-default SQL index. Regeneration supports explicit resume selection. A profile's selected resume takes precedence over the default.
- Optional off/OpenAI/Ollama abstraction uses allowlisted existing content selection. Models may return indexes only, never new personal claims or rewritten bullets. Fixed documented endpoints, explicit hosted-spending environment opt-in, per-regeneration UI choice, no redirects/retries, time/response bounds, and Zod validation. Job descriptions are never sent as instructions. Outbound log entries precede requests and record field names/outcomes only; Settings shows the latest 100.
- Dashboard counts real preparation events. README, model, design-system, database, alignment, preparation and next-context docs reflect actual availability.

## Files changed

- Data/dependency/config: prisma/schema.prisma; prisma/migrations/202610120008_preparation/migration.sql; package.json; package-lock.json; .env.example; src/lib/env.ts.
- Preparation/storage: src/lib/{preparation,preparation-provider,draft-service,resume-extraction,resume-management,resume-proposal}.ts; scripts/extract-resume.mjs.
- Routes/actions: src/app/{page.tsx,queue/page.tsx,queue/actions.ts,queue/[id]/page.tsx,profile/page.tsx,profile/actions.ts,profile/resumes/[id]/page.tsx,settings/page.tsx}.
- UI: src/components/{job-card,draft-review,prepare-button,resume-review}.tsx.
- Tests: tests/{preparation,preparation-provider,env}.test.ts; tests/draft-review.test.tsx; tests/db/preparation.test.ts.
- Docs: DESIGN.md; README.md; docs/{PHASE-6-MODEL,PHASE-6-REPORT,PREPARATION,DATABASE,PROMPT-ALIGNMENT,NEXT-CONTEXT}.md.

## Verification

Installed versions inspected with `npm ls --depth=0`; added only exact unpdf 1.8.1 via npm. Model was documented before schema/migration edits. Migration SQL used installed Prisma 7.10.0 migrate diff plus explicit integrity constraints. Formatting used pinned Prettier 3.9.10.

Final checks after all code changes:

| Command / check                                     | Exact result                                                                                                                    |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| npm run lint                                        | Passed, no warnings                                                                                                             |
| npm run typecheck                                   | Passed                                                                                                                          |
| npm test                                            | Passed: 155 tests / 21 files                                                                                                    |
| npm run test:db                                     | Passed: 38 tests / 7 files; all eight migrations deployed in disposable PostgreSQL; container removed                           |
| npm run build                                       | Passed; new queue/review and resume-review dynamic routes built                                                                 |
| npm run db:setup                                    | Passed; preparation migration applied to guarded dedicated local Orbit Compose DB                                               |
| npm audit --omit=dev                                | Passed: 0 production vulnerabilities                                                                                            |
| git diff --check                                    | Passed                                                                                                                          |
| Local production HTTP, npm run start -- --port 3106 | Dashboard/Discover/Profile/Queue/Settings returned 200 and expected UI; Queue empty and outbound log empty, not fabricated data |
| Invalid queue/resume-review page IDs                | Expected Page not found UI; Next streamed responses have HTTP 200, not a successful record lookup                               |
| Private download invalid ID / foreign Host          | HTTP 404 / 403 respectively                                                                                                     |

New tests cover verified-only drafting, aliases preserving verified spelling, missing/sensitive answers, prompt-injection text, original bullet preservation, malformed/duplicate AI indexes, proposal non-overwrite/provenance, provider spending gate, pre-request logging and honest failures, review confirmation/read-only history, real transactional preparation, stale/concurrent edits, regeneration/discard/reprepare, workspace and job foreign keys, default uniqueness, revoked versions, real synthetic PDF extraction and malformed-PDF fallback. Early test failures in fixture initialization/PDF cleanup were corrected before the final passing runs; no check is reported as successful based on an attempted call alone.

Pre-existing next-env.d.ts development references were saved before Next checks, restored afterward, and excluded from the commit. No synthetic normal-database profile/resume/job/draft or fake external result was seeded. No discovery API calls or quota resets were made in this phase. Temporary production server was stopped after HTTP checks.

## Limits and stop point

OpenAI/Ollama adapters are mocked-protocol tested only; neither was called against a real service. No paid call, model download or real-provider success claim. AI supplementation is intentionally constrained to selecting existing facts; job analysis/match explanations/questions remain deterministic. Unknowns need manual input; exact supported question labels are documented. PDFs have no OCR; proposals are conservative and require review, and marked bullets may belong to non-project sections. The parser subprocess has resource bounds but is not an OS sandbox. Emphasis is a recommendation display, not an exported rewritten/tailored PDF. Queue/log views show up to 200 latest job drafts/100 attempts. Resume removal/redaction and SPA-history unsaved-edit handling remain outstanding.

Manual visual/keyboard review at 320/768/1280px remains outstanding; DOM and HTTP tests do not establish visual acceptance. Existing development-only lint-chain advisories remain documented in README. Nothing submits or marks Applied. Phase 7 tracking/events/follow-ups/export and Phase 8 Inngest daily scheduling/catch-up remain unimplemented. Stop here after the report/push and await explicit user authorization for Phase 7 in a new context.
