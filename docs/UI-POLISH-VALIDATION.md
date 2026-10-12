# UI polish validation

Both UI phases are implemented. AGENTS.md now retains verification requirements without mandatory phase reports or approval gates. Light / Dark / System remains the approved theme choice.

## Changes

- DESIGN.md and globals.css define consistent widths, spacing, readable type, panel padding, button states, and reduced-motion behavior.
- Shared Button, ConfirmationDialog, FormFeedback, FieldMessage, and usePendingAction provide accessible confirmations, semantic feedback, action-specific pending indicators, and synchronous duplicate-request protection.
- JobActions, DraftReview, and TrackingControls use the shared dialog for the planned confirmations. Failure keeps the dialog open and retains edits; success closes it only after a successful action result. Applied still requires the user's manual confirmation.
- Preparation, imports, uploads, profile/preferences, resume selection, discovery, match recording, and daily processing use the pending guard and consistent feedback. Preference and source forms no longer reset automatically after failed requests.
- Job cards, screen metadata, queue/tracker empty states, pagination wrapping, and queue/review loading layouts follow the shared design rules.
- Interaction tests were expanded in job-actions.test.tsx, draft-review.test.tsx, tracking-controls.test.tsx, and action-feedback.test.tsx.

## Commands and results

- `npm run lint`: passed.
- `npm run typecheck`: passed for the UI snapshot. A later run in the actively changing shared workspace reports two TS2353 errors in src/lib/tailored-resume-service.ts at the nested ResumeArtifact create objects; these are separate tailored-resume changes.
- `npm test`: 199 tests passed across 29 files, in both the shared workspace and the isolated snapshot.
- `npm run build`: passed in the shared workspace before the concurrent additions and in the final isolated UI snapshot after the dialog animation correction.
- `git diff --check`: passed.

The snapshot was placed outside the repository to keep another build from changing the assets underneath the preview server. It excludes secrets and private resumes. Preview servers used loopback addresses and disabled scheduler dispatch. No test submitted an external application or changed application records.

## Browser checks

Chrome checks used 320px, 768px, and 1280px in both themes:

- 84 main-screen combinations covered the normal local service and an unavailable database. None had horizontal overflow or visible buttons below 44px. The queue rendered the error boundary when the pending database column was missing.
- 132 detail-screen combinations were attempted: 72 rendered successfully, while 60 encountered the same pending database migration. No detail view or error boundary overflowed horizontally.
- All six live job-dialog combinations passed initial cancel focus, focus trapping, Escape cancellation, focus restoration, and viewport bounds.
- All six temporary draft/tracker fixture combinations passed long-content layout, failed regeneration with retained input, focus trapping/restoration, bounded dialogs, 44px buttons, and reduced-motion checks. Fixture action responses were explicitly simulated failures; no external integration was tested or claimed.
- All main-screen focus checks showed a 2px solid outline, and reduced-motion checks showed zero transition duration.
- A computed-style contrast check found no failures among 2,720 rendered text samples. This is a targeted browser check rather than a complete accessibility certification.

## Remaining validation limits

Live queue and some detail data could not be verified because the separate tailored-resume schema work adds ApplicationDraft.tailoredResumeVersionId before that column exists in the current local database. Private resume detail files were not copied into the test snapshot. Their UI behavior should be checked after that work and its migrations are ready. These changes were preserved rather than modified as part of the UI task.

## Commit verification

The UI-only changes were applied to a detached worktree based on e44bb77, excluding the concurrent tailored-resume work. The exact UI commit contents passed `npm run lint`, `npm run typecheck`, `npm test` (194 tests across 28 files), and `npm run build`. The earlier 199-test result also included five tests from concurrent work; those tests are outside this commit.
