import { Pressable, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import type { AppTheme } from "@/theme/theme";
import { useAppTheme, useThemedStyles } from "@/theme/useAppTheme";

type AppLogoMarkProps = {
  size?: number;
  onPress?: () => void;
  accessibilityLabel?: string;
};

const createStyles = (theme: AppTheme) => ({
  shell: {
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
  accessibilityLabel
}: AppLogoMarkProps) {
  const theme = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const logo = (
    <View style={[styles.shell, { width: size, height: size }]}>
      <MaterialCommunityIcons
        name="recycle-variant"
        size={Math.round(size * 0.5)}
        color={theme.colors.onPrimary}
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
    >
      {logo}
    </Pressable>
  );
}
