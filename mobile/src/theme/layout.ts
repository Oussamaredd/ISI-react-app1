export const CITIZEN_COMPACT_TAB_BREAKPOINT = 390;
export const MOBILE_HEADER_TOP_PADDING = 6;
export const MOBILE_HEADER_BAR_HEIGHT = 54;
export const MOBILE_HEADER_TOUCH_TARGET = 44;

export type CitizenTabLayout = {
  hideScheduleTab: boolean;
  showLabels: boolean;
  tabBarHeight: number;
  tabBarPaddingTop: number;
  tabBarPaddingBottom: number;
  tabBarPaddingHorizontal: number;
  tabBarItemMarginVertical: number;
  tabBarItemPaddingVertical: number;
  tabBarLabelFontSize: number;
  edgeSwipeWidth: number;
};

export const resolveCitizenTabLayout = (
  width: number,
  bottomInset: number
): CitizenTabLayout => {
  const hideScheduleTab = width < CITIZEN_COMPACT_TAB_BREAKPOINT;
  const showLabels = width >= 340;
  const tabBarPaddingBottom = Math.max(bottomInset, 8);
  const tabBarPaddingTop = hideScheduleTab ? 8 : 6;
  const tabBarHeight = (hideScheduleTab ? 58 : 64) + tabBarPaddingTop + tabBarPaddingBottom;

  return {
    hideScheduleTab,
    showLabels,
    tabBarHeight,
    tabBarPaddingTop,
    tabBarPaddingBottom,
    tabBarPaddingHorizontal: hideScheduleTab ? 2 : 4,
    tabBarItemMarginVertical: hideScheduleTab ? 1 : 2,
    tabBarItemPaddingVertical: hideScheduleTab ? 3 : 4,
    tabBarLabelFontSize: width < 360 ? 10 : 11,
    edgeSwipeWidth: hideScheduleTab ? 18 : 24
  };
};

export const resolveMobileHeaderOffset = (topInset: number) =>
  Math.max(MOBILE_HEADER_TOP_PADDING, topInset) + MOBILE_HEADER_BAR_HEIGHT;
