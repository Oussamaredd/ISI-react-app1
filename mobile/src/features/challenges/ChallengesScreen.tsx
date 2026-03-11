import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, ProgressBar, Text } from "react-native-paper";

import { citizenApi } from "@api/modules/citizen";
import { AppStateScreen } from "@/components/AppStateScreen";
import { InfoCard } from "@/components/InfoCard";
import { ScreenContainer } from "@/components/ScreenContainer";
import { queryKeys } from "@/lib/queryKeys";

export function ChallengesScreen() {
  const queryClient = useQueryClient();
  const challengesQuery = useQuery({
    queryKey: queryKeys.citizenChallenges,
    queryFn: () => citizenApi.getChallenges()
  });
  const enrollMutation = useMutation({
    mutationFn: (challengeId: string) => citizenApi.enrollInChallenge(challengeId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.citizenChallenges });
    }
  });
  const progressMutation = useMutation({
    mutationFn: (challengeId: string) =>
      citizenApi.updateChallengeProgress(challengeId, 1),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.citizenChallenges }),
        queryClient.invalidateQueries({ queryKey: queryKeys.citizenProfile })
      ]);
    }
  });

  if (challengesQuery.isLoading) {
    return (
      <AppStateScreen
        title="Loading challenges"
        description="EcoTrack is syncing the citizen challenge catalog."
        isBusy
      />
    );
  }

  if (challengesQuery.isError) {
    return (
      <AppStateScreen
        title="Challenges unavailable"
        description={
          challengesQuery.error instanceof Error
            ? challengesQuery.error.message
            : "Unable to load challenges."
        }
        actionLabel="Retry"
        onAction={() => {
          void challengesQuery.refetch();
        }}
      />
    );
  }

  if (!challengesQuery.data) {
    return (
      <AppStateScreen
        title="Challenges unavailable"
        description="The challenge catalog returned no payload."
      />
    );
  }

  const challenges = challengesQuery.data.challenges;

  return (
    <ScreenContainer
      eyebrow="Gamification"
      title="Challenges"
      description="Points and goals."
    >
      {challenges.length === 0 ? (
        <InfoCard title="No challenges">
          <Text variant="bodyMedium">No active items.</Text>
        </InfoCard>
      ) : null}
      {challenges.map((challenge) => {
        const isEnrolled = challenge.enrollmentStatus !== "not_enrolled";
        const isCompleted = challenge.enrollmentStatus === "completed";

        return (
          <InfoCard
            key={challenge.id}
            title={challenge.title}
            caption={`${challenge.rewardPoints} points reward`}
          >
            <Text variant="bodyMedium">{challenge.description}</Text>
            <Text variant="bodyMedium">
              Progress: {challenge.progress}/{challenge.targetValue}
            </Text>
            <ProgressBar progress={challenge.completionPercent / 100} />
            {!isEnrolled ? (
              <Button
                mode="contained"
                onPress={() => {
                  void enrollMutation.mutateAsync(challenge.id);
                }}
                loading={enrollMutation.isPending}
                disabled={enrollMutation.isPending}
              >
                Join challenge
              </Button>
            ) : (
              <Button
                mode={isCompleted ? "outlined" : "contained"}
                onPress={() => {
                  void progressMutation.mutateAsync(challenge.id);
                }}
                loading={progressMutation.isPending}
                disabled={progressMutation.isPending || isCompleted}
              >
                {isCompleted ? "Completed" : "Add progress +1"}
              </Button>
            )}
          </InfoCard>
        );
      })}
    </ScreenContainer>
  );
}
