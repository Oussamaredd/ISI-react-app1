import type { SessionRole, SessionUser } from "@api/modules/auth";

const ACCESS_TOKEN_STORAGE_KEY = "ecotrack.mobile.access-token";
const SESSION_USER_STORAGE_KEY = "ecotrack.mobile.session-user";

let accessTokenCache: string | null = null;
let sessionUserCache: SessionUser | null = null;
let storageHydrated = false;

const loadSecureStore = async () => import("expo-secure-store");

export type PersistedSessionSnapshot = {
  accessToken: string | null;
  user: SessionUser | null;
};

const isSessionRole = (value: unknown): value is SessionRole => {
  if (!value || typeof value !== "object") {
    return false;
  }

  const role = value as Partial<SessionRole>;
  return typeof role.id === "string" && typeof role.name === "string";
};

const isSessionUser = (value: unknown): value is SessionUser => {
  if (!value || typeof value !== "object") {
    return false;
  }

  const user = value as Partial<SessionUser>;
  return (
    typeof user.id === "string" &&
    typeof user.email === "string" &&
    typeof user.displayName === "string" &&
    (typeof user.avatarUrl === "string" || user.avatarUrl === null) &&
    typeof user.role === "string" &&
    Array.isArray(user.roles) &&
    user.roles.every(isSessionRole) &&
    typeof user.isActive === "boolean" &&
    (user.provider === "local" || user.provider === "google")
  );
};

const parseStoredSessionUser = (value?: string | null) => {
  if (!value || value.trim().length === 0) {
    return null;
  }

  try {
    const parsed = JSON.parse(value) as unknown;
    return isSessionUser(parsed) ? parsed : null;
  } catch {
    return null;
  }
};

const persistSessionSnapshot = async () => {
  try {
    const secureStore = await loadSecureStore();
    const writes: Promise<void>[] = [];

    if (accessTokenCache) {
      writes.push(secureStore.setItemAsync(ACCESS_TOKEN_STORAGE_KEY, accessTokenCache));
    } else {
      writes.push(secureStore.deleteItemAsync(ACCESS_TOKEN_STORAGE_KEY));
    }

    if (sessionUserCache) {
      writes.push(
        secureStore.setItemAsync(SESSION_USER_STORAGE_KEY, JSON.stringify(sessionUserCache))
      );
    } else {
      writes.push(secureStore.deleteItemAsync(SESSION_USER_STORAGE_KEY));
    }

    await Promise.all(writes);
  } catch {
    // Ignore storage failures so the in-memory session still works.
  }
};

export const hydrateSessionSnapshot = async (): Promise<PersistedSessionSnapshot> => {
  if (storageHydrated) {
    return {
      accessToken: accessTokenCache,
      user: sessionUserCache
    };
  }

  try {
    const secureStore = await loadSecureStore();
    const [storedAccessToken, storedSessionUser] = await Promise.all([
      secureStore.getItemAsync(ACCESS_TOKEN_STORAGE_KEY),
      secureStore.getItemAsync(SESSION_USER_STORAGE_KEY)
    ]);

    accessTokenCache = storedAccessToken?.trim() || null;
    sessionUserCache = parseStoredSessionUser(storedSessionUser);
  } catch {
    accessTokenCache = null;
    sessionUserCache = null;
  }

  storageHydrated = true;

  return {
    accessToken: accessTokenCache,
    user: sessionUserCache
  };
};

export const hydrateAccessToken = async () => {
  const snapshot = await hydrateSessionSnapshot();
  return snapshot.accessToken;
};

export const getCachedAccessToken = () => accessTokenCache;
export const getCachedSessionUser = () => sessionUserCache;

export const setPersistedSessionUser = async (user: SessionUser | null) => {
  sessionUserCache = user;
  storageHydrated = true;
  await persistSessionSnapshot();
};

export const setSessionSnapshot = async ({
  accessToken,
  user
}: {
  accessToken: string;
  user: SessionUser;
}) => {
  const normalizedToken = accessToken.trim();
  accessTokenCache = normalizedToken.length > 0 ? normalizedToken : null;
  sessionUserCache = accessTokenCache ? user : null;
  storageHydrated = true;

  await persistSessionSnapshot();
};

export const setAccessToken = async (token: string) => {
  const normalizedToken = token.trim();
  accessTokenCache = normalizedToken.length > 0 ? normalizedToken : null;
  storageHydrated = true;
  await persistSessionSnapshot();
};

export const clearPersistedSession = async () => {
  accessTokenCache = null;
  sessionUserCache = null;
  storageHydrated = true;
  await persistSessionSnapshot();
};

export const clearAccessToken = async () => {
  accessTokenCache = null;
  storageHydrated = true;
  await persistSessionSnapshot();
};

export const resetAccessTokenStoreForTests = () => {
  accessTokenCache = null;
  sessionUserCache = null;
  storageHydrated = false;
};

export const primeAccessTokenCacheForTests = (token: string | null) => {
  accessTokenCache = token;
  storageHydrated = true;
};

export const primeSessionUserCacheForTests = (user: SessionUser | null) => {
  sessionUserCache = user;
  storageHydrated = true;
};
