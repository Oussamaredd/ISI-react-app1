import type { Session } from "@supabase/supabase-js";

import type { PersistedSessionSnapshot } from "@api/core/tokenStore";
import type { SessionUser } from "@api/modules/auth";

import type { AuthState } from "./SessionProvider";

type SessionBootstrapDeps = {
  hydrateSessionSnapshot: () => Promise<PersistedSessionSnapshot>;
  loadSession: () => Promise<{ data: { session: Session | null }; error: Error | null }>;
  resolveSessionUser: (session: Session | null) => SessionUser | null;
};

export type SessionBootstrapResult = {
  authState: AuthState;
  accessToken: string | null;
  user: SessionUser | null;
  shouldClearPersistedSession: boolean;
};

export const bootstrapSession = async ({
  hydrateSessionSnapshot,
  loadSession,
  resolveSessionUser,
}: SessionBootstrapDeps): Promise<SessionBootstrapResult> => {
  const persistedSession = await hydrateSessionSnapshot();

  try {
    const { data, error } = await loadSession();
    if (error) {
      throw error;
    }

    const accessToken = data.session?.access_token?.trim() ?? null;
    const user = resolveSessionUser(data.session);

    if (accessToken && user) {
      return {
        authState: "authenticated",
        accessToken,
        user,
        shouldClearPersistedSession: false
      };
    }

    return {
      authState: "anonymous",
      accessToken: null,
      user: null,
      shouldClearPersistedSession: Boolean(persistedSession.accessToken || persistedSession.user)
    };
  } catch {
    if (persistedSession.accessToken && persistedSession.user) {
      return {
        authState: "authenticated",
        accessToken: persistedSession.accessToken,
        user: persistedSession.user,
        shouldClearPersistedSession: false
      };
    }

    return {
      authState: "anonymous",
      accessToken: null,
      user: null,
      shouldClearPersistedSession: false
    };
  }
};
