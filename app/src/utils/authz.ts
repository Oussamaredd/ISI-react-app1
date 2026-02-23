export type RoleLike = {
  name?: string | null;
};

export type UserLike = {
  role?: string | null;
  roles?: RoleLike[] | null;
};

const ADMIN_ROLE_NAMES = new Set(['admin', 'super_admin']);
const MANAGER_ROLE_NAMES = new Set(['manager', 'admin', 'super_admin']);

const collectRoleNames = (user: UserLike | null | undefined) => {
  const names = new Set<string>();

  if (!user) {
    return names;
  }

  if (typeof user.role === 'string') {
    names.add(user.role);
  }

  if (Array.isArray(user.roles)) {
    for (const role of user.roles) {
      if (typeof role?.name === 'string') {
        names.add(role.name);
      }
    }
  }

  return names;
};

export const hasAdminAccess = (user: UserLike | null | undefined): boolean => {
  const roleNames = collectRoleNames(user);
  for (const roleName of roleNames) {
    if (ADMIN_ROLE_NAMES.has(roleName)) {
      return true;
    }
  }

  return false;
};

export const hasManagerAccess = (user: UserLike | null | undefined): boolean => {
  const roleNames = collectRoleNames(user);
  for (const roleName of roleNames) {
    if (MANAGER_ROLE_NAMES.has(roleName)) {
      return true;
    }
  }

  return false;
};
