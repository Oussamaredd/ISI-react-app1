import {
  ApiRequestError,
  authorizedFetch,
  invalidateClientSession,
  parseJsonResponse,
} from './api';

type AuthUser = {
  id: string;
  email: string;
  displayName: string;
  name?: string | null;
  avatarUrl: string | null;
  role: string;
  roles: Array<{ id: string; name: string }>;
  isActive: boolean;
  provider: 'local' | 'google';
};

type AuthSuccess = {
  accessToken: string;
  user: AuthUser;
};

type AuthCodeResponse = {
  code: string;
  accessToken?: string;
  user?: AuthUser;
};

const resolveAuthRequestPath = (path: string) => (path.startsWith('/api') ? path : `/api${path}`);

const resolveAuthErrorMessage = (payload: unknown, status: number) => {
  if (payload && typeof payload === 'object' && 'message' in payload) {
    const message = (payload as { message?: unknown }).message;
    if (typeof message === 'string' && message.trim().length > 0) {
      return message;
    }
  }

  return `HTTP ${status}`;
};

async function authRequest(
  path: string,
  init: RequestInit = {},
  options: { invalidateSessionOnUnauthorized?: boolean } = {},
) {
  const response = await authorizedFetch(resolveAuthRequestPath(path), init);
  const payload = await parseJsonResponse(response);

  if (!response.ok) {
    if (response.status === 401 && options.invalidateSessionOnUnauthorized) {
      invalidateClientSession();
    }

    throw new ApiRequestError(
      resolveAuthErrorMessage(payload, response.status),
      response.status,
      payload,
    );
  }

  return payload;
}

export const authApi = {
  signup: (email: string, password: string, displayName?: string) =>
    authRequest('/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, ...(displayName ? { displayName } : {}) }),
    }) as Promise<AuthSuccess>,

  login: (email: string, password: string) =>
    authRequest('/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    }) as Promise<AuthCodeResponse>,

  exchange: (code: string) =>
    authRequest('/auth/exchange', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    }) as Promise<AuthSuccess>,

  logout: () =>
    authRequest('/logout', {
      method: 'POST',
    }),

  me: () =>
    authRequest('/me', {}, { invalidateSessionOnUnauthorized: true }) as Promise<{ user: AuthUser }>,

  updateProfile: (displayName: string, avatarUrl?: string | null) =>
    authRequest('/me', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        displayName,
        ...(avatarUrl !== undefined ? { avatarUrl } : {}),
      }),
    }, { invalidateSessionOnUnauthorized: true }) as Promise<{ user: AuthUser }>,

  changePassword: (currentPassword: string, newPassword: string) =>
    authRequest('/me/password', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentPassword, newPassword }),
    }, { invalidateSessionOnUnauthorized: true }) as Promise<{ success: boolean }>,

  forgotPassword: (email: string) =>
    authRequest('/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    }) as Promise<{ devResetUrl?: string; success?: boolean } | null>,

  resetPassword: (token: string, password: string) =>
    authRequest('/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, password }),
    }) as Promise<{ success: boolean }>,
};

export type { AuthUser, AuthSuccess, AuthCodeResponse };
