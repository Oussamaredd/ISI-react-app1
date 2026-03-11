import { apiClient } from "@api/core/http";

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
  provider: "local" | "google";
};

export type AuthSession = {
  accessToken: string;
  user: SessionUser;
};

export type AuthLoginResponse =
  | AuthSession
  | {
      code: string;
      accessToken?: string;
      user?: SessionUser;
    };

export type AuthStatusResponse = {
  authenticated: boolean;
  user?: SessionUser;
};

export type ForgotPasswordResponse = {
  devResetUrl?: string;
  success?: boolean;
} | null;

export const authApi = {
  signup: (email: string, password: string, displayName?: string) =>
    apiClient.post<AuthSession>("/api/signup", {
      email,
      password,
      ...(displayName ? { displayName } : {})
    }),

  login: (email: string, password: string) =>
    apiClient.post<AuthLoginResponse>("/api/login", { email, password }),

  exchange: (code: string) =>
    apiClient.post<AuthSession>("/api/auth/exchange", { code }),

  status: () => apiClient.get<AuthStatusResponse>("/api/auth/status"),

  me: () => apiClient.get<{ user: SessionUser }>("/api/me"),

  forgotPassword: (email: string) =>
    apiClient.post<ForgotPasswordResponse>("/api/forgot-password", { email }),

  logout: () => apiClient.post<{ success: boolean }>("/api/logout", {})
};
