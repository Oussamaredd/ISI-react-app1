import { Pressable, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import type { AppTheme } from "@/theme/theme";
import { useAppTheme, useThemedStyles } from "@/theme/useAppTheme";

type AppLogoMarkProps = {
  size?: number;
  onPress?: () => void;
  accessibilityLabel?: string;
  tintColor?: string;
  variant?: "badge" | "plain";
};

const createStyles = (theme: AppTheme) => ({
  shell: {
    alignItems: "center",
    justifyContent: "center"
  },
  badge: {
    alignItems: "center",
    justifyContent: "center",
    borderRadius: theme.shape.sm,
    backgroundColor: theme.colors.primary,
    borderWidth: 1,
    borderColor: theme.colors.primaryStrong
  }
});

export function AppLogoMark({
  size = 34,
  onPress,
  accessibilityLabel,
  tintColor,
  variant = "badge"
}: AppLogoMarkProps) {
  const theme = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const iconSize = variant === "plain" ? Math.round(size * 0.84) : Math.round(size * 0.5);
  const iconColor =
    tintColor ?? (variant === "plain" ? theme.colors.onSurface : theme.colors.onPrimary);
  const logo = (
    <View style={[styles.shell, variant === "badge" ? styles.badge : null, { width: size, height: size }]}>
      <MaterialCommunityIcons
        name="recycle-variant"
        size={iconSize}
        color={iconColor}
      />
    </View>
  );

  if (!onPress) {
    return logo;
  }

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      hitSlop={8}
    >
      {logo}
    </Pressable>
  );
}
