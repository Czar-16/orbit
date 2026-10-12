# Phase 7 tracking proposal

Status: approved by the user (“yes proceed”) on 2026-10-12 and implemented in Phase 7. Phase 6 is committed/pushed as 7b92c32. See PHASE-7-REPORT.md and TRACKING.md for the delivered behavior and validation.

## Models and relations

Retain the existing local Workspace, Job, immutable JobRevision and ApplicationDraft models. Add three workspace-owned models with restrictive deletion and composite foreign keys to prevent cross-workspace links:

| Model            | Fields and purpose                                                                                                                                                                                                                                          | Relations and constraints                                                                                                                                                                                                                                                                   |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Application      | UUID; workspaceId; jobId; status; revision counter; selected draft ID (nullable); appliedAt (nullable UTC timestamp); applied provenance/confirmation time (nullable until manually confirmed); nextStep (nullable user-provided text); createdAt/updatedAt | One application per workspace/job. References its own Job and, when selected, a draft belonging to that same workspace/job. Index workspace/status/update time and applied date.                                                                                                            |
| ApplicationEvent | UUID; workspaceId; applicationId; sequence; kind; previous/new status (nullable for notes); bounded note/validated details; origin; occurredAt (UTC); recordedAt (UTC)                                                                                      | Append-only history, unique application/sequence. References the application in the same workspace. Index workspace/recordedAt. An event and its state update commit atomically. User notes are user-provided, never employer-verified.                                                     |
| FollowUp         | UUID; workspaceId; applicationId; bounded label; dueAt; completedAt/cancelledAt (nullable); revision counter; createdAt/updatedAt                                                                                                                           | References the application in the same workspace. Due dates are selected as Asia/Kolkata calendar dates and stored as UTC instants at local midnight. Completion and cancellation are mutually exclusive. Index workspace/dueAt and application. Every change appends an application event. |

All external action, filter and export inputs use strict server-side Zod validation. No credentials, new services, external submission API or personal-fact inference is introduced. SQL constraints enforce status/date/confirmation consistency, positive revisions, ownership and append-only events. Transactional workspace locks and expected revision checks reject stale/concurrent updates. Retries of stale commands require reload rather than repeating an action silently.

## Status transitions

The initial proposed transition graph is:

| Current        | Allowed next states                                      |
| -------------- | -------------------------------------------------------- |
| Discovered     | Saved, Needs Review, Draft Ready, Applied, Archived      |
| Saved          | Discovered, Needs Review, Draft Ready, Applied, Archived |
| Needs Review   | Discovered, Saved, Draft Ready, Applied, Archived        |
| Draft Ready    | Needs Review, Ready to Apply, Applied, Archived          |
| Ready to Apply | Needs Review, Draft Ready, Applied, Archived             |
| Applied        | Interview, Offer, Rejected, Withdrawn, Archived          |
| Interview      | Offer, Rejected, Withdrawn, Archived                     |
| Offer          | Withdrawn, Archived                                      |
| Rejected       | Archived                                                 |
| Withdrawn      | Archived                                                 |
| Archived       | Explicit restore to the recorded previous state          |

Mark as applied is a dedicated manual command, requiring an explicit confirmation and a user-selected application date that is not in the future in Asia/Kolkata. It is available without a draft because the user may have applied outside this app. Interview/Offer require a prior confirmed application. Applied date and original confirmation remain preserved in subsequent statuses and archived records. No opening-link action writes application state. No authorized integration is added.

Ready to Apply requires an explicitly reviewed current active draft, with required unresolved answers addressed; unresolved profile/resume warnings remain visible and block readiness where appropriate. Preparation records Draft Ready only in pre-application states. Editing/regenerating a ready draft resets readiness; discard returns pre-application workflow to Needs Review. Preparing or changing drafts for an already applied/terminal application preserves its tracking status and prior selected submission draft.

