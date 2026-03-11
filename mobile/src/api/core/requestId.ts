const randomSegment = () => Math.random().toString(36).slice(2, 10);

export const createRequestId = () => {
  const cryptoApi = globalThis.crypto as { randomUUID?: () => string } | undefined;

  if (typeof cryptoApi?.randomUUID === "function") {
    return cryptoApi.randomUUID();
  }

  return `mobile-${Date.now().toString(36)}-${randomSegment()}-${randomSegment()}`;
};
