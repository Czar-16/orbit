# DESIGN.md: UI design system for the Job Application Agent

Follow this on every screen. If a screen needs something not defined here, extend the system consistently and document the addition at the bottom of this file. Do not invent one-off styles.

## 1. Principles

1. **Readable first, in light and dark.** Two themes, one token set. Every text/background pair must pass WCAG AA (4.5:1), and body text should aim for 7:1. If something looks dim or faint, fix the token, not the component.
2. **Calm and clear, not flashy.** A tool used daily for scanning many jobs. Prioritize readability and scan speed over decoration and density.
3. **Honest UI.** Never present estimated, AI-generated, or unknown values as verified. Unknown looks different from confirmed. Buttons never overpromise (no "Auto Apply" label on anything that only prepares or opens a page).
4. **One primary action per context.** Each card/screen has a single obvious next step.
5. **Real data only.** No hardcoded stats or placeholder numbers in production views. Empty states instead.

## 2. Stack and implementation

- Tailwind CSS with CSS variables for tokens; shadcn/ui components customized to these tokens; lucide-react icons.
- Define all tokens in `globals.css`: light values under `:root`, dark values under `.dark`. Map them in the Tailwind config (`darkMode: "class"`). Do not hardcode hex values in components.
- Theme behavior: follow the system setting by default (`prefers-color-scheme`), with a manual Light / Dark / System choice in Settings. Store the choice, set `<html class="dark">` and `color-scheme` to match, and avoid a flash of the wrong theme on load.
- Font: **DM Sans** for all UI text and numbers (use `font-variant-numeric: tabular-nums` for scores and stat values). **Geist Mono** only for URLs, IDs, and code. Load both via `next/font`.

## 3. Color tokens

Define every token in both themes. Components use token names only.

| Token                | Light   | Dark    | Use                                                              |
| -------------------- | ------- | ------- | ---------------------------------------------------------------- |
| `--bg`               | #F5F4EF | #0E1015 | App background                                                   |
| `--surface`          | #FFFFFF | #181B23 | Cards, panels, sidebar                                           |
| `--surface-2`        | #F5F4EF | #0E1015 | Inputs, nested panels (match score box)                          |
| `--surface-3`        | #ECEAE4 | #232731 | Selected rows, popovers, Unknown pill fill                       |
| `--border`           | #D9D6CC | #343945 | Default 1px border, list dividers, progress track                |
| `--border-strong`    | #B9B5A8 | #5A6070 | Input borders (1.5px), hover                                     |
| `--text`             | #17191F | #F2F3F7 | Primary text                                                     |
| `--text-muted`       | #4A505C | #B4BAC7 | Secondary text, captions                                         |
| `--text-label`       | #3B414D | #C9CEDA | Field and stat labels (bold)                                     |
| `--text-subtle`      | #6B7180 | #8A90A0 | Placeholders and non-essential metadata only                     |
| `--accent`           | #2F33C9 | #8A90FF | Primary button, progress fill, outline-button border, focus ring |
| `--accent-hover`     | #2025A8 | #A3A8FF | Primary hover                                                    |
| `--accent-text`      | #2025A8 | #B5B9FF | Links and outline-button text                                    |
| `--on-accent`        | #FFFFFF | #0E1015 | Text on filled accent                                            |
| `--accent-soft`      | #E8E9FB | #262A5E | Active nav background, selected chips                            |
| `--accent-soft-text` | #2025A8 | #D5D8FF | Active nav text                                                  |

Semantic colors (always paired with an icon or text label, never color alone). Each has a text color, a soft fill, and a border for larger callouts.

| Token       | Light text / fill / border  | Dark text / fill / border   |
| ----------- | --------------------------- | --------------------------- |
| `--success` | #0F6B3E / #E3F3EA / #A7D4B8 | #7BE0A8 / #12362A / #2E6B4D |
| `--warning` | #7A4100 / #FFF0D1 / #E6C98A | #FFC966 / #3D2C0A / #7A5B1E |
| `--danger`  | #B42318 / #FDECEA / #F2B8B2 | #FF9A91 / #3A1512 / #7A2E28 |
| `--info`    | #0B5CAD / #E3F0FB / #A9CBEC | #7CC4FF / #11283A / #2C5878 |

