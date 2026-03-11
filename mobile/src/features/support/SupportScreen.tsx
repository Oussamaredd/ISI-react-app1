import { Text } from "react-native-paper";

import { InfoCard } from "@/components/InfoCard";
import { ScreenContainer } from "@/components/ScreenContainer";

export function SupportScreen() {
  return (
    <ScreenContainer
      eyebrow="Support"
      title="Support"
      description="Get help with account access, reporting issues, and mobile usage questions."
    >
      <InfoCard
        title="Assistance"
        caption="Use this area for help requests while dedicated support workflows are still being connected."
      >
        <Text variant="bodyMedium">
          Track issues related to sign-in, location capture, report submission, and navigation behavior here.
        </Text>
      </InfoCard>
      <InfoCard
        title="What to include"
        caption="Helpful context makes support triage faster."
      >
        <Text variant="bodyMedium">Device type and platform</Text>
        <Text variant="bodyMedium">What action you tried to complete</Text>
        <Text variant="bodyMedium">What you expected to happen and what happened instead</Text>
      </InfoCard>
    </ScreenContainer>
  );
}
