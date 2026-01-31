export type AuthUser = {
  provider: 'google';
  id: string;
  email?: string | null;
  name?: string | null;
  avatarUrl?: string | null;
};

export type AuthTokenPayload = {
  sub: string;
  provider: string;
  email?: string | null;
  name?: string | null;
  picture?: string | null;
};