Callout surfaces (banners, notices) use the soft fill as background and the matching border, with `--text` for body copy and the semantic text color for the heading. Example: "Local workspace ready" is a success callout; "Add the employer's required skills to get a score" is a warning callout.

Contrast: do not use `--text-subtle` for essential information. Never put text under 14px on a tinted fill.

## 4. Match score colors and bands

| Score  | Label        | Color                |
| ------ | ------------ | -------------------- |
| 85-100 | Excellent    | success              |
| 70-84  | Strong       | accent               |
| 50-69  | Possible     | warning              |
| <50    | Low priority | text-muted (neutral) |

Show the number (DM Sans 700, tabular) plus the label. Never rely on color alone. Always include a short disclaimer tooltip: "Prioritization aid, not a guarantee."

When no score can be computed, show a bordered "Match score" box (`--surface-2`, 10px padding) with the plain words **Not scored yet**, and explain what is missing in a warning callout. Never show a guessed number or the word "Unavailable" in monospace.

## 5. Provenance badges (important)

Every field that can be uncertain shows its provenance with a small pill badge (13px, 700, fully rounded, 3px/10px padding, icon + text):

- **Verified** (success fill and text, check icon): confirmed from the employer/official source or confirmed by me.
- **User-provided** (neutral `--surface-3` fill, `--text-label`, user icon): typed or pasted by me.
- **Inferred** (warning fill and text, sparkle icon): derived by rules or AI. Tooltip: "Estimated, not confirmed by the employer."
- **Unknown** (`--surface-3` fill, `--text-label`, 1px dashed `--border-strong`, text "Needs your input" or "Unknown"): missing. Never hide it; never display a guessed value in its place.

## 6. Typography

- Page title: 32px / 700
- Section title: 20px / 700
- Card title: 18px / 700 (24px for the featured match card)
- Body: 16px / 400, line-height 1.5
- Field and stat labels: 14px / 700, `--text-label`
- Meta and captions: 14px / 400, `--text-muted`. Do not go below 14px for anything a person needs to read.
- Stat value: 40px / 700 for numbers; 26px / 700 `--text-muted` for text values such as "Not tracked yet"
- Pills and status badges: 13px / 700, sentence case
- Maximum reading width for long text (job descriptions, cover letters): 70ch.
- Use sentence case everywhere, not Title Case or ALL CAPS.

## 7. Spacing, radius, elevation

- Spacing scale: 4, 8, 12, 16, 20, 24, 32, 48. Main content padding 28px 48px (16px on mobile). Card padding 22px. Gap between cards 16px, gap between sections 24px.
- Radius: 10px for buttons and inputs, 14px for cards and callouts and modals, fully round (99px) for pills and dots.
- Elevation: no shadows on cards. Use border + background step instead. Popovers/modals may use a soft shadow plus `--border-strong`.
- Borders: 1px on cards and dividers, 1.5px on inputs and outline buttons. No gradients on surfaces, no glow effects.

## 8. Layout

- **Desktop (≥1024px):** fixed left sidebar 232px on `--surface` with a 1px right border (collapsible to 64px icons-only). Content column max-width 1120px, left-aligned in the main area.
- **Tablet (768-1023px):** sidebar collapsed to icons by default.
- **Mobile (<768px):** sidebar becomes a bottom tab bar (Dashboard, Discover, Queue, Tracker, More) with the rest in a sheet. Tables become card lists. Stat cards and form grids wrap to one column.
- Sidebar: "Orbit" wordmark (22px / 700) at the top. Items: Dashboard, Discover jobs, Saved jobs, Application queue, Application tracker, Resume & profile, Settings. Each item is 16px / 500 with 10px 12px padding and 8px radius. Active item: `--accent-soft` background, `--accent-soft-text`, 700 weight. Icon + label; tooltips when collapsed.
- Page header: title (32px) and one-line subtitle on the left. On the right: a "Local mode" neutral pill, "Import job" (secondary), and "Run now" (primary, the single primary action on the dashboard). Header wraps on narrow widths.

