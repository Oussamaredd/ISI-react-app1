import type { PropsWithChildren } from "react";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

import {
  authApi,
  type AuthLoginResponse,
  type AuthSession,
  type SessionUser
} from "@api/modules/auth";
import {
  clearPersistedSession,
  hydrateSessionSnapshot,
  setPersistedSessionUser,
  setSessionSnapshot
} from "@api/core/tokenStore";
import { subscribeToSessionInvalidated } from "@api/core/sessionEvents";

import { bootstrapSession } from "./sessionBootstrap";

export type AuthState = "unknown" | "authenticated" | "anonymous";

type SessionContextValue = {
  user: SessionUser | null;
  authState: AuthState;
  isAuthenticated: boolean;
  isLoading: boolean;
  signIn: (params: { email: string; password: string }) => Promise<void>;
  signUp: (params: {
    email: string;
    password: string;
    displayName?: string;
  }) => Promise<void>;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
};

const SessionContext = createContext<SessionContextValue | null>(null);

const resolveAuthSession = async (payload: AuthLoginResponse): Promise<AuthSession> => {
  if (
    "accessToken" in payload &&
    typeof payload.accessToken === "string" &&
    payload.user
  ) {
    return {
      accessToken: payload.accessToken,
      user: payload.user
    };
  }

  if (!("code" in payload)) {
    throw new Error("Auth response did not include an exchange code.");
  }

  return authApi.exchange(payload.code);
};

export function SessionProvider({ children }: PropsWithChildren) {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [authState, setAuthState] = useState<AuthState>("unknown");

  const applyAnonymousState = useCallback(() => {
    setUser(null);
    setAuthState("anonymous");
  }, []);

  const applyAuthenticatedState = useCallback((nextUser: SessionUser) => {
    setUser(nextUser);
    setAuthState("authenticated");
  }, []);

  const refreshSession = useCallback(async () => {
    setAuthState("unknown");
    const nextState = await bootstrapSession({
      hydrateSessionSnapshot,
      loadStatus: authApi.status
    });

    if (nextState.shouldClearPersistedSession) {
      await clearPersistedSession();
    }

    if (nextState.authState === "authenticated" && nextState.user) {
      if (nextState.shouldPersistUser) {
        await setPersistedSessionUser(nextState.user);
      }

      applyAuthenticatedState(nextState.user);
      return;
    }

    applyAnonymousState();
  }, [applyAnonymousState, applyAuthenticatedState]);

  useEffect(() => {
    void refreshSession();
  }, [refreshSession]);

  useEffect(() => {
    return subscribeToSessionInvalidated(() => {
      queryClient.clear();
      void clearPersistedSession();
      applyAnonymousState();
    });
  }, [applyAnonymousState, queryClient]);

  const signIn = useCallback(
    async ({ email, password }: { email: string; password: string }) => {
      const response = await authApi.login(email, password);
      const session = await resolveAuthSession(response);
      await setSessionSnapshot({
        accessToken: session.accessToken,
        user: session.user
      });
      queryClient.clear();
      applyAuthenticatedState(session.user);
    },
    [applyAuthenticatedState, queryClient]
  );

  const signUp = useCallback(
    async ({
      email,
      password,
      displayName
    }: {
      email: string;
      password: string;
      displayName?: string;
    }) => {
      const session = await authApi.signup(email, password, displayName);
      await setSessionSnapshot({
        accessToken: session.accessToken,
        user: session.user
      });
      queryClient.clear();
      applyAuthenticatedState(session.user);
    },
    [applyAuthenticatedState, queryClient]
  );

  const signOut = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      // Local logout still proceeds.
    }

    await clearPersistedSession();
    queryClient.clear();
    applyAnonymousState();
  }, [applyAnonymousState, queryClient]);

  const value = useMemo<SessionContextValue>(
    () => ({
      user,
      authState,
      isAuthenticated: authState === "authenticated",
      isLoading: authState === "unknown",
      signIn,
      signUp,
      signOut,
      refreshSession
    }),
    [authState, refreshSession, signIn, signOut, signUp, user]
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export const useSession = () => {
  const context = useContext(SessionContext);

  if (!context) {
    throw new Error("useSession must be used inside SessionProvider.");
  }

  return context;
};
