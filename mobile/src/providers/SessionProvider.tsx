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
  clearAccessToken,
  hydrateAccessToken,
  setAccessToken
} from "@api/core/tokenStore";
import { subscribeToSessionInvalidated } from "@api/core/sessionEvents";

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
    const token = await hydrateAccessToken();

    if (!token) {
      applyAnonymousState();
      return;
    }

    try {
      const status = await authApi.status();

      if (status.authenticated && status.user) {
        applyAuthenticatedState(status.user);
        return;
      }
    } catch {
      // Fall through to anonymous state and clear the invalid token.
    }

    await clearAccessToken();
    applyAnonymousState();
  }, [applyAnonymousState, applyAuthenticatedState]);

  useEffect(() => {
    void refreshSession();
  }, [refreshSession]);

  useEffect(() => {
    return subscribeToSessionInvalidated(() => {
      queryClient.clear();
      applyAnonymousState();
    });
  }, [applyAnonymousState, queryClient]);

  const signIn = useCallback(
    async ({ email, password }: { email: string; password: string }) => {
      const response = await authApi.login(email, password);
      const session = await resolveAuthSession(response);
      await setAccessToken(session.accessToken);
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
      await setAccessToken(session.accessToken);
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

    await clearAccessToken();
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
