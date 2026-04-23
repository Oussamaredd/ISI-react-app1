import { createClient } from '@supabase/supabase-js';

const TEST_SUPABASE_URL = 'https://ecotrack.test.supabase.co';
const TEST_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_test_key';

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

  throw new Error(
    'VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY are required for browser auth.',
  );
};

const normalizeBasePath = (value: string | undefined) => {
  const normalized = value?.trim() || '/';
  if (normalized === '/') {
    return '/';
  }

  return normalized.endsWith('/') ? normalized : `${normalized}/`;
};

const { supabaseUrl, supabasePublishableKey } = resolveSupabaseConfig();
const supabaseStorageKey =
  import.meta.env.MODE === 'test'
    ? `ecotrack.web.test.auth.${Math.random().toString(36).slice(2)}`
    : undefined;

export const supabase = createClient(supabaseUrl, supabasePublishableKey, {
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
