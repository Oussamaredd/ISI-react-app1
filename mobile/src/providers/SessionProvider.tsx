import type { PropsWithChildren } from "react";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

import {
  authApi,
  type SessionUser
} from "@api/modules/auth";
import {
  clearPersistedSession,
  hydrateSessionSnapshot,
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
      loadSession: authApi.getSession,
      resolveSessionUser: authApi.resolveSessionUser
    });

    if (nextState.shouldClearPersistedSession) {
      await clearPersistedSession();
    }

    if (nextState.authState === "authenticated" && nextState.user && nextState.accessToken) {
      await setSessionSnapshot({
        accessToken: nextState.accessToken,
        user: nextState.user
      });
      applyAuthenticatedState(nextState.user);
      return;
    }

    applyAnonymousState();
  }, [applyAnonymousState, applyAuthenticatedState]);

  useEffect(() => {
    void refreshSession();
  }, [refreshSession]);

  useEffect(() => {
    const {
      data: { subscription }
    } = authApi.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        queryClient.clear();
        void clearPersistedSession();
        applyAnonymousState();
        return;
      }

      void (async () => {
        queryClient.clear();
        await refreshSession();
      })();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [applyAnonymousState, queryClient, refreshSession]);

  useEffect(() => {
    return subscribeToSessionInvalidated(() => {
      queryClient.clear();
      void authApi.logout().catch(() => undefined);
      applyAnonymousState();
    });
  }, [applyAnonymousState, queryClient]);

  const signIn = useCallback(
    async ({ email, password }: { email: string; password: string }) => {
      const session = await authApi.login(email, password);
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
