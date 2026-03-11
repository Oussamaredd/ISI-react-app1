# K6 Scenario Pack

Available scenarios:
- `api-health-smoke.js`: minimal readiness smoke for CI.
- `api-business-flow.js`: readiness plus optional local-auth + planning-dashboard flow.
- `api-health-ramping.js`: gradual ramp-up, steady-state, and cooldown profile.
- `api-health-spike.js`: sudden traffic spike profile.
- `api-health-stress.js`: progressive saturation profile.
- `api-health-soak.js`: long-running endurance profile.

Environment knobs:
- `API_BASE_URL`
- `K6_LOGIN_EMAIL`
- `K6_LOGIN_PASSWORD`
- `K6_THINK_TIME_SECONDS`
- scenario-specific stage overrides such as `K6_RAMP_UP_DURATION`, `K6_SPIKE_TARGET`, or `K6_SOAK_TARGET`

Recommended commands:
- `npm run ci:quality:k6`
- `node infrastructure/scripts/ci/run-k6-scenarios.mjs --profile ramping`
- `node infrastructure/scripts/ci/run-k6-scenarios.mjs --profile all`
