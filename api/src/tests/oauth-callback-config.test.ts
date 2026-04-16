import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { PATH_METADATA } from '@nestjs/common/constants';
import { afterEach, describe, expect, it } from 'vitest';

import { validateEnv } from '../config/validation.js';
import { AuthController } from '../modules/auth/auth.controller.js';
import { getGoogleCallbackUrl } from '../modules/auth/auth.utils.js';

const originalEnv = { ...process.env };

afterEach(() => {
  process.env = { ...originalEnv };
  delete process.env.GOOGLE_CALLBACK_URL;
  delete process.env.GOOGLE_REDIRECT_URI;
  delete process.env.GOOGLE_OAUTH_CALLBACK_URL;
  delete process.env.GOOGLE_OAUTH_REDIRECT_URI;
  delete process.env.GOOGLE_CALLBACK;
  delete process.env.API_BASE_URL;
  delete process.env.API_HOST;
  delete process.env.API_PORT;
  delete process.env.PORT;
});

describe('OAuth callback config', () => {
  it('uses explicit GOOGLE_CALLBACK_URL when valid', () => {
    process.env.GOOGLE_CALLBACK_URL = 'http://localhost:5173/api/auth/google/callback';

    expect(getGoogleCallbackUrl()).toBe('http://localhost:5173/api/auth/google/callback');
  });

  it('rejects explicit callback URL with non-canonical path', () => {
    process.env.GOOGLE_CALLBACK_URL = 'http://localhost:5173/auth/google/callback';

    expect(() => getGoogleCallbackUrl()).toThrow(/Invalid GOOGLE_CALLBACK_URL path/i);
  });

  it('derives callback URL from API_BASE_URL when explicit callback is absent', () => {
    process.env.API_BASE_URL = 'http://localhost:5173';

    expect(getGoogleCallbackUrl()).toBe('http://localhost:5173/api/auth/google/callback');
  });

  it('derives callback URL from API_PORT and API_HOST fallback', () => {
    process.env.API_PORT = '3001';
    process.env.API_HOST = '0.0.0.0';

    expect(getGoogleCallbackUrl()).toBe('http://localhost:3001/api/auth/google/callback');
  });

  it('derives callback URL from PORT when API_PORT is absent', () => {
    process.env.PORT = '10000';
    process.env.API_HOST = '0.0.0.0';

    expect(getGoogleCallbackUrl()).toBe('http://localhost:10000/api/auth/google/callback');
  });

  it('composes callback route to /api/auth/google/callback with global prefix', () => {
    const controllerPath = Reflect.getMetadata(PATH_METADATA, AuthController);
    const callbackPath = Reflect.getMetadata(PATH_METADATA, AuthController.prototype.googleAuthCallback);

    const fullPath = `/${'api'}/${controllerPath}/${callbackPath}`.replace(/\/+/g, '/');
    expect(fullPath).toBe('/api/auth/google/callback');
  });

  it('bootstrap sets global API prefix to api', () => {
    const testDir = path.dirname(fileURLToPath(import.meta.url));
    const mainPath = path.resolve(testDir, '../main.ts');
    const mainSource = fs.readFileSync(mainPath, 'utf8');

    expect(mainSource).toContain("app.setGlobalPrefix('api')");
  });

  it('bootstrap trusts the immediate frontend edge proxy', () => {
    const testDir = path.dirname(fileURLToPath(import.meta.url));
    const mainPath = path.resolve(testDir, '../main.ts');
    const mainSource = fs.readFileSync(mainPath, 'utf8');

    expect(mainSource).toContain("expressApp.set('trust proxy', 1)");
  });

  it('accepts canonical GOOGLE_CLIENT_ID format', () => {
    expect(() =>
      validateEnv({
        NODE_ENV: 'development',
        API_PORT: '3001',
        DATABASE_URL: 'postgres://postgres:postgres@localhost:5432/ticketdb',
        GOOGLE_CLIENT_ID: '1234567890-abcdefghi12345.apps.googleusercontent.com',
      }),
    ).not.toThrow();
  });

  it('rejects malformed GOOGLE_CLIENT_ID format', () => {
    expect(() =>
      validateEnv({
        NODE_ENV: 'development',
        API_PORT: '3001',
        DATABASE_URL: 'postgres://postgres:postgres@localhost:5432/ticketdb',
        GOOGLE_CLIENT_ID: '6oja0hr6gfulaqsdpkq8qf50qccipmgj.apps.googleusercontent.com',
      }),
    ).toThrow(/Invalid GOOGLE_CLIENT_ID format/i);
  });

  it('rejects wildcard CORS origins', () => {
    expect(() =>
      validateEnv({
        NODE_ENV: 'development',
        API_PORT: '3001',
        DATABASE_URL: 'postgres://postgres:postgres@localhost:5432/ticketdb',
        CORS_ORIGINS: '*',
      }),
    ).toThrow(/wildcard/i);
  });

  it('rejects production CORS origins that are not https', () => {
    expect(() =>
      validateEnv({
        NODE_ENV: 'production',
        API_PORT: '3001',
        DATABASE_URL: 'postgres://postgres:postgres@localhost:5432/ticketdb',
        CORS_ORIGINS: 'http://staging.ecotrack.example.com',
      }),
    ).toThrow(/must use https/i);
  });

  it('requires APP_URL origin to be listed in CORS_ORIGINS', () => {
    expect(() =>
      validateEnv({
        NODE_ENV: 'development',
        API_PORT: '3001',
        DATABASE_URL: 'postgres://postgres:postgres@localhost:5432/ticketdb',
        APP_URL: 'https://app.ecotrack.example.com',
        CORS_ORIGINS: 'https://staging.ecotrack.example.com',
      }),
    ).toThrow(/APP_URL origin/i);
  });

  it('accepts APP_URL origin when listed in CORS_ORIGINS', () => {
    expect(() =>
      validateEnv({
        NODE_ENV: 'development',
        API_PORT: '3001',
        DATABASE_URL: 'postgres://postgres:postgres@localhost:5432/ticketdb',
        APP_URL: 'https://app.ecotrack.example.com',
        CORS_ORIGINS: 'https://app.ecotrack.example.com',
      }),
    ).not.toThrow();
  });

  it('accepts localhost callback URL when it matches API_BASE_URL', () => {
    expect(() =>
      validateEnv({
        NODE_ENV: 'development',
        API_PORT: '3001',
        API_BASE_URL: 'http://localhost:5173',
        DATABASE_URL: 'postgres://postgres:postgres@localhost:5432/ticketdb',
        GOOGLE_CALLBACK_URL: 'http://localhost:5173/api/auth/google/callback',
      }),
    ).not.toThrow();
  });

  it('accepts localhost callback URL when PORT is present and API_PORT is absent', () => {
    expect(() =>
      validateEnv({
        NODE_ENV: 'development',
        PORT: '3001',
        DATABASE_URL: 'postgres://postgres:postgres@localhost:5432/ticketdb',
        GOOGLE_CALLBACK_URL: 'http://localhost:3001/api/auth/google/callback',
      }),
    ).not.toThrow();
  });

  it('rejects localhost callback URL when it does not match API_BASE_URL', () => {
    expect(() =>
      validateEnv({
        NODE_ENV: 'development',
        API_PORT: '3001',
        API_BASE_URL: 'http://localhost:5173',
        DATABASE_URL: 'postgres://postgres:postgres@localhost:5432/ticketdb',
        GOOGLE_CALLBACK_URL: 'http://localhost:3001/api/auth/google/callback',
      }),
    ).toThrow(/API_BASE_URL/i);
  });
});

