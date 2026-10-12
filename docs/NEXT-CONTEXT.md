# Fresh-context handoff: Phase 6

## Latest explicit user instructions (override approval waits)

The user said, in this session:
- “don't ask for my approval till phase 6 is complete”
- “you can use as any public api for the job listing thing”
- “also after every phase push the code to github”
- “also start each phase in new context”
- “why not checking more platforms for the api”

These authorize continued implementation through Phase 6 without phase/model/source approval waits; explain/document model and source decisions, then implement within the existing local architecture. All AGENTS.md compliance/truth/security rules remain in force. Only officially supported APIs/feeds with clear current permission may be enabled; public reachability is not permission. Paid infrastructure/services are not authorized. Do not ask again for approval of already authorized routine phase work.

Start Phase 6 as a fresh Codex task (not a fork with the accumulated conversation). A `mcp__codex_tui__create_thread` capability was discovered in this session and can create/start the separate task, which the user explicitly requested. Inspect tool metadata when necessary. Earlier statements that the agent could not open a separate task were corrected. Each phase should be checked, documented, committed/pushed, then started separately. Stop for user approval after completing Phase 6; do not start Phase 7 automatically.

## Read first

Read AGENTS.md, PROMPT.md, DESIGN.md, docs/PROMPT-ALIGNMENT.md, docs/PHASE-4-MODEL.md, docs/PHASE-4-WEIGHTED-REPORT.md, docs/PHASE-5-REPORT.md, docs/SOURCES.md, and current repository code before editing. The current branch is main; origin is Czar-16/orbit. Preserve user changes, especially generated next-env.d.ts development route references. Never print .env contents, resumes, or personal profile data in tool outputs. Check installed versions with npm ls --depth=0.

## Completed through Phase 5

- Private PDF/TXT uploads, immutable verified profiles, manual paste and atomic CSV/JSON import, URL validation, save/dismiss/archive, immutable source/URL history.
- Requirement classification/review, 15 synthetic realistic fixtures, seven weighted categories, versioned editable preferences, explicit verified numeric experience/education/absent skills/verbatim project bullets. Old profiles parse missing fields as unknown. Existing skills-only history remains separate; weighted explanations show confirmed points, unknown weight, upper bound, and conflict/review flags. No AI is required.
- Four reviewed public APIs: Himalayas, Remotive, Jobicy, Remote OK. Public-IP-pinned bounded HTTPS requests, no redirects, Zod shapes, inert description text, exact apply links and attribution. Persistent daily query/provider quotas, source health/toggles, company filters for Himalayas/Remotive, shared relevant-job cap, Run Now, new-today badges, today's top candidates.
- Tested migrations 202610120006_weighted_matching and 202610120007_discovery applied to the guarded dedicated local Orbit Compose database. Current schema has seven migrations. No test fixtures or personal facts were seeded in the normal database.
- Real API checks: Himalayas 20 fetched/5 imported; Remotive 15/1; Jobicy 20/0; Remote OK 20/3. Nine actual selected jobs imported on 2026-10-12. Re-running skips today's attempted queries; do not reset quotas to test again. Keys for Adzuna/Jooble/OpenAI/Ollama were not configured; values were never printed. Other sources remain disabled for unresolved permission/configuration.
- Final phase checks: lint, typecheck, build, 142 unit/DOM tests across 18 files, 31 disposable PostgreSQL tests across 6 files, and git diff --check passed. See reports for commands/files/limits. Commit/push Phase 4+5 together before starting this fresh task; the push request arrived during Phase 5. Verify git log/status/origin rather than guessing a hash.

## Implement Phase 6: application preparation

Deliver the authorized Phase 6 from PROMPT: off/default deterministic preparation, optional hosted/local provider abstraction, one-click Prepare Application, versioned draft creation/edit/regeneration/discard with job/profile/preference/resume version links, review screen, unknown/sensitive answers, selection/order-only resume/project emphasis diff, and outbound data log view in Settings. Nothing submits or marks Applied. Clearly separate Prepare/Review/Open original listing from disabled Authorized Submission.

Inspect existing job/profile/resume services, schemas, action security patterns, private resume storage, UI components, and tests first. Present/document the concrete model/relations before writing migrations, then proceed without asking for approval under the user's override. Keep versions/history workspace-scoped and transactional, protect stale edits, validate all external/AI input and output with Zod, and never persist fake external success. Preserve verified fact provenance and original bullets; no rewriting personal achievements or invented experience/metrics. Java/Spring Boot remains unconfirmed unless the user explicitly verifies their own facts; no inferred skill confirmation.

PDF text extraction with human review and resume role/default selection are still missing from expanded PROMPT, so account for these where required to produce a truthful original-resume emphasis diff. Choose a maintained extraction library only after checking actual version/docs; never auto-save extracted facts. Existing resume uploads are private and limited to 5 MB. Unknown and sensitive answers stay “Needs your input”; no legal/demographic assumptions. Hosted/local adapters must be optional, cannot claim real integration success without a permitted-interface test, and must log minimal outbound fields (not raw secrets) before requests. No paid call should be made without authorization; default off mode and no keys must remain fully usable.

After meaningful implementation steps, run npm run lint, npm run typecheck, npm test, npm run test:db where DB workflow changes, npm run build, and git diff --check. Restore the saved pre-existing next-env.d.ts references after Next checks and exclude that file from commits. Deploy tested migrations only via guarded npm run db:setup to the dedicated local Orbit database; automated DB tests must use the disposable harness. Do not seed synthetic normal-database jobs/resumes/profile facts. No browser automation on any platform. Visual 320/768/1280px review remains outstanding.

After Phase 6 checks pass: write its phase report and update this handoff, commit/push the completed phase, report exactly what works/limits/real tests, and STOP. Do not imply the entire PROMPT is done: Phase 7 tracking/follow-ups/export and Phase 8 Inngest scheduling/catch-up remain. The user was told Phase 6 is the main useful manual-application milestone; Phase 4 is already useful for manual scoring/saving, Phase 5 adds API discovery via Run Now, Phase 7 adds tracking, Phase 8 removes the need to press Run Now for daily discovery.
