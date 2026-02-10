import type { Request } from 'express';

export type ResolvedRole = {
  id: string;
  name: string;
};

export type AuthenticatedRequestUser = {
  id: string;
  email: string;
  displayName: string;
  role: string;
  roles: ResolvedRole[];
  permissions: string[];
  isActive: boolean;
  hotelId: string;
};

export type RequestWithAuthUser = Request & {
  authUser?: AuthenticatedRequestUser;
};