## 9. Core components

**Buttons**

- Primary: `--accent` background, `--on-accent` text, 700 weight. Used once per view for the main action.
- Secondary (outline): `--surface` background, 1.5px `--accent` border, `--accent-text` text.
- Ghost: no background; for tertiary actions.
- Destructive: danger text on ghost; filled danger only inside confirmation dialogs.
- Padding 10px 18px, 10px radius, 44px minimum height. Disabled: 40% opacity with a tooltip explaining why (e.g. "Automatic submission is not available for this source. Open the original listing to apply manually.").

**Stat cards (dashboard):** card with a 14px bold label, a 40px bold value, and a 14px muted caption in plain words. Four across on desktop, wrapping with `auto-fit, minmax(200px, 1fr)`. "0" is shown as 0 with an explanatory caption. If tracking is not built yet, show "Not tracked yet" and say which phase enables it. Skeleton while loading.

**Status banner:** full-width success callout under the page header (heading + one sentence + a text link such as "Setup status" on the right). Use warning or danger callouts for degraded states.

**Job card**

- Layout: title row (card title, provenance badge) with the score box on the right; a two-column field grid (Company, Location, Work arrangement, Employment type, Experience required, Compensation), each with a bold 14px label above the value and its provenance badge beside it; then a skills callout; then actions.
- Fields that are missing show the dashed "Needs your input" pill instead of a value.
- When skills are unknown: a warning callout with a bold one-line instruction ("Add the employer's required skills to get a score.") and a muted explanation including how much of the weight was evaluated and the disclaimer that this is a prioritization aid, not a guarantee.
- Actions: Add requirements or Prepare application (primary), Save job (secondary), Open original listing (secondary, external-link icon), Dismiss and Inspect (ghost or overflow menu on narrow widths).
- Application method line: "Manual apply only" or "Authorized integration available", with an info tooltip explaining the restriction.
- Hover: border moves to `--border-strong`. Selected: `--accent` border.

**Source list and quota (Discover):** one card containing a bold heading, the primary "Run discovery now" button, and a quota line ("9 of 20 new jobs processed today") with a 10px fully rounded progress bar (`--border` track, `--accent` fill) and a 14px muted note about limits. Each source is a row with a top divider: name (bold), last run time (muted), a "Success" (or failure) pill, and the new-job count (bold). Failures use a danger pill and say what to do next.

**Import form:** card with heading and one-line explanation, then a labeled URL field, then a two-column grid (Job title, Company, Location, Required skills). Labels sit above fields (14px bold), real `<label for>`, inputs 44px tall, `--surface-2` background, 1.5px `--border-strong`, 10px radius. Primary "Import job" button at the bottom.

**Status badges** (12px / 700, sentence case, with a dot): Discovered (neutral), Saved (info), Needs review (warning), Draft ready (accent), Ready to apply (accent), Applied (success), Interview (success, brighter), Offer (success, filled), Rejected (danger), Withdrawn (neutral), Archived (muted).

**Tables/lists (Tracker, Saved Jobs):** sticky header, 48px rows, row hover `--surface-3`, filter bar above (company, role, source, score range, status, location, date), sortable columns, URL state for filters so refresh keeps them.

**Forms:** React Hook Form + Zod; label above input, helper text 14px muted, inline error in danger color with an icon; unsaved-changes warning on leave; save indicator for drafts only where saving is real.

**Review screen (Prepare Application):** two-column on desktop. Left (wider): editable cover letter, proposed answers (each with provenance badge and a "Needs your input" state in a warning callout), resume emphasis diff. Right (sticky): job summary, selected resume + version, match explanation, missing information list, source URL, policy notice. Footer bar: Save, Regenerate, Discard, Open original listing. A persistent notice reads: "Nothing has been submitted. You submit on the employer's site yourself."

**Needs your input:** unanswered/sensitive questions show a dashed warning border, an empty field, and a "Required from you" label. Never prefill.

**Dialogs/sheets:** use for confirmations and quick edits only; destructive actions always confirm.

**Toasts:** bottom-right, short, with an Undo where possible. Errors persist until dismissed.

