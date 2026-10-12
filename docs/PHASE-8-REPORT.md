# Phase 8: daily scheduling

Completed 2026-10-13 after explicit approval of PHASE-8-MODEL.md. Base includes the user's committed readable design updates (59e7dff). Phase 9 was not started.

## Delivered

- Local Inngest SDK 4.23.0 / CLI 1.46.0, loopback-only transport/serve route, 09:00 Asia/Kolkata cron, startup catch-up and later-request redelivery. No cloud account or keys required.
- Workspace-owned daily ProcessingRun, source DiscoveryAttempt, request reservations, leases, execution ownership checks, bounded step retries and failure reporting. Concurrent daily record creation is workspace-locked. SQL protects ownership, states/counters and completed attempt history.
- Atomic source import/results: a committed import retains its original counts on replay. One source request/day, four/provider/day including failed requests and legacy observations, provider spacing through durable sleeps, stop on 429. Interrupted source requests are explicitly unknown and are not repeated. Old-day work is marked failed without a backlog or new-day quota spill.
- Default shared relevant-job cap 20/day remains configurable. Missing/stale manual matches process in cursor batches without AI, with idempotent match counts and no replenished daily allowance.
- Workspaces without saved preferences get a pinned configuration version labeled defaults, enabling deterministic weighted scoring without a Settings prerequisite or invented user facts.
- Run now in the header/Discover queues real work; synchronous Run manual discovery preserves the shared reservations/caps. Dashboard/Discover show persisted daily state, counts, trigger, completion and actionable errors, refreshing active runs. Existing source outcome UI remains.
- Private exports include processing and request-attempt history (schemaVersion 2). Setup/recovery instructions and a disposable real-runtime smoke command are available in SCHEDULING.md.

No new source was enabled by this phase, no source quota was reset, no paid/AI/provider request or external submission was made, and no synthetic profile/jobs/results were seeded into the normal database. The normal migration preserves existing records without invented attempts or successful daily-run baselines. The existing DESIGN.md changes were preserved; generated next-env.d.ts changes were restored.

## Files changed

- Database: prisma/schema.prisma; prisma/migrations/202610130010_scheduling/migration.sql.
- Scheduling: src/inngest/{client,functions}.ts; src/instrumentation.ts; src/app/api/inngest/route.ts; src/lib/{processing,processing-service,scheduler-dispatch,source-processing}.ts.
- Integration: src/lib/{discovery-service,job-service,data-export,env}.ts; src/app/{layout,page}.tsx; src/app/discover/{page,discovery-actions}.tsx/ts.
- UI: src/components/{app-shell,discovery-controls,processing-summary,processing-refresh,run-daily-button}.tsx.
- Checks: scripts/test-scheduler.ts; tests/{processing,env,navigation}.test.ts/tsx; tests/db/{processing,scheduling-migration}.test.ts.
- Setup/docs: package.json, package-lock.json, .env.example, .gitignore, README.md, docs/{DATABASE,PROMPT-ALIGNMENT,SCHEDULING,PHASE-8-MODEL,PHASE-8-REPORT,NEXT-CONTEXT}.md.

The CLI's adm-zip dependency is pinned to patched 0.6.1. No architecture change beyond the requested local Inngest integration. Formatting used pinned Prettier 3.9.10. SQL was generated using installed Prisma 7.10.0 migrate diff from the previous schema, then extended with integrity checks/triggers.

## Commands and final results

| Command | Result |
| --- | --- |
| npm run lint | Passed |
| npm run typecheck | Passed |
| npm test | Passed: 178 tests / 25 files |
| npm run test:db | Passed: 63 tests / 11 files; ten migrations on disposable PostgreSQL, removed afterward |
| npm run build | Passed, including /api/inngest |
| npm run test:scheduler | Passed against real production Next.js and local Inngest; disposable PostgreSQL and synthetic manual fixtures only |
| npm run db:setup | Passed; scheduling migration applied to guarded dedicated local Compose database |
| npm audit --omit=dev | Passed: zero production vulnerabilities |
| git diff --check | Passed |

Inspection used rg/file reads, npm ls/view, installed SDK declarations/CLI help and official Inngest documentation. Dependency installation used pinned npm versions. Early fixture metadata and navigation expectations were corrected. Real HTTP exposed Next's matching x-forwarded-host header; the guard now accepts that local case while rejecting foreign hosts/origins, with a regression test. Concurrent creation tests exposed a Prisma upsert race; daily upsert now occurs inside the workspace lock. No failed check is counted as a success.

Real-runtime verification exercised startup catch-up while the CLI was unavailable, genuine SDK registration/event delivery, two forced database-step failures followed by one successful committed match, replay without extra execution/match counts, exhausted retries and the real onFailure callback persisting failure, HTTP progress and foreign-Origin rejection. All external source rows were disabled before the test app started; zero source requests occurred. Temporary test services were stopped and disposable database containers removed. The normal database was not used for fault injection.

Database coverage includes concurrent triggers/claims, expired leases and previous-owner fencing, source reservation replay, immutable attempts, quota/spacing, unknown interrupted requests, invalid-URL rollback, 429 provider stop, shared manual cap, stale match replay, old-day/foreign-workspace rejection, invalid SQL values and legacy migration preservation without fabricated request history.

## Limitations and stop point

Background work requires Orbit, PostgreSQL and local Inngest to remain running. This is not an OS boot service and does not fetch missed-day backlogs. Source requests are not retried that day; only internal steps/delivery recover within bounded attempts. Completed/partial days do not reset or repeat discovery; use the existing manual match refresh for later profile edits. Three failed worker executions exhaust that day's recovery budget. Source fetches remain bounded to existing adapter behavior. Runtime traces are local; application summaries finalize source counters at completion.

The real local Inngest interface was verified. A live external-source sync was not repeated in this phase, and waiting for a wall-clock 09:00 cron occurrence was not part of the smoke test; the actual cron is registered with the runtime. Real AI providers remain untested. Existing pg concurrent-query deprecation and development-only lint-tool audit advisories remain; no lint rules or type errors were suppressed. Manual visual/keyboard acceptance at 320/768/1280 and the earlier resume/SPA-history limitations remain for Phase 9 review. There is no remote authentication, notification delivery or authorized-submission integration.

To use scheduling: restart Orbit, keep the database running, then start npm run inngest:dev in another terminal (port 3000 registration; alternate ports documented). Use Run now to recover pending delivery and inspect the real daily summary.

STOP after this phase. Only Phase 9 (hardening and documentation) remains, and requires the user's next approval.

## Follow-up repair: stale Prisma client during dev reload

The user reported `database.processingRun` was undefined in the running dashboard. Next preserved a Prisma instance created before the scheduling model was generated. The global cache now records its generated constructor and replaces/disconnects an outdated client during reload. `npm run dev` also generates Prisma before starting Next. Files changed: src/lib/db.ts, package.json, tests/db-cache.test.ts and this report. No schema/data migration or Phase 9 work was added.

Regression tests cover both a pre-upgrade cache without the constructor marker and a cache owned by an older generated constructor. Final npm run lint, npm run typecheck, npm test (180 tests / 26 files), npm run test:db (63 tests / 11 files), npm run build and git diff --check passed. A request to the user's running loopback dashboard returned HTTP 200 with Daily processing and without the page failure/stale-client error. Generated next-env.d.ts changes were restored. This validates page recovery; it does not claim an additional external sync. The earlier local-runtime requirements and known limitations still apply.
