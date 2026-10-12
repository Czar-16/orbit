# Orbit

Orbit is a local job search and application workspace. It helps you organize job listings, compare them with a profile you verify, prepare application materials for your review, and track applications you submit yourself.

**Project status:** development is paused. The app is usable as a local project, but some workflows still need manual effort. Contributions and forks are welcome. This project does not submit applications for you.

## What it can do

- Store your profile and PDF or text resumes locally, with explicit review before profile facts are verified.
- Add jobs by pasting a listing URL and/or description, or importing a CSV/JSON file. LinkedIn and Indeed listings must be provided by you; their pages are never fetched.
- Discover listings from the reviewed public APIs for Himalayas, Remotive, Jobicy, and Remote OK. Source permissions, attribution, and limits are documented in [docs/SOURCES.md](docs/SOURCES.md).
- Match jobs against your profile and preferences using deterministic scoring. AI is optional and is not needed for matching or the standard preparation flow.
- Prepare editable application drafts from your verified information, review unknown answers, and track applications, notes, and follow-ups.
- Export workspace data as JSON or CSV.

Job descriptions and imported listings are treated as untrusted input. Scores and aggregated listing details are aids for prioritization, not verified employer information. You decide what information to confirm and what to submit.

## Run locally

### Requirements

- Ubuntu or a compatible Linux environment
- Node.js `>=24.11.1 <25`
- npm `>=11`
- Docker with Compose v2

The default setup uses local ports 3000 (app), 55432 (PostgreSQL), and 8288 (Inngest). See [docs/OPERATIONS.md](docs/OPERATIONS.md) for troubleshooting and alternate database setup.

### Install and start

```sh
git clone <your-fork-url>
cd orbit
npm ci
npm run db:setup
npm run dev
```

Open the loopback address printed by Next.js, normally <http://127.0.0.1:3000>. `db:setup` creates ignored local credentials in `.env.local`, starts Orbit's dedicated PostgreSQL container, applies migrations, and creates an empty workspace. It does not add sample jobs or personal information. Keep the app bound to loopback; authentication is not implemented, so do not expose it to the internet or a shared network.

To use daily scheduled discovery, leave Orbit running and start the local Inngest runtime in a second terminal:

```sh
npm run inngest:dev
```

Scheduling behavior, daily limits, and recovery details are in [docs/SCHEDULING.md](docs/SCHEDULING.md). You can also use manual discovery from the app without setting up a job search profile first.

To stop the database container while preserving its data:

```sh
docker compose --env-file .env.local stop
```

### Set up your own workspace

Orbit starts with an empty workspace. After the app is running:

1. Open **Resume & profile** and enter your own details. You can upload a PDF or UTF-8 text resume (up to 5 MB), then review any proposed information and explicitly confirm what is accurate. Uploading a resume does not automatically verify facts.
2. Add matching preferences and weights in **Settings**. Profile facts, preferences, and dates should reflect information you have checked.
3. Add jobs in **Discover jobs** by pasting a public HTTPS URL, pasting the job description, or importing a supported CSV/JSON file. A URL is saved as a reference; Orbit does not fetch the listing page. For LinkedIn and Indeed, copy the details into Orbit yourself.
4. Review job details and match explanations, save jobs you want to pursue, and prepare a draft when ready. Check every draft and fill any fields marked **Needs your input** yourself.
5. Apply on the employer's site yourself. Then use **Tracker** to confirm that you submitted the application and record its status. Orbit never marks an application as Applied on its own.

Your resume files are stored privately under the ignored `private/resumes` directory, outside the public web directory. Never commit `.env.local`, resumes, exports, or other personal data. See [docs/PROFILE.md](docs/PROFILE.md), [docs/INTAKE.md](docs/INTAKE.md), and [docs/BACKUP.md](docs/BACKUP.md) for details.

## Optional AI assistance

AI is off by default. Deterministic matching and standard application preparation work without an AI key. Optional preparation assistance supports OpenAI or a local Ollama instance; configure it only if you want it. Hosted OpenAI calls require an explicit model, API key, and `ORBIT_ALLOW_PAID_AI=true`. Ollama uses the fixed local endpoint `http://127.0.0.1:11434` and a model already available on your machine. No model is downloaded automatically.

Configuration names and data-handling details are in [docs/OPERATIONS.md](docs/OPERATIONS.md) and [docs/PREPARATION.md](docs/PREPARATION.md). Optional AI adapters have not been verified against live providers; the normal local workflow does not depend on them.

## Checks

```sh
npm run lint
npm run typecheck
npm test
npm run test:db
npm run build
```

The database test command uses a disposable PostgreSQL container. Additional clean-start and scheduler checks are documented in [docs/OPERATIONS.md](docs/OPERATIONS.md).

## Current limitations

- Orbit is local-only and has no authentication or multi-user separation. Treat each local installation as private.
- Applications are never submitted automatically; follow-ups are local reminders without notification delivery.
- Resume support is PDF and UTF-8 TXT only. There is no DOCX/OCR support, resume removal/redaction interface, or exported replacement PDF for tailored resume emphasis.
- Job description analysis uses a limited English rule set. Unknown profile or job details remain unknown and may need your input.
- Public API discovery is limited to the sources listed above and currently requests at most the first 20 listings per query. Other sources may be added only after their official terms permit the intended use.
- Optional AI providers have not been tested against live services.

More detail is in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md), [docs/OPERATIONS.md](docs/OPERATIONS.md), and [docs/SOURCES.md](docs/SOURCES.md).

## Contributing

Issues and pull requests are welcome. Please read [AGENTS.md](AGENTS.md) before changing the project; it contains required privacy, security, and source-compliance rules. In particular, do not add job-site scraping or application-submission automation, and do not invent personal or employer facts. If you add or enable a job source, document its official permission and use limits in `docs/SOURCES.md` first.

## License

No project license is currently provided. Until a license is added, do not assume that the code may be reused, modified, or redistributed under an open-source license.
