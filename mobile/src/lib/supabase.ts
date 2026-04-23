import { AppState, Platform } from 'react-native';
import * as ExpoLinking from 'expo-linking';
import * as SecureStore from 'expo-secure-store';
import 'react-native-url-polyfill/auto';
import { createClient, processLock } from '@supabase/supabase-js';

const TEST_SUPABASE_URL = 'https://ecotrack.test.supabase.co';
const TEST_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_test_key';
const MOBILE_SUPABASE_STORAGE_KEY = 'ecotrack.mobile.supabase.auth';

const trimEnvValue = (value: string | undefined) => {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
};

const resolveSupabaseConfig = () => {
  const supabaseUrl = trimEnvValue(process.env.EXPO_PUBLIC_SUPABASE_URL);
  const supabasePublishableKey = trimEnvValue(process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY);

  if (supabaseUrl && supabasePublishableKey) {
    return {
      supabaseUrl,
      supabasePublishableKey,
    };
  }

  if (process.env.NODE_ENV === 'test') {
    return {
      supabaseUrl: TEST_SUPABASE_URL,
      supabasePublishableKey: TEST_SUPABASE_PUBLISHABLE_KEY,
    };
  }

  throw new Error(
    'EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY are required for mobile auth.',
  );
};

const secureStoreAdapter = {
  getItem: (key: string) => SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key),
};

const { supabaseUrl, supabasePublishableKey } = resolveSupabaseConfig();
const mobileSupabaseStorageKey =
  process.env.NODE_ENV === 'test'
    ? `ecotrack.mobile.test.auth.${Math.random().toString(36).slice(2)}`
    : MOBILE_SUPABASE_STORAGE_KEY;

export const supabase = createClient(supabaseUrl, supabasePublishableKey, {
  auth: {
    autoRefreshToken: true,
    detectSessionInUrl: false,
    flowType: 'pkce',
    lock: processLock,
    persistSession: true,
    storage: secureStoreAdapter,
    storageKey: mobileSupabaseStorageKey,
  },
});

if (Platform.OS !== 'web') {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') {
      supabase.auth.startAutoRefresh();
      return;
    }

    supabase.auth.stopAutoRefresh();
  });
}

export const buildMobileSupabaseRedirectUrl = (pathname: string) =>
  ExpoLinking.createURL(pathname.replace(/^\/+/, ''));
