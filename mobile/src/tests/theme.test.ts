import { describe, expect, it } from "vitest";

import { palette } from "../theme/palette";
import { isThemePreference, resolveThemeMode } from "../theme/themePreference";

describe("mobile theme system", () => {
  it("resolves the expected theme mode from preference and system appearance", () => {
    expect(resolveThemeMode("light", "dark")).toBe("light");
    expect(resolveThemeMode("dark", "light")).toBe("dark");
    expect(resolveThemeMode("system", "dark")).toBe("dark");
    expect(resolveThemeMode("system", null)).toBe("light");
  });

  it("accepts only supported theme preferences", () => {
    expect(isThemePreference("system")).toBe(true);
    expect(isThemePreference("light")).toBe(true);
    expect(isThemePreference("dark")).toBe(true);
    expect(isThemePreference("blue")).toBe(false);
    expect(isThemePreference(null)).toBe(false);
  });

  it("keeps distinct light and dark palette roles", () => {
    expect(palette.light.background).not.toBe(palette.dark.background);
    expect(palette.light.primary).not.toBe(palette.dark.primary);
    expect(palette.light.text).not.toBe(palette.dark.text);
    expect(palette.light.surface).not.toBe(palette.dark.surface);
  });
});
