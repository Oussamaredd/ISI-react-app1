import type { PropsWithChildren, ReactNode } from "react";
import { useMemo, useRef } from "react";
import { router, useSegments } from "expo-router";
import { Pressable, ScrollView, View, useWindowDimensions } from "react-native";
import { Text } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { resolveAuthenticatedHomeRoute } from "@/lib/roleRoutes";
import { useCitizenMenu } from "@/providers/CitizenMenuProvider";
import { useSession } from "@/providers/SessionProvider";
import {
  MOBILE_HEADER_BAR_HEIGHT,
  MOBILE_HEADER_TOUCH_TARGET,
  resolveCitizenTabLayout,
  resolveMobileHeaderOffset
} from "@/theme/layout";
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
  headerShell: {
    borderBottomWidth: 1,
    backgroundColor: theme.colors.surface
  },
  headerSection: {
    width: "100%",
    alignSelf: "center"
  },
  headerRow: {
    minHeight: MOBILE_HEADER_BAR_HEIGHT,
    justifyContent: "center"
  },
  headerContent: {
    minHeight: MOBILE_HEADER_BAR_HEIGHT,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  profileSlot: {
    width: MOBILE_HEADER_TOUCH_TARGET,
    height: MOBILE_HEADER_TOUCH_TARGET,
    alignItems: "flex-start",
    justifyContent: "center"
  },
  avatarPlaceholder: {
    width: MOBILE_HEADER_TOUCH_TARGET,
    height: MOBILE_HEADER_TOUCH_TARGET
  },
  logoOverlay: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: "center",
    justifyContent: "center"
  },
  logoButton: {
    width: MOBILE_HEADER_TOUCH_TARGET,
    height: MOBILE_HEADER_TOUCH_TARGET,
    alignItems: "center",
    justifyContent: "center"
  },
  titleSlot: {
    flex: 1,
    alignItems: "flex-end",
    justifyContent: "center",
    paddingLeft: MOBILE_HEADER_TOUCH_TARGET + theme.spacing.sm
  },
  titleButton: {
    minHeight: MOBILE_HEADER_TOUCH_TARGET,
    justifyContent: "center",
    alignItems: "flex-end",
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.xs
  },
  title: {
    fontWeight: "700",
    textAlign: "right",
    letterSpacing: 0.2
  },
  titleCompact: {
    fontSize: 18,
    lineHeight: 22
  },
  screen: {
    flex: 1,
    backgroundColor: "transparent"
  },
  content: {
    width: "100%",
    alignSelf: "center",
    gap: theme.spacing.lg
  },
  intro: {
    paddingHorizontal: theme.spacing.xs
  },
  actions: {
    marginTop: 0
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
  const scrollViewRef = useRef<ScrollView | null>(null);
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const segments = useSegments();
  const { authState, user } = useSession();
  const { isMenuAvailable, openMenu } = useCitizenMenu();
  const tabLayout = resolveCitizenTabLayout(width, insets.bottom);
  const horizontalPadding =
    width >= 1200 ? width * 0.08 : width >= 720 ? width * 0.06 : theme.spacing.lg;
  const maxContentWidth = width >= 1200 ? 980 : width >= 900 ? 860 : undefined;
  const isCitizenTabRoute = segments[0] === "(tabs)";
  const baseVerticalPadding = width < 380 ? theme.spacing.md : theme.spacing.xl;
  const bottomPadding = baseVerticalPadding + (isCitizenTabRoute ? tabLayout.tabBarHeight : 0);
  const headerOffset = resolveMobileHeaderOffset(insets.top);
  const headerPaddingTop = headerOffset - MOBILE_HEADER_BAR_HEIGHT;
  const headerDividerColor = theme.dark ? theme.colors.borderStrong : theme.colors.borderSoft;
  const headerAvatarSize = width < 390 ? 34 : 36;
  const shouldShowProfileAvatar = authState === "authenticated";
  const shouldAllowMenuOpen = shouldShowProfileAvatar && showMenuButton && isMenuAvailable;
  const authenticatedHomeRoute = resolveAuthenticatedHomeRoute(user);
  const homeSegment = authenticatedHomeRoute.slice(1);
  const isOnAuthenticatedHome =
    authState === "authenticated" &&
    segments[0] === homeSegment &&
    segments.length === 1;
  void eyebrow;
  void description;
  const shouldShowIntro = Boolean(actions);
  const headerShellStyle = useMemo(
    () => [
      styles.headerShell,
      {
        paddingTop: headerPaddingTop,
        paddingHorizontal: horizontalPadding,
        borderBottomColor: headerDividerColor
      }
    ],
    [headerDividerColor, headerPaddingTop, horizontalPadding, styles.headerShell]
  );
  const contentStyle = useMemo(
    () => [
      styles.content,
      {
        maxWidth: maxContentWidth,
        paddingTop: theme.spacing.md,
        paddingHorizontal: horizontalPadding,
        paddingBottom: bottomPadding
      }
    ],
    [bottomPadding, horizontalPadding, maxContentWidth, styles.content, theme.spacing.md]
  );
  const titleAccessibilityLabel = `Scroll ${title} to top`;
  const scrollToTop = () => {
    scrollViewRef.current?.scrollTo({
      y: 0,
      animated: true
    });
  };
  const handleLogoPress = () => {
    if (isOnAuthenticatedHome) {
      scrollToTop();
      return;
    }

    if (authState === "authenticated") {
      router.replace(authenticatedHomeRoute);
      return;
    }

    router.replace("/login");
  };

  return (
    <View style={styles.root}>
      <View style={headerShellStyle}>
        <View style={[styles.headerSection, maxContentWidth ? { maxWidth: maxContentWidth } : null]}>
          <View style={styles.headerRow}>
            <View style={styles.headerContent}>
              <View style={styles.profileSlot}>
                {shouldShowProfileAvatar ? (
                  <ProfileAvatar
                    name={user?.displayName ?? user?.email}
                    size={headerAvatarSize}
                    variant="header"
                    onPress={shouldAllowMenuOpen ? openMenu : undefined}
                    accessibilityLabel={shouldAllowMenuOpen ? "Open account menu" : "Account profile"}
                  />
                ) : (
                  <View style={styles.avatarPlaceholder} />
                )}
              </View>
              <View pointerEvents="box-none" style={styles.logoOverlay}>
                <Pressable
                  onPress={handleLogoPress}
                  style={styles.logoButton}
                  accessibilityRole="button"
                  accessibilityLabel="Go to home"
                  hitSlop={8}
                >
                  <AppLogoMark size={20} variant="plain" tintColor={theme.colors.onSurface} />
                </Pressable>
              </View>
              <View style={styles.titleSlot}>
                <Pressable
                  onPress={scrollToTop}
                  style={styles.titleButton}
                  accessibilityRole="button"
                  accessibilityLabel={titleAccessibilityLabel}
                  hitSlop={8}
                >
                  <Text
                    variant={width < 390 ? "titleMedium" : "titleLarge"}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                    adjustsFontSizeToFit
                    minimumFontScale={0.92}
                    style={[
                      styles.title,
                      width < 390 ? styles.titleCompact : null,
                      { color: theme.colors.onSurface }
                    ]}
                  >
                    {title}
                  </Text>
                </Pressable>
              </View>
            </View>
          </View>
        </View>
      </View>
      <ScrollView ref={scrollViewRef} style={styles.screen} contentContainerStyle={contentStyle}>
        {shouldShowIntro ? (
          <View style={styles.intro}>
            {actions ? <View style={styles.actions}>{actions}</View> : null}
          </View>
        ) : null}
        <View style={styles.body}>{children}</View>
      </ScrollView>
    </View>
  );
}
