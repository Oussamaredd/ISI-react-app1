import type { AuthChangeEvent, Session, User } from '@supabase/supabase-js';

import { supabase, buildMobileSupabaseRedirectUrl } from '@/lib/supabase';

import { apiClient } from '@api/core/http';
import { clearPersistedSession, setAccessToken } from '@api/core/tokenStore';

export type SessionRole = {
  id: string;
  name: string;
};

export type SessionUser = {
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  role: string;
  roles: SessionRole[];
  isActive: boolean;
  provider: 'local' | 'google';
};

export type AuthSession = {
  accessToken: string;
  user: SessionUser;
};

export type ForgotPasswordResponse = {
  success?: boolean;
} | null;

export type AuthStatusResponse = {
  authenticated: boolean;
  user?: SessionUser;
};

export type ResetPasswordParams = {
  password: string;
  code?: string | null;
  token?: string | null;
};

const DEFAULT_ROLE = 'citizen';

const createSupabaseError = (error: unknown, fallback: string) =>
  new Error(error instanceof Error && error.message.trim().length > 0 ? error.message : fallback);

const normalizeMetadataString = (value: unknown) =>
  typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;

const normalizeMetadataBoolean = (value: unknown, fallback: boolean) =>
  typeof value === 'boolean' ? value : fallback;

const resolveSupabaseUserMetadata = (user: User | null | undefined) =>
  (user?.user_metadata && typeof user.user_metadata === 'object'
    ? user.user_metadata
    : {}) as Record<string, unknown>;

const resolveSupabaseAppMetadata = (user: User | null | undefined) =>
  (user?.app_metadata && typeof user.app_metadata === 'object'
    ? user.app_metadata
    : {}) as Record<string, unknown>;

const resolveRoleEntries = (...sources: unknown[]) => {
  const entries: SessionRole[] = [];
  const seenRoleNames = new Set<string>();

  for (const source of sources) {
    if (!Array.isArray(source)) {
      continue;
    }

    for (const entry of source) {
      if (typeof entry === 'string' && entry.trim().length > 0) {
        const roleName = entry.trim();
        const dedupeKey = roleName.toLowerCase();
        if (seenRoleNames.has(dedupeKey)) {
          continue;
        }

        seenRoleNames.add(dedupeKey);
        entries.push({
          id: `role:${dedupeKey}`,
          name: roleName,
        });
        continue;
      }

      if (!entry || typeof entry !== 'object') {
        continue;
      }

      const roleName = normalizeMetadataString((entry as Record<string, unknown>).name);
      if (!roleName) {
        continue;
      }

      const dedupeKey = roleName.toLowerCase();
      if (seenRoleNames.has(dedupeKey)) {
        continue;
      }

      seenRoleNames.add(dedupeKey);
      entries.push({
        id:
          normalizeMetadataString((entry as Record<string, unknown>).id) ??
          `role:${dedupeKey}`,
        name: roleName,
      });
    }
  }

  return entries;
};

const resolveSupabaseProvider = (user: User | null | undefined): SessionUser['provider'] => {
  const appMetadata = resolveSupabaseAppMetadata(user);
  const providerCandidates = [
    appMetadata.provider,
    ...(Array.isArray(appMetadata.providers) ? appMetadata.providers : []),
    ...(Array.isArray(user?.identities) ? user.identities.map((identity) => identity?.provider) : []),
  ];

  return providerCandidates.some((provider) => provider === 'google') ? 'google' : 'local';
};

const resolveSupabaseDisplayName = (user: User | null | undefined) => {
  const userMetadata = resolveSupabaseUserMetadata(user);
  const candidates = [
    userMetadata.display_name,
    userMetadata.full_name,
    userMetadata.name,
    user?.email?.split('@')[0],
  ];

  for (const candidate of candidates) {
    const normalized = normalizeMetadataString(candidate);
    if (normalized) {
      return normalized;
    }
  }

  return 'EcoTrack User';
};

const resolveLegacyUserId = (user: User | null | undefined) => {
  const userMetadata = resolveSupabaseUserMetadata(user);
  const appMetadata = resolveSupabaseAppMetadata(user);

  return (
    normalizeMetadataString(userMetadata.legacy_user_id) ??
    normalizeMetadataString(appMetadata.legacy_user_id)
  );
};

