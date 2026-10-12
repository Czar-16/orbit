# Private resumes and verified profile

Set up the local database, restart Orbit, and open Resume & profile. Upload a PDF or UTF-8 TXT file up to 5 MB with a simple filename. MIME, extension, signature/text, size, and filename checks run on the server. Files have generated opaque keys and mode 0600 under ignored private/resumes. Symlinked directories/files and traversal keys are rejected. Downloads require an owned available record, are attachments with nosniff, and use private/no-store caching.

Uploading does not extract or confirm any facts. Enter facts manually and check the confirmation checkbox before saving. Missing fields stay null with Unknown provenance. Known fields become Verified only through explicit user confirmation, with recorded evidence. No skills, employment, degrees, metrics, dates, years, legal/eligibility, demographic, disability, or veteran answers are invented. Skills are comma-separated and case-insensitive duplicates are removed; Java/Spring Boot is never prefilled.

Profile revisions are immutable through app writes. Each save pins an optional selected resume reference. A stale tab is rejected rather than overwriting a newer revision. Edited values show User-provided until saved. Unsaved-change guards cover navigation links and browser unload. Save failures preserve the entered values and show a persistent error.

Current limits: PDF/TXT only; no DOCX parser or automatic extraction; no resume removal/redaction UI yet; no application drafts. Do not expose the app remotely before authentication. Browser visual/keyboard checks remain manual. Private/environment files are excluded from output tracing, and build artifacts were checked for the generated credential without displaying it.

Testing fixtures use a disposable test database and ignored .test-private/resumes; no example personal data is seeded into the app database.
