# Manual intake and deterministic matching

Phase 4 supports manual intake/matching; Phase 5 adds four permitted public API adapters. No job page is fetched, no Apply action is automated, and no submission integration exists.

## Input

Paste a public HTTPS URL, a description, or both. Fill only fields you can source from the supplied listing: title, company, location, work arrangement, employment type, employer-stated skills/experience, and stated compensation. URL-only entries retain unknown titles/descriptions/requirements. Entered fields carry User-provided provenance. Unknown fields remain null/empty with Unknown provenance.

URLs undergo server-side Zod validation plus public-address/DNS validation. Non-public addresses, credentials, fragments, and custom ports are blocked. DNS failures can be worked around by importing a description without a URL. No redirects or page requests are made. WHATWG URL normalization is used for the stored URL hash, preserving query parameters rather than stripping tracking/job identity parameters. Exact normalized URL duplicates are skipped without overwriting existing information. Description-only entries are not automatically merged.

JSON imports use an array of objects with the same field names as the form. All fields are strings; omit unknown fields. Limit: 50 rows / 1 MB. Supported keys are listingUrl, description, title, company, location, workArrangement, employmentType, compensationMin, compensationMax, currency, compensationPeriod, experienceRequirement, and skills. At least listingUrl or description is required for each row. Skills are comma-separated. Compensation requires a known amount, a three-letter uppercase currency code, and hour/month/year period. Bounds are nonnegative with at most two decimal places. Every row and URL is validated before a single transaction writes the batch; one invalid row causes no partial import.

CSV imports use the same supported field names as unique headers (case-sensitive), with one job per row and comma delimiters. Optional columns may be omitted. Quote cells containing commas, quotes, or line breaks; escape a quote with two quotes. UTF-8 text with an optional BOM, LF/CRLF line endings, and a final newline are supported. Blank rows, unknown/duplicate headers, malformed quoting, uneven row widths, and invalid fields are rejected before ingestion. Use at most 50 jobs / 1 MB and a simple .csv or .json filename. File MIME type must be compatible with its extension. Both formats pass through the same server validation and atomic transaction; descriptions are never executed or treated as instructions.

```csv
title,description,skills
"<employer-stated title>","<pasted description>","TypeScript,React"
```

Replace placeholders with your actual supplied listing text; this example is not seeded into the app.

LinkedIn/Indeed origins receive manual-only Source records with enabled=false. Other URL host labels do not imply an authorized API/feed. Job descriptions are stored as untrusted text and rendered through React escaping, never interpreted as instructions.

## Lists and revisions

Saved jobs includes active saved records. Dismiss and Archive ask for confirmation, remove the job from active/saved lists, and can be reversed through the corresponding Discover status filter. Restore does not automatically restore the previous saved flag; explicitly Save job again if desired. No job-state action changes application status.

Filters cover role, company, location, source, status, weighted-score range, and discovered dates; sorting supports newest, oldest, company, and weighted score. State stays in the query string, with 20 cards per page. Lists cap database-filtered candidates at 1,000 recent records before weighted filtering/sorting and clearly disclose truncation. Invalid filters show an error and default filters. Unknown scores are excluded from numeric score ranges. Dates are Asia/Kolkata calendar dates.

Inspect shows supplied data, the latest description, and revision history. New manual revisions (schemaVersion 2) preserve the supplied listing URL and a source identity/label snapshot, with User-provided provenance. History shows these values per revision even after URL removal or source-label changes. Older schemaVersion 1 revisions display historical listing identity as Unknown; current URLs are never copied backward into old history. Editing creates a new immutable revision and pins a new match; stale-tab edits are rejected. Matching/import history does not create an application or Applied event.

## Skills coverage

Rule version: confirmed-skills-v1. Normalize case/spacing and a small documented alias set (React.js/ReactJS → React; Node/NodeJS → Node.js; JS → JavaScript; TS → TypeScript; Postgres → PostgreSQL). Remove duplicate requirements, then score round(100 × confirmed overlaps / unique supplied requirements). Only Verified profile skills count; inferred or user-provided-but-unconfirmed personal skills cannot improve a score. JavaScript never implies Java or Spring Boot. No employment duration, experience level, degrees, metrics, work authorization, or sensitive answers are inferred.

If requirements or confirmed profile skills are missing, score is null/Unavailable with an explanation. With known inputs and no overlap, a real zero is shown. Missing/unverified skills remain visible. These scores measure skills coverage only, use DESIGN.md bands, and carry an Inferred label and prioritization disclaimer. They do not verify employer information or evaluate eligibility, experience, or compensation.

MatchResult pins the exact job and profile revisions plus rule version, bounded nullable score, and structured explanation. Import/edit records a match if a profile exists. List display recalculates against the latest profile without writing during rendering. Record current matches explicitly stores/checks up to 200 recent unarchived jobs; it does not submit anything or run a background integration.

## Review/limits

Manual browser layout and keyboard checks remain outstanding. Local HTTP checks and disposable PostgreSQL tests passed. Invalid job detail IDs render the not-found UI; Next.js streamed not-found responses may carry HTTP 200 after headers have streamed, while invalid resume IDs and unknown top-level paths return 404. No browser automation was used.

## Weighted scoring and public discovery

Weighted-v1 uses seven configurable categories and immutable preference versions. Scores are confirmed weighted points out of 100; unknown weights remain unknown with an upper bound, never renormalized. The role category combines title keywords and responsibility-verb overlap against verified profile text. Explicit confirmed experience years, education level and absent skills can support conflict flags; unconfirmed skills cannot. Detailed category explanations and flags appear on each card. WeightedMatch history pins job/profile/preference versions and leaves old skills-only MatchResult rows unchanged.

Run discovery now calls only reviewed Himalayas, Remotive, Jobicy and Remote OK public APIs. API revisions use schemaVersion 3, PERMITTED_API, official-interface evidence labeled Inferred, source snapshots, and exact returned application URLs. Job descriptions, including HTML, remain untrusted inert text. API responses use Zod, bounded HTTPS fetches, fixed host allowlists, validated public DNS, pinned IP connections and redirect refusal. Local selected jobs are cached in immutable revisions; raw responses are not archived. See SOURCES.md for source-specific permissions, attribution, limits and disabled candidates.

Daily limit defaults to 20 newly admitted relevant jobs (Asia/Kolkata), shared with manual jobs whose titles match configured roles. Existing records/edits/duplicates do not consume the limit again. Manual batches exceeding the cap roll back; API intake admits only remaining capacity. A job's processedRelevant marker records admission and is not cleared by dismissal/archive. Existing jobs predating this feature are not backfilled as today's processing. Each API query has one persistent attempt/day, success or failure; providers cap at four requests/day with 31-second spacing. A later Run Now may process company queries skipped for spacing. Restarting does not reset quota. Company queries are supported through Himalayas companySlug and Remotive company_name, not unapproved ATS endpoints.

AI calls, application preparation/tracking and Inngest execution are not yet enabled. Prepare application stays disabled. Scheduled/catch-up discovery arrives in Phase 8; currently Run Now performs discovery without manual job searching. Manual import remains the working fallback for all skipped sources. A real sync on 2026-10-12 returned 20 Himalayas and 15 Remotive records plus 20 Jobicy and 20 Remote OK records, and imported 9 relevant jobs total. Profile facts were not seeded or modified by the sync.

For an explicit operational check against the real permitted interfaces: `NODE_OPTIONS=--conditions=react-server npx tsx scripts/discovery-check.ts`. This writes real selected jobs and run history to your configured local database, consumes the same quotas, and never submits applications. Automated tests use separate disposable PostgreSQL and synthetic protocol fixtures.