**Empty states:** icon, one-line explanation, one clear action (e.g. "No jobs yet. Import a job to get started."). Tone is plain and helpful.

**Loading:** skeletons shaped like the final content; spinners only for button-level actions. Background runs (Run now) show progress and a processing summary when finished.

## 10. Charts and data viz (dashboard)

Keep minimal: a 14-day line/bar for jobs processed and applications prepared, and a status funnel. Use Recharts or similar. Colors from the tokens above, 2px lines, faint `--border` gridlines only, tooltips on `--surface-3`. Chart text 14px. Include text equivalents for accessibility. Verify both themes.

## 11. Motion

- Subtle and fast: 150–180ms ease-out for hover/focus/pressed states; 200ms for sheets/dialogs.
- No parallax, bouncing, or looping decorative animation.
- Respect `prefers-reduced-motion`.

## 12. Accessibility

- Full keyboard navigation with a visible 2px `--accent` focus ring (offset 2px) on every interactive element, in both themes.
- Semantic HTML, real `<button>`, `<a>`, `<label>`; `aria-label` on icon-only buttons; `aria-live` for toasts and background-run status.
- Color is never the only signal (icons and text accompany semantic colors). Statuses also differ in lightness, not hue alone.
- Minimum 44px touch targets everywhere. Test at 320px width in both themes.

## 13. Content and voice

- Plain, direct, calm. No hype ("supercharge", "magic", "auto-apply").
- Prefer specific labels: "Prepare application", "Open original listing", "Mark as applied", "Not scored yet", "Needs your input".
- Prefer plain words over technical states: "Not tracked yet" instead of "Unavailable".
- Honest limits stated in-product: e.g. "LinkedIn and Indeed jobs are added manually, by pasting a link or description."
- Error messages say what happened and what to do next.

## 14. Don'ts

