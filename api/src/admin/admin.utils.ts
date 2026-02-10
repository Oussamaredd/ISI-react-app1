import type { Request } from 'express';

export const getRequestMetadata = (req: Request) => {
  const rawUserAgent = req.headers['user-agent'];
  const userAgent = Array.isArray(rawUserAgent) ? rawUserAgent.join(', ') : rawUserAgent;

  return {
    ipAddress: req.ip ?? null,
    userAgent: userAgent ?? null,
  };
};
