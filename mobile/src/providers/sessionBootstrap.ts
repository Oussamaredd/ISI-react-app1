import { ApiRequestError } from "@api/core/http";
import type { AuthStatusResponse, SessionUser } from "@api/modules/auth";
import type { PersistedSessionSnapshot } from "@api/core/tokenStore";

import type { AuthState } from "./SessionProvider";

type SessionBootstrapDeps = {
  hydrateSessionSnapshot: () => Promise<PersistedSessionSnapshot>;
  loadStatus: () => Promise<AuthStatusResponse>;
};

export type SessionBootstrapResult = {
  authState: AuthState;
  user: SessionUser | null;
  shouldPersistUser: boolean;
  shouldClearPersistedSession: boolean;
};

export const bootstrapSession = async ({
  hydrateSessionSnapshot,
  loadStatus
}: SessionBootstrapDeps): Promise<SessionBootstrapResult> => {
  const persistedSession = await hydrateSessionSnapshot();

  if (!persistedSession.accessToken) {
    return {
      authState: "anonymous",
      user: null,
      shouldPersistUser: false,
      shouldClearPersistedSession: persistedSession.user !== null
    };
  }

  try {
    const status = await loadStatus();

    if (status.authenticated && status.user) {
      return {
        authState: "authenticated",
        user: status.user,
        shouldPersistUser: true,
        shouldClearPersistedSession: false
      };
    }

    return {
      authState: "anonymous",
      user: null,
      shouldPersistUser: false,
      shouldClearPersistedSession: true
    };
  } catch (error) {
    if (error instanceof ApiRequestError && error.status === 401) {
      return {
        authState: "anonymous",
        user: null,
        shouldPersistUser: false,
        shouldClearPersistedSession: true
      };
    }

    if (persistedSession.user) {
      return {
        authState: "authenticated",
        user: persistedSession.user,
        shouldPersistUser: false,
        shouldClearPersistedSession: false
      };
    }

    return {
      authState: "anonymous",
      user: null,
      shouldPersistUser: false,
      shouldClearPersistedSession: false
    };
  }
};
