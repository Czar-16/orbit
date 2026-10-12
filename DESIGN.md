# DESIGN.md: UI design system for the Job Application Agent

Follow this on every screen. If a screen needs something not defined here, extend the system consistently and document the addition at the bottom of this file. Do not invent one-off styles.

## 1. Principles

1. **Dark AMOLED only.** True-black foundation, no theme switch, no light mode, no `prefers-color-scheme` branching.
2. **Calm and dense, not flashy.** A tool used daily for scanning many jobs. Prioritize readability and scan speed over decoration.
3. **Honest UI.** Never present estimated, AI-generated, or unknown values as verified. Unknown looks different from confirmed. Buttons never overpromise (no "Auto Apply" label on anything that only prepares or opens a page).
4. **One primary action per context.** Each card/screen has a single obvious next step.
5. **Real data only.** No hardcoded stats or placeholder numbers in production views. Empty states instead.

## 2. Stack and implementation

- Tailwind CSS with CSS variables for tokens; shadcn/ui components customized to these tokens; lucide-react icons.
- Define all tokens in `globals.css` under `:root` and map them in the Tailwind config. Do not hardcode hex values in components.
- Font: Geist Sans for UI, Geist Mono for scores, IDs, URLs, and code. Load via `next/font`.
- Set `color-scheme: dark` and `<html class="dark">`.

## 3. Color tokens

Backgrounds

- `--bg`: #000000 (app background, true black)
- `--surface`: #0A0A0B (cards, panels)
- `--surface-2`: #111113 (inputs, hover rows, nested panels)
- `--surface-3`: #18181B (popovers, menus, selected rows)

Borders

- `--border`: #1F1F23 (default, 1px)
- `--border-strong`: #2E2E34 (hover, focus-adjacent, dividers that need emphasis)

Text

- `--text`: #EDEDEF (primary)
- `--text-muted`: #A1A1AA (secondary)
- `--text-subtle`: #71717A (tertiary, placeholders, metadata)

Accent (single accent, used sparingly)

- `--accent`: #6366F1 (indigo: primary buttons, active nav, focus ring)
- `--accent-hover`: #7C7FF5
- `--accent-soft`: rgba(99,102,241,0.12) (active nav background, selected chips)

Semantic (always paired with an icon or text label, never color alone)

- `--success`: #22C55E / soft rgba(34,197,94,0.12)
- `--warning`: #F59E0B / soft rgba(245,158,11,0.12)
- `--danger`: #EF4444 / soft rgba(239,68,68,0.12)
- `--info`: #38BDF8 / soft rgba(56,189,248,0.12)

Contrast: body text must meet WCAG AA against its background. Do not use `--text-subtle` for essential information.

## 4. Match score colors and bands

| Score  | Label        | Color                 |
| ------ | ------------ | --------------------- |
| 85-100 | Excellent    | success               |
| 70-84  | Strong       | accent                |
| 50-69  | Possible     | warning               |
| <50    | Low priority | text-subtle (neutral) |

Show the number in Geist Mono plus the label. Never rely on color alone. Always include a short disclaimer tooltip: "Prioritization aid, not a guarantee."

## 5. Provenance badges (important)

Every field that can be uncertain shows its provenance with a small badge:

- **Verified** (success tone, check icon): confirmed from the employer/official source or confirmed by me.
- **User-provided** (neutral tone, user icon): typed or pasted by me.
- **Inferred** (warning tone, sparkle/wand icon): derived by rules or AI. Tooltip: "Estimated, not confirmed by the employer."
- **Unknown** (muted, dashed border, "Unknown" text): missing. Never hide it; never display a guessed value in its place.

## 6. Typography

- Page title: 24px / 600 / tracking -0.01em
- Section title: 16px / 600
- Card title: 15px / 600
- Body: 14px / 400, line-height 1.5
- Small/meta: 12px / 400-500, `--text-muted`
- Mono (scores, URLs, IDs): 12-13px Geist Mono
- Maximum reading width for long text (job descriptions, cover letters): 70ch.
- Use sentence case everywhere, not Title Case or ALL CAPS (except tiny status labels at 11px with 0.04em tracking).

