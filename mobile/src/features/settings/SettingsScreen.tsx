import Constants from "expo-constants";
import { Platform, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { SegmentedButtons, Text } from "react-native-paper";

import { InfoCard } from "@/components/InfoCard";
import { ScreenContainer } from "@/components/ScreenContainer";
import {
  formatNotificationPermissionState,
  getNotificationPermissionState
} from "@/device/notifications";
import { getMobileApiBaseLabel } from "@/lib/env";
import { queryKeys } from "@/lib/queryKeys";
import { useThemePreference } from "@/providers/ThemePreferenceProvider";
import type { AppTheme } from "@/theme/theme";
import type { ThemePreference } from "@/theme/themePreference";
import { useThemedStyles } from "@/theme/useAppTheme";

const resolveExecutionModeLabel = () => {
  switch (Constants.executionEnvironment) {
    case "storeClient":
      return "Expo Go";
    case "standalone":
      return "Standalone build";
    case "bare":
      return "Development build";
    default:
      return "Unknown";
  }
};

const createStyles = (theme: AppTheme) =>
  ({
    stack: {
      gap: theme.spacing.sm
    },
    choiceWrap: {
      gap: theme.spacing.md
    },
    statusPanel: {
      gap: theme.spacing.sm,
      padding: theme.spacing.md,
      borderRadius: theme.shape.md,
      borderWidth: 1,
      borderColor: theme.colors.borderSoft,
      backgroundColor: theme.colors.surfaceMuted
    },
    statusRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      gap: theme.spacing.md
    },
    statusLabel: {
      color: theme.colors.textMuted
    },
    statusValue: {
      flexShrink: 1,
      textAlign: "right",
      color: theme.colors.onSurface,
      fontWeight: "600"
    },
    helperText: {
      color: theme.colors.textMuted,
      lineHeight: 20
    },
    runtimeGroup: {
      gap: theme.spacing.sm
    }
  }) satisfies Record<string, object>;

export function SettingsScreen() {
  const styles = useThemedStyles(createStyles);
  const { preference, resolvedMode, setPreference } = useThemePreference();
  const notificationQuery = useQuery({
    queryKey: queryKeys.notificationPermission,
    queryFn: () => getNotificationPermissionState()
  });

  return (
    <ScreenContainer
      eyebrow="Settings"
      title="Settings"
      description="Theme, runtime, notifications."
    >
      <InfoCard title="Appearance">
        <View style={styles.choiceWrap}>
          <SegmentedButtons
            value={preference}
            onValueChange={(value) => setPreference(value as ThemePreference)}
            buttons={[
              {
                value: "system",
                label: "System"
              },
              {
                value: "light",
                label: "Light"
              },
              {
                value: "dark",
                label: "Dark"
              }
            ]}
          />
          <View style={styles.statusPanel}>
            <View style={styles.statusRow}>
              <Text variant="bodyMedium" style={styles.statusLabel}>
                Preference
              </Text>
              <Text variant="bodyMedium" style={styles.statusValue}>
                {preference === "system"
                  ? "Follow device"
                  : preference === "dark"
                    ? "Dark"
                    : "Light"}
              </Text>
            </View>
            <View style={styles.statusRow}>
              <Text variant="bodyMedium" style={styles.statusLabel}>
                Active theme
              </Text>
              <Text variant="bodyMedium" style={styles.statusValue}>
                {resolvedMode === "dark" ? "Dark mode" : "Light mode"}
              </Text>
            </View>
          </View>
        </View>
      </InfoCard>

      <InfoCard title="Runtime and API">
        <View style={styles.runtimeGroup}>
          <View style={styles.statusRow}>
            <Text variant="bodyMedium" style={styles.statusLabel}>
              Platform
            </Text>
            <Text variant="bodyMedium" style={styles.statusValue}>
              {Platform.OS}
            </Text>
          </View>
          <View style={styles.statusRow}>
            <Text variant="bodyMedium" style={styles.statusLabel}>
              Execution mode
            </Text>
            <Text variant="bodyMedium" style={styles.statusValue}>
              {resolveExecutionModeLabel()}
            </Text>
          </View>
          <View style={styles.statusRow}>
            <Text variant="bodyMedium" style={styles.statusLabel}>
              API base
            </Text>
            <Text variant="bodyMedium" style={styles.statusValue}>
              {getMobileApiBaseLabel()}
            </Text>
          </View>
        </View>
      </InfoCard>

      <InfoCard title="Notifications">
        <View style={styles.stack}>
          <View style={styles.statusRow}>
            <Text variant="bodyMedium" style={styles.statusLabel}>
              Status
            </Text>
            <Text variant="bodyMedium" style={styles.statusValue}>
              {formatNotificationPermissionState(notificationQuery.data)}
            </Text>
          </View>
        </View>
      </InfoCard>
    </ScreenContainer>
  );
}
