# Deterministic requirement review phase

Completed 2026-10-12 within the small phase authorized by NEXT-CONTEXT.md. This is a supplementary review subphase, not completion of expanded PROMPT Phase 4.

## Behavior

Inspect job now shows rule-inferred mandatory, preferred, or unclear wording from the latest supplied description and experience field. Each recognized clause retains its original excerpt and source field. Recognized skills show verified personal confirmation only when explicitly verified in the profile; every other skill remains unknown / Needs your input. Missing confirmation never establishes absence.

Required/preferred headings carry into their following lines. Blank lines and other headings reset scope. Sentence and semicolon boundaries separate clauses. Mixed mandatory/preferred wording, alternatives, and supported negations remain unclear. A fixed vocabulary covers the initial profile stack plus Java/Spring Boot; this is deliberately bounded rule recognition, not exhaustive extraction.

Explicit unpaid wording produces a paid-only conflict flag for review. Required numeric experience minima, location restrictions, and mandatory education/eligibility wording produce review flags with supplied excerpts. No flags automatically exclude a job. No free-text personal experience, willingness to relocate, legal answer, or absence of a qualification is inferred. Compensation compatibility remains unknown unless unpaid wording is detected, which is itself inferred and requires review; undisclosed salary never rejects.

The existing confirmed-skills-v1 scoring, bands, filtering, persistence, profile revisions, and job history are unchanged. Text analysis is calculated on the detail page and is not persisted. It works without an AI key or outbound call. Text is processed as data and rendered with React escaping. No source activation, listing fetch, submission, application status change, normal-database fixture write, schema/migration, dependency, commit, or push occurred.

## Files changed

- `src/lib/requirement-analysis.ts` — strict Zod input validation, conservative classification, personal skill confirmation, evidence flags.
- `src/components/requirement-review.tsx` — supplementary review panel using DESIGN.md tokens and provenance badges.
- `src/app/discover/[id]/page.tsx` — computes and renders latest-revision review with the latest profile.
- `tests/fixtures/matching-descriptions.ts` — 15 synthetic descriptions: strong/weak coverage, unpaid, mandatory/preferred Java, excessive requested experience, missing salary, paid internship, onsite elsewhere, ambiguous wording, prompt injection, preferred experience, negation, eligibility, mixed clauses.
- `tests/requirement-analysis.test.ts` — 20 tests covering fixtures and conservative/unknown/input-boundary behavior; fixture scores explicitly remain skills coverage.
- `tests/requirement-review.test.tsx` — 2 tests for escaped untrusted text, personal unknowns, supplementary disclosures, empty inputs, and absence of actions.
- `README.md`, `docs/PROMPT-ALIGNMENT.md`, `docs/NEXT-CONTEXT.md`, `docs/DETERMINISTIC-REVIEW-PHASE.md` — usage, remaining scope, handoff, and phase report.

The pre-existing next-env.d.ts development references were preserved by saving them before checks and restoring them afterward.

## Commands and results

Inspection: file reads, `rg`, `git status --short`, `git diff`, `npm ls --depth=0`. Installed direct dependencies match package.json (Next 16.4.0, Prisma 7.10.0, Zod 4.6.6, TypeScript 5.9.3, Vitest 5.0.4); the same three extraneous optional WASM packages remain. Formatting: `npx --yes prettier@3.9.10 --write` on changed TypeScript/TSX files, without adding a dependency.

| Command | Final result |
| --- | --- |
| `npm run lint` | Passed |
| `npm run typecheck` | Passed |
| `npm test` | Passed: 113 tests / 15 files |
| `npm run test:db` | Passed: 26 tests / 4 files; five existing migrations applied in a disposable PostgreSQL container, then removed |
| `npm run build` | Passed |
| `git diff --check` | Passed |

Initial fixture assertions compared vocabulary order and repeated flag categories as though each category appeared once. They were corrected to compare sets: separate evidence excerpts intentionally retain separate flags. All final tests pass. Prompt-injection coverage verifies an instruction to set score to 100 leaves a 50% skills-only score unchanged; the UI test verifies script-looking text stays literal.

## Limits and next step

Recognition is English-only and bounded to supported words, headings, skill names, and experience patterns. Ambiguous/negated wording is not a full natural-language interpretation; unsupported wording can be missed and recognized wording can need correction. The panel makes no employer-verification or full-eligibility claim. Structured verified experience, explicit negative qualification evidence, matching preferences, the seven weighted categories, closed/expired verification, and configured role filters remain future work. Current location is not relocation permission. Paid internships are fixtures, not a configured employment preference. Visual acceptance at 320/768/1280px remains outstanding; DOM tests do not establish it.

After phase approval, the next step is to present the matching preference/profile/model relations proposal. PROMPT section 13 requires approval of that concrete proposal before any schema or migration implementation.

Stop after this report and await phase approval, as AGENTS.md requires.
