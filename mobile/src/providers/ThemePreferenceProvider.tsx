import type { PropsWithChildren } from "react";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useColorScheme } from "react-native";
import * as SecureStore from "expo-secure-store";

import { getThemesForMode } from "@/theme/theme";
import {
  THEME_PREFERENCE_STORAGE_KEY,
  isThemePreference,
  resolveThemeMode,
  type ThemePreference
} from "@/theme/themePreference";

type ThemePreferenceContextValue = {
  preference: ThemePreference;
  resolvedMode: "light" | "dark";
  setPreference: (preference: ThemePreference) => void;
  toggleThemeMode: () => void;
};

const ThemePreferenceContext = createContext<ThemePreferenceContextValue | null>(null);

export function ThemePreferenceProvider({ children }: PropsWithChildren) {
  const systemColorScheme = useColorScheme();
  const [preference, setPreference] = useState<ThemePreference>("light");
  const [hasHydrated, setHasHydrated] = useState(false);
  const resolvedMode = resolveThemeMode(preference, systemColorScheme);

  useEffect(() => {
    let isMounted = true;

    const loadPreference = async () => {
      try {
        const storedValue = await SecureStore.getItemAsync(THEME_PREFERENCE_STORAGE_KEY);

        if (isMounted && isThemePreference(storedValue)) {
          setPreference(storedValue);
        }
      } catch {
        // Theme persistence is optional. Keep the in-memory fallback.
      } finally {
        if (isMounted) {
          setHasHydrated(true);
        }
      }
    };

    void loadPreference();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!hasHydrated) {
      return;
    }

    const persistPreference = async () => {
      try {
        await SecureStore.setItemAsync(THEME_PREFERENCE_STORAGE_KEY, preference);
      } catch {
        // Ignore persistence errors and keep the runtime preference.
      }
    };

    void persistPreference();
  }, [hasHydrated, preference]);

  const value = useMemo<ThemePreferenceContextValue>(
    () => ({
      preference,
      resolvedMode,
      setPreference,
      toggleThemeMode: () => {
        setPreference((currentPreference) =>
          resolveThemeMode(currentPreference, systemColorScheme) === "dark" ? "light" : "dark"
        );
      }
    }),
    [preference, resolvedMode, systemColorScheme]
  );

  return (
    <ThemePreferenceContext.Provider value={value}>
      {children}
    </ThemePreferenceContext.Provider>
  );
}

export const useThemePreference = () => {
  const context = useContext(ThemePreferenceContext);

  if (!context) {
    throw new Error("useThemePreference must be used inside ThemePreferenceProvider.");
  }

  return context;
};

export const useResolvedThemeSet = () => {
  const { resolvedMode } = useThemePreference();

  return getThemesForMode(resolvedMode);
};
