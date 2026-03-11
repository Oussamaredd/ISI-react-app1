import { createThresholds, maybeRunAuthenticatedPlanningFlow, pauseBetweenIterations, runReadinessProbe } from "./lib/shared.js";

export const options = {
  vus: Number(__ENV.K6_AUTH_VUS || "25"),
  duration: __ENV.K6_AUTH_DURATION || "3m",
  thresholds: createThresholds({ p95Ms: 650, p99Ms: 1200 }),
};

export default function () {
  runReadinessProbe("m10.2-auth-flow");
  maybeRunAuthenticatedPlanningFlow("m10.2-auth-flow");
  pauseBetweenIterations();
}
