import { View, useWindowDimensions } from "react-native";
import { Text } from "react-native-paper";

import type { AppTheme } from "@/theme/theme";
import { useThemedStyles } from "@/theme/useAppTheme";

type MetricCardProps = {
  label: string;
  value: string | number;
  forceGrid?: boolean;
};

const createStyles = (theme: AppTheme) =>
  ({
    card: {
      minHeight: 128,
      gap: theme.spacing.sm,
      padding: theme.spacing.lg,
      borderRadius: theme.shape.md,
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.borderSoft,
      borderWidth: 1,
      alignItems: "center",
      justifyContent: "center"
    },
    label: {
      color: theme.colors.textMuted,
      textTransform: "uppercase",
      letterSpacing: 0.6,
      textAlign: "center"
    },
    value: {
      color: theme.colors.onSurface,
      fontWeight: "700",
      textAlign: "center"
    }
  }) satisfies Record<string, object>;

export function MetricCard({ label, value, forceGrid = false }: MetricCardProps) {
  const styles = useThemedStyles(createStyles);
  const { width } = useWindowDimensions();
  const isSingleColumn = width < 420 && !forceGrid;

  return (
    <View style={[styles.card, isSingleColumn ? { width: "100%" } : { width: "48%" }]}>
      <Text variant="labelLarge" style={styles.label}>
        {label}
      </Text>
      <Text variant="headlineSmall" style={styles.value}>
        {value}
      </Text>
    </View>
  );
}
