import { Text } from "react-native-paper";

import { InfoCard } from "@/components/InfoCard";
import { ScreenContainer } from "@/components/ScreenContainer";

export function FeedbackScreen() {
  return (
    <ScreenContainer
      eyebrow="Feedback"
      title="Feedback"
      description="Support and feedback."
    >
      <InfoCard title="Support">
        <Text variant="bodyMedium">Manual and support flow coming later.</Text>
      </InfoCard>
      <InfoCard title="Feedback">
        <Text variant="bodyMedium">Feature coming later.</Text>
      </InfoCard>
    </ScreenContainer>
  );
}
