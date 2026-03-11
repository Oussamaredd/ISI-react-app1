import { createThresholds, maybeRunAuthenticatedPlanningFlow, pauseBetweenIterations, runReadinessProbe } from "./lib/shared.js";

export const options = {
  stages: [
    { duration: __ENV.K6_SOAK_RAMP_UP_DURATION || "5m", target: Number(__ENV.K6_SOAK_TARGET || "300") },
    { duration: __ENV.K6_SOAK_STEADY_DURATION || "8h", target: Number(__ENV.K6_SOAK_TARGET || "300") },
    { duration: __ENV.K6_SOAK_RAMP_DOWN_DURATION || "5m", target: 0 },
  ],
  thresholds: createThresholds({ p95Ms: 700, p99Ms: 1200 }),
};

export default function () {
  runReadinessProbe("m10.2-soak");
  maybeRunAuthenticatedPlanningFlow("m10.2-soak");
  pauseBetweenIterations();
}
