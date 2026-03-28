import { ConsoleLogger, Logger } from '@nestjs/common';
import { afterAll, beforeAll } from 'vitest';

const CONTROLLER_ERROR_PATTERNS = [
  /^Failed to fetch audit logs\b/i,
  /^Failed to fetch audit stats\b/i,
  /^Failed to list users\b/i,
  /^Failed to fetch comments\b/i,
  /^Failed to add comment\b/i,
  /^Failed to update comment\b/i,
  /^Failed to delete comment\b/i,
  /^Failed to fetch activity\b/i,
  /^Failed to fetch tickets\b/i,
  /^Failed to fetch replayable staged ingestion events\b/i,
  /^Failed to replay staged ingestion events\b/i,
  /^Failed to fetch replayable validated-event deliveries\b/i,
  /^Failed to replay validated-event deliveries\b/i,
  /^Failed to update settings\b/i,
];
const originalConsoleError = console.error.bind(console);
const originalConsoleWarn = console.warn.bind(console);
const originalLoggerError = Logger.error.bind(Logger);
const originalConsoleLoggerError = ConsoleLogger.prototype.error.bind(ConsoleLogger.prototype);

const normalizeConsoleArgs = (args: unknown[]) =>
  args
    .map((value) => {
      if (typeof value === 'string') {
        return value;
      }

      if (value instanceof Error) {
        return value.message;
      }

      return '';
    })
    .filter(Boolean)
    .join(' ');

beforeAll(() => {
  Logger.overrideLogger(false);

  console.error = (...args: Parameters<typeof console.error>) => {
    const message = normalizeConsoleArgs(args);

    if (CONTROLLER_ERROR_PATTERNS.some((pattern) => pattern.test(message))) {
      return;
    }

    originalConsoleError(...args);
  };

  console.warn = (...args: Parameters<typeof console.warn>) => {
    const message = normalizeConsoleArgs(args);

    if (/^\[Nest\]/i.test(message)) {
      return;
    }

    originalConsoleWarn(...args);
  };

  Logger.error = ((message: unknown, ...optionalParams: unknown[]) => {
    const normalizedMessage = normalizeConsoleArgs([message, ...optionalParams]);

    if (/ExceptionsHandler/i.test(normalizedMessage) || /^\[Nest\]/i.test(normalizedMessage)) {
      return;
    }

    originalLoggerError(message as never, ...(optionalParams as never[]));
  }) as typeof Logger.error;

  ConsoleLogger.prototype.error = function patchedConsoleLoggerError(
    message: unknown,
    ...optionalParams: unknown[]
  ) {
    const normalizedMessage = normalizeConsoleArgs([message, ...optionalParams]);

    if (/ExceptionsHandler/i.test(normalizedMessage) || /^\[Nest\]/i.test(normalizedMessage)) {
      return;
    }

    return originalConsoleLoggerError.call(this, message as never, ...(optionalParams as never[]));
  };
});

afterAll(() => {
  console.error = originalConsoleError;
  console.warn = originalConsoleWarn;
  Logger.error = originalLoggerError as typeof Logger.error;
  ConsoleLogger.prototype.error = originalConsoleLoggerError;
  Logger.overrideLogger(false);
});
