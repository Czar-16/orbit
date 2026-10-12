# Tailored resume generation and download

From Prepare application, an unreviewed original opens tailoring setup. Application review also has a “Review and tailor resume” link. Originals remain private and unchanged. Nothing is submitted.

## Review the source

Every nonempty extracted line receives a stable ID and original location; duplicate bullets remain distinct. Conservative heading detection is a proposal, not a verified parser. Classify contact, summary, employment, projects, education, and skills; mark entry headings and link their bullets. Account for other text by classification or an explicit exclusion reason. Confirm each item and the whole source against the original and pinned profile. Missing extraction offers manual reconstruction alongside the original, without OCR. Large/ambiguous extraction is never silently truncated into a usable source.

Name/email and differing education/experience summaries require explicit profile conflict resolutions. Skills marked absent and unconfirmed Java/Spring Boot claims are blocked. Review never writes profile facts. Correct facts in source review or Resume & profile; generation cannot add unsupported claims.

A confirmed source is reused for the original version. A new profile snapshot reuses the reviewed structure if validation and previous conflict resolutions still apply to the same facts; new conflicts require resolution. Source corrections append a revision and invalidate unsubmitted readiness. Reading historical drafts does not create a new source revision.

## Generate and edit

Selection is deterministic without an AI key. Pinned job skills and a fixed matching vocabulary rank existing bullets within their entry and project entry groups; employment chronology stays fixed. The job description is data, never instructions. No AI rewriting or provider calls occur in tailoring.

Select/remove/reorder existing items. Explicitly include absent-from-original verified profile facts from the inclusion list. Move them into their section. Manual bullet rewrites must be individually confirmed; new factual vocabulary, skill changes, protected names, dates, and metrics are blocked. The intentionally conservative vocabulary check may reject a truthful paraphrase: reuse original wording or correct authoritative source/profile content first. Text edits reset the checkbox. Entry and heading relationships must remain intact. Comparison shows stable IDs, original and new wording, additions/removals and positions, including duplicates.

Generation appends an unapproved version. Regenerating from a parent preserves its selected items and confirmed manual wording; the editor’s “Reset selection to current reviewed source” explicitly restores deterministic selection. History and the selected approved document are never silently replaced.

## Inspect, approve and select

PDF and DOCX derive from the same content snapshot. The white single-column A4 template uses bundled SIL OFL Liberation Sans, 11-point body text, standard headings, 18 mm margins and plain bullets. PDF fonts are embedded; PDF text is selectable. DOCX specifies Liberation Sans and can reflow or substitute fonts on a machine without that font.

The local worker has a 30-second timeout, a 256 MB JavaScript heap limit and a 5 MB limit per output. It measures wrapping and page placement before rendering. Headings stay with entries/following content and entries with their first bullet; individual paragraphs are never split. Third-page overflow and unsupported glyphs fail rather than shrink or truncate text.

The installed unpdf checks actual PDF text/order, nonempty pages, glyph output, margins, line geometry, overlap and correspondence with the plan. DOCX ZIP/XML structure and exact paragraph text/order are checked separately. These are basic text/layout readability checks, not universal ATS compatibility or DOCX geometric validation.

Inspect the actual PDF iframe or open its file, then explicitly confirm facts, completeness and readability. A same-origin PDF response issues an HttpOnly, version/hash-bound receipt valid for one hour and the current app process. After expiry/restart, open the PDF again. Approval atomically records exact content and both artifact hashes. Unsaved edits cannot approve/select the previously generated file; generate a new version first.

Select an approved compatible version to append an application-draft revision. Compatible letter/answer edits retain its reference. Regenerating application inputs keeps it only when job, original, profile and preferences still match and artifacts pass verification. New Ready to apply transitions require the current reviewed source, the approved version, matching files, and existing answer/warning checks. Approved structured review resolves legacy resume-emphasis/extraction warnings; unknown answers and other warnings remain required. Historical Applied evidence survives migration, and legacy Ready to apply records show a review warning.

## Private delivery and backup

Generated files live under `private/generated-documents` (disposable database tests use `.test-private/generated-documents`), never public storage. UUID filenames, exclusive writes, 0700/0600 permissions, path validation, symlink rejection and bounded reads protect delivery. Persistence failures remove only newly generated files. Approved files are never overwritten. Original deletion, OCR, AI rewriting and externally edited DOCX re-import are outside this feature.

`/api/tailored-resumes/:id?preview=1` serves a validated PDF for inspection; final `?format=PDF|DOCX` downloads require approval, passing validation and freshly matching hashes. Both routes enforce local same-origin requests and workspace ownership. Historical approved files remain downloadable; UI warnings and `X-Orbit-Version-Stale` identify newer snapshots or revoked originals. An app theme never affects document styling.

Schema-version-3 private exports include reviewed source snapshots, tailored history, exact draft references, validation and approval metadata; files and storage paths remain excluded. Back up generated files together with original files and PostgreSQL: see BACKUP.md. Files are retained indefinitely by default.

## Verification

The automated suites cover extraction review, stable duplicate identity, selection and protected rewrites, job prompt injection/Java requests, Unicode and unsupported glyphs, wrapping and page limits, corrupt PDF geometry/text and DOCX paragraphs, real bounded-worker generation and failure paths, private exclusive writes, traversal/symlinks, inspection receipts, duplicate approval, workspace/job consistency, immutable history, compatible draft edits, regeneration, final downloads, and preservation of legacy Ready/Applied records through migration. Database tests use isolated disposable PostgreSQL containers, not the user's records.

Manual responsive/keyboard and theme inspection at 320, 768 and 1280px remains a separate acceptance task; jsdom keyboard tests do not establish visual layout. No browser automation or live job-platform calls are used.
