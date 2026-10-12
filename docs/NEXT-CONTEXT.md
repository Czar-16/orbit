# Next-context handoff

The user requested committing/pushing the completed work and starting the next tasks in a fresh context. This handoff preserves that authorization. A fresh conversation still needs to be opened by the user; the agent cannot create or switch the conversation context itself.

## Read first

Read AGENTS.md, PROMPT.md, DESIGN.md, docs/PROMPT-ALIGNMENT.md, docs/PROMPT-CONTINUATION.md, and docs/LISTING-HISTORY-PHASE.md. Inspect the current repository before editing. Existing phase numbers reflect older scope and do not mean the expanded PROMPT is complete.

## Completed

- Local Next.js/PostgreSQL/Prisma app, private resume uploads, explicitly verified profiles, manual job intake, job saving, and verified-skills coverage.
- CSV/JSON atomic imports and the maximum-length profile skills reopening fix.
- Listing URL/source snapshots on schemaVersion 2 revisions; legacy history remains unknown. Migration 202610120005_listing_history was applied to the dedicated local Orbit Compose database.
- Latest checks passed: lint, typecheck, build, 91 unit/DOM tests across 13 files, and 26 disposable PostgreSQL tests across 4 files.

No automatic discovery, application drafting/submission, tracking, AI, export, or Inngest scheduling exists. The current scores are skills coverage only. No external listing pages were fetched and no normal-database test jobs were seeded.

## Start next: deterministic matching

The user has authorized continuing the next tasks. Begin with a small phase for mandatory/preferred requirement classification and explicit hard-filter evidence, plus 12–15 realistic description fixtures. Inspect matching.ts, job-input.ts, profile-schema.ts, job-service.ts, job-query.ts, and existing tests before defining the rules.

Handle strong/weak fits, explicitly unpaid jobs, mandatory versus preferred Java/Spring Boot, excessive required experience, missing salary, internships, location restrictions, ambiguous wording, and prompt-injection text. Unknown personal facts must remain unknown. Missing confirmation of a skill is not proof of absence. Do not infer Applied, personal experience, sensitive eligibility, or employer verification. A preferred Java requirement must not reject a job, and undisclosed salary must remain unknown.

Keep analysis supplementary until verified input supports eligibility conclusions; explanations must distinguish supplied facts, rule inferences, and unknowns. Do not silently convert the current skills-only score to a full match score before all intended categories and evidence handling exist.

Then complete the seven weighted categories and editable matching preferences. Present the model/relations proposal and wait for approval before writing any new preference/profile/matching schema or migrations, per PROMPT section 13. Do not treat approval to continue as approval of a model that has not been presented.

After each implementation phase, run lint, typecheck, tests, and build; document files/commands/results/limits, report, and stop for user approval as AGENTS.md requires. Use npm and inspect installed versions. No sub-agents are requested.

## Workspace details

- Current branch: main; remote: origin (Czar-16/orbit).
- Preserve any existing user changes. next-env.d.ts has pre-existing development route references; these are generated and intentionally excluded from this commit. Next checks may regenerate it; restore the pre-existing references afterward.
- Secrets and resumes remain ignored/private. Never print .env contents or target the normal database with fixtures.
- Already-running app servers may need restart to load the regenerated Prisma client.
- Visual review at 320/768/1280px remains outstanding.

Suggested opening message for the new conversation: “Read docs/NEXT-CONTEXT.md and continue the authorized deterministic matching phase. Follow AGENTS.md and stop after the phase report.”
