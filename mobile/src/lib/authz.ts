import type { SessionUser } from "@api/modules/auth";

type UserLike = Pick<SessionUser, "role" | "roles"> | null | undefined;

const MANAGER_ROLE_NAMES = new Set(["manager", "admin", "super_admin"]);
const AGENT_ROLE_NAMES = new Set(["agent", "admin", "super_admin"]);
const CITIZEN_ROLE_NAMES = new Set(["citizen", "admin", "super_admin"]);

const collectRoleNames = (user: UserLike) => {
  const roleNames = new Set<string>();

  if (typeof user?.role === "string" && user.role.trim().length > 0) {
    roleNames.add(user.role.trim().toLowerCase());
  }

  if (Array.isArray(user?.roles)) {
    for (const role of user.roles) {
      if (typeof role?.name === "string" && role.name.trim().length > 0) {
        roleNames.add(role.name.trim().toLowerCase());
      }
    }
  }

  return roleNames;
};

export const hasManagerAccess = (user: UserLike) => {
  for (const roleName of collectRoleNames(user)) {
    if (MANAGER_ROLE_NAMES.has(roleName)) {
      return true;
    }
  }

  return false;
};

export const hasAgentAccess = (user: UserLike) => {
  for (const roleName of collectRoleNames(user)) {
    if (AGENT_ROLE_NAMES.has(roleName)) {
      return true;
    }
  }

  return false;
};

export const hasCitizenAccess = (user: UserLike) => {
  for (const roleName of collectRoleNames(user)) {
    if (CITIZEN_ROLE_NAMES.has(roleName)) {
      return true;
    }
  }

  return false;
};
