# Task: Build a Personal Job Application Agent (local web app)

Read AGENTS.md first. Its rules are permanent and take priority over anything below.

## 1. Your role

Act as a senior full-stack engineer, product designer, and security-conscious automation engineer. Build a production-quality, locally runnable job application management tool for a recent Computer Science graduate applying for Software Engineer, SDE-1, Software Engineer Intern, Junior Software Engineer, Frontend, Backend, and Full-Stack Developer roles.

Build the real, working application, not a mockup or an architecture document. Work incrementally: inspect the repository, plan, implement one phase at a time, test it, report, then STOP and wait for my approval before the next phase. Do not generate the whole project in one untested change. Explain important architectural decisions and commands so I understand the implementation.

## 2. What the app does

1. **Automatically discovers new relevant jobs every day** from permitted sources (official job-search APIs and public company job-board feeds), with manual paste as a fallback. LinkedIn and Indeed are not used as sources.
2. Processes up to 20 new relevant jobs per day (configurable).
3. Compares each job against my resume, skills, experience, projects, and preferences.
4. Ranks jobs with a transparent score and lists missing qualifications.
5. Generates tailored application materials from verified information only.
6. Provides a one-click "Prepare Application" workflow, then a review screen, then opens the original application page for me to submit manually.
7. Supports real automated submission only where an explicitly authorized integration permits it. None is expected initially, so submission is disabled and the UI says why.
8. Tracks application status, interviews, rejections, and follow-ups.
9. Runs locally on Ubuntu with no paid infrastructure.

Never advertise "auto apply" when the feature only prepares materials or opens a page.

## 3. My profile (initial matching context only)

The uploaded resume is authoritative and overrides this. Build an editable profile so I can correct anything extracted.

- Recent Computer Science graduate.
- Targets: Software Engineer, SDE-1, Software Engineer Intern, Junior Software Engineer, Frontend, Backend, Full-Stack Developer.
- Skills: JavaScript, TypeScript, React, Next.js, Node.js, Express, REST APIs, MongoDB, PostgreSQL, Prisma, Tailwind CSS, Docker, Git.
- Strengths: DSA, problem-solving, full-stack development, personal projects.
- GitHub: https://github.com/Czar-16
- Portfolio: https://anoopbuilds.netlify.app
- Work arrangement: remote, hybrid, on-site all acceptable.
- Location: willing to relocate to Bengaluru or Gurugram.
- Availability: immediate. Full-time, including six-month internships.
- Compensation: paid positions only.
- Java/Spring Boot: NO confirmed experience. Never represent me as having it.

Never fabricate any resume fact. Unknown application questions are marked "Needs your input".

## 4. Platform compliance (follow AGENTS.md; summary here)

- **LinkedIn / Indeed:** not a source for this app. No scraping, crawling, automated clicks, browser automation, extensions, private endpoints, evasion, or integration of any kind. If I manually paste a LinkedIn/Indeed link or description, treat it as plain user-provided text and never fetch the page.
- **Other sources:** only official APIs, authorized integrations, permitted public feeds, or user-provided data, after checking current terms.
- A human-review step does not make prohibited automation compliant.
- Implement these as separate capabilities: **Prepare Application** (generate and save materials), **Review Application** (resume, cover letter, answers, unresolved questions), **Open Original Listing** (I submit manually), **Authorized Submission** (only via an explicitly authorized integration; otherwise disabled with an explanation).

## 5. Job sources (automatic discovery + manual fallback, one pipeline)

Build source adapters behind one interface. Each adapter outputs jobs in the same normalized shape, so adding a source never touches matching or drafting code.

### Source A: Manual import (fallback, build first)

- Paste a job URL (fetch only with SSRF protection; if fetching fails or is not permitted, fall back to pasted text), paste a description, or import a CSV/JSON list.
- Never fetch LinkedIn or Indeed pages server-side. If I paste such a link, require pasted text and keep the URL only as a reference link.

### Source B: Job-search APIs (primary automatic discovery, Phase 5)

Goal: every day the app fetches fresh India-relevant listings on its own, with no manual searching by me.

