# Accessibility and Responsive Audit (Sprint 6)

Last update: 2026-02-20

## Scope

Critical EcoTrack flows audited in Sprint 6:
- Citizen overflow reporting (`/app/citizen/report`)
- Agent tour execution (`/app/agent/tour`)
- Manager planning wizard (`/app/manager/planning`)

## Keyboard and Screen-Reader Validation

Validation is automated in `app/src/tests/e2e.key-journeys.test.tsx` and enforced by CI.

Checklist status:
- [x] Keyboard tab order reaches primary fields and actions for citizen report flow.
- [x] Form controls expose accessible names via explicit `label` + `htmlFor` + `id` bindings.
- [x] Status/confirmation updates are announced using `role="status"` with polite live regions.

## Responsive Validation

Responsive behavior checks are included in journey tests by asserting mobile-first layouts keep breakpoint classes for multi-column sections.

Checklist status:
- [x] Citizen report location fields keep `sm:grid-cols-2` split for larger screens.
- [x] Manager planning form keeps `sm:grid-cols-2` layout for tablet/desktop.
- [x] Agent/manager/citizen pages remain single-column usable on base mobile layout.

## WCAG 2.1 AA Fixes Applied

- [x] Added explicit label association for inputs/selects/textareas across citizen, agent, and manager forms.
- [x] Added live status announcements on async actions where feedback was previously visual-only.

## Operational Notes

- PR reviewers must complete the accessibility checklist in `.github/pull_request_template.md`.
- If new UI flows are added, extend `app/src/tests/e2e.key-journeys.test.tsx` (or add a focused journey test file) before merge.
