import { createThresholds, maybeRunAuthenticatedPlanningFlow, pauseBetweenIterations, runReadinessProbe } from "./lib/shared.js";

export const options = {
  stages: [
    { duration: __ENV.K6_SPIKE_RAMP_DURATION || "1m", target: Number(__ENV.K6_SPIKE_TARGET || "1000") },
    { duration: __ENV.K6_SPIKE_HOLD_DURATION || "2m", target: Number(__ENV.K6_SPIKE_TARGET || "1000") },
    { duration: __ENV.K6_SPIKE_COOLDOWN_DURATION || "1m", target: 0 },
  ],
  thresholds: createThresholds({ p95Ms: 650, p99Ms: 1200 }),
};

export default function () {
  runReadinessProbe("m10.2-spike");
  maybeRunAuthenticatedPlanningFlow("m10.2-spike");
  pauseBetweenIterations();
}
