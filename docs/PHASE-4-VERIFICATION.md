# Phase 4 fresh-context verification

Reviewed on 2026-10-12 at commit `c987ac3`, including the job skills-length fix. This was a verification pass; no application code, schema, or personal data was changed, and Phase 5 was not started.

Result: all required automated checks pass, but two functional gaps remain. This is not a complete acceptance of Phase 4's history and editing behavior.

## Findings

1. **Medium — historical listing URL/source is lost on edit.** `src/lib/job-service.ts:255` overwrites `Job.listingUrl`, `urlHash`, and `sourceId`. `JobRevision` (`prisma/schema.prisma:107`) stores neither the listing URL nor a source snapshot. Although the content hash includes the URL, a hash cannot recover it. Changing a URL from listing A to listing B leaves previous revisions without their original URL/source, so history cannot reconstruct the complete supplied input. Preserve URL/source identity in each revision, with an honest unknown state for historical values that cannot be recovered. Current tests verify revision numbers and preserved job details but do not cover URL history.

2. **Medium — a valid profile skills list can become invalid when reopened.** `src/lib/profile-input.ts:74` reconstructs skills using `join(", ")`, expanding the input. An in-memory reproduction used 999 `a` characters, a comma, and 1,000 `b` characters: the original 2,000-character profile passes validation; reopening produces 2,001 characters and fails the skills limit even when only another field is edited. This originates in Phase 3 and affects the profile feeding Phase 4 matching. Apply the same non-expanding reconstruction used for job skills and cover the profile round trip with a regression test. No profile was written to reproduce this.

## Checks run

| Command/check | Result |
| --- | --- |
| `npm ls --depth=0` | Installed versions inspected; pinned direct dependencies present; three extraneous optional WASM packages reported |
| `npm run lint` | Passed |
| `npm run typecheck` | Passed |
| `npm test` | Passed: 71 tests / 11 files |
| `npm run test:db` | Passed: 22 tests / 3 files; all four migrations applied to a new disposable PostgreSQL container, then container removed |
| `npm run build` | Passed |
| `npm run start -- --port 3104` plus local HTTP checks | All seven main routes returned 200 with expected content; invalid score ranges showed the filter error; invalid job ID rendered not-found UI with HTTP 200; invalid attachment ID and unknown route returned 404 |
| Profile skills round-trip via `npx tsx -e` | Reproduced finding 2 without database access |
| Source/action/privacy inspection | No listing HTTP fetch, automated application submission, AI matching dependency, tracked private files, or error suppression found in inspected code |

HTTP checks made read-only requests to the local app. No external listing was requested. No normal-database setup, imports, profile changes, or resume uploads were performed. The temporary production server was stopped after verification. The pre-existing generated `next-env.d.ts` development references were restored after Next generated production references.

## Remaining limits and phase boundary

Manual visual review at 320px, 768px, and 1280px remains outstanding. DOM tests and HTTP checks do not establish visual correctness or browser back/forward unsaved-change protection. Existing candidate/recording caps, disabled application workflows, and streamed not-found status behavior remain as described in `docs/PHASE-4.md`.

Changed file for this pass: `docs/PHASE-4-VERIFICATION.md` only; the pre-existing `next-env.d.ts` modification is preserved. No commit or push was requested for this verification pass. Stop here and await the user's direction, as required by AGENTS.md's phase boundary.
