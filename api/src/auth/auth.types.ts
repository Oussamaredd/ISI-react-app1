export type AuthUser = {
  provider: 'google' | 'local';
  id: string;
  email?: string | null;
  name?: string | null;
  avatarUrl?: string | null;
};

export type AuthTokenPayload = {
  sub: string;
  provider: 'google' | 'local';
  email?: string | null;
  name?: string | null;
  picture?: string | null;
  tokenType?: 'access' | 'local_access' | 'oauth_session';
};