- No pure-black (#000) backgrounds and no text dimmer than the muted tokens for anything essential.
- No monospace for ordinary words or labels.
- No stock illustrations, emoji in UI chrome, or decorative gradients/glows.
- No fake data, fake progress, or fake success states.
- No more than one accent color; no rainbow category colors.
- No hardcoded colors in components; no theme-specific one-off styles.
- No new component libraries without asking.

## 15. Definition of done for any screen

Matches tokens in both light and dark; text passes AA contrast in both; works at 320px, 768px, and 1280px; has loading, empty, and error states; keyboard accessible; provenance badges where data can be uncertain; no hardcoded stats; no overpromising labels.

---

_Additions to this system (append here when extended):_

### Shared form primitives (Phases 3–4)

`.field-label`, `.field-input`, `.field-hint`, and `.field-error` use the existing typography, border, background, and semantic tokens. Inputs are at least 44px tall. `.form-grid` uses two columns on desktop and one on mobile, with 16px gaps. Provenance badges next to inputs describe the saved fact; edited values show User-provided until explicit verification is saved. Sensitive answers remain uncollected and unknown.

### Manual intake and skills matching (Phase 4)

Job lists use the standard job-card layout at all widths, with URL-backed filters, sorting, and pagination. Dismissed is a neutral job-only label with text; it is not an application status. Skills-only scores use the existing score bands, a visible prioritization disclaimer, and an Inferred-by-rules label. Unknown requirements/profile skills produce "Not scored yet" instead of a manufactured score. Source names derived from manually supplied URLs remain User-provided, not employer-verified.

### Application review (Phase 6)

Review uses the standard panel/input/provenance tokens, a two-column desktop layout with a sticky context panel and a single column on mobile. A sticky notice always states that nothing has been submitted. Resume emphasis compares numbered verbatim eligible project bullets with the selected order; omitted bullets are listed explicitly. Unknown answers use a dashed warning border and empty editable fields. Every saved edit is an explicit revision; there is no autosave claim. Historical and discarded revisions are read-only. Optional-provider configuration is described as configured/untested, never connected by inference.

### Readable redesign: light and dark themes

Replaced the dark-AMOLED-only system with a two-theme token set (section 3), larger type (section 6), and softer surfaces for readability. Added the status banner, source list with quota bar, import form, and the "Not scored yet" and "Not tracked yet" patterns. Reference mockups: Dashboard and Discover jobs, each in light and dark.

### Redesign implementation: type and browser theme preference

All readable text, including provenance pills and status badges, has a minimum size of 14px. This resolves the older 12px/13px badge specifications in sections 5, 6, and 9. UI text and statistics use DM Sans; tabular numbers align scores and counts. Geist Mono remains reserved for URLs, IDs, and code.

The browser preference is Light / Dark / System, stored as `orbit.theme` in localStorage. Missing or invalid values select System. A head script resolves the theme before the body paints; the client controller follows system changes only in System mode and synchronizes preferences across tabs. If storage is blocked, manual choices still apply in the current tab. Settings exposes the control even without a database. This user-approved redesign supersedes the legacy dark-only theme rule in AGENTS.md; other project rules still apply.

`--overlay` is the shared scrim token (`rgb(14 16 21 / 60%)` in both themes), for dialog and sheet backdrops. Section 3 semantic triplets use `--success`, `--success-soft`, `--success-border` and the same suffixes for warning, danger, and info. Callout bodies use primary text; semantic colors identify headings.

### Activity feeds

Activity panels use a compact heading icon on the accent-soft surface, a connected timeline with neutral markers, and divided entries. Job links are bold 16px with a 44px minimum target; status pills wrap alongside the title. Event kind and origin remain visible, with a semantic timestamp in Asia/Kolkata on a separate 14px muted line. Long titles and metadata wrap instead of truncating. Discovery runs use nested bordered surface-2 cards with the recorded state, date, counts, and error text. Empty and unavailable states use a dashed neutral panel. Dashboard columns align at the top so adjacent panels keep their natural height. All entries remain visible without an internal scroll area.

### UI polish: shared layout and interaction contract

All screens share a left-aligned 1120px content column, with 28px vertical and 48px horizontal desktop padding and 16px mobile padding. Panels have 14px corners and 22px desktop / 16px mobile padding. Sections are separated by 24px; cards within lists by 16px. Page, section, and card headings are 32px, 20px, and 18px respectively. Long descriptions and drafts stay within 70ch.

Buttons have 44px minimum height, 10px corners, bold readable labels, and primary, secondary, ghost, and destructive variants. Hover and pressed states use token surfaces; keyboard focus uses the shared offset accent ring. Disabled controls retain 40% opacity. Interaction transitions last 160ms. Dialog and sheet entrances/exits last 200ms, using opacity and a small translation; reduced motion disables both. Whole job lists do not animate. Only interactive job cards receive hover-border feedback; static panels do not.

Job cards separate title and match-score regions, use bold field labels, group missing scoring inputs in a warning callout, and place preparation before listing and inspection actions. Missing scores read “Not scored yet.” No matching, provenance, or submission behavior changes.

### Confirmations and action feedback

Job dismissal/archive, draft discard, regeneration with unsaved edits, application archive, and follow-up completion/cancellation use the shared Radix confirmation dialog. Cancel receives initial focus; keyboard focus is trapped and returned to the initiating control. Escape and outside dismissal are blocked while an action is pending. Failed requests leave the dialog open with an actionable error; only a successful action result closes it. Buttons name the action and descriptions explain consequences and retained history.

Action feedback pairs an icon with readable text, semantic soft background, and border. Success is announced as a polite status; errors are alerts. Pending buttons show a local indicator and accurate action label; synchronous request locks prevent duplicate mutations. Failed saves retain edits. Applied remains an explicit manual confirmation of an application already submitted by the user.

### Tailored resume review

Source/original panes stack below desktop width and use the shared panel, field, warning and provenance tokens. Original and generated PDF iframes have meaningful titles and independent open-file links; extracted text and stable-item comparisons provide accessible text alternatives. Inclusion is explicit, ordering uses labeled buttons, and per-bullet confirmations reset when wording changes. Source corrections, generation and selection are saved revisions, never autosave. Approval requires inspection of the actual generated PDF and names the exact documents. Unsaved changes disable approval/selection. Documents use a white Liberation Sans A4 template independent of Light / Dark / System UI preference.
