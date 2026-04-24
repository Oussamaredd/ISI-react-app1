import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const TEST_SUPABASE_URL = 'https://ecotrack.test.supabase.co';
const TEST_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_test_key';
export const SUPABASE_BROWSER_AUTH_CONFIG_ERROR =
  'Browser auth is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY in the frontend build environment.';

const trimEnvValue = (value: string | undefined) => {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
};

const resolveSupabaseConfig = () => {
  const supabaseUrl = trimEnvValue(import.meta.env.VITE_SUPABASE_URL);
  const supabasePublishableKey = trimEnvValue(import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY);

  if (supabaseUrl && supabasePublishableKey) {
    return {
      supabaseUrl,
      supabasePublishableKey,
    };
  }

  if (import.meta.env.MODE === 'test') {
    return {
      supabaseUrl: TEST_SUPABASE_URL,
      supabasePublishableKey: TEST_SUPABASE_PUBLISHABLE_KEY,
    };
  }

  return null;
};

const normalizeBasePath = (value: string | undefined) => {
  const normalized = value?.trim() || '/';
  if (normalized === '/') {
    return '/';
  }

  return normalized.endsWith('/') ? normalized : `${normalized}/`;
};

let testStorageKeyCounter = 0;

const createTestStorageKey = () => {
  const cryptoObject = globalThis.crypto;
  if (!cryptoObject) {
    testStorageKeyCounter += 1;
    return `ecotrack.web.test.auth.${testStorageKeyCounter}`;
  }

  if (typeof cryptoObject.randomUUID === 'function') {
    return `ecotrack.web.test.auth.${cryptoObject.randomUUID()}`;
  }

  const bytes = new Uint8Array(16);
  cryptoObject.getRandomValues(bytes);

  const suffix = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
  return `ecotrack.web.test.auth.${suffix}`;
};

const createSupabaseConfigError = () => new Error(SUPABASE_BROWSER_AUTH_CONFIG_ERROR);

const createDisabledSupabaseClient = () =>
  ({
    auth: {
      exchangeCodeForSession: async () => ({
        data: { session: null, user: null },
        error: createSupabaseConfigError(),
      }),
      getSession: async () => ({
        data: { session: null },
        error: null,
      }),
      onAuthStateChange: () => ({
        data: {
          subscription: {
            id: 'ecotrack-disabled-supabase-auth',
            callback: () => undefined,
            unsubscribe: () => undefined,
          },
        },
      }),
      resetPasswordForEmail: async () => ({
        data: {},
        error: createSupabaseConfigError(),
      }),
      signInWithOAuth: async () => ({
        data: { provider: 'google', url: null },
        error: createSupabaseConfigError(),
      }),
      signInWithPassword: async () => ({
        data: { session: null, user: null },
        error: createSupabaseConfigError(),
      }),
      signOut: async () => ({ error: null }),
      signUp: async () => ({
        data: { session: null, user: null },
        error: createSupabaseConfigError(),
      }),
      updateUser: async () => ({
        data: { user: null },
        error: createSupabaseConfigError(),
      }),
    },
  }) as unknown as SupabaseClient;

const supabaseConfig = resolveSupabaseConfig();
export const isSupabaseBrowserAuthConfigured = supabaseConfig !== null;
export const getSupabaseBrowserConfigError = () =>
  isSupabaseBrowserAuthConfigured ? null : SUPABASE_BROWSER_AUTH_CONFIG_ERROR;

const supabaseStorageKey =
  import.meta.env.MODE === 'test'
    ? createTestStorageKey()
    : undefined;

export const supabase =
  supabaseConfig === null
    ? createDisabledSupabaseClient()
    : createClient(supabaseConfig.supabaseUrl, supabaseConfig.supabasePublishableKey, {
        auth: {
          detectSessionInUrl: false,
          flowType: 'pkce',
          storageKey: supabaseStorageKey,
        },
      });

export const buildSupabaseBrowserRedirectUrl = (pathname: string) => {
  if (typeof window === 'undefined') {
    return pathname;
  }

  const appBaseUrl = new URL(normalizeBasePath(import.meta.env.BASE_URL), window.location.origin);
  const targetPath = pathname.replace(/^\/+/, '');

  return new URL(targetPath, appBaseUrl).toString();
};
