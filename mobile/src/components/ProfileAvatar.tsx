import { Pressable } from "react-native";
import { Avatar } from "react-native-paper";

import type { AppTheme } from "@/theme/theme";
import { useThemedStyles } from "@/theme/useAppTheme";

type ProfileAvatarProps = {
  name?: string | null;
  size?: number;
  onPress?: () => void;
  accessibilityLabel?: string;
  variant?: "default" | "header";
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
  avatarHeader: {
    borderWidth: 1,
    borderColor: theme.dark ? theme.colors.borderStrong : theme.colors.borderSoft,
    backgroundColor: theme.dark ? theme.colors.surfaceMuted : theme.colors.primarySurface,
    shadowColor: theme.colors.shadow,
    shadowOpacity: theme.dark ? 0.24 : 0.1,
    shadowRadius: 8,
    shadowOffset: {
      width: 0,
      height: 4
    },
    elevation: 3
  },
  label: {
    color: theme.colors.primaryStrong,
    fontWeight: "700"
  },
  labelHeader: {
    color: theme.dark ? theme.colors.onSurface : theme.colors.primaryStrong,
    fontWeight: "700"
  }
});

export function ProfileAvatar({
  name,
  size = 38,
  onPress,
  accessibilityLabel,
  variant = "default"
}: ProfileAvatarProps) {
  const styles = useThemedStyles(createStyles);
  const avatar = (
    <Avatar.Text
      size={size}
      label={resolveInitials(name)}
      style={[styles.avatar, variant === "header" ? styles.avatarHeader : null]}
      labelStyle={variant === "header" ? styles.labelHeader : styles.label}
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
