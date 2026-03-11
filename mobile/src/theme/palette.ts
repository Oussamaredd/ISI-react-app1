export type ThemeMode = "light" | "dark";

type ThemePalette = {
  primary: string;
  primaryStrong: string;
  primarySoft: string;
  primarySurface: string;
  background: string;
  backgroundAccent: string;
  surface: string;
  surfaceElevated: string;
  surfaceMuted: string;
  text: string;
  textMuted: string;
  textInverse: string;
  borderSoft: string;
  borderStrong: string;
  overlay: string;
  success: string;
  warning: string;
  shadow: string;
};

const foundation = {
  blue500: "#155EEF",
  blue600: "#0F4CD6",
  blue700: "#12367A",
  blue100: "#D7E5FF",
  blue050: "#F3F7FF",
  ink950: "#05080F",
  ink900: "#111827",
  ink700: "#344054",
  ink500: "#667085",
  ink300: "#D0D5DD",
  ink200: "#E4E7EC",
  ink100: "#F2F4F7",
  white: "#FFFFFF",
  black: "#000000",
  success: "#2E8B57",
  warning: "#E3A008"
} as const;

export const palette: Record<ThemeMode, ThemePalette> = {
  light: {
    primary: foundation.blue500,
    primaryStrong: foundation.blue600,
    primarySoft: foundation.blue100,
    primarySurface: foundation.blue050,
    background: "#F7F9FC",
    backgroundAccent: "#EEF4FF",
    surface: foundation.white,
    surfaceElevated: "#FCFDFF",
    surfaceMuted: "#F4F7FC",
    text: foundation.ink900,
    textMuted: foundation.ink700,
    textInverse: foundation.white,
    borderSoft: "#D9E0EA",
    borderStrong: "#BFC9D8",
    overlay: "rgba(5, 8, 15, 0.22)",
    success: foundation.success,
    warning: foundation.warning,
    shadow: "rgba(17, 24, 39, 0.08)"
  },
  dark: {
    primary: "#7CB4FF",
    primaryStrong: "#B9D4FF",
    primarySoft: "#18345F",
    primarySurface: "#0F1D35",
    background: foundation.ink950,
    backgroundAccent: "#0A1322",
    surface: "#0F1722",
    surfaceElevated: "#151F2D",
    surfaceMuted: "#1B2738",
    text: "#F8FAFC",
    textMuted: "#B6C2D2",
    textInverse: foundation.black,
    borderSoft: "#263244",
    borderStrong: "#35455D",
    overlay: "rgba(0, 0, 0, 0.42)",
    success: "#58C88D",
    warning: "#F4C95D",
    shadow: "rgba(0, 0, 0, 0.28)"
  }
} as const;
