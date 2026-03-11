import { Redirect } from "expo-router";

import { AppStateScreen } from "@/components/AppStateScreen";
import { resolveAuthenticatedHomeRoute } from "@/lib/roleRoutes";
import { useSession } from "@/providers/SessionProvider";

export default function IndexRoute() {
  const { authState, user } = useSession();

  if (authState === "unknown") {
    return (
      <AppStateScreen
        title="Checking your session"
        description="EcoTrack is restoring your secure mobile session."
        isBusy
      />
    );
  }

  if (authState !== "authenticated") {
    return <Redirect href="/login" />;
  }

  return <Redirect href={resolveAuthenticatedHomeRoute(user)} />;
}