## 7. Spacing, radius, elevation

- Spacing scale: 4, 8, 12, 16, 20, 24, 32, 48. Page padding 24px (16px on mobile). Card padding 16-20px. Gap between cards 12-16px.
- Radius: 6px inputs/chips, 10px cards, 14px modals/sheets. Fully round only for avatars and dots.
- Elevation: avoid shadows on true black. Use border + background step instead. Popovers/modals may use `0 8px 30px rgba(0,0,0,0.6)` plus `--border-strong`.
- Borders are 1px. No thick borders, no gradients on surfaces, no glow effects. The only allowed subtle gradient is a faint accent wash on the primary Prepare Application button hover, if desired.

## 8. Layout

- **Desktop (≥1024px):** fixed left sidebar 240px (collapsible to 64px icons-only), top bar 56px, content area max-width 1280px centered.
- **Tablet (768-1023px):** sidebar collapsed to icons by default.
- **Mobile (<768px):** sidebar becomes a bottom tab bar (Dashboard, Discover, Queue, Tracker, More) with the rest in a sheet. Tables become card lists.
- Sidebar items: Dashboard, Discover Jobs, Saved Jobs, Application Queue, Application Tracker, Resume & Profile, Settings. Active item: `--accent-soft` background, `--text` color, 2px accent bar on the left edge. Icon + label; tooltips when collapsed.
- Top bar: page title/breadcrumb on the left; global "Import job" button, "Run now" status indicator, and a local-mode badge on the right.

## 9. Core components

**Buttons**

- Primary: accent background, white text. Used once per view for the main action (e.g. Prepare Application).
- Secondary: `--surface-2` background, `--border` border.
- Ghost: no background; for tertiary actions.
- Destructive: danger text on ghost; filled danger only inside confirmation dialogs.
- Disabled: 40% opacity with a tooltip explaining why (e.g. "Automatic submission is not available for this source. Open the original listing to apply manually.").
- Minimum hit target 36px height (44px on mobile).

**Job card**

- Layout: top row = title (card title) + score pill on the right; second row = company · location · work arrangement; third row = chips (employment type, compensation, experience requirement, source); fourth = "Matching skills" (success-soft chips) and "Missing / unverified" (warning-soft chips), each limited to 5 with "+N more"; footer = discovered date, status badge, and actions.
- Actions: Prepare Application (primary), Open original listing (secondary, external-link icon), Save, Dismiss, Inspect (ghost/overflow menu on narrow widths).
- Application method line: "Manual apply only" or "Authorized integration available", with an info tooltip explaining the restriction.
- Hover: border moves to `--border-strong`. Selected: `--accent` border.

**Status badges** (11px caps text with dot): Discovered (neutral), Saved (info), Needs Review (warning), Draft Ready (accent), Ready to Apply (accent), Applied (success), Interview (success, brighter), Offer (success, filled), Rejected (danger), Withdrawn (neutral), Archived (muted).

**Stat cards (dashboard):** label (12px muted), value (28px mono/600), optional delta or caption. Skeleton while loading; "0" is shown as 0 with an explanatory caption, never faked.

**Tables/lists (Tracker, Saved Jobs):** sticky header, 44px rows, row hover `--surface-2`, filter bar above (company, role, source, score range, status, location, date), sortable columns, URL state for filters so refresh keeps them.

**Forms:** React Hook Form + Zod; label above input, helper text 12px muted, inline error in danger color with an icon; unsaved-changes warning on leave; autosave indicator for drafts ("Saved just now").

**Review screen (Prepare Application):** two-column on desktop. Left (wider): editable cover letter, proposed answers (each with provenance badge and a "Needs your input" state highlighted in warning), resume emphasis diff. Right (sticky): job summary, selected resume + version, match explanation, missing information list, source URL, policy notice. Footer bar: Save, Regenerate, Discard, Open original listing. A persistent notice reads: "Nothing has been submitted. You submit on the employer's site yourself."

