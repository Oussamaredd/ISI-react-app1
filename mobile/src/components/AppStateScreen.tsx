import { ActivityIndicator, Button, Text } from "react-native-paper";

import { ScreenContainer } from "@/components/ScreenContainer";

type AppStateScreenProps = {
  title: string;
  description: string;
  actionLabel?: string;
  isBusy?: boolean;
  onAction?: () => void;
};

export function AppStateScreen({
  title,
  description,
  actionLabel,
  isBusy,
  onAction
}: AppStateScreenProps) {
  return (
    <ScreenContainer
      eyebrow="EcoTrack Mobile"
      title={title}
      description={description}
      actions={
        actionLabel && onAction ? (
          <Button mode="contained" onPress={onAction} disabled={isBusy}>
            {actionLabel}
          </Button>
        ) : undefined
      }
    >
      {isBusy ? <ActivityIndicator animating size="large" /> : null}
      {!isBusy ? <Text variant="bodyMedium">{description}</Text> : null}
    </ScreenContainer>
  );
}
