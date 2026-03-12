# Release and Versioning

This file defines the EcoTrack release bookkeeping process for the monorepo.

## Version Source of Truth

- The canonical repository release version is the root `package.json` version.
- Workspace package versions remain private implementation details unless a workspace is intentionally published on its own.
- Release notes live in the root `CHANGELOG.md`.
- Git tags must use the form `vX.Y.Z`.

## Semantic Versioning Rules

- `MAJOR`: breaking runtime, API, env, database, or workflow change that requires consumer or operator action
- `MINOR`: backward-compatible feature delivery
- `PATCH`: backward-compatible fix, docs correction, or operational refinement

If a change is not meant to become a tagged release yet, keep it in `CHANGELOG.md` under `Unreleased`.

## Changelog Rules

- Keep entries under `Unreleased` until the release is cut.
- Use the standard sections only when needed: `Added`, `Changed`, `Deprecated`, `Removed`, `Fixed`, `Security`.
- Write entries in user-impact terms, not commit-message shorthand.
- Link follow-up runbooks or docs when release operators need more context.

## Public Repo Legal Baseline

Before a public GitHub release or main-branch push, keep these root artifacts aligned:

- `LICENSE` must exist at the repository root and match the intended public-use terms.
- `README.md` should name the current repository owner and link to `LICENSE`.
- Root `package.json` should expose the same `author` and `license` metadata used by the repository.
- `CHANGELOG.md` should capture legal/governance changes when they affect public distribution, attribution, or release bookkeeping.

## Release Procedure

1. Run the required validations for the changed paths from `AGENTS.md`.
2. Confirm the public repo legal baseline (`LICENSE`, `README.md`, root `package.json`, `CHANGELOG.md`) is current.
3. Move the relevant `Unreleased` notes in `CHANGELOG.md` into a new dated version section.
4. Bump the root version in `package.json`.
5. Commit the release change set.
6. Create an annotated tag such as `git tag -a v1.0.1 -m "Release v1.0.1"`.
7. Push the commit and tag.
8. Publish GitHub release notes using the matching changelog section.

## Workspace Policy

- Do not treat `app/package.json`, `mobile/package.json`, `api/package.json`, or `database/package.json` versions as the release source of truth for the deployed platform.
- Only align workspace versions deliberately when independent package publishing becomes part of the delivery model.

## Notes for This Repository

- The documented changelog baseline starts on 2026-03-11.
- Earlier work remains traceable through Git history, roadmap checkpoints, and runbooks, but not through backfilled release entries.
