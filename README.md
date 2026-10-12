# Orbit

Local application workspace. Phase 1 is a Next.js dashboard shell with seven navigable pages. Local PostgreSQL storage, private PDF/TXT resume upload, and explicit profile verification are available. Job fetching, matching, AI, and submission integrations remain deferred. Metrics are unavailable rather than invented.

## Setup

Use Node.js 24 LTS and npm. Install from the committed lockfile:

```sh
npm ci
npm run dev
```

Open http://127.0.0.1:3000 (or the port reported by Next.js if occupied). The shell runs without database configuration; to enable local storage, run `npm run db:setup` and restart the app. See [database setup](docs/DATABASE.md). No environment file is required for the shell. If needed, copy `.env.example` to `.env.local`; `ORBIT_MODE` must be `local`. Invalid configuration stops startup and reports field names without printing values. No database or AI credentials are needed.

Production locally:

```sh
npm run build
npm run start
```

Both start scripts bind to loopback. This app has no authentication; do not override the hostname, expose it through a tunnel, or deploy it remotely. Real authentication must precede remote access.

## Checks

```sh
npm run lint
npm run typecheck
npm test
npm run build
```

Lint runs ESLint directly, separately from the Next.js build. Tests exercise startup validation, active navigation, sidebar toggling, unavailable controls, and the mobile More sheet keyboard behavior using a DOM environment. They do not automate a browser or contact job platforms.

`next/font` downloads Geist Sans and Geist Mono at build time, requiring access to Google Fonts; the resulting fonts are served locally at runtime.

## Dependency limitations

The production dependency audit is clean. The full audit reports five high-severity entries in the development lint dependency chain (`eslint-config-next` → Next lint plugin → `fast-glob` → `micromatch` → `braces`). npm currently reports no compatible patched release; its suggested forced downgrade would leave the intended Next.js 16 lint stack. ESLint 9.39.5 is deprecated, but remains required by the lint plugins' current peer ranges; ESLint 10 was checked and rejected because of incompatible peers. Revisit the lint dependency chain when upstream publishes compatible updates.

## Layout and keyboard review

Manual browser inspection is still required. At 320px check stacked cards, bottom tabs, More sheet, text wrapping, and no horizontal overflow. At 768px check the 64px icon sidebar and link titles. At 1280px check the 240px sidebar, collapse/expand, and content width. At each width, use Tab/Shift+Tab to check focus rings and the skip link; open More with Enter, check focus containment, close with Escape, and confirm focus returns. Check disabled control explanations and reduced-motion settings.

## Project map

- `src/app`: App Router pages, loading/error boundaries, and global design tokens.
- `src/components`: responsive shell, shadcn-style Button and Radix Sheet primitives, and unavailable states.
- `src/lib`: environment validation, navigation definitions, and component utilities.
- `tests`: environment and navigation tests.
- `docs/SOURCES.md`: source enablement register; no sources currently enabled.

DESIGN.md is the UI contract. Tailwind 4 explicitly loads `tailwind.config.ts` with `@config`; every design color maps to a CSS variable. The permanent dark theme uses Geist fonts, semantic navigation, and reduced-motion support. Dates and daily limits in future workflows use Asia/Kolkata, with UTC timestamps in storage.

Private files, resumes, environment files, and keys are ignored. Future uploads must additionally validate file type/size/path and use private storage. There are no uploads or URL-fetching endpoints in this phase.

## Next phase

Phase 2 begins with a proposed PostgreSQL/Prisma database model and relations for user approval before writing a schema. Review the [Phase 2 database proposal](docs/PHASE-2-DATABASE-PROPOSAL.md). Intake, resume/profile, matching, application preparation/tracking, and background processing remain later work. No exact later phase numbers are assigned by this foundation.

Implementation references: [Next.js installation](https://nextjs.org/docs/app/getting-started/installation), [shadcn Tailwind 4](https://ui.shadcn.com/docs/tailwind-v4), [Tailwind directives](https://tailwindcss.com/docs/functions-and-directives).
