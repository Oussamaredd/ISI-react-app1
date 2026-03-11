export const mobileFeatureBlueprint = [
  {
    key: "dashboard",
    route: "/(tabs)",
    title: "Citizen dashboard",
    owner: "mobile/src/features/dashboard",
    status: "connected"
  },
  {
    key: "report",
    route: "/(tabs)/report",
    title: "Citizen report submission",
    owner: "mobile/src/features/reports",
    status: "connected"
  },
  {
    key: "challenges",
    route: "/(tabs)/challenges",
    title: "Gamification and challenges",
    owner: "mobile/src/features/challenges",
    status: "connected"
  },
  {
    key: "history",
    route: "/(tabs)/history",
    title: "Citizen history and impact",
    owner: "mobile/src/features/history",
    status: "connected"
  },
  {
    key: "schedule",
    route: "/(tabs)/schedule",
    title: "Collection schedule",
    owner: "mobile/src/features/schedule",
    status: "connected"
  },
  {
    key: "agent-home",
    route: "/(agent)",
    title: "Agent route summary",
    owner: "mobile/src/features/agent",
    status: "connected"
  },
  {
    key: "manager-home",
    route: "/(manager)",
    title: "Manager dashboard summary",
    owner: "mobile/src/features/manager",
    status: "connected"
  }
] as const;