Save/unsave/archive/restore job actions must update the pre-application tracker state in the same transaction where appropriate. Saving/dismissing a job never withdraws/rejects an application. Job inbox visibility and application progress remain separately stored and explicitly labeled. Tracking archive/restore records the prior status, preserving dates and drafts. Restore uses that saved status, not an arbitrary target supplied by the client.

## Existing data

Backfill one tracking row per existing job using only observable state: archived job → Archived; latest active draft → Draft Ready; saved job → Saved; otherwise Discovered. Archived records retain the observable underlying pre-application state for restore. Dismissed jobs keep their job-only dismissed label. Backfill records a clearly labeled migration baseline at migration time; it never invents historical transitions or applied dates. Existing immutable drafts and snapshots stay intact. Newly imported jobs get Discovered state atomically; successful preparation/state actions append real events after rollout.

## UI, metrics and export

Build the existing Tracker route and application detail view using DESIGN.md: status badges, responsive lists, URL-backed company/role/source/score/status/location/date filters, pagination, notes, next steps, event history and follow-up controls. Database filters run before pagination; score filtering must explicitly specify the pinned match version used, and unknown scores remain unknown. Use the application-selected draft match snapshot where available; otherwise the latest recorded match for the latest job revision, labeled with its profile/preference version and staleness.

Dashboard metrics distinguish jobs imported today, relevant jobs recorded today, awaiting review, unique applications with active drafts, manually confirmed applications (including those now in later statuses), current interviews/rejections, and pending overdue/upcoming follow-ups. Today uses Asia/Kolkata intervals; unavailable queries never show fabricated zeroes. Recent activity comes from actual events, draft history and discovery runs with explicit origins. Discovery summaries use existing DiscoveryRun fields; scheduling summaries remain Phase 8.

Provide local-only JSON export covering workspace configuration, verified profile versions, resume metadata, sources, job revisions, matches/preferences, drafts, applications/events/follow-ups, discovery runs and outbound metadata. Exclude environment variables, credentials, internal storage paths and resume bytes. Private original resume downloads remain separate. Export a consistent database snapshot, retain provenance and version IDs, and mark unknowns as null. CSV export uses separately downloadable tables for each entity rather than dropping nested/history data; nested fields use JSON cells. Escape spreadsheet formula prefixes, quote CSV correctly, send attachment/no-store headers, validate host/origin and document that exports contain private information. No imports or backup restore are performed by export. Document manual pg_dump/restore procedures without displaying credentials.

## Acceptance checks and implementation boundary

After approval, implement the schema/migration, pure transition/input rules, transactional services, UI/dashboard/export, then test valid/invalid transitions, absent/manual confirmation, future dates, draft readiness, stale/concurrent requests, ownership, append-only history, backfill, Kolkata boundaries, archived restoration, filtering, accurate counts and export completeness/formula escaping. Real DB tests run only against disposable PostgreSQL; no sample personal data enters the normal database.

Run lint, typecheck, unit/DOM tests, DB tests and build; document results and limitations; commit/push the completed Phase 7; stop before Phase 8. The approved proposal is implemented by migration 202610120009_tracking and the tracking/query/export services. Phase 8 remains separate.

## Implementation refinements

Application additionally stores nullable derived matchScore/matchSnapshot fields so exact pinned-score filters run in PostgreSQL before pagination. These cache existing draft/recorded-match evidence with version IDs; they never create employer facts. A discarded pre-application draft switches to the latest recorded-match projection. Archive restore uses the recorded previous status but rechecks draft availability/currency/readiness; a failed recheck returns Needs review and preserves the recorded previous status in the restore event. This prevents stale or discarded materials from regaining readiness. All displayed unanswered questions block Ready to apply; unknown/sensitive answers must never be invented to clear this gate.

Saved profile/preferences changes and dismissal invalidate pre-application Ready to apply in the same workspace-locked transaction, appending an event while preserving the pinned evidence. Confirmed application history is unaffected.