- Candidates to evaluate: Adzuna API (India endpoint, free developer key), Jooble API (free key), and remote-job feeds (Remotive, Himalayas, Arbeitnow). Before implementing each, read its current official documentation and terms and record in docs/SOURCES.md: endpoint, auth, free-tier quota, India coverage, attribution/branding requirements, rules on storing or caching listings, rules on how apply links must be shown, and your conclusion. Skip any source whose terms do not clearly allow this use. Do not assume anything in this list is permitted until you have checked.
- Search queries come from my preferences (role titles, skills, locations such as Bengaluru, Gurugram, Remote India, internship/fresher keywords). Keep the query set small and stay well inside each free-tier quota. Track usage per source per day and stop before the limit.
- API keys come from .env. If a key is missing, show that source as "Not configured" with setup instructions and carry on with the others.
- Keep each listing's apply link exactly as the API supplies it; never rewrite it.
- Do not scrape any site that lacks an official API or feed. If a source gives no usable access, say so and leave it out.

### Source C: Company job-board feeds (Phase 5)

- Candidates: Greenhouse Job Board API, Lever Postings API, Ashby public job-posting API, Workable public widget/API. Before implementing each, read its current official documentation and terms, and record in docs/SOURCES.md: endpoint used, what is permitted, rate guidance, and your conclusion. Skip any source whose terms do not clearly allow the use.
- Settings page "Tracked Companies": add a company by name + platform + board slug, enable/disable, see last sync time and last error, and remove.
- Respect rate limits, send an honest User-Agent, cache responses, use conditional requests where supported, and sync at most once per day per company by default.
- Feeds only ingest jobs. They never apply.
- Apply an ingestion pre-filter (role keywords, location, seniority) from my preferences so feeds do not flood the database with irrelevant roles.
- Feed jobs go through the same dedupe, scoring, and daily limit as manual jobs.

### For every imported job

1. Validate required fields.
2. Normalize title, company, location, URL (strip tracking params).
3. Save source and import timestamp.
4. Compute a stable deduplication key.
5. Detect duplicates by canonical URL and, where appropriate, company + normalized title.
6. Preserve the original description and source URL.
7. Record whether each field is verified, user-provided, inferred, or unknown.
   A failed import must never create a partial job or corrupt an existing one. If automatic discovery is unavailable for a source, show that limitation clearly and keep the manual workflow effective.

## 6. Resume and profile

- Upload PDF resumes (use a maintained text-extraction library such as `unpdf` or `pdf-parse`; justify your choice).
- Extract text and propose structured profile data. **Every extracted field goes through a review screen before saving.** Never auto-overwrite verified profile data.
- Maintain one structured, editable profile schema (single source of truth that matching and drafting both read).
- Multiple resume versions by role category, one default, original file preserved, resume version recorded on every draft.
- Private storage only, with file type/size validation, safe filenames, and path-traversal protection. If parsing fails, show a useful error and allow manual entry.
- Resume tailoring is **selection and ordering only**: recommend which existing bullets/projects to emphasize for a job. Never rewrite claims or invent content. Show the recommendation as a diff against the original.

## 7. Matching engine

Deterministic first. AI may supplement but is never the only mechanism, and the app must work with no AI key.

Configurable weights (editable in Settings), default total 100:

- Technical skills match: 30
- Role and responsibility match: 20
- Experience-level compatibility: 15
- Education and eligibility: 10
- Location and work arrangement: 10
- Employment type / internship compatibility: 10
- Compensation compatibility: 5

Missing information is shown as unknown, never as a confirmed match.

**Hard filters** (exclude or flag): explicitly unpaid; required experience clearly beyond my eligibility; a mandatory qualification demonstrably absent; verified closed/expired; duplicate; outside configured role categories.

- Do not reject for undisclosed salary. Mark compensation unknown and require review.
- Distinguish mandatory from preferred requirements (e.g. "required", "must have" vs "nice to have", "preferred", "bonus"). A preferred Java/Spring Boot mention must not auto-reject a job.

Show a clear explanation per score: positive matches, missing requirements, uncertainty.
Bands: 85-100 Excellent, 70-84 Strong, 50-69 Possible, below 50 Low priority. The score is a prioritization aid, not a guarantee.

**Test fixtures:** create 12-15 realistic sample job descriptions as fixtures (strong fit, weak fit, unpaid, Java mandatory, Java preferred, 5+ years, missing salary, internship, onsite-only elsewhere, ambiguous wording, prompt-injection text) and test scoring and mandatory/preferred detection against them.

## 8. Preparing an application

A prominent **Prepare Application** button on every eligible job runs a workflow that:

