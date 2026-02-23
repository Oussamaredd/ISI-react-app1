import { randomUUID } from 'node:crypto';

import type { NextFunction, Request, Response } from 'express';

import {
  getRequestIdFromRequest,
  REQUEST_ID_HEADER,
  RESPONSE_REQUEST_ID_HEADER,
  normalizeRequestId,
} from '../request-id.js';

export function requestIdMiddleware(request: Request, response: Response, next: NextFunction): void {
  const incomingRequestId = normalizeRequestId(request.headers[REQUEST_ID_HEADER]);
  const resolvedRequestId = incomingRequestId ?? getRequestIdFromRequest(request) ?? randomUUID();

  request.requestId = resolvedRequestId;
  request.id = resolvedRequestId;
  response.setHeader(RESPONSE_REQUEST_ID_HEADER, resolvedRequestId);

  next();
}
