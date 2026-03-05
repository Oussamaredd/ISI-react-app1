import http from "k6/http";
import { check, sleep } from "k6";

export const options = {
  vus: 10,
  duration: "1m",
  thresholds: {
    http_req_failed: ["rate<0.01"],
    http_req_duration: ["p(95)<500"],
  },
};

const apiBaseUrl = __ENV.API_BASE_URL || "http://127.0.0.1:3001";

export default function () {
  const response = http.get(`${apiBaseUrl}/api/health/ready`, {
    tags: { gate: "m10.2-k6-smoke" },
  });

  check(response, {
    "health endpoint returns 200": (res) => res.status === 200,
  });

  sleep(1);
}
