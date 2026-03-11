export const DEFAULT_RATE_LIMIT_WINDOW_MS = 60_000;
export const DEFAULT_RATE_LIMIT_MAX_REQUESTS = 120;
export const AUTH_RATE_LIMIT_MAX_REQUESTS = 10;

export const AUTH_ABUSE_THROTTLE = {
  default: {
    limit: AUTH_RATE_LIMIT_MAX_REQUESTS,
    ttl: DEFAULT_RATE_LIMIT_WINDOW_MS,
  },
} as const;
