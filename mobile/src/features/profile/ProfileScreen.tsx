import { useQuery } from "@tanstack/react-query";
import { Text } from "react-native-paper";

import { citizenApi } from "@api/modules/citizen";
import { AppStateScreen } from "@/components/AppStateScreen";
import { InfoCard } from "@/components/InfoCard";
import { ScreenContainer } from "@/components/ScreenContainer";
import { queryKeys } from "@/lib/queryKeys";

export function ProfileScreen() {
  const profileQuery = useQuery({
    queryKey: queryKeys.citizenProfile,
    queryFn: () => citizenApi.getProfile()
  });

  if (profileQuery.isLoading) {
    return (
      <AppStateScreen
        title="Loading profile"
        description="EcoTrack is syncing your citizen account details."
        isBusy
      />
    );
  }

  if (profileQuery.isError || !profileQuery.data) {
    return (
      <AppStateScreen
        title="Profile unavailable"
        description={
          profileQuery.error instanceof Error
            ? profileQuery.error.message
            : "Unable to load the citizen profile."
        }
        actionLabel="Retry"
        onAction={() => {
          void profileQuery.refetch();
        }}
      />
    );
  }

  const profile = profileQuery.data;

  return (
    <ScreenContainer
      eyebrow="Profile"
      title="Profile"
      description="Account and points."
    >
      <InfoCard title="Identity">
        <Text variant="bodyMedium">Name: {profile.user.displayName}</Text>
        <Text variant="bodyMedium">Email: {profile.user.email}</Text>
        <Text variant="bodyMedium">User ID: {profile.user.id}</Text>
      </InfoCard>
      <InfoCard title="Gamification">
        <Text variant="bodyMedium">Points: {profile.gamification.points}</Text>
        <Text variant="bodyMedium">Level: {profile.gamification.level}</Text>
        <Text variant="bodyMedium">
          Leaderboard: #{profile.gamification.leaderboardPosition}
        </Text>
        <Text variant="bodyMedium">
          Badges:{" "}
          {profile.gamification.badges.length > 0
            ? profile.gamification.badges.join(", ")
            : "None yet"}
        </Text>
      </InfoCard>
    </ScreenContainer>
  );
}