export const resolveSupabaseSessionUser = (session: Session | null): SessionUser | null => {
  const supabaseUser = session?.user ?? null;
  const email = normalizeMetadataString(supabaseUser?.email);
  if (!supabaseUser || !email) {
    return null;
  }

  const userMetadata = resolveSupabaseUserMetadata(supabaseUser);
  const appMetadata = resolveSupabaseAppMetadata(supabaseUser);
  const role =
    normalizeMetadataString(userMetadata.role) ??
    normalizeMetadataString(appMetadata.role) ??
    DEFAULT_ROLE;
  const roles = resolveRoleEntries(userMetadata.roles, appMetadata.roles);

  return {
    id: resolveLegacyUserId(supabaseUser) ?? supabaseUser.id,
    email,
    displayName: resolveSupabaseDisplayName(supabaseUser),
    avatarUrl:
      normalizeMetadataString(userMetadata.avatar_url) ??
      normalizeMetadataString(userMetadata.picture),
    role,
    roles:
      roles.length > 0
        ? roles
        : [
            {
              id: `role:${role.toLowerCase()}`,
              name: role,
            },
          ],
    isActive: normalizeMetadataBoolean(userMetadata.is_active ?? appMetadata.is_active, true),
    provider: resolveSupabaseProvider(supabaseUser),
  };
};

const resolveAuthenticatedSession = async (
  missingSessionMessage = 'Unable to establish your EcoTrack session.',
): Promise<AuthSession> => {
  const { data, error } = await supabase.auth.getSession();

  if (error) {
    throw createSupabaseError(error, 'Unable to read the current Supabase session.');
  }

  const accessToken = data.session?.access_token?.trim() ?? '';
  if (!accessToken) {
    throw new Error(missingSessionMessage);
  }

  const user = resolveSupabaseSessionUser(data.session ?? null);
  if (!user) {
    throw new Error('Unable to resolve your EcoTrack session user.');
  }

  await setAccessToken(accessToken);
  return {
    accessToken,
    user,
  };
};

export const authApi = {
  signup: async (email: string, password: string, displayName?: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          display_name: displayName ?? null,
          full_name: displayName ?? null,
          is_active: true,
          name: displayName ?? null,
          role: DEFAULT_ROLE,
          roles: [
            {
              id: `role:${DEFAULT_ROLE}`,
              name: DEFAULT_ROLE,
            },
          ],
        },
      },
    });

    if (error) {
      throw createSupabaseError(error, 'Unable to create your EcoTrack account.');
    }

    return resolveAuthenticatedSession(
      'Account created. Check your email to finish confirming the sign-in flow.',
    );
  },

  login: async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      throw createSupabaseError(error, 'Unable to sign in.');
    }

    return resolveAuthenticatedSession();
  },

  exchange: async (code: string) => {
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      throw createSupabaseError(error, 'Unable to complete sign-in.');
    }

    return resolveAuthenticatedSession();
  },

  getSession: () => supabase.auth.getSession(),

  onAuthStateChange: (callback: (event: AuthChangeEvent, sessionAccessToken: string | null) => void) =>
    supabase.auth.onAuthStateChange((event, session) => {
      callback(event, session?.access_token ?? null);
    }),

  resolveSessionUser: resolveSupabaseSessionUser,

  status: () => apiClient.get<AuthStatusResponse>('/api/auth/status'),

  me: () => apiClient.get<{ user: SessionUser }>('/api/me'),

  forgotPassword: async (email: string): Promise<ForgotPasswordResponse> => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: buildMobileSupabaseRedirectUrl('/reset-password'),
    });

    if (error) {
      throw createSupabaseError(error, 'Unable to process your password reset request.');
    }

    return { success: true };
  },

  resetPassword: async ({ code, password, token }: ResetPasswordParams) => {
    if (code && code.trim().length > 0) {
      const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code.trim());
      if (exchangeError) {
        throw createSupabaseError(exchangeError, 'Unable to verify your password reset link.');
      }

      const { error: updateError } = await supabase.auth.updateUser({
        password,
      });

      if (updateError) {
        throw createSupabaseError(updateError, 'Unable to reset your password.');
      }

      const { data } = await supabase.auth.getSession();
      const accessToken = data.session?.access_token?.trim();
      if (accessToken) {
        await setAccessToken(accessToken);
      }

      return { success: true };
    }

    if (token && token.trim().length > 0) {
      return apiClient.post<{ success: boolean }>('/api/reset-password', { token, password });
    }

    throw new Error('Missing password reset code. Open the reset link again and retry.');
  },

  logout: async () => {
    try {
      await supabase.auth.signOut();
    } finally {
      await clearPersistedSession();
    }
  },
};
