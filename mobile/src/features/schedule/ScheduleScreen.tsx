import { useQuery } from "@tanstack/react-query";
import { Text } from "react-native-paper";

import { containersApi } from "@api/modules/containers";
import { healthApi } from "@api/modules/health";
import { AppStateScreen } from "@/components/AppStateScreen";
import { InfoCard } from "@/components/InfoCard";
import { ScreenContainer } from "@/components/ScreenContainer";
import {
  formatNotificationPermissionState,
  getNotificationPermissionState
} from "@/device/notifications";
import { queryKeys } from "@/lib/queryKeys";

export function ScheduleScreen() {
  const healthQuery = useQuery({
    queryKey: queryKeys.apiHealthReady,
    queryFn: () => healthApi.ready(),
    retry: false
  });
  const containersQuery = useQuery({
    queryKey: queryKeys.containers("all"),
    queryFn: () => containersApi.list({ pageSize: 6 })
  });
  const notificationQuery = useQuery({
    queryKey: queryKeys.notificationPermission,
    queryFn: () => getNotificationPermissionState()
  });

  if (containersQuery.isLoading) {
    return (
      <AppStateScreen
        title="Loading service coverage"
        description="EcoTrack is preparing the collection coverage snapshot for mobile."
        isBusy
      />
    );
  }

  return (
    <ScreenContainer
      eyebrow="Schedule"
      title="Schedule"
      description="Service status and coverage."
    >
      <InfoCard title="Status">
        <Text variant="bodyMedium">API status: {healthQuery.data?.status ?? "degraded"}</Text>
        <Text variant="bodyMedium">
          Notification status: {formatNotificationPermissionState(notificationQuery.data)}
        </Text>
      </InfoCard>
      <InfoCard title="Coverage">
        {(containersQuery.data?.containers ?? []).map((container) => (
          <Text key={container.id} variant="bodyMedium">
            {`${container.code} - ${container.label}`}
          </Text>
        ))}
      </InfoCard>
    </ScreenContainer>
  );
}
