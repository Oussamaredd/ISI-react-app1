import { API_BASE } from './api';
import { withAuthHeader } from './authToken';

const AUTH_API_BASE = `${API_BASE}/api`;

type AuthUser = {
  id: string;
  email: string;
  displayName: string;
  name?: string | null;
  avatarUrl: string | null;
  role: string;
  roles: Array<{ id: string; name: string }>;
  isActive: boolean;
  hotelId: string;
  provider: 'local' | 'google';
};

type AuthSuccess = {
  accessToken: string;
  user: AuthUser;
};

type AuthCodeResponse = {
  code: string;
};

async function parseAuthResponse(response: Response) {
  if (response.status === 204) {
    return null;
  }

  const contentType = response.headers.get('content-type');
  if (!contentType || !contentType.includes('application/json')) {
    return null;
  }

  try {
    return await response.json();
  } catch {
    return null;
  }
}

async function authRequest(path: string, init: RequestInit = {}) {
  const response = await fetch(`${AUTH_API_BASE}${path}`, {
    credentials: 'include',
    ...init,
    headers: Object.fromEntries(withAuthHeader(init.headers).entries()),
  });

  const payload = await parseAuthResponse(response);
  if (!response.ok) {
    const message = payload && typeof payload === 'object' && 'message' in payload
      ? String((payload as { message: string }).message)
      : `HTTP ${response.status}`;
    throw new Error(message);
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
    authRequest('/me') as Promise<{ user: AuthUser }>,

  updateProfile: (displayName: string) =>
    authRequest('/me', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ displayName }),
    }) as Promise<{ user: AuthUser }>,

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