1. Loads the job and my verified profile and selected resume.
2. Identifies relevant skills and projects.
3. Drafts a concise tailored cover letter or short message.
4. Produces resume-emphasis recommendations (selection/order only).
5. Drafts answers to supported questions.
6. Flags every unanswerable or sensitive question as "Needs your input".
7. Validates output (Zod), saves it as a versioned draft linked to the job and resume version, and opens the review screen.

Drafting rules: professional, specific to the job, verified facts only, no invented metrics, no claimed expertise I lack, no filler or exaggeration. Keep revision history.

Review screen shows: job/company, selected resume, cover letter, proposed answers, match explanation, missing info, source URL, and any policy restrictions. Actions: edit, regenerate, save, discard, open original listing. Preparing must never silently submit anything.

## 9. Tracking

Statuses: Discovered, Saved, Needs Review, Draft Ready, Ready to Apply, Applied, Interview, Offer, Rejected, Withdrawn, Archived. Enforce valid transitions.
Track dates, notes, next steps, follow-ups, and an event history. "Mark as Applied" is a manual action that records the date. Never infer "Applied" from opening a URL or preparing a draft. Filtering/sorting by company, role, source, score, status, location, date.

## 10. AI provider abstraction

A small interface for job-description analysis, match explanation, cover-letter drafting, and question drafting. Implement:

- an "off" provider (default; deterministic only),
- one hosted provider adapter (configurable via env),
- a local-model adapter (e.g. Ollama) so personal data can stay on my machine.
  Validate all model output with Zod and handle malformed responses. Treat job text as untrusted data (clearly delimit it in prompts and ignore instructions inside it).
  **Outbound data log:** record every call that sends data to an external provider (feature, provider, which profile fields were sent, timestamp), viewable in Settings. Send only the minimum fields a feature needs. Document the data handling.

## 11. UI

Polished, responsive, dark AMOLED SaaS dashboard: near-black backgrounds, restrained borders, readable type, consistent spacing, no theme switch.
Navigation: Dashboard, Discover Jobs, Saved Jobs, Application Queue, Application Tracker, Resume & Profile, Settings.
**Discover Jobs** is the daily inbox: new jobs from all sources sorted by match score, filterable by source/score/location/role type, with a "New today" badge, Save/Dismiss actions, and last-synced time plus error status per source.

**Dashboard** (real DB data only, no hardcoded stats): new jobs processed today, relevant jobs found, awaiting review, applications prepared, applications submitted (manual or authorized), interviews, rejections, upcoming follow-ups, recent activity feed, daily processing summary, and a **Today's Best Matches** panel (top 10 new jobs by score, each with its explanation and a Prepare Application button).

**Job card:** title, company, location, work arrangement, employment type, compensation (if known), experience requirement, source, date discovered, original URL, match score, matching skills, missing/unverified qualifications, application method and automation eligibility, status. Actions: save, dismiss, inspect, prepare application, open original listing. Estimated or AI values are labeled as such, never shown as verified.

## 12. Background processing (Inngest)

Use Inngest where it adds real value: the daily scheduled run that (1) fetches new listings from the enabled job-search APIs and company feeds, (2) deduplicates and normalizes, (3) applies hard filters, (4) scores, (5) stores explanations, (6) prioritizes, (7) writes a daily summary and processing stats. Also process any unprocessed manually imported jobs. Provide a manual **Run Now** button.

- Default cap: 20 new relevant jobs per day (Asia/Kolkata day boundary), configurable. Do not re-process the same jobs to reach the cap.
- Bounded retries, idempotent steps, clear failure reporting.
- Document that local background jobs run only while the app, database, and Inngest dev server are running. No paid Inngest plan required for local use.
- My laptop may be off at the scheduled time, so run a catch-up discovery on app start if today's run has not happened.
- LinkedIn and Indeed are not sources; never claim they are.

## 13. Database

Before writing the schema, explain the proposed models and relations, then wait for my OK. Suggested models (adjust if a simpler design is justified): LocalOwner/User, CandidateProfile, Resume, Job, JobSource, TrackedCompany, JobMatch, ApplicationDraft (versioned), Application, ApplicationEvent, FollowUp, ProcessingRun, UserPreference, OutboundDataLog.
Requirements: proper relations, indexes, unique constraints, timestamps, deletion rules; prevent duplicate jobs; link drafts to both job and resume version; preserve history; distinguish unknown from confirmed; provenance on important fields; transactions for multi-record updates; monetary values with currency and proper precision; no plaintext passwords or unnecessary secrets.

