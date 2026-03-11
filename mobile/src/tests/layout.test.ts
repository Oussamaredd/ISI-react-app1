import { describe, expect, it } from "vitest";

import { resolveCitizenTabLayout } from "../theme/layout";

describe("citizen tab layout", () => {
  it("uses compact navigation on narrow phones", () => {
    const layout = resolveCitizenTabLayout(360, 0);

    expect(layout.hideScheduleTab).toBe(true);
    expect(layout.showLabels).toBe(true);
    expect(layout.edgeSwipeWidth).toBe(18);
  });

  it("keeps five primary tabs on wider phones", () => {
    const layout = resolveCitizenTabLayout(412, 0);

    expect(layout.hideScheduleTab).toBe(false);
    expect(layout.showLabels).toBe(true);
    expect(layout.edgeSwipeWidth).toBe(24);
  });

  it("includes the safe-area inset in the tab bar height", () => {
    const layoutWithoutInset = resolveCitizenTabLayout(412, 0);
    const layoutWithInset = resolveCitizenTabLayout(412, 16);

    expect(layoutWithInset.tabBarHeight).toBeGreaterThan(layoutWithoutInset.tabBarHeight);
    expect(layoutWithInset.tabBarPaddingBottom).toBe(16);
  });
});
