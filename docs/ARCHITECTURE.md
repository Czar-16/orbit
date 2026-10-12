# Local architecture and operation boundaries

Orbit is one Next.js 16 App Router application with React 19, strict TypeScript, Tailwind 4, PostgreSQL 18 and Prisma 7. npm/package-lock.json pins the installed versions. Local Inngest runs durable internal work; there is no Redis, microservice, authentication service or cloud scheduler dependency.

## Data flow

User-pasted text/CSV/JSON and reviewed official API adapters → server Zod validation and public URL checks → transactional Job/immutable JobRevision → deterministic matching against explicitly verified ProfileVersion and PreferenceVersion → versioned ApplicationDraft linked to the exact resume/profile/job/preferences → human review and a normal original-listing link → explicitly confirmed manual tracking.

Workspace owns all records. Services in src/lib enforce ownership and expected revisions; database foreign keys, unique constraints and integrity triggers protect history and concurrent writes. Historical revisions are immutable. Legacy history remains unknown where no original snapshot exists. Job descriptions are inert text, never instructions or executable HTML. Provenance distinguishes employer-supplied/user-provided/inferred/unknown values; AI cannot verify employer or personal claims.

Matching has no AI dependency. Optional AI only selects indexes from existing verified sentences/bullets; Zod and bounds validation reject new text. OutboundDataLog records attempted/succeeded/failed provider calls. Hosted opt-in may incur provider charges; the default is off. No provider interface was exercised against a real AI service during final acceptance.

Local Inngest schedules 09:00 Asia/Kolkata and startup catch-up for today's work only. ProcessingRun and DiscoveryAttempt store claims, leases, counters and bounded retries. Source requests are reserved before dispatch; uncertain requests are not repeated. Internal retries cannot replenish source quotas or daily capacity. Timestamps are UTC; daily limits and follow-ups use Asia/Kolkata. See SCHEDULING.md.

## Security boundary

The app has no login: use loopback only. npm dev/start, PostgreSQL Compose and Inngest bind to 127.0.0.1. Do not tunnel or expose them. Next's built-in same-origin Server Action protection covers form mutations; service validation remains mandatory. Export, resume download and Inngest routes additionally check loopback Host/URL, Origin, Referer and Fetch Metadata. This is a local defense, not authentication against other local processes.

Manual listing URLs are HTTPS/public-host/DNS validated and retained only as references. Listing pages and redirects are never fetched. Official API requests use fixed allowed hosts, validate all DNS answers, connect to the selected public IP with the correct TLS name, reject redirects and bound time/response size. Local Ollama and Inngest use explicit loopback endpoints, with no arbitrary user-supplied endpoint. Source permission decisions are in SOURCES.md; reachability does not establish permission.

Original resumes are private files, excluded from output tracing/Git/public storage. Filenames are generated, opens reject symlinks, directory paths are checked, size/type are bounded and permissions are private. PDF extraction is bounded but is not an OS sandbox. Export excludes original bytes and secrets. Backup/restore requires both database and matching private files; see BACKUP.md. Resume removal/redaction UI is still absent.

## Operation classification

| Operation | Boundary |
| --- | --- |
| Upload, profile confirmation, manual job import/edit | Manual local input; extracted facts require review |
| Match, prepare, draft revisions, exports | Internal local automation; nothing submitted |
| Daily discovery and Run now | Internal scheduling plus reviewed public listing APIs only |
| Optional AI selection | Explicit provider choice; hosted use requires env opt-in; logged outbound data |
| Open original listing | User-controlled external navigation; no fetch or status change |
| Mark Applied, later statuses and follow-ups | Manual confirmation/local records; no notification or submission |
| LinkedIn/Indeed | User-pasted reference URL/text only; no adapter or automated access |
| External application submission | Unsupported/disabled; no authorized integration exists |
| Browser automation, scraping, private endpoints, evasion | Prohibited; absent from product implementation |

## Verification boundaries

npm test uses synthetic fixtures; npm run test:db uses disposable PostgreSQL. npm run test:scheduler exercises the real local Inngest transport with all external sources disabled. npm run test:clean-start copies tracked source into a temporary directory, performs npm ci, migrates disposable PostgreSQL, creates an empty workspace, builds/starts production, checks seven HTTP pages/private endpoints and restores a synthetic dump into another disposable database. It never copies ignored .env, uploads, node_modules or build output. It requires Docker, cached/available PostgreSQL image, npm registry and build font access; no job/AI API calls.

Clean-start acceptance uses the documented existing-instance migration path on a random loopback database port, leaving the normal Compose database intact. It does not run db:setup on the user's fixed port or validate a backup containing real personal data/resume bytes. HTTP/DOM checks cannot establish manual visual/keyboard acceptance or a waited wall-clock cron occurrence.
