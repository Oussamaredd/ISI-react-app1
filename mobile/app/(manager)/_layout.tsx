import { Redirect, Stack } from "expo-router";

import { AppStateScreen } from "@/components/AppStateScreen";
import { hasManagerAccess } from "@/lib/authz";
import { resolveAuthenticatedHomeRoute } from "@/lib/roleRoutes";
import { useSession } from "@/providers/SessionProvider";

export default function ManagerLayout() {
  const { authState, user } = useSession();

  if (authState === "unknown") {
    return (
      <AppStateScreen
        title="Opening manager lane"
        description="EcoTrack is confirming planning access."
        isBusy
      />
    );
  }

  if (authState !== "authenticated") {
    return <Redirect href="/login" />;
  }

  if (!hasManagerAccess(user)) {
    return <Redirect href={resolveAuthenticatedHomeRoute(user)} />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
