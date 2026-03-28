import { describe, expect, it } from 'vitest';

import { validateEnv } from '../config/validation.js';

describe('validateEnv branches', () => {
  it('accepts localhost callback URLs when the port matches API_PORT and no API_BASE_URL is set', () => {
    expect(() =>
      validateEnv({
        NODE_ENV: 'development',
        API_PORT: '3001',
        DATABASE_URL: 'postgres://postgres:postgres@localhost:5432/ticketdb',
        GOOGLE_CALLBACK_URL: 'http://localhost:3001/api/auth/google/callback',
        CORS_ORIGINS: 'http://localhost:3001',
      }),
    ).not.toThrow();
  });

  it('rejects localhost callback URLs when the port does not match API_PORT', () => {
    expect(() =>
      validateEnv({
        NODE_ENV: 'development',
        API_PORT: '3001',
        DATABASE_URL: 'postgres://postgres:postgres@localhost:5432/ticketdb',
        GOOGLE_CALLBACK_URL: 'http://localhost:9999/api/auth/google/callback',
        CORS_ORIGINS: 'http://localhost:3001',
      }),
    ).toThrow(/must match API_PORT/i);
  });

  it('requires APP_BASE_URL origin to be listed in CORS_ORIGINS', () => {
    expect(() =>
      validateEnv({
        NODE_ENV: 'development',
        API_PORT: '3001',
        DATABASE_URL: 'postgres://postgres:postgres@localhost:5432/ticketdb',
        APP_BASE_URL: 'https://mobile.ecotrack.example.com/app',
        CORS_ORIGINS: 'https://app.ecotrack.example.com',
      }),
    ).toThrow(/APP_BASE_URL origin/i);
  });

  it('accepts APP_BASE_URL when its origin is present in CORS_ORIGINS', () => {
    expect(() =>
      validateEnv({
        NODE_ENV: 'development',
        API_PORT: '3001',
        DATABASE_URL: 'postgres://postgres:postgres@localhost:5432/ticketdb',
        APP_BASE_URL: 'https://mobile.ecotrack.example.com/app',
        CORS_ORIGINS: 'https://mobile.ecotrack.example.com',
      }),
    ).not.toThrow();
  });
});
