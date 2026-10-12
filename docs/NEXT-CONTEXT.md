# Fresh-context handoff after Phase 7

The user approved the Phase 7 model with “yes proceed” after the explicit model approval question. Phase 7 tracking/export is complete after the checks in PHASE-7-REPORT.md and is committed/pushed at the end of the phase. Confirm git log/status/origin before future work. Earlier Phase 6 base: 7b92c32; proposal: d617acc. Origin: Czar-16/orbit. Prior instructions request pushes after each phase and a fresh context for each next phase. STOP after the Phase 7 report; do not start Phase 8 until the user authorizes it.

## Read first

AGENTS.md, PROMPT.md, DESIGN.md, docs/PHASE-7-MODEL.md, docs/PHASE-7-REPORT.md, docs/TRACKING.md, docs/BACKUP.md, docs/PREPARATION.md and docs/SOURCES.md. Inspect current code and installed versions before editing. Preserve pre-existing next-env.d.ts changes around Next typegen/build and exclude them from commits. Never print .env contents, resumes or personal profile data. Never scrape/crawl LinkedIn/Indeed, fetch listing pages, use browser automation or automate external submission.

## Delivered through Phase 7

Private PDF/TXT upload and verified immutable profiles; manual/list intake and listing revisions/provenance; deterministic skills/weighted matching and preferences; permitted public-API discovery with Kolkata daily limits/quotas/Run Now; deterministic preparation/review with immutable drafts and private selected resume; optional off/OpenAI/Ollama content-index selection and outbound metadata logs.

Tracking adds workspace-owned Application/ApplicationEvent/FollowUp, observed legacy migration baselines, valid status rules, manually confirmed Applied/date, immutable history/notes, next steps, follow-up create/edit/complete/cancel and expected-revision/workspace-lock concurrency. SQL guards workspace/job/draft identity, confirmation consistency/immutability, archive prior status, follow-up Kolkata midnight/exclusive closure and append-only events. Preparation and job state actions synchronize tracking atomically without inferring submission. After Applied, later drafts preserve confirmation and the selected submission draft. Archive restore uses recorded status and safely returns Needs review if a ready/draft recheck fails.

Tracker has URL-backed company/role/location/source/status/applied-date/pinned-score filters and DB pagination; match projections pin existing evidence/version IDs and label staleness. Dashboard shows real preparation events, unique active drafts, confirmed applications, review/interview/rejection/follow-up counts, recent real events and discovery summaries. Settings exports complete local JSON and CSV tables with provenance/history; original resume bytes/environment credentials/internal storage paths excluded. Private downloads remain separate. Export is repeatable-read, buffered and local host/origin guarded. Backup/restore is documented, never performed over the normal database.

## Verification and limits

See PHASE-7-REPORT.md for exact final commands, test counts, production HTTP results and migration deployment. Nine migrations including 202610120009_tracking. All synthetic fixtures stay in disposable PostgreSQL/ignored test storage; no sample facts/jobs/drafts/applications/submission results were seeded into the normal database. Existing real jobs get labeled migration baseline events only. No discovery call/quota reset or AI-provider request is made by Phase 7.

Manual visual/keyboard review at 320/768/1280 remains outstanding. Navigation/unload guards work through the existing hook; SPA-history unsaved-edit handling remains outstanding. PDF extraction is bounded but not an OS sandbox; no OCR/DOCX/tailored PDF rewrite/removal/redaction UI. Real OpenAI/Ollama adapters remain untested; no paid calls/model downloads. Ready to apply blocks all unanswered displayed questions and warnings; never invent sensitive answers to clear it, use manual application confirmation for outside-app submission. Follow-ups do not send notifications or messages. Export is not a restore/import file; large backups should use pg_dump. Existing development lint advisories and pg adapter query concurrency deprecation remain documented. No auth: remain local only.

## Next only after authorization

Phase 8: Inngest daily scheduling/startup catch-up, idempotency/retries, daily cap, processing summaries/observability/Run Now. Follow installed versions/docs and record source permissions before enabling new sources. Do not add Redis/Kubernetes/microservices/paid services, remote exposure or external submissions. Asia/Kolkata defines daily intervals; timestamps stay UTC. Phase 9 hardening/documentation is separate. The approved Phase 7 model does not waive future model approval or phase-stop requirements.
