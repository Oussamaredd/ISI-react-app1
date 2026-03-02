import { describe, expect, it } from 'vitest';

import { resolveCorsOrigins } from '../config/cors-origins.js';

describe('resolveCorsOrigins', () => {
  it('parses and normalizes comma-separated origins', () => {
    expect(
      resolveCorsOrigins({
        corsOrigins: 'http://localhost:5173, https://staging.ecotrack.example.com/',
        nodeEnv: 'development',
      }),
    ).toEqual(['http://localhost:5173', 'https://staging.ecotrack.example.com']);
  });

  it('rejects wildcard origins', () => {
    expect(() => resolveCorsOrigins({ corsOrigins: '*', nodeEnv: 'development' })).toThrow(
      /wildcard/i,
    );
  });

  it('rejects origins that include path segments', () => {
    expect(() =>
      resolveCorsOrigins({
        corsOrigins: 'https://app.ecotrack.example.com/dashboard',
        nodeEnv: 'development',
      }),
    ).toThrow(/path segments/i);
  });

  it('requires explicit origins in production', () => {
    expect(() =>
      resolveCorsOrigins({
        corsOrigins: undefined,
        clientOrigin: undefined,
        nodeEnv: 'production',
      }),
    ).toThrow(/must be explicitly configured in production/i);
  });

  it('requires https origins in production for non-localhost hosts', () => {
    expect(() =>
      resolveCorsOrigins({
        corsOrigins: 'http://app.ecotrack.example.com',
        nodeEnv: 'production',
      }),
    ).toThrow(/must use https/i);
  });

  it('allows localhost http origins in production for controlled local runs', () => {
    expect(
      resolveCorsOrigins({
        corsOrigins: 'http://localhost:5173,http://127.0.0.1:5173',
        nodeEnv: 'production',
      }),
    ).toEqual(['http://localhost:5173', 'http://127.0.0.1:5173']);
  });

  it('falls back to localhost origin outside production', () => {
    expect(resolveCorsOrigins({ nodeEnv: 'test' })).toEqual(['http://localhost:5173']);
  });
});
