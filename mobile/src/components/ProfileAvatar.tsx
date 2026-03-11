import { Pressable } from "react-native";
import { Avatar } from "react-native-paper";

import type { AppTheme } from "@/theme/theme";
import { useThemedStyles } from "@/theme/useAppTheme";

type ProfileAvatarProps = {
  name?: string | null;
  size?: number;
  onPress?: () => void;
  accessibilityLabel?: string;
};

const resolveInitials = (name?: string | null) => {
  const segments = (name ?? "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (segments.length === 0) {
    return "EC";
  }

  return segments
    .slice(0, 2)
    .map((segment) => segment[0]?.toUpperCase() ?? "")
    .join("");
};

const createStyles = (theme: AppTheme) => ({
  pressable: {
    borderRadius: theme.shape.pill
  },
  avatar: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.borderSoft
  },
  label: {
    color: theme.colors.primaryStrong,
    fontWeight: "700"
  }
});

export function ProfileAvatar({
  name,
  size = 38,
  onPress,
  accessibilityLabel
}: ProfileAvatarProps) {
  const styles = useThemedStyles(createStyles);
  const avatar = (
    <Avatar.Text
      size={size}
      label={resolveInitials(name)}
      style={styles.avatar}
      labelStyle={styles.label}
    />
  );

  if (!onPress) {
    return avatar;
  }

  return (
    <Pressable
      onPress={onPress}
      style={styles.pressable}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
    >
      {avatar}
    </Pressable>
  );
}
