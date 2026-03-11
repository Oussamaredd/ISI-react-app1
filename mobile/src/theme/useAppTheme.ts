import { useMemo } from "react";
import { useTheme } from "react-native-paper";

import type { AppTheme } from "./theme";

export const useAppTheme = () => useTheme<AppTheme>();

export const useThemedStyles = <T extends Record<string, unknown>>(
  factory: (theme: AppTheme) => T
): { [K in keyof T]: any } => {
  const theme = useAppTheme();

  return useMemo(() => factory(theme) as { [K in keyof T]: any }, [factory, theme]);
};
