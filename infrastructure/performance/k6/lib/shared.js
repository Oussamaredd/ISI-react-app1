import http from "k6/http";
import { check, sleep } from "k6";

export const apiBaseUrl = __ENV.API_BASE_URL || "http://127.0.0.1:3001";
export const thinkTimeSeconds = Number(__ENV.K6_THINK_TIME_SECONDS || "1");
export const hasAuthScenarioCredentials =
  typeof __ENV.K6_LOGIN_EMAIL === "string" &&
  __ENV.K6_LOGIN_EMAIL.length > 0 &&
  typeof __ENV.K6_LOGIN_PASSWORD === "string" &&
  __ENV.K6_LOGIN_PASSWORD.length > 0;

export const createThresholds = ({ p95Ms = 500, p99Ms = 1000 } = {}) => ({
  http_req_failed: ["rate<0.01"],
  http_req_duration: [`p(95)<${p95Ms}`, `p(99)<${p99Ms}`],
  checks: ["rate>0.95"],
});

export const runReadinessProbe = (gate) => {
  const response = http.get(`${apiBaseUrl}/api/health/ready`, {
    tags: { gate, flow: "readiness" },
  });

  check(response, {
    "health endpoint returns 200": (res) => res.status === 200,
  });

  return response;
};

export const maybeRunAuthenticatedPlanningFlow = (gate) => {
  if (!hasAuthScenarioCredentials) {
    return { skipped: true };
  }

  const loginResponse = http.post(
    `${apiBaseUrl}/login`,
    JSON.stringify({
      email: __ENV.K6_LOGIN_EMAIL,
      password: __ENV.K6_LOGIN_PASSWORD,
    }),
    {
      headers: { "Content-Type": "application/json" },
      tags: { gate, flow: "login" },
    },
  );

  const loginOk = check(loginResponse, {
    "local login returns 201": (res) => res.status === 201,
    "local login returns access token": (res) => typeof res.json("accessToken") === "string",
  });

  if (!loginOk) {
    return { skipped: false, ok: false };
  }

  const accessToken = loginResponse.json("accessToken");
  const dashboardResponse = http.get(`${apiBaseUrl}/api/planning/dashboard`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    tags: { gate, flow: "planning-dashboard" },
  });

  check(dashboardResponse, {
    "planning dashboard returns 200": (res) => res.status === 200,
    "planning dashboard stays under 750ms": (res) => res.timings.duration < 750,
  });

  return { skipped: false, ok: true };
};

export const pauseBetweenIterations = () => {
  sleep(thinkTimeSeconds);
};
