import { createThresholds, maybeRunAuthenticatedPlanningFlow, pauseBetweenIterations, runReadinessProbe } from "./lib/shared.js";

export const options = {
  stages: [
    { duration: __ENV.K6_STRESS_STAGE_ONE_DURATION || "2m", target: Number(__ENV.K6_STRESS_STAGE_ONE_TARGET || "500") },
    { duration: __ENV.K6_STRESS_STAGE_TWO_DURATION || "5m", target: Number(__ENV.K6_STRESS_STAGE_TWO_TARGET || "1000") },
    { duration: __ENV.K6_STRESS_STAGE_THREE_DURATION || "2m", target: Number(__ENV.K6_STRESS_STAGE_THREE_TARGET || "1500") },
    { duration: __ENV.K6_STRESS_STAGE_FOUR_DURATION || "5m", target: Number(__ENV.K6_STRESS_STAGE_FOUR_TARGET || "2000") },
  ],
  thresholds: createThresholds({ p95Ms: 900, p99Ms: 1500 }),
};

export default function () {
  runReadinessProbe("m10.2-stress");
  maybeRunAuthenticatedPlanningFlow("m10.2-stress");
  pauseBetweenIterations();
}
