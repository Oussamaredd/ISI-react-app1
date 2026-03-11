import type { PropsWithChildren } from "react";
import { useEffect, useState } from "react";
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  View,
  useWindowDimensions
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Surface, Text } from "react-native-paper";

import { AppLogoMark } from "@/components/AppLogoMark";
import type { AppTheme } from "@/theme/theme";
import { useAppTheme, useThemedStyles } from "@/theme/useAppTheme";

type AuthScreenLayoutProps = PropsWithChildren<{
  title: string;
  subtitle?: string;
}>;

const createStyles = (theme: AppTheme) => ({
  root: {
    flex: 1,
    backgroundColor: theme.colors.background
  },
  fill: {
    flex: 1
  },
  backgroundOrbPrimary: {
    position: "absolute",
    top: -120,
    right: -72,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: theme.colors.backgroundAccent
  },
  backgroundOrbSecondary: {
    position: "absolute",
    bottom: -96,
    left: -90,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: theme.colors.primarySurface,
    opacity: theme.dark ? 0.8 : 1
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: theme.spacing.lg
  },
  stack: {
    width: "100%",
    alignSelf: "center",
    gap: theme.spacing.lg
  },
  heroSection: {
    alignItems: "center",
    gap: theme.spacing.sm
  },
  heroTitle: {
    color: theme.colors.onSurface,
    fontWeight: "700",
    textAlign: "center"
  },
  heroSubtitle: {
    color: theme.colors.textMuted,
    textAlign: "center",
    lineHeight: 20
  },
  card: {
    padding: theme.spacing.xl,
    borderRadius: theme.shape.xl,
    borderWidth: 1,
    borderColor: theme.colors.borderSoft,
    backgroundColor: theme.colors.surface,
    gap: theme.spacing.lg,
    shadowColor: theme.colors.shadow,
    shadowOffset: {
      width: 0,
      height: 14
    },
    shadowOpacity: theme.dark ? 0.24 : 0.07,
    shadowRadius: 24,
    elevation: 4
  }
});

export function AuthScreenLayout({
  title,
  subtitle,
  children
}: AuthScreenLayoutProps) {
  const theme = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  const stackWidth = width > 560 ? 420 : undefined;
  const isCompactLayout = isKeyboardVisible || height < 760;
  const contentContainerStyle = [
    styles.scrollContent,
    {
      paddingTop: isCompactLayout
        ? Math.max(theme.spacing.lg, insets.top + theme.spacing.sm)
        : Math.max(theme.spacing.xxl * 2, insets.top + theme.spacing.xl),
      paddingBottom: Math.max(theme.spacing.lg, insets.bottom + theme.spacing.md)
    }
  ];

  useEffect(() => {
    const showSubscription = Keyboard.addListener("keyboardDidShow", () => {
      setIsKeyboardVisible(true);
    });
    const hideSubscription = Keyboard.addListener("keyboardDidHide", () => {
      setIsKeyboardVisible(false);
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  return (
    <View style={styles.root}>
      <View pointerEvents="none" style={styles.backgroundOrbPrimary} />
      <View pointerEvents="none" style={styles.backgroundOrbSecondary} />
      <KeyboardAvoidingView
        style={styles.fill}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <SafeAreaView style={styles.fill} edges={["top", "bottom"]}>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={contentContainerStyle}
          >
            <View style={[styles.stack, stackWidth ? { maxWidth: stackWidth } : null]}>
              <View style={styles.heroSection}>
                <AppLogoMark size={isCompactLayout ? 48 : 56} />
                <Text
                  variant={isCompactLayout ? "headlineSmall" : "headlineMedium"}
                  style={styles.heroTitle}
                >
                  {title}
                </Text>
                {subtitle ? (
                  <Text variant="bodyMedium" style={styles.heroSubtitle}>
                    {subtitle}
                  </Text>
                ) : null}
              </View>

              <Surface
                style={[styles.card, isCompactLayout ? { padding: theme.spacing.lg } : null]}
                elevation={0}
              >
                {children}
              </Surface>
            </View>
          </ScrollView>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </View>
  );
}
