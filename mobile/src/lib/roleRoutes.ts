import type { SessionUser } from "@api/modules/auth";

import { hasAgentAccess, hasCitizenAccess, hasManagerAccess } from "./authz";

export type MobileAppRoute = "/login" | "/(tabs)" | "/(agent)" | "/(manager)";

export const resolveAuthenticatedHomeRoute = (
  user: SessionUser | null | undefined
): MobileAppRoute => {
  if (hasManagerAccess(user)) {
    return "/(manager)";
  }

  if (hasAgentAccess(user)) {
    return "/(agent)";
  }

  if (hasCitizenAccess(user)) {
    return "/(tabs)";
  }

  return "/(tabs)";
};
