import { randomUUID } from 'node:crypto';

import {
  ArgumentsHost,
  Catch,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  type ExceptionFilter,
} from '@nestjs/common';
import type { Request, Response } from 'express';

import { getRequestIdFromRequest, RESPONSE_REQUEST_ID_HEADER } from '../request-id.js';

type StandardErrorBody = {
  statusCode: number;
  message: string;
  path: string;
  method: string;
  timestamp: string;
  requestId: string;
  details?: unknown;
};

@Injectable()
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const request = context.getRequest<Request>();
    const response = context.getResponse<Response>();
    const timestamp = new Date().toISOString();
    const requestId = getRequestIdFromRequest(request) ?? randomUUID();

    const normalizedError = this.normalizeException(exception);
    const body: StandardErrorBody = {
      statusCode: normalizedError.statusCode,
      message: normalizedError.message,
      path: request.originalUrl ?? request.url,
      method: request.method,
      timestamp,
      requestId,
      ...(normalizedError.details !== undefined ? { details: normalizedError.details } : {}),
    };

    response.setHeader(RESPONSE_REQUEST_ID_HEADER, requestId);
    response.status(normalizedError.statusCode).json(body);

    if (normalizedError.statusCode >= 500) {
      this.logger.error(
        `${request.method} ${request.originalUrl ?? request.url} ${normalizedError.statusCode} (${requestId})`,
        normalizedError.logStack,
      );
    }
  }

  private normalizeException(exception: unknown): {
    statusCode: number;
    message: string;
    details?: unknown;
    logStack?: string;
  } {
    if (exception instanceof HttpException) {
      const statusCode = exception.getStatus();
      const responseBody = exception.getResponse();

      if (typeof responseBody === 'string') {
        return { statusCode, message: responseBody };
      }

      if (responseBody && typeof responseBody === 'object') {
        const payload = responseBody as Record<string, unknown>;
        const payloadMessage = payload.message;
        const payloadError = payload.error;

        if (Array.isArray(payloadMessage)) {
          return {
            statusCode,
            message: statusCode === HttpStatus.BAD_REQUEST ? 'Validation failed' : 'Request failed',
            details: payloadMessage,
          };
        }

        if (typeof payloadMessage === 'string') {
          return { statusCode, message: payloadMessage };
        }

        if (typeof payloadError === 'string') {
          return { statusCode, message: payloadError };
        }
      }

      return { statusCode, message: exception.message || 'Request failed' };
    }

    const fallbackMessage =
      process.env.NODE_ENV === 'production'
        ? 'Internal server error'
        : exception instanceof Error && exception.message
          ? exception.message
          : 'Internal server error';

    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: fallbackMessage,
      logStack: exception instanceof Error ? exception.stack : undefined,
    };
  }
}
