import { Redirect, Stack } from "expo-router";

import { AppStateScreen } from "@/components/AppStateScreen";
import { hasAgentAccess } from "@/lib/authz";
import { resolveAuthenticatedHomeRoute } from "@/lib/roleRoutes";
import { useSession } from "@/providers/SessionProvider";

export default function AgentLayout() {
  const { authState, user } = useSession();

  if (authState === "unknown") {
    return (
      <AppStateScreen
        title="Opening agent lane"
        description="EcoTrack is confirming field access."
        isBusy
      />
    );
  }

  if (authState !== "authenticated") {
    return <Redirect href="/login" />;
  }

  if (!hasAgentAccess(user)) {
    return <Redirect href={resolveAuthenticatedHomeRoute(user)} />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
