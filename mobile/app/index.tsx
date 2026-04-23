import { View } from "react-native";
import { Redirect, router } from "expo-router";
import { Button, Text } from "react-native-paper";

import { AppStateScreen } from "@/components/AppStateScreen";
import { ScreenContainer } from "@/components/ScreenContainer";
import { resolveAuthenticatedHomeRoute } from "@/lib/roleRoutes";
import { useSession } from "@/providers/SessionProvider";

export default function IndexRoute() {
  const { authState, signOut, user } = useSession();

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

  const workspaceRoute = resolveAuthenticatedHomeRoute(user);

  return (
    <ScreenContainer
      eyebrow="EcoTrack Mobile"
      title="Choose your next action"
      description="Open a live workspace only when you are ready to use the product."
      actions={
        <View style={{ gap: 12 }}>
          <Button mode="contained" onPress={() => router.push(workspaceRoute)}>
            Open workspace
          </Button>
          <Button mode="outlined" onPress={() => void signOut()}>
            Sign out
          </Button>
        </View>
      }
      showMenuButton={false}
    >
      <Text variant="bodyMedium">
        Authentication stays on Supabase so this screen can load without waking the EcoTrack API.
        Open reporting, dashboards, tours, or other product flows only when you want live data.
      </Text>
      <Text variant="bodySmall">
        Signed in as {user?.displayName ?? user?.email ?? "your EcoTrack account"}.
      </Text>
    </ScreenContainer>
  );
}
