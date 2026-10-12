# Matching model and authorization

The user instructed on 2026-10-12: “don't ask for my approval till phase 6 is complete”. This supersedes the per-phase and model/source approval waits through Phase 6. Compliance, truthful personal facts, input validation, local-only operation, and phase verification still apply. Model decisions are documented before implementation.

Workspace owns immutable PreferenceVersion records (revision, validated JSON, timestamps). JSON contains seven integer weights totaling 100, role/location/arrangement/employment preferences, paid-only, minimum compensation with currency/period, and daily relevant-job cap. Preferences are user choices, not personal qualifications. Defaults come from PROMPT and are labeled defaults until saved.

Workspace owns WeightedMatch records linked by workspace-scoped foreign keys to immutable JobRevision, ProfileVersion, and PreferenceVersion. The explanation records the rule version, category points/status/evidence, evaluated weight, unknowns, and conflict/review flags. Existing skills-only MatchResult rows remain intact and are never reinterpreted. Matches under unsaved defaults are calculated for display but not persisted as saved preference evidence.

ProfileVersion JSON adds optional fact fields for explicit experience years and education level, and optional verified absent-skill/project-bullet arrays. Existing JSON parses with unknown/empty defaults. All new personal facts require the existing explicit verification control. Absence is never inferred from the positive skills list. Projects are verbatim supplied facts, not generated achievements.

The score is confirmed weighted points out of 100, not a rescaled partial percentage. Unknown categories earn no confirmed points and show unknown weight and a possible upper bound. It is a prioritization aid and does not assert eligibility. Mandatory employer wording remains rule-inferred from supplied text; sensitive requirements need user input. Preference changes create versions, never overwrite past match evidence.
