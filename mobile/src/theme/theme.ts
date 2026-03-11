import {
  DarkTheme as NavigationDarkTheme,
  DefaultTheme as NavigationDefaultTheme,
  type Theme as NavigationTheme
} from "@react-navigation/native";
import {
  MD3DarkTheme,
  MD3LightTheme,
  adaptNavigationTheme,
  type MD3Theme
} from "react-native-paper";

import { palette, type ThemeMode } from "./palette";

type AppThemeColors = MD3Theme["colors"] & {
  primaryStrong: string;
  primarySoft: string;
  primarySurface: string;
  backgroundAccent: string;
  surfaceElevated: string;
  surfaceMuted: string;
  textMuted: string;
  borderSoft: string;
  borderStrong: string;
  success: string;
  warning: string;
  overlay: string;
  shadow: string;
};

const spacing = {
  xs: 6,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 28,
  xxl: 32
} as const;

const shape = {
  sm: 12,
  md: 18,
  lg: 24,
  xl: 32,
  pill: 999
} as const;

export type AppTheme = MD3Theme & {
  colors: AppThemeColors;
  spacing: typeof spacing;
  shape: typeof shape;
};

const createPaperTheme = (mode: ThemeMode): AppTheme => {
  const source = palette[mode];
  const baseTheme = mode === "dark" ? MD3DarkTheme : MD3LightTheme;

  return {
    ...baseTheme,
    dark: mode === "dark",
    roundness: shape.md,
    spacing,
    shape,
    colors: {
      ...baseTheme.colors,
      primary: source.primary,
      onPrimary: source.textInverse,
      primaryContainer: source.primarySoft,
      onPrimaryContainer: source.text,
      secondary: source.primaryStrong,
      onSecondary: source.textInverse,
      secondaryContainer: source.primarySurface,
      onSecondaryContainer: source.text,
      tertiary: source.primaryStrong,
      onTertiary: source.textInverse,
      tertiaryContainer: source.primarySurface,
      onTertiaryContainer: source.text,
      background: source.background,
      onBackground: source.text,
      surface: source.surface,
      onSurface: source.text,
      surfaceVariant: source.surfaceMuted,
      onSurfaceVariant: source.textMuted,
      outline: source.borderStrong,
      outlineVariant: source.borderSoft,
      error: "#C73E4D",
      onError: source.textInverse,
      errorContainer: mode === "dark" ? "#4F1F27" : "#F7D8DD",
      onErrorContainer: mode === "dark" ? "#FFD9DE" : "#5A0F1B",
      inverseSurface: source.text,
      inverseOnSurface: source.background,
      inversePrimary: source.primaryStrong,
      backdrop: source.overlay,
      elevation: {
        ...baseTheme.colors.elevation,
        level0: source.background,
        level1: source.surface,
        level2: source.surfaceElevated,
        level3: source.surfaceMuted,
        level4: source.primarySurface,
        level5: source.primarySoft
      },
      primaryStrong: source.primaryStrong,
      primarySoft: source.primarySoft,
      primarySurface: source.primarySurface,
      backgroundAccent: source.backgroundAccent,
      surfaceElevated: source.surfaceElevated,
      surfaceMuted: source.surfaceMuted,
      textMuted: source.textMuted,
      borderSoft: source.borderSoft,
      borderStrong: source.borderStrong,
      success: source.success,
      warning: source.warning,
      overlay: source.overlay,
      shadow: source.shadow
    }
  };
};

const lightPaperTheme = createPaperTheme("light");
const darkPaperTheme = createPaperTheme("dark");

const { LightTheme, DarkTheme } = adaptNavigationTheme({
  reactNavigationLight: NavigationDefaultTheme,
  reactNavigationDark: NavigationDarkTheme,
  materialLight: lightPaperTheme,
  materialDark: darkPaperTheme
});

const createNavigationTheme = (
  baseTheme: NavigationTheme,
  paperTheme: AppTheme
): NavigationTheme => ({
  ...baseTheme,
  dark: paperTheme.dark,
  colors: {
    ...baseTheme.colors,
    primary: paperTheme.colors.primary,
    background: paperTheme.colors.background,
    card: paperTheme.colors.surface,
    text: paperTheme.colors.onSurface,
    border: paperTheme.colors.outlineVariant,
    notification: paperTheme.colors.primaryStrong
  }
});

export const themes = {
  light: {
    paper: lightPaperTheme,
    navigation: createNavigationTheme(LightTheme, lightPaperTheme)
  },
  dark: {
    paper: darkPaperTheme,
    navigation: createNavigationTheme(DarkTheme, darkPaperTheme)
  }
} as const;

export const getThemesForMode = (mode: ThemeMode) => themes[mode];
