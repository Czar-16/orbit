# Daily scheduling (Phase 8)

Orbit uses Inngest SDK 4.23.0 and local CLI 1.46.0. No account, hosted plan, cloud keys or new infrastructure is needed. Local background work runs only while Orbit, PostgreSQL and the Inngest dev server are running.

## Run locally

1. `npm ci`
2. `npm run db:setup`
3. `npm run dev` (loopback port 3000)
4. In another terminal, `npm run inngest:dev`

The CLI binds to 127.0.0.1:8288, explicitly registers http://127.0.0.1:3000/api/inngest, disables app auto-discovery and persists local execution state. Its UI is http://127.0.0.1:8288. Keep this local; Orbit has no remote authentication. For a different app port, run `npx --no-install inngest-cli dev --host 127.0.0.1 --no-discovery -u http://127.0.0.1:YOUR_PORT/api/inngest --persist`.

The daily cron is `TZ=Asia/Kolkata 0 9 * * *`. Startup queues today's missing run; later local page requests retry delivery at most once a minute when needed. If the CLI starts after Orbit, open a page or use **Run now**. A queued event is never reported as completed. No missed-day backlog is fetched. Old unfinished records are marked failed, preserving their uncertain outcomes. Timestamps are stored in UTC; daily identities/limits use Asia/Kolkata.

`ORBIT_SCHEDULER_ENABLED=false` disables scheduled/startup/event execution. **Run manual discovery** remains usable with the same database caps and source quotas. The app has explicit local SDK mode, a fixed transport allowlist and redirect rejection; INNGEST cloud/base-URL settings cannot redirect Orbit's requests. Do not configure cloud signing/event keys for this local setup.

## Durability and limits

- ProcessingRun is unique per workspace/Kolkata day. Concurrent cron/startup/manual events share that record, with database claims, a ten-minute renewable lease and at most three worker executions. Inngest retries failed steps twice and preserves completed steps.
- Source HTTP requests are reserved before sending, once per source/day and at most four/provider/day including failed requests. At least 31 seconds separate provider requests. Durable sleeps handle spacing in the daily worker; the synchronous fallback reports spacing skips and can be run later. A 429 stops that provider today.
- External HTTP requests are deliberately not retried that day. An interrupted reservation becomes an explicit unknown-outcome failure; it is never silently reissued. Completed import, source counters and attempt success share a transaction, preserving results after replay.
- Default 20 relevant new jobs/day, configurable in Settings. Manual/API intake share the locked ledger. Existing-job matching does not spend/reset the allowance. Import crossing Kolkata midnight rolls back rather than charging another day under an old run.
- Source prefilters and deterministic hard filters precede atomic intake. Remaining manual/stale matches are processed in cursor batches; scoring creates no personal facts and sends no AI requests. Archived jobs are excluded. Without a verified profile, jobs remain unscored.
- If preferences were never saved, the worker pins the existing default settings as a version labeled `origin=defaults`; these are configuration defaults, never user-verified personal facts.
- Dashboard/Discover show real daily state, final counters, trigger, worker executions, completion and safe errors. Active summaries refresh every five seconds. Per-source outcomes remain visible. The snapshot profile/preferences/cap describes run start; intake/matching read the current verified versions and current cap, and individual matches retain their exact version IDs.
- New processing/attempt records are included in JSON and CSV export. Legacy discovery records retain honest zero detailed-attempt counts, while still consuming the daily provider quota. Historical attempt details are not invented.

## Troubleshooting and verification

Local runtime unavailable: start `npm run inngest:dev`, then use Run now. Check the local CLI UI for queued/running/failed steps. Database unavailable or migrations missing: run `npm run db:setup`, then restart Orbit. Completed/partial days are not restarted to reset quotas. Three failed executions exhaust the daily recovery budget; fix setup and allow the next day's run. Request outcomes remain visible even if the worker fails.

Do not clear quota/run tables to force another source request. Source failures never imply successful discovery or an application submission. Permitted interfaces and attribution remain documented in SOURCES.md; this phase adds no source or submission integration.

`npm run test:scheduler` requires a current `npm run build`, Docker and unused loopback ports 3178/8288. It starts disposable PostgreSQL, seeds explicitly synthetic manual fixtures with all external sources disabled, starts production Orbit and the real local Inngest CLI, delivers an event, verifies durable scoring and replay protection, checks progress HTTP/security, then removes test services. It never calls source APIs. Failed synthetic-run logs can be retained in a temporary directory; no environment credentials are written there.

References: [Next.js integration](https://www.inngest.com/docs/getting-started/nextjs-quick-start), [function retries/concurrency](https://www.inngest.com/docs/reference/typescript/v4/functions/create), [timezone cron](https://www.inngest.com/docs/durable-execution/guides-and-advanced/events-and-triggers/schedules-and-delayed-starts).
