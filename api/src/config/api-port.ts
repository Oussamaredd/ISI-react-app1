export const DEFAULT_API_PORT = 3001;

const normalizePortValue = (value: unknown): string | undefined => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }

  if (typeof value !== 'string') {
    return undefined;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
};

export const resolveApiPortValue = (env: Record<string, unknown>): string | undefined =>
  normalizePortValue(env.API_PORT) ?? normalizePortValue(env.PORT);

export const resolveApiPort = (env: Record<string, unknown>): number => {
  const rawPort = resolveApiPortValue(env);
  if (!rawPort) {
    return DEFAULT_API_PORT;
  }

  const parsedPort = Number(rawPort);
  return Number.isInteger(parsedPort) && parsedPort > 0 && parsedPort <= 65535
    ? parsedPort
    : DEFAULT_API_PORT;
};
