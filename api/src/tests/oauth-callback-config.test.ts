import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { PATH_METADATA } from '@nestjs/common/constants';
import { afterEach, describe, expect, it } from 'vitest';

import { AuthController } from '../auth/auth.controller.js';
import { getGoogleCallbackUrl } from '../auth/auth.utils.js';

const originalEnv = { ...process.env };

afterEach(() => {
  process.env = { ...originalEnv };
  delete process.env.GOOGLE_CALLBACK_URL;
  delete process.env.GOOGLE_REDIRECT_URI;
  delete process.env.GOOGLE_OAUTH_CALLBACK_URL;
  delete process.env.GOOGLE_OAUTH_REDIRECT_URI;
  delete process.env.GOOGLE_CALLBACK;
  delete process.env.API_URL;
  delete process.env.API_BASE_URL;
  delete process.env.API_HOST;
  delete process.env.API_PORT;
});

describe('OAuth callback config', () => {
  it('uses explicit GOOGLE_CALLBACK_URL when valid', () => {
    process.env.GOOGLE_CALLBACK_URL = 'http://localhost:3001/api/auth/google/callback';

    expect(getGoogleCallbackUrl()).toBe('http://localhost:3001/api/auth/google/callback');
  });

  it('rejects explicit callback URL with non-canonical path', () => {
    process.env.GOOGLE_CALLBACK_URL = 'http://localhost:3001/auth/google/callback';

    expect(() => getGoogleCallbackUrl()).toThrow(/Invalid GOOGLE_CALLBACK_URL path/i);
  });

  it('derives callback URL from API_URL when explicit callback is absent', () => {
    process.env.API_URL = 'http://localhost:3001';

    expect(getGoogleCallbackUrl()).toBe('http://localhost:3001/api/auth/google/callback');
  });

  it('derives callback URL from API_PORT and API_HOST fallback', () => {
    process.env.API_PORT = '3001';
    process.env.API_HOST = '0.0.0.0';

    expect(getGoogleCallbackUrl()).toBe('http://localhost:3001/api/auth/google/callback');
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
});