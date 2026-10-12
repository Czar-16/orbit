# Tailored resume delivery verification — 2026-10-13

Implemented the approved reviewed-source → deterministic tailoring → PDF/DOCX generation → comparison/editing → actual PDF inspection → exact-hash approval → draft selection → private download workflow. No application is submitted. Original files remain unchanged and privately retained.

## Changes

- Persistence: `prisma/schema.prisma` and additive migration `202610130011_tailored_resume` introduce workspace-scoped reviewed source versions, tailored versions, artifacts and compatible optional draft references. Composite foreign keys enforce snapshot ownership; database checks/triggers preserve immutable content and require exact approval hashes. Existing application/draft rows receive no invented approvals.
- Source review: `src/lib/resume-content*`, canonical `content-hash.ts`, source-review component and `/queue/[id]/resume` retain original line IDs/text, explicitly account for unmapped items, provide manual reconstruction and profile conflict review, and append confirmed snapshots. Source changes demote unsubmitted readiness.
- Documents: `scripts/generate-resume.mjs`, `resume-document-engine.mjs`, the bounded worker service, bundled Liberation Sans fonts/license and generated storage provide measured A4 PDF and editable DOCX with text/layout checks. PDFKit 0.20.2, docx 9.10.0, fontkit 2.0.4, JSZip 3.10.2 and fast-xml-parser 5.11.2 are pinned; existing unpdf 1.8.1 validates PDFs. Artifact hashes use actual output bytes.
- Review and delivery: tailoring domain/service, inspection receipts, server actions, review component and `/api/tailored-resumes/[id]` provide explicit profile additions, protected manual wording, item comparison, PDF preview/inspection, immutable approval and authorized downloads.
- Application integration: preparation opens unreviewed source setup; application review links to tailoring. Selection creates a new draft revision. Compatible letter/answer edits retain selection. Readiness requires approved, validated current source documents and existing answer/warning checks. Legacy ready records display a warning; manually confirmed Applied history survives migration.
- Export/operations: schema-version-3 exports include structured source, versions, artifact metadata and approval hashes, excluding private paths/bytes. BACKUP.md includes generated documents. DESIGN.md records the review pattern; the approved Light / Dark / System implementation is preserved.

## Checks

| Delivery phase | Results |
| --- | --- |
| Structured source/persistence | Lint, typecheck and production build passed; 199 unit tests and 63 isolated database tests passed. A React Hook Form watch warning was subsequently fixed using useWatch. |
| Tailoring/documents | Lint/typecheck/build passed; 211 unit tests and the existing 63 database tests passed before the expanded integration suite. |
| Complete integration | Lint and typecheck passed; 223 unit tests across 37 files, 70 database tests across 13 files, and production build passed. The final stricter PDF word-spacing check also passed all 9 document tests. |
| Local schema | `npm run db:migrate` successfully applied the approved additive migration to the local database. Migration status is up to date. |
| Packaging | Production trace contains worker scripts and three font/license assets, with no private resume/generated-document files. |

Database suites use disposable PostgreSQL containers. They verify real source review, generation, approval, selection, ready transitions, exact-byte downloads, hash tampering rejection, concurrent generation cleanup, immutable rows, stale actions and workspace/job ownership. The upgrade test migrates an isolated schema containing synthetic legacy Ready to Apply and Applied records and checks that both records, original draft content and submission evidence survive unchanged with null tailored references.

Unit coverage includes duplicate identity, source accounting and manual reconstruction, profile conflicts, mandatory Java/prompt injection, unsupported factual rewrites and metrics, parent relationships/chronology, explicit additions, skill ranking, Unicode, XML/numeric text preservation, overflow/long words, missing text/order, PDF overlaps/bounds/empty pages, actual local worker generation, worker timeout/crash/malformed/oversized output, partial file writes, private permissions, traversal/symlink rejection, inspection receipt expiry/forgery, retained failed form edits and keyboard confirmation behavior. Changing bullet text clears its factual confirmation and blocks approval of the older file.

## Manual observations and limitations

Inspected rasterized synthetic one- and two-page PDFs with pdftoppm: white single-column A4 pages, readable 11-point text, visible headings/entry relationships, Unicode, wrapped long bullets and readable second-page text. These synthetic files are outside the repository and contain no personal resume facts.

Responsive visual/theme inspection at 320, 768 and 1280px and a complete manual browser keyboard walkthrough remain outstanding. Automated jsdom keyboard tests and responsive source/layout review do not establish rendered browser appearance. No browser automation or live job-platform requests were used. PDF inspection is required in the product for every approval; automated checks are not universal ATS certification. DOCX can reflow or substitute a missing font in Word/LibreOffice. Manual rewriting is deliberately conservative; unsupported paraphrases must use original wording or be corrected in the authoritative source/profile first.

Original deletion, OCR, AI rewriting, external DOCX re-import and remote exposure/authentication remain outside this feature.
