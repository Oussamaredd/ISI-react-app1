import { Injectable, type NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';

import {
  normalizeMetricsPath,
  shouldIgnoreHttpMetricsPath,
} from './http-metrics.utils.js';
import { MonitoringService } from './monitoring.service.js';

@Injectable()
export class HttpMetricsMiddleware implements NestMiddleware {
  constructor(private readonly monitoringService: MonitoringService) {}

  use(request: Request, response: Response, next: NextFunction): void {
    const rawPath = request.originalUrl ?? request.url;
    if (shouldIgnoreHttpMetricsPath(rawPath)) {
      next();
      return;
    }

    const startedAt = process.hrtime.bigint();
    const method = request.method.toUpperCase();
    const path = normalizeMetricsPath(rawPath);
    let completed = false;

    this.monitoringService.recordHttpRequestStart();

    const finalize = () => {
      if (completed) {
        return;
      }

      completed = true;
      const elapsedMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;

      this.monitoringService.recordHttpRequestCompleted({
        method,
        path,
        statusCode: response.statusCode,
        durationMs: elapsedMs,
      });
    };

    response.once('finish', finalize);
    response.once('close', finalize);

    next();
  }
}
