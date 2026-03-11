const ACCESS_TOKEN_STORAGE_KEY = "ecotrack.mobile.access-token";

let accessTokenCache: string | null = null;
let storageHydrated = false;

const loadSecureStore = async () => import("expo-secure-store");

export const hydrateAccessToken = async () => {
  if (storageHydrated) {
    return accessTokenCache;
  }

  try {
    const secureStore = await loadSecureStore();
    accessTokenCache =
      (await secureStore.getItemAsync(ACCESS_TOKEN_STORAGE_KEY))?.trim() || null;
  } catch {
    accessTokenCache = null;
  }

  storageHydrated = true;
  return accessTokenCache;
};

export const getCachedAccessToken = () => accessTokenCache;

export const setAccessToken = async (token: string) => {
  const normalizedToken = token.trim();
  accessTokenCache = normalizedToken.length > 0 ? normalizedToken : null;
  storageHydrated = true;

  try {
    const secureStore = await loadSecureStore();

    if (accessTokenCache) {
      await secureStore.setItemAsync(ACCESS_TOKEN_STORAGE_KEY, accessTokenCache);
    } else {
      await secureStore.deleteItemAsync(ACCESS_TOKEN_STORAGE_KEY);
    }
  } catch {
    // Ignore storage failures so the in-memory session still works.
  }
};

export const clearAccessToken = async () => {
  accessTokenCache = null;
  storageHydrated = true;

  try {
    const secureStore = await loadSecureStore();
    await secureStore.deleteItemAsync(ACCESS_TOKEN_STORAGE_KEY);
  } catch {
    // Ignore storage failures during best-effort logout.
  }
};

export const resetAccessTokenStoreForTests = () => {
  accessTokenCache = null;
  storageHydrated = false;
};

export const primeAccessTokenCacheForTests = (token: string | null) => {
  accessTokenCache = token;
  storageHydrated = true;
};
