# Orbit visual redesign progress

## Phase 1: tokens, typography, browser theme preference

Implemented the complete DESIGN.md section 3 token set in light and dark, the shared overlay token, Tailwind class-based dark mode, DM Sans for UI text/numbers, retained Geist Mono, tabular numbers, base heading sizes and a 14px minimum for existing stylesheet text. Shared primary buttons now use on-accent text for dark-theme contrast.

A head bootstrap applies the resolved theme before body paint. The client controller handles Light / Dark / System, persistence under orbit.theme, system changes only in System mode, cross-tab changes and blocked storage. Settings exposes labeled radio controls independently of database readiness. Root-layout and global-error output both initialize the theme. No application queries, actions, source integrations, matching calculations or submission behavior changed. No dependencies added.

Files: src/app/globals.css, tailwind.config.ts, src/lib/theme.ts, src/components/theme-controller.tsx, src/app/layout.tsx, src/app/global-error.tsx, src/app/settings/page.tsx, src/components/ui/button.tsx, tests/theme.test.tsx, DESIGN.md additions, this report. Pre-existing DESIGN.md changes remain in the working tree; only new additions are included in the phase commit.

Baseline: npm run lint, npm run typecheck, npm test (164 tests / 23 files), npm run build, npm run test:db (51 tests / 9 files) all passed. Database suite emitted an existing pg concurrent-query deprecation warning.

Phase checks: npm run lint, npm run typecheck, npm test (173 tests / 24 files), npm run build and git diff --check passed. Nine theme tests cover defaults, invalid preferences, initial bootstrap, persistence, system events, storage events and clearing, blocked storage, and cleanup. Existing navigation and disabled-action assertions pass.

Production server: npm run start -- --port 3210, bound to localhost. All seven main routes returned HTTP 200 and contained the bootstrap; Settings contained all three radio options. Server stopped after checks. Core essential token pair audit checked 20 pairs per theme: minimum 5.72:1 light and 6.81:1 dark. These are token checks, not an audit of every rendered element.

Limits: no interactive browser available; no browser automation used. Manual visual acceptance in both themes at 320px, 768px, and 1280px is outstanding, including font rendering, focus appearance, hydration, overflow and layout. Detail, loading, error and empty states have not been visually inspected. Existing component text-xs/other obsolete classes, sheet backdrops and shared layouts await Phase 2. All screen-specific restyling remains outstanding. The database suite will run again at final verification.

Implementation follows Next.js next/font documentation (https://nextjs.org/docs/app/api-reference/components/font) and Tailwind 4 dark variant documentation (https://tailwindcss.com/docs/dark-mode), with the existing dependency versions inspected first.

Pause after this phase for user approval, as AGENTS.md requires. Next: shared components and app shell, then screen phases.

## Focused phase: Recent activity

User requested improving the dashboard Recent activity panel after Phase 1. Replaced the plain stacked rows with a timeline: neutral connected markers, bold 16px job links, rounded 14px status pills, event kind/origin captions and semantic timestamps. Discovery runs use nested cards with recorded state/date/counts and error text. Empty and unavailable states have a dashed panel; the tracker link has a distinct footer. Dashboard columns align at the top, avoiding an unnecessarily stretched policy panel. Both themes use existing tokens; mobile spacing narrows and content wraps. Queries, ordering, number of visible records, navigation destinations, statuses and Asia/Kolkata timestamp values remain unchanged. No dependencies or new behaviors.

Files: src/app/page.tsx, src/app/globals.css, appended activity-feed guidance in DESIGN.md, and this report. Pre-existing DESIGN.md changes remain uncommitted.

Checks: npm run lint, npm run typecheck, npm test (173 passing tests), npm run build, git diff --check all passed. Local production dashboard HTTP 200; rendered activity rows had matching tracker links and semantic timestamps. Production server stopped after inspection. No new tests added for this reversible presentation change. No browser automation used. Visual appearance at 320px, 768px, and 1280px in both themes remains unverified without an interactive browser. The broader shared-component and screen redesign remains pending approval.
