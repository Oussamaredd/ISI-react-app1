import type { PropsWithChildren } from "react";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { Animated, PanResponder, Pressable, StyleSheet, View, useWindowDimensions } from "react-native";
import { router, useSegments } from "expo-router";
import { Button, Divider, Portal, Surface, Text } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ProfileAvatar } from "@/components/ProfileAvatar";
import { hasCitizenAccess } from "@/lib/authz";
import { useSession } from "@/providers/SessionProvider";
import { resolveCitizenTabLayout, resolveMobileHeaderOffset } from "@/theme/layout";
import type { AppTheme } from "@/theme/theme";
import { useThemedStyles } from "@/theme/useAppTheme";

const DRAWER_WIDTH = 344;

type CitizenMenuContextValue = {
  isMenuAvailable: boolean;
  isMenuOpen: boolean;
  openMenu: () => void;
  closeMenu: () => void;
};

type MenuDestination =
  | "/profile"
  | "/(tabs)/report"
  | "/(tabs)/schedule"
  | "/settings"
  | "/feedback"
  | "/support";

const CitizenMenuContext = createContext<CitizenMenuContextValue | null>(null);

const createStyles = (theme: AppTheme) => ({
  edgeSwipeZone: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: theme.colors.overlay
  },
  drawerShell: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    width: "84%",
    maxWidth: DRAWER_WIDTH
  },
  drawer: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderRightWidth: 1,
    borderRightColor: theme.colors.borderSoft,
    paddingHorizontal: theme.spacing.lg,
    justifyContent: "space-between"
  },
  drawerTop: {
    gap: theme.spacing.xxl
  },
  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.md,
    paddingVertical: theme.spacing.xs
  },
  profileCopy: {
    flex: 1,
    gap: 2
  },
  profileName: {
    color: theme.colors.onSurface,
    fontWeight: "700"
  },
  profileHint: {
    color: theme.colors.textMuted
  },
  topActions: {
    gap: theme.spacing.sm,
    paddingTop: theme.spacing.md
  },
  footer: {
    gap: theme.spacing.md
  },
  utilityToggle: {
    alignSelf: "stretch"
  },
  utilityList: {
    gap: theme.spacing.xs,
    paddingTop: theme.spacing.sm
  },
  signOutWrap: {
    paddingTop: theme.spacing.lg,
    alignItems: "center"
  },
  signOutButton: {
    minWidth: 128,
    borderRadius: theme.shape.md
  }
});

