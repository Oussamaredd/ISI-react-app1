import type { PropsWithChildren, ReactNode } from "react";
import { useMemo } from "react";
import { router, useSegments } from "expo-router";
import { ScrollView, View, useWindowDimensions } from "react-native";
import { Text } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { resolveAuthenticatedHomeRoute } from "@/lib/roleRoutes";
import { useCitizenMenu } from "@/providers/CitizenMenuProvider";
import { useSession } from "@/providers/SessionProvider";
import { resolveCitizenTabLayout } from "@/theme/layout";
import type { AppTheme } from "@/theme/theme";
import { useAppTheme, useThemedStyles } from "@/theme/useAppTheme";
import { AppLogoMark } from "./AppLogoMark";
import { ProfileAvatar } from "./ProfileAvatar";

type ScreenContainerProps = PropsWithChildren<{
  eyebrow: string;
  title: string;
  description: string;
  actions?: ReactNode;
  showMenuButton?: boolean;
}>;

const createStyles = (theme: AppTheme) => ({
  root: {
    flex: 1,
    backgroundColor: theme.colors.background
  },
  topBand: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 112,
    backgroundColor: theme.colors.backgroundAccent
  },
  screen: {
    flex: 1,
    backgroundColor: "transparent"
  },
  content: {
    gap: theme.spacing.lg
  },
  stack: {
    width: "100%",
    alignSelf: "center",
    gap: theme.spacing.lg
  },
  appBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
    minHeight: 72,
    paddingHorizontal: theme.spacing.lg,
    borderRadius: theme.shape.lg,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.borderSoft
  },
  titleSlot: {
    flex: 1,
    justifyContent: "center"
  },
  title: {
    color: theme.colors.onSurface,
    fontWeight: "700"
  },
  titleCompact: {
    fontSize: 20
  },
  centerSlot: {
    width: 56,
    alignItems: "center",
    justifyContent: "center"
  },
  rightSlot: {
    flex: 1,
    alignItems: "flex-end",
    justifyContent: "center"
  },
  avatarPlaceholder: {
    width: 38,
    height: 38
  },
  intro: {
    gap: theme.spacing.xs,
    paddingHorizontal: theme.spacing.xs
  },
  eyebrow: {
    color: theme.colors.primaryStrong,
    fontWeight: "700",
    letterSpacing: 0.7,
    textTransform: "uppercase"
  },
  description: {
    color: theme.colors.textMuted,
    lineHeight: 22
  },
  actions: {
    marginTop: theme.spacing.sm
  },
  body: {
    gap: theme.spacing.md
  }
});

export function ScreenContainer({
  eyebrow,
  title,
  description,
  actions,
  showMenuButton = true,
  children
}: ScreenContainerProps) {
  const theme = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const segments = useSegments();
  const { authState, user } = useSession();
  const { isMenuAvailable, openMenu } = useCitizenMenu();
  const tabLayout = resolveCitizenTabLayout(width, insets.bottom);
  const horizontalPadding =
    width >= 1200 ? width * 0.08 : width >= 720 ? width * 0.06 : theme.spacing.lg;
  const stackWidth = width >= 1200 ? 980 : width >= 900 ? 860 : undefined;
  const isCitizenTabRoute = segments[0] === "(tabs)";
  const verticalPadding = width < 380 ? theme.spacing.md : theme.spacing.xl;
  const bottomPadding = verticalPadding + (isCitizenTabRoute ? tabLayout.tabBarHeight : 0);
  const contentStyle = useMemo(
    () => [
      styles.content,
      {
        paddingHorizontal: horizontalPadding,
        paddingTop: verticalPadding,
        paddingBottom: bottomPadding
      }
    ],
    [bottomPadding, horizontalPadding, styles.content, verticalPadding]
  );

  const shouldShowProfileTrigger = showMenuButton && isMenuAvailable;
  const handleLogoPress = () => {
    if (authState === "authenticated") {
      router.replace(resolveAuthenticatedHomeRoute(user));
      return;
    }

    router.replace("/login");
  };

  return (
    <View style={styles.root}>
      <View pointerEvents="none" style={styles.topBand} />
      <ScrollView style={styles.screen} contentContainerStyle={contentStyle}>
        <View style={[styles.stack, stackWidth ? { maxWidth: stackWidth } : null]}>
          <View style={styles.appBar}>
            <View style={styles.titleSlot}>
              <Text
                variant={width < 390 ? "titleMedium" : "titleLarge"}
                numberOfLines={1}
                ellipsizeMode="tail"
                adjustsFontSizeToFit
                minimumFontScale={0.82}
                style={[styles.title, width < 390 ? styles.titleCompact : null]}
              >
                {title}
              </Text>
            </View>
            <View style={styles.centerSlot}>
              <AppLogoMark onPress={handleLogoPress} accessibilityLabel="Go to home" />
            </View>
            <View style={styles.rightSlot}>
              {shouldShowProfileTrigger ? (
                <ProfileAvatar
                  name={user?.displayName ?? user?.email}
                  onPress={openMenu}
                  accessibilityLabel="Open account menu"
                />
              ) : (
                <View style={styles.avatarPlaceholder} />
              )}
            </View>
          </View>
          <View style={styles.intro}>
            <Text variant="labelLarge" style={styles.eyebrow}>
              {eyebrow}
            </Text>
            <Text variant="bodyMedium" style={styles.description}>
              {description}
            </Text>
            {actions ? <View style={styles.actions}>{actions}</View> : null}
          </View>
          <View style={styles.body}>{children}</View>
        </View>
      </ScrollView>
    </View>
  );
}
