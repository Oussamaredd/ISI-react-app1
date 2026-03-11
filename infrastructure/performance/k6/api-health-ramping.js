import { createThresholds, maybeRunAuthenticatedPlanningFlow, pauseBetweenIterations, runReadinessProbe } from "./lib/shared.js";

export const options = {
  stages: [
    { duration: __ENV.K6_RAMP_UP_DURATION || "5m", target: Number(__ENV.K6_RAMP_UP_TARGET || "500") },
    { duration: __ENV.K6_STEADY_DURATION || "10m", target: Number(__ENV.K6_STEADY_TARGET || "500") },
    { duration: __ENV.K6_RAMP_DOWN_DURATION || "5m", target: 0 },
  ],
  thresholds: createThresholds({ p95Ms: 500, p99Ms: 900 }),
};

export default function () {
  runReadinessProbe("m10.2-ramping");
  maybeRunAuthenticatedPlanningFlow("m10.2-ramping");
  pauseBetweenIterations();
}
