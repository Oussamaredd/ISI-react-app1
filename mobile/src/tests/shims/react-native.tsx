import React from "react";

type BasicProps = React.PropsWithChildren<{
  accessibilityLabel?: string;
  accessibilityRole?: string;
  hitSlop?: number;
  onPress?: () => void;
  pointerEvents?: string;
  style?: unknown;
}>;

const normalizeChildren = (
  children: React.ReactNode | ((state: { pressed: boolean }) => React.ReactNode)
) => {
  if (typeof children === "function") {
    return children({ pressed: false });
  }

  return children;
};

const toDomProps = (props: BasicProps) => ({
  "aria-label": props.accessibilityLabel,
  role: props.accessibilityRole,
});

export const View = ({ children, ...props }: BasicProps) => (
  <div {...toDomProps(props)}>{normalizeChildren(children)}</div>
);

export const ScrollView = React.forwardRef<
  { scrollTo: (options?: { y?: number; animated?: boolean }) => void },
  BasicProps
>(({ children, ...props }, ref) => {
  React.useImperativeHandle(ref, () => ({
    scrollTo: () => undefined,
  }));

  return <div {...toDomProps(props)}>{normalizeChildren(children)}</div>;
});
ScrollView.displayName = "ScrollView";

export const Pressable = ({ children, onPress, ...props }: BasicProps) => (
  <button type="button" onClick={onPress} {...toDomProps(props)}>
    {normalizeChildren(children)}
  </button>
);

export const Image = ({
  accessibilityLabel,
  source,
}: {
  accessibilityLabel?: string;
  source?: { uri?: string };
}) => <img alt={accessibilityLabel ?? source?.uri ?? "image"} src={source?.uri} />;

export const StyleSheet = {
  absoluteFillObject: {},
  create: <T,>(styles: T) => styles,
};

class AnimatedValue {
  value: number;

  constructor(value: number) {
    this.value = value;
  }

  setValue(nextValue: number) {
    this.value = nextValue;
  }

  interpolate({
    outputRange,
  }: {
    inputRange: number[];
    outputRange: (number | string)[];
  }) {
    return outputRange[0] ?? 0;
  }

  stopAnimation(callback?: (value: number) => void) {
    callback?.(this.value);
  }
}

const createAnimationHandle = () => ({
  start: (callback?: (result: { finished: boolean }) => void) => {
    callback?.({ finished: true });
  },
  stop: () => undefined,
  reset: () => undefined,
});

export const Animated = {
  Value: AnimatedValue,
  View,
  loop: () => createAnimationHandle(),
  sequence: () => createAnimationHandle(),
  timing: () => createAnimationHandle(),
  multiply: () => 0,
};

export const Platform = {
  OS: "web",
  select: <T,>(options: { ios?: T; android?: T; web?: T; default?: T }) =>
    options.web ?? options.ios ?? options.android ?? options.default,
};

export type AppStateStatus = "active" | "background" | "inactive";

export const AppState = {
  currentState: "active" as AppStateStatus,
  addEventListener: () => ({
    remove: () => undefined,
  }),
};

export const Vibration = {
  vibrate: () => undefined,
};

export const useWindowDimensions = () => ({
  width: 390,
  height: 844,
  scale: 1,
  fontScale: 1,
});
