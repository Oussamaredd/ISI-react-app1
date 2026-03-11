import type { ColorSchemeName } from "react-native";

import type { ThemeMode } from "./palette";

export type ThemePreference = "system" | ThemeMode;

export const THEME_PREFERENCE_STORAGE_KEY = "ecotrack.mobile.theme-preference";

export const isThemePreference = (value: string | null): value is ThemePreference =>
  value === "system" || value === "light" || value === "dark";

export const resolveThemeMode = (
  preference: ThemePreference,
  systemColorScheme: ColorSchemeName
): ThemeMode => {
  if (preference === "light" || preference === "dark") {
    return preference;
  }

  return systemColorScheme === "dark" ? "dark" : "light";
};
