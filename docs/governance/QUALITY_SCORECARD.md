# Development Quality Scorecard

Last updated: 2026-03-28

This scorecard is the canonical Development-only release bar for EcoTrack. It does not expand scope into Cyber-Security, Data-Science, or deferred platform work.

## Blocking Targets

- Coverage:
  - web app: minimum `80/70/80/80`
  - mobile: minimum `80/70/80/80`
  - api: minimum `85/70/85/85`
- Lighthouse:
  - URLs: `/`, `/login`, `/app/dashboard`
  - categories: `performance >= 0.90`, `accessibility >= 0.95`, `best-practices >= 0.95`, `seo >= 0.90`
  - total byte weight: `<= 1,000,000`
- Route-aware bundle budgets:
  - initial route shell gzip: `<= 450 kB`
  - landing route delta gzip: `<= 10 kB`
  - login route delta gzip: `<= 10 kB`
  - dashboard route delta gzip: `<= 50 kB`
  - admin route delta gzip: `<= 30 kB`
  - mapping vendor gzip: `<= 125 kB`
  - brand logo raw asset: `<= 120 kB`
- Release evidence:
  - hosted smoke must pass for the release target
  - hosted synthetic monitoring must pass for the release target

## Required Commands

```bash
npm run quality:product-hardening
npm run quality:mobile-readiness
npm run ci:release:manifest
npm run ci:release:quality-scorecard
```

## Critical Flow Evidence

- Web role-critical journeys: `npm run test:e2e`
- Web realtime fallback and reconnect: `npm run test:realtime`
- Mobile citizen, agent, manager, login, and session flows: `npm run quality:mobile-readiness`
- API degraded and recovery paths: `npm run test:coverage:api`

## Artifact Contract

- Product hardening artifacts:
  - `tmp/quality/**` locally
  - `tmp/ci/quality/**` in CI/CD
- Release artifacts:
  - `tmp/ci/release/release-manifest.<env>.md`
  - `tmp/ci/release/quality-scorecard.<env>.md`
  - `tmp/ci/release/release-smoke.<env>.md`
  - `tmp/ci/synthetic/synthetic-monitoring.<env>.md`

## Notes

- The scorecard is enforced by repo-owned scripts, not by ad hoc CI shell snippets.
- CD summaries must reference the generated scorecard artifact for each release candidate.
- If a lane is intentionally skipped, the release summary must record the reason explicitly.
