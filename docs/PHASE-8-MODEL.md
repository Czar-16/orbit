# Phase 8 proposal: daily scheduling and durable processing

Status: approved by the user with “continue and tell me after phase 8 completes”; implemented and verified in PHASE-8-REPORT.md. The sections below retain the proposal reviewed before schema changes. Phase 9 remains separate.

## Current implementation

DiscoveryRun records one source attempt per workspace/source/Kolkata day. Workspace-locked reservations enforce provider quotas and spacing; intake enforces the relevant-job cap and deduplication. Failed or interrupted reservations currently prevent another attempt that day. There is no Inngest dependency, startup catch-up or durable daily orchestration record. Existing sources and permissions are documented in SOURCES.md.

## Proposed models and relations

Add ProcessingRun, owned by Workspace, unique on workspaceId/day (Asia/Kolkata YYYY-MM-DD). Fields: UUID id; trigger (scheduled/startup/manual); state (queued/running/success/partial/failed); revision; queuedAt, startedAt, finishedAt, leaseExpiresAt (UTC); attempt count; bounded safe error; counters for fetched/imported/duplicates/filtered/matched/skipped and the cap/profile/preference versions used. Workspace deletion remains restricted. Add workspace/state/day lookup indexes. A retry reuses this record rather than creating another daily allowance.

Extend DiscoveryRun with an optional ProcessingRun relationship, attempt count, lease expiry and last-attempt timestamp. Legacy records remain unattached historical observations. Add a DiscoveryAttempt child with workspace/source/run ownership, unique run/attempt number, reserved/finished timestamps, result and safe error. Reserve every actual HTTP request before sending; quotas and spacing count attempts, including failures. No historical synthetic attempts or fabricated results are backfilled. Existing run uniqueness remains.

Use SQL constraints for valid counters/states, completion timestamps and workspace ownership. Finalize source import and its successful counters atomically so a crash after persistence cannot misreport a replay as zero imports. Keep existing job/match identities and provenance; job storage is the authoritative cap ledger. Export the new records with the existing private-data exclusions.

## Execution behavior

- Daily schedule at 09:00 Asia/Kolkata, with a shared event-triggered worker for startup catch-up and Run Now. Validate event inputs with Zod. Database idempotency and leases complement Inngest concurrency and durable steps.
- Startup checks today's durable record and queues missing or recoverable work when the local runtime is reachable. A failed enqueue stays visibly pending; retries on later local requests can deliver it. Never report success merely because an event was sent. No backfill across missed days and no old-day retry spending today's allowance.
- Bounded retries for orchestration/database delivery; source HTTP retries only when permitted, with every attempt counted and provider spacing respected. Stop on 429; do not retry malformed/forbidden responses. Recover expired leases without silently repeating a request whose outcome is uncertain.
- Default 20 relevant new jobs/day, configured through existing preferences. Manual and discovered jobs share the current cap; rescoring existing jobs does not replenish it. Process missing/stale deterministic matches without AI calls or invented profile facts.
- Run Now returns a truthful queued/running/completed/unavailable result. Preserve synchronous manual discovery as an explicit fallback when the local scheduler is unavailable, under the same database reservations and quotas.
- Surface persisted daily progress, per-source outcomes, safe actionable errors and last completion on Discover/Dashboard. Respect existing design tokens; preserve the pre-existing DESIGN.md edit.
- Local Inngest only: loopback endpoint validation and local request guards, explicit dev mode and no cloud fallback. The app, PostgreSQL and Inngest dev server must remain running. No account, paid service, new job source or external submission.

## Implementation and verification after approval

Inspect/pin the actual Inngest SDK/CLI versions and use their official docs. Add the migration, services, local serve route, startup dispatch, Run Now integration, summaries and setup documentation. Test daily rollover, concurrent triggers, crash/retry replay, source quotas/429, cap sharing, stale matches, unavailable runtime and legacy migration using recorded API fixtures and disposable PostgreSQL. Exercise the real local Inngest interface with synthetic test-only jobs; do not claim external source success without a real permitted sync.

Required checks: npm run lint, npm run typecheck, npm test, npm run test:db, npm run build and git diff --check. Report results and stop before Phase 9.

Official references reviewed for the proposal:

- https://www.inngest.com/docs/getting-started/nextjs-quick-start
- https://www.inngest.com/docs/durable-execution/guides-and-advanced/events-and-triggers/schedules-and-delayed-starts
- https://www.inngest.com/docs/reference/typescript/v4/functions/create

Approval gate: PROMPT.md section 13 says, "Before writing the schema, explain the proposed models and relations, then wait for my OK." Approve this model before implementation begins.

## Proposal-stage verification

Baseline checks passed: npm run lint; npm run typecheck; npm test (173 tests / 24 files); npm run test:db (51 tests / 9 files, existing nine migrations on disposable PostgreSQL); npm run build; git diff --check. The existing pg concurrent-query deprecation warning remains. Only this proposal document was added; generated next-env.d.ts changes were restored. These results validate the current baseline, not the proposed scheduling integration. Phase 8 implementation remains pending model approval; Phase 9 remains separate.