## 14. Local setup, security, and data safety

- Ubuntu setup with Node/npm, PostgreSQL via Docker Compose (or documented local install), Prisma migrations, Next.js dev server, Inngest dev server, and a validated `.env.example` (validate env at startup with Zod).
- `.gitignore` for .env, uploads, secrets, temp files, build artifacts.
- Server-side validation of all inputs, protection on state-changing endpoints, no unsafe dynamic SQL, SSRF protection on any server-side fetch, documented local-only security assumptions.
- **Export and backup:** export all my data (profile, jobs, drafts, applications, events) as JSON and CSV, and document a `pg_dump` backup/restore procedure.
- **Seed script:** sample data clearly labeled as sample and excluded from real dashboard metrics.

## 15. Testing

Unit tests for business logic and integration tests for key DB workflows, covering: profile/resume validation; import and normalization; duplicate detection; scoring and fixtures; mandatory vs preferred; unknown answers; draft creation/editing/versioning; status transitions; daily limit and Asia/Kolkata day boundary; retries and idempotency; URL validation and SSRF boundaries; feed adapters (using recorded fixtures, not live calls in tests); authorized-submission restrictions.
Run lint, typecheck, tests, and production build after each phase. Fix root causes; never hide failures with broad suppressions.

## 16. Phases (STOP after each and wait for my approval)

**Phase 1: Inspection and foundation.** Inspect the repo and installed versions; report stack, scripts, dependencies, missing prerequisites; propose a concise plan; create/verify the Next.js app; build the dark dashboard shell and navigation.

**Phase 2: Database and profile.** PostgreSQL via Docker Compose; compatible Prisma; present the schema design and get my OK; migrate; profile and resume management with review-before-save; test persistence.

**Phase 3: Manual job intake.** Manual import (URL, description, file/list) with safe URL handling, normalization, dedupe; Saved Jobs list and job detail view.

**Phase 4: Matching.** Scoring model, configurable weights/preferences, hard filters, explanations, fixtures and unit tests.
_After Phase 4 the app must already be usable for manual import + scoring + saving. Tell me so._

**Phase 5: Automatic job discovery.** Verify and document each source's terms in docs/SOURCES.md and show me the results before enabling any. Implement the approved adapters (job-search APIs and company feeds), the Tracked Companies settings, per-source quota tracking, a Run discovery now button, and the Discover Jobs inbox with Today's Best Matches. Test with recorded fixtures, then do one real sync with my keys and report what came back. _After Phase 5 the app finds and ranks jobs by itself; tell me so._

**Phase 6: Application preparation.** AI provider abstraction (off/hosted/local), Prepare Application workflow, review screen, versioned drafts, unknown-answer handling, resume-emphasis diff, outbound data log.

**Phase 7: Tracking.** Statuses and transitions, notes, history, follow-ups, filters, real dashboard metrics, manual "Mark as Applied", export.

**Phase 8: Daily scheduling.** Integrate Inngest to run discovery and processing automatically every day (plus catch-up on app start); 20/day cap; retries, observability, failure reporting; Run Now.

**Phase 9: Hardening and documentation.** Full test run; verify setup from a clean start; document architecture, commands, migrations, env vars, troubleshooting, and which sources/operations are supported, restricted, manual, internal-automated, or externally authorized (docs/SOURCES.md, README.md). Verify the codebase contains no prohibited scraping, browser automation, or unauthorized submission mechanism.

## 17. Per-phase report format

After each phase report: what was completed, files changed, commands executed, test/lint/typecheck/build results, known limitations, and what the next phase will do. If an external integration is unavailable, explain the limitation and provide a working fallback.

## 18. Definition of done

I can: run it locally on Ubuntu; maintain an editable profile and upload my resume; open the app and find new relevant jobs already fetched from approved sources, with the best matches ranked at the top (and still paste in a job manually if I want); process up to 20 new relevant jobs per day; see explainable scores; have unpaid and clearly ineligible jobs filtered; generate and edit tailored materials; review the selected resume and all proposed answers; open the original application page in one click; record that I applied manually; track interviews, rejections, and follow-ups; run background processing locally; restart without losing data; export my data; run tests and build successfully; and know exactly which operations are manual, internally automated, or externally authorized.

**Start with Phase 1 only. Inspect the repository, report your findings and plan, then stop and wait for my approval.**
