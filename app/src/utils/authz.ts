export type RoleLike = {
  name?: string | null;
};

export type UserLike = {
  role?: string | null;
  roles?: RoleLike[] | null;
};

const ADMIN_ROLE_NAMES = new Set(['admin', 'super_admin']);
const MANAGER_ROLE_NAMES = new Set(['manager', 'admin', 'super_admin']);
const CITIZEN_ROLE_NAMES = new Set(['citizen', 'admin', 'super_admin']);
const AGENT_ROLE_NAMES = new Set(['agent', 'admin', 'super_admin']);
const SUPPORT_WORKSPACE_ROLE_NAMES = new Set(['agent', 'manager', 'admin', 'super_admin']);

const normalizeRoleName = (roleName: string) => roleName.trim().toLowerCase();

const collectRoleNames = (user: UserLike | null | undefined) => {
  const names = new Set<string>();

  if (!user) {
    return names;
  }

  if (typeof user.role === 'string') {
    const normalizedRoleName = normalizeRoleName(user.role);
    if (normalizedRoleName.length > 0) {
      names.add(normalizedRoleName);
    }
  }

  if (Array.isArray(user.roles)) {
    for (const role of user.roles) {
      if (typeof role?.name === 'string') {
        const normalizedRoleName = normalizeRoleName(role.name);
        if (normalizedRoleName.length > 0) {
          names.add(normalizedRoleName);
        }
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

export const hasCitizenAccess = (user: UserLike | null | undefined): boolean => {
  const roleNames = collectRoleNames(user);
  for (const roleName of roleNames) {
    if (CITIZEN_ROLE_NAMES.has(roleName)) {
      return true;
    }
  }

  return false;
};

export const hasAgentAccess = (user: UserLike | null | undefined): boolean => {
  const roleNames = collectRoleNames(user);
  for (const roleName of roleNames) {
    if (AGENT_ROLE_NAMES.has(roleName)) {
      return true;
    }
  }

  return false;
};

export const hasSupportWorkspaceAccess = (user: UserLike | null | undefined): boolean => {
  const roleNames = collectRoleNames(user);
  for (const roleName of roleNames) {
    if (SUPPORT_WORKSPACE_ROLE_NAMES.has(roleName)) {
      return true;
    }
  }

  return false;
};
