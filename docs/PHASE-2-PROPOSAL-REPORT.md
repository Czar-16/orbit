# Phase 2 proposal-stage report

Date: 2026-10-12. Proposal stage finished; Phase 2 database implementation is pending model approval.

## Changes

- Added docs/PHASE-2-DATABASE-PROPOSAL.md: six proposed foundation tables, relation diagram, field provenance and immutable history, ownership constraints, source/URL policy, deletion behavior, deduplication, timestamps, future workflow relations, and the implementation/validation scope after approval.
- Updated README.md to link the proposal.
- Added this report.

The initial migration would contain Workspace, ResumeVersion, ProfileVersion, Source, Job, and JobRevision. Matching and application history will later reference exact job/profile/resume revisions. The proposal retains manual-only LinkedIn/Indeed intake, explicit source review, and confirmed application states.

## Commands and results

| Command | Result |
| --- | --- |
| git status --short; git diff -- next-env.d.ts | Inspected existing changes; the pre-existing dev type-reference change was preserved and excluded from this commit. |
| npm ls --depth=0 | Existing dependency versions inspected; Prisma is not yet installed. |
| command -v docker; command -v psql | Both executables present; no database was started or contacted. |
| npm exec --yes --package=prettier@3.6.2 -- prettier --write docs/PHASE-2-DATABASE-PROPOSAL.md | Proposal formatted. |
| npm run lint | Passed, no warnings/errors. |
| npm run typecheck | Passed. |
| npm test | Passed: 18 tests across 2 files. |
| npm run build | Passed: all seven existing routes generated. |

Read AGENTS.md, DESIGN.md, the Phase 1 report, README.md, environment validation, and the existing package manifest before drafting. Consulted official Prisma relation/referential-action documentation and PostgreSQL date/time documentation; links are in the proposal. No dependencies or application code changed. No new tests were added for this documentation-only step. Existing generated next-env.d.ts content was restored to its pre-check state after the tools ran.

## Limitations and approval boundary

No Prisma schema, migration, database connection, Docker service, data seed, or database-backed UI has been implemented or tested. Passing existing checks validates the current app, not the proposed database. Version-specific dependency selection and real database tests belong to the implementation step after approval. Phase 1 manual visual inspection and previously recorded lint-tool audit limitations remain outstanding.

The supplied plan explicitly requires approval of the Phase 2 model and relation design before any schema is written. Review docs/PHASE-2-DATABASE-PROPOSAL.md and approve or amend the six-table model before implementation continues. No next phase has started.
