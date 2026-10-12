# Phase 3 report: private resumes and profile verification

Completed on 2026-10-12. Implemented PDF/TXT upload, safe private storage and attachment download, server-side Zod validation, a React Hook Form profile editor, explicit fact verification with evidence, versioned saves, selected resume references, stale-tab protection, and unsaved-change guards for navigation links/unload. Added shared token-based form styles and documented them in DESIGN.md. Database/file errors produce real error states, not success messages.

Checks passed: npm run lint, npm run typecheck, npm test (43 tests across 7 files), npm run test:db (14 tests across 2 files), npm run build. Local HTTP smoke checks verified Settings Connected, the profile form, 404 for invalid resume IDs and public private-file paths, and 403 for an external Host header. Real disposable-database tests verify private file content, opaque keys, attachment/no-store/nosniff headers, explicit confirmation, stored provenance, unavailable resume rejection, and revision conflict handling. Build tracing was narrowed to static private roots; private/environment files are excluded, and artifacts were checked for credential leakage without displaying credentials. The final build has no tracing warnings.

Limits: PDF/TXT only; no automatic extraction or DOCX parsing. Profile facts and individual skills require user confirmation. Sensitive questions remain uncollected/unknown. No resume removal/redaction UI yet. Unsaved guards cover links and unload; SPA history navigation has not been manually verified. Manual viewport/keyboard inspection remains outstanding. Application workflows, integrations, and background runs remain deferred. Existing lint-tool advisories remain.

Changed files:

- `.gitignore`
- `DESIGN.md`
- `README.md`
- `docs/PHASE-3.md`
- `docs/PROFILE.md`
- `next.config.ts`
- `package-lock.json`
- `package.json`
- `src/app/api/resumes/[id]/route.ts`
- `src/app/globals.css`
- `src/app/profile/actions.ts`
- `src/app/profile/page.tsx`
- `src/components/form-feedback.tsx`
- `src/components/profile-form.tsx`
- `src/components/provenance-badge.tsx`
- `src/components/resume-upload.tsx`
- `src/hooks/use-unsaved-changes.ts`
- `src/lib/action-result.ts`
- `src/lib/profile-input.ts`
- `src/lib/profile-service.ts`
- `src/lib/resume-service.ts`
- `src/lib/resume-storage.ts`
- `src/lib/resume-validation.ts`
- `tests/db/profile.test.ts`
- `tests/profile-form.test.tsx`
- `tests/profile.test.ts`
- `tests/resume.test.ts`

Committed and pushed after checks under the user’s authorization. Continuing directly to Phase 4: manual job intake, saved jobs, and deterministic matching, with no intermediate approval requested.
