export type AdminRole = {
  id: string;
  name: string;
};

export type AdminUserContext = {
  id: string;
  email: string;
  displayName: string;
  role: string;
  roles: AdminRole[];
  isActive: boolean;
};