**Needs your input:** unanswered/sensitive questions show a dashed warning border, an empty field, and a "Required from you" label. Never prefill.

**Dialogs/sheets:** use for confirmations and quick edits only; destructive actions always confirm.

**Toasts:** bottom-right, short, with an Undo where possible. Errors persist until dismissed.

**Empty states:** icon, one-line explanation, one clear action (e.g. "No jobs yet. Import a job to get started."). Tone is plain and helpful.

**Loading:** skeletons shaped like the final content; spinners only for button-level actions. Background runs (Run Now) show progress and a processing summary when finished.

## 10. Charts and data viz (dashboard)

Keep minimal: a 14-day line/bar for jobs processed and applications prepared, and a status funnel. Use Recharts or similar. Colors from the tokens above, thin 1.5px lines, no gridline clutter (faint `--border` lines only), tooltips on `--surface-3`. Include text equivalents for accessibility.

## 11. Motion

- Subtle and fast: 120-180ms ease-out for hover/focus/expand; 200ms for sheets/dialogs.
- No parallax, bouncing, or looping decorative animation.
- Respect `prefers-reduced-motion`.

## 12. Accessibility

- Full keyboard navigation with a visible 2px `--accent` focus ring (offset 2px) on every interactive element.
- Semantic HTML, proper labels, `aria-live` for toasts and background-run status.
- Color is never the only signal (icons and text accompany semantic colors).
- Minimum 44px touch targets on mobile. Test at 320px width.

## 13. Content and voice

- Plain, direct, calm. No hype ("supercharge", "magic", "auto-apply").
- Prefer specific labels: "Prepare application", "Open original listing", "Mark as applied".
- Honest limits stated in-product: e.g. "LinkedIn and Indeed jobs are added manually, by pasting a link or description."
- Error messages say what happened and what to do next.

## 14. Don'ts

- No light theme or theme toggle.
- No stock illustrations, emoji in UI chrome, or decorative gradients/glows.
- No fake data, fake progress, or fake success states.
- No more than one accent color; no rainbow category colors.
- No new component libraries without asking.

## 15. Definition of done for any screen

Matches tokens; works at 320px, 768px, and 1280px; has loading, empty, and error states; keyboard accessible; provenance badges where data can be uncertain; no hardcoded stats; no overpromising labels.

---

_Additions to this system (append here when extended):_

### Shared form primitives (Phases 3–4)

`.field-label`, `.field-input`, `.field-hint`, and `.field-error` use the existing typography, border, background, and semantic tokens. Inputs are at least 44px tall. `.form-grid` uses two columns on desktop and one on mobile, with 16px gaps. Provenance badges next to inputs describe the saved fact; edited values show User-provided until explicit verification is saved. Sensitive answers remain uncollected and unknown.

### Manual intake and skills matching (Phase 4)

Job lists use the standard job-card layout at all widths, with URL-backed filters, sorting, and pagination. Dismissed is a neutral job-only label with text; it is not an application status. Skills-only scores use the existing score bands, a visible prioritization disclaimer, and an Inferred-by-rules label. Unknown requirements/profile skills produce Unavailable instead of a manufactured score. Source names derived from manually supplied URLs remain User-provided, not employer-verified.

### Application review (Phase 6)

Review uses the standard panel/input/provenance tokens, a two-column desktop layout with a sticky context panel and a single column on mobile. A sticky notice always states that nothing has been submitted. Resume emphasis compares numbered verbatim eligible project bullets with the selected order; omitted bullets are listed explicitly. Unknown answers use a dashed warning border and empty editable fields. Every saved edit is an explicit revision; there is no autosave claim. Historical and discarded revisions are read-only. Optional-provider configuration is described as configured/untested, never connected by inference.
