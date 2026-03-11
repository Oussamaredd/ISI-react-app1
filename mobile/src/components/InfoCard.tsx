import type { ComponentProps, PropsWithChildren } from "react";
import { View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Card, Text } from "react-native-paper";

import type { AppTheme } from "@/theme/theme";
import { useThemedStyles } from "@/theme/useAppTheme";

type InfoCardProps = PropsWithChildren<{
  title: string;
  caption?: string;
  icon?: ComponentProps<typeof MaterialCommunityIcons>["name"];
}>;

const createStyles = (theme: AppTheme) =>
  ({
    card: {
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.borderSoft,
      borderWidth: 1,
      borderRadius: theme.shape.md,
      shadowColor: theme.colors.shadow,
      shadowOffset: {
        width: 0,
        height: 8
      },
      shadowOpacity: theme.dark ? 0.16 : 0.05,
      shadowRadius: 16,
      elevation: 2
    },
    titleRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.sm
    },
    titleIcon: {
      color: theme.colors.primaryStrong
    },
    content: {
      gap: theme.spacing.sm
    },
    title: {
      color: theme.colors.onSurface,
      fontWeight: "700"
    },
    caption: {
      color: theme.colors.textMuted,
      lineHeight: 20
    }
  }) satisfies Record<string, object>;

export function InfoCard({ title, caption, icon, children }: InfoCardProps) {
  const styles = useThemedStyles(createStyles);

  return (
    <Card style={styles.card} mode="contained">
      <Card.Content style={styles.content}>
        <View style={styles.titleRow}>
          {icon ? (
            <MaterialCommunityIcons name={icon} size={18} style={styles.titleIcon} />
          ) : null}
          <Text variant="titleMedium" style={styles.title}>
            {title}
          </Text>
        </View>
        {caption ? (
          <Text variant="bodySmall" style={styles.caption}>
            {caption}
          </Text>
        ) : null}
        {children}
      </Card.Content>
    </Card>
  );
}