export function CitizenMenuProvider({ children }: PropsWithChildren) {
  const styles = useThemedStyles(createStyles);
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const segments = useSegments();
  const { authState, signOut, user } = useSession();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [shouldRenderDrawer, setShouldRenderDrawer] = useState(false);
  const [isUtilityListOpen, setIsUtilityListOpen] = useState(false);
  const isMenuAvailable = authState === "authenticated" && hasCitizenAccess(user);
  const isCitizenTabRoute = segments[0] === "(tabs)";
  const tabLayout = resolveCitizenTabLayout(width, insets.bottom);
  const drawerTranslateX = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  const openMenu = useCallback(() => {
    if (!isMenuAvailable) {
      return;
    }

    setShouldRenderDrawer(true);
    setIsMenuOpen(true);
  }, [isMenuAvailable]);

  const closeMenu = useCallback(() => {
    setIsMenuOpen(false);
    setIsUtilityListOpen(false);
  }, []);

  useEffect(() => {
    if (!isMenuAvailable) {
      setIsMenuOpen(false);
      setShouldRenderDrawer(false);
      drawerTranslateX.setValue(-DRAWER_WIDTH);
      backdropOpacity.setValue(0);
    }
  }, [backdropOpacity, drawerTranslateX, isMenuAvailable]);

  useEffect(() => {
    if (isMenuOpen) {
      setShouldRenderDrawer(true);
      Animated.parallel([
        Animated.timing(drawerTranslateX, {
          toValue: 0,
          duration: 220,
          useNativeDriver: true
        }),
        Animated.timing(backdropOpacity, {
          toValue: 1,
          duration: 180,
          useNativeDriver: true
        })
      ]).start();
      return;
    }

    if (!shouldRenderDrawer) {
      return;
    }

    Animated.parallel([
      Animated.timing(drawerTranslateX, {
        toValue: -DRAWER_WIDTH,
        duration: 200,
        useNativeDriver: true
      }),
      Animated.timing(backdropOpacity, {
        toValue: 0,
        duration: 160,
        useNativeDriver: true
      })
    ]).start(({ finished }) => {
      if (finished) {
        setShouldRenderDrawer(false);
      }
    });
  }, [backdropOpacity, drawerTranslateX, isMenuOpen, shouldRenderDrawer]);

  const value = useMemo<CitizenMenuContextValue>(
    () => ({
      isMenuAvailable,
      isMenuOpen,
      openMenu,
      closeMenu
    }),
    [closeMenu, isMenuAvailable, isMenuOpen, openMenu]
  );

  const handleNavigation = (href: MenuDestination) => {
    closeMenu();
    router.push(href);
  };

  const handleSignOut = async () => {
    closeMenu();
    await signOut();
    router.replace("/login");
  };

  const openGestureResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gestureState) =>
          isMenuAvailable &&
          !isMenuOpen &&
          Math.abs(gestureState.dy) < 12 &&
          gestureState.dx > 18,
        onPanResponderRelease: (_, gestureState) => {
          if (gestureState.dx > 56) {
            openMenu();
          }
        }
      }),
    [isMenuAvailable, isMenuOpen, openMenu]
  );

  const closeGestureResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gestureState) =>
          isMenuOpen && Math.abs(gestureState.dy) < 12 && gestureState.dx < -18,
        onPanResponderRelease: (_, gestureState) => {
          if (gestureState.dx < -56) {
            closeMenu();
          }
        }
      }),
    [closeMenu, isMenuOpen]
  );

  return (
    <CitizenMenuContext.Provider value={value}>
      {children}
      {isMenuAvailable ? (
        <View
          style={[
            styles.edgeSwipeZone,
            {
              top: resolveMobileHeaderOffset(insets.top),
              width: tabLayout.edgeSwipeWidth,
              bottom: isCitizenTabRoute ? tabLayout.tabBarHeight : 0
            }
          ]}
          {...openGestureResponder.panHandlers}
        />
      ) : null}
      <Portal>
        {shouldRenderDrawer ? (
          <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
            <Animated.View style={[StyleSheet.absoluteFill, { opacity: backdropOpacity }]}>
              <Pressable style={styles.backdrop} onPress={closeMenu} />
            </Animated.View>
            <Animated.View
              style={[
                styles.drawerShell,
                {
                  transform: [{ translateX: drawerTranslateX }]
                }
              ]}
              {...closeGestureResponder.panHandlers}
            >
              <Surface
                style={[
                  styles.drawer,
                  {
                    paddingTop: Math.max(insets.top, 18) + 8,
                    paddingBottom: Math.max(insets.bottom, 20) + 8
                  }
                ]}
                elevation={2}
              >
                <View style={styles.drawerTop}>
                  <Pressable style={styles.profileCard} onPress={() => handleNavigation("/profile")}>
                    <ProfileAvatar name={user?.displayName ?? user?.email} size={52} />
                    <View style={styles.profileCopy}>
                      <Text variant="titleMedium" style={styles.profileName}>
                        {user?.displayName ?? "EcoTrack citizen"}
                      </Text>
                      <Text variant="bodySmall" style={styles.profileHint}>
                        Open profile
                      </Text>
                    </View>
                  </Pressable>
                  <View style={styles.topActions}>
                    <Button
                      mode="contained-tonal"
                      icon="account-circle-outline"
                      onPress={() => handleNavigation("/profile")}
                    >
                      Profile
                    </Button>
                    <Button
                      mode="contained-tonal"
                      icon="map-marker-alert-outline"
                      onPress={() => handleNavigation("/(tabs)/report")}
                    >
                      Report container
                    </Button>
                  </View>
                </View>
                <View style={styles.footer}>
                  <Divider />
                  {tabLayout.hideScheduleTab ? (
                    <Button
                      mode="text"
                      icon="calendar-clock-outline"
                      onPress={() => handleNavigation("/(tabs)/schedule")}
                    >
                      Schedule
                    </Button>
                  ) : null}
                  <View>
                    <Button
                      mode="text"
                      icon={isUtilityListOpen ? "chevron-up" : "chevron-down"}
                      contentStyle={{ flexDirection: "row-reverse" }}
                      style={styles.utilityToggle}
                      onPress={() => setIsUtilityListOpen((currentValue) => !currentValue)}
                    >
                      Settings & Support
                    </Button>
                    {isUtilityListOpen ? (
                      <View style={styles.utilityList}>
                        <Button
                          mode="text"
                          icon="cog-outline"
                          onPress={() => handleNavigation("/settings")}
                        >
                          Settings
                        </Button>
                        <Button
                          mode="text"
                          icon="message-alert-outline"
                          onPress={() => handleNavigation("/feedback")}
                        >
                          Feedback
                        </Button>
                        <Button
                          mode="text"
                          icon="lifebuoy"
                          onPress={() => handleNavigation("/support")}
                        >
                          Support
                        </Button>
                      </View>
                    ) : null}
                  </View>
                  <View style={styles.signOutWrap}>
                    <Button mode="outlined" style={styles.signOutButton} onPress={() => void handleSignOut()}>
                      Sign out
                    </Button>
                  </View>
                </View>
              </Surface>
            </Animated.View>
          </View>
        ) : null}
      </Portal>
    </CitizenMenuContext.Provider>
  );
}

export const useCitizenMenu = () => {
  const context = useContext(CitizenMenuContext);

  if (!context) {
    throw new Error("useCitizenMenu must be used inside CitizenMenuProvider.");
  }

  return context;
};
