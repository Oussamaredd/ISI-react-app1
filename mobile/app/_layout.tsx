import { ThemeProvider } from "@react-navigation/native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";

import { AppProviders } from "@/providers/AppProviders";
import {
  ThemePreferenceProvider,
  useResolvedThemeSet,
  useThemePreference
} from "@/providers/ThemePreferenceProvider";

export const unstable_settings = {
  initialRouteName: "index"
};

function ThemedRootLayout() {
  const { paper, navigation } = useResolvedThemeSet();
  const { resolvedMode } = useThemePreference();

  return (
    <AppProviders theme={paper}>
      <ThemeProvider value={navigation}>
        <StatusBar style={resolvedMode === "dark" ? "light" : "dark"} />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="login" />
          <Stack.Screen name="signup" />
          <Stack.Screen name="forgot-password" />
          <Stack.Screen name="reset-password" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="(agent)" />
          <Stack.Screen name="(manager)" />
          <Stack.Screen name="profile" />
          <Stack.Screen name="settings" />
          <Stack.Screen name="feedback" />
          <Stack.Screen name="support" />
        </Stack>
      </ThemeProvider>
    </AppProviders>
  );
}

export default function RootLayout() {
  return (
    <ThemePreferenceProvider>
      <ThemedRootLayout />
    </ThemePreferenceProvider>
  );
}
