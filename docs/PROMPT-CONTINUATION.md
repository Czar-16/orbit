# PROMPT continuation: manual intake and profile repair

Completed on 2026-10-12. Scope: one small repair/extension phase after reviewing PROMPT.md, AGENTS.md, DESIGN.md, existing implementation, and previous verification findings.

## Completed

- Fixed profile editor reconstruction so a valid 2,000-character skills list remains valid when reopened and another field is edited. Explicit personal-fact confirmation remains required.
- Added CSV intake alongside JSON: UTF-8/BOM, quoted commas, multiline descriptions, doubled quotes, optional columns, LF/CRLF, and up to 50 jobs / 1 MB.
- Added server-side Zod metadata/content validation and useful failures for unsupported fields, mismatched file types, malformed quoting, uneven rows, and invalid compensation. CSV uses the existing URL validation, deduplication, manual provenance, and atomic transaction. Listing pages are never fetched.
- Updated import controls/instructions and setup/intake documentation using existing design components and tokens.
- Recorded the expanded requirements still missing and a concrete next-phase listing-history schema proposal in PROMPT-ALIGNMENT.md. No schema change or automatic source activation occurred.

## Files changed

- `src/lib/profile-input.ts`
- `src/lib/job-file.ts` (new)
- `src/app/discover/actions.ts`
- `src/components/job-file-import.tsx`
- `src/components/app-shell.tsx`
- `tests/profile.test.ts`
- `tests/job-file.test.ts` (new)
- `tests/db/jobs.test.ts`
- `README.md`
- `docs/INTAKE.md`
- `docs/PROMPT-ALIGNMENT.md` (new)
- `docs/PROMPT-CONTINUATION.md` (this report)

Pre-existing PROMPT.md, PHASE-4-VERIFICATION.md, and next-env.d.ts changes are preserved. No normal-database imports/profile writes, migrations, dependency changes, commits, or pushes were performed.

## Commands and results

Inspection used `rg`, file reads, `git status --short`, `git diff`, and `npm ls --depth=0`. Installed direct versions match package.json; three extraneous optional WASM packages were reported.

| Command | Result |
| --- | --- |
| `npm run lint` | Passed |
| `npm run typecheck` | Passed |
| `npm test` | Passed: 89 tests across 12 files |
| `npm run test:db` | Passed: 23 tests across 3 files; existing four migrations applied to a new disposable PostgreSQL container, then container removed |
| `npm run build` | Passed |
| `git diff --check` | Passed |

Formatting used `npx --yes prettier@3.9.10 --write` on the parser, profile input, import action/component, and affected test files. An initial `npx --no-install prettier` attempt failed because Prettier was not installed; the pinned formatter then completed without changing dependencies. Required lint/type/unit/build checks were repeated after updating the shared import hint; database tests already covered the final parser/service changes.

Regression coverage checks maximum-length profile round trips; CSV quoted commas/newlines/quotes and literal untrusted text; BOM/optional fields; headers, row widths, malformed quoting, invalid fields, filenames/MIME/size/count limits; real manual-source persistence and deduplication; and no partial database writes when one CSV URL fails SSRF validation. These checks contact no job listing pages and write only disposable test records.

## Limits and next phase

The app remains usable for manual import, skills scoring, and saving. Scores still measure verified-skills coverage only. The full weighted matching engine, hard filters, PDF extraction, automatic discovery, application preparation, tracking, export, and Inngest scheduling remain incomplete. Historical listing URL/source is still lost after an edit until the proposed snapshot migration is approved and implemented. Visual checks at 320/768/1280px remain outstanding.

CSV is comma-delimited and uses the documented field names; other spreadsheet formats/delimiters and unknown columns are rejected. No source terms were reviewed or source enabled in this phase.

Next proposed phase: preserve listing URL/source snapshots per revision and show honest unknown history for legacy records, using the model/relations proposal in PROMPT-ALIGNMENT.md. Full matching should follow before discovery activation.

Stop here for approval. AGENTS.md requires: “STOP after each phase report and wait for the user's approval before starting the next phase.” PROMPT.md section 13 additionally requires approval before writing the schema.
