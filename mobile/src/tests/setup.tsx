import React from "react";
import { afterEach, vi } from "vitest";
import { cleanupMobileScreens } from "./test-utils";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const originalConsoleError = console.error.bind(console);
const originalConsoleWarn = console.warn.bind(console);
const suppressedConsoleErrorPatterns = [
  /not wrapped in act/i,
  /act scope, but the `act` call was not awaited/i,
];

const shouldSuppressConsoleNoise = (parts: unknown[]) => {
  const joinedMessage = parts
    .filter((part) => typeof part === "string")
    .join(" ");

  return suppressedConsoleErrorPatterns.some((pattern) => pattern.test(joinedMessage));
};

console.error = (message?: unknown, ...optionalParams: unknown[]) => {
  if (shouldSuppressConsoleNoise([message, ...optionalParams])) {
    return;
  }

  originalConsoleError(message, ...optionalParams);
};

console.warn = (message?: unknown, ...optionalParams: unknown[]) => {
  if (shouldSuppressConsoleNoise([message, ...optionalParams])) {
    return;
  }

  originalConsoleWarn(message, ...optionalParams);
};

const mockTheme = {
  dark: false,
  colors: {
    primary: "#1F6F5F",
    onPrimary: "#FFFFFF",
    primarySoft: "#D9EEE8",
    primarySurface: "#EDF7F3",
    primaryStrong: "#125246",
    background: "#F8FBFA",
    onBackground: "#10211D",
    surface: "#FFFFFF",
    onSurface: "#10211D",
    surfaceMuted: "#EEF3F1",
    surfaceElevated: "#FFFFFF",
    textMuted: "#5C6F69",
    borderSoft: "#D5E1DD",
    borderStrong: "#A6B7B1",
    success: "#2F8F62",
    warning: "#B78103",
    error: "#C73E4D",
    errorContainer: "#F7D8DD",
    overlay: "rgba(16, 33, 29, 0.18)",
    shadow: "rgba(0, 0, 0, 0.12)",
  },
  spacing: {
    xs: 6,
    sm: 12,
    md: 16,
    lg: 20,
    xl: 28,
    xxl: 32,
  },
  shape: {
    sm: 12,
    md: 18,
    lg: 24,
    xl: 32,
    pill: 999,
  },
};

const netInfoAddEventListenerSpy = vi.fn();

const createField = ({ multiline = false, search = false }: { multiline?: boolean; search?: boolean } = {}) => {
  const Field = React.forwardRef<
    { focus: () => void },
    React.PropsWithChildren<{
      accessibilityLabel?: string;
      label?: string;
      onBlur?: () => void;
      onChangeText?: (value: string) => void;
      onSubmitEditing?: () => void;
      placeholder?: string;
      right?: React.ReactNode;
      secureTextEntry?: boolean;
      value?: string;
    }>
  >(({ accessibilityLabel, label, onBlur, onChangeText, onSubmitEditing, placeholder, right, value = "" }, ref) => {
    const Component = multiline ? "textarea" : "input";

    React.useImperativeHandle(ref, () => ({
      focus: () => undefined,
    }));

    return (
      <label>
        <span>{label ?? accessibilityLabel ?? placeholder}</span>
        <Component
          aria-label={accessibilityLabel ?? label ?? placeholder}
          data-search={search || undefined}
          value={value}
          onBlur={onBlur}
          onChange={(event) => onChangeText?.(event.currentTarget.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              onSubmitEditing?.();
            }
          }}
        />
        {right}
      </label>
    );
  });

  Field.displayName = search ? "SearchField" : multiline ? "MultilineField" : "TextField";

  return Field;
};

const TextInput = Object.assign(createField(), {
  Icon: ({ icon, onPress }: { icon?: string; onPress?: () => void }) => (
    <button aria-label={icon ?? "icon"} onClick={onPress} type="button">
      {icon ?? "icon"}
    </button>
  ),
});

const Searchbar = createField({ search: true });

const Card = Object.assign(
  ({ children }: React.PropsWithChildren) => <div>{children}</div>,
  {
    Content: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
  },
);

const RadioGroupContext = React.createContext<{
  onValueChange?: (value: string) => void;
  value?: string;
}>({});

const RadioButtonItem = ({
  label,
  onPress,
  value,
}: {
  label: string;
  onPress?: () => void;
  value: string;
}) => {
  const group = React.useContext(RadioGroupContext);

  return (
    <label>
      <input
        aria-checked={group.value === value}
        aria-label={label}
        checked={group.value === value}
        type="radio"
        value={value}
        onChange={() => {
          group.onValueChange?.(value);
          onPress?.();
        }}
      />
      <span>{label}</span>
    </label>
  );
};

const RadioButtonBase = ({ onPress, status, value }: { onPress?: () => void; status?: string; value?: string }) => (
  <span
    aria-checked={status === "checked"}
    aria-label={value}
    role="radio"
    onClick={onPress}
  >
    {value}
  </span>
);

const RadioButton = Object.assign(RadioButtonBase, {
  Group: ({
    children,
    onValueChange,
    value,
  }: React.PropsWithChildren<{ onValueChange?: (value: string) => void; value?: string }>) => (
    <RadioGroupContext.Provider value={{ onValueChange, value }}>
      <div>{children}</div>
    </RadioGroupContext.Provider>
  ),
  Item: RadioButtonItem,
});

afterEach(() => {
  cleanupMobileScreens();
});

vi.mock("@tanstack/react-query", async () => {
  const ReactModule = await import("react");
  const React = ReactModule.default ?? ReactModule;
  const focusManager = {
    setFocused: vi.fn(),
  };
  const onlineManager = {
    setEventListener: vi.fn(),
  };

  const createQueryClient = () => ({
    clear: vi.fn(),
    invalidateQueries: vi.fn().mockResolvedValue(undefined),
  });

  const sharedQueryClient = createQueryClient();

  const useQuery = <TData,>({
    queryKey,
    enabled = true,
    queryFn,
  }: {
    queryKey?: unknown;
    enabled?: boolean;
    queryFn: () => Promise<TData> | TData;
  }) => {
    const [data, setData] = React.useState<TData | undefined>(undefined);
    const [error, setError] = React.useState<unknown>(null);
    const [isLoading, setIsLoading] = React.useState(enabled);
    const [isError, setIsError] = React.useState(false);
    const queryFnRef = React.useRef(queryFn);

    queryFnRef.current = queryFn;

    const serializedQueryKey = JSON.stringify(queryKey ?? null);

    const runQuery = React.useCallback(async () => {
      if (!enabled) {
        setIsLoading(false);
        setIsError(false);
        setError(null);
        return {
          data: undefined,
        };
      }

      setIsLoading(true);
      setIsError(false);
      setError(null);

      try {
        const result = await queryFnRef.current();
        setData(result);
        setIsLoading(false);
        return {
          data: result,
        };
      } catch (queryError) {
        setIsError(true);
        setError(queryError);
        setIsLoading(false);
        throw queryError;
      }
    }, [enabled]);

    React.useEffect(() => {
      void runQuery().catch(() => undefined);
    }, [runQuery, serializedQueryKey]);

    return {
      data,
      error,
      isError,
      isLoading,
      refetch: runQuery,
    };
  };

  const useMutation = <TResult, TVariables>({
    mutationFn,
    onSuccess,
  }: {
    mutationFn: (variables: TVariables) => Promise<TResult> | TResult;
    onSuccess?: (result: TResult, variables: TVariables) => Promise<void> | void;
  }) => {
    const [isPending, setIsPending] = React.useState(false);

    const mutateAsync = React.useCallback(
      async (variables: TVariables) => {
        setIsPending(true);

        try {
          const result = await mutationFn(variables);
          await onSuccess?.(result, variables);
          return result;
        } finally {
          setIsPending(false);
        }
      },
      [mutationFn, onSuccess],
    );

    return {
      isPending,
      mutate: (variables: TVariables) => {
        void mutateAsync(variables);
      },
      mutateAsync,
    };
  };

  return {
    QueryClient: class {
      clear = sharedQueryClient.clear;
      invalidateQueries = sharedQueryClient.invalidateQueries;
    },
    QueryClientProvider: ({ children }: React.PropsWithChildren) => <>{children}</>,
    focusManager,
    onlineManager,
    useMutation,
    useQuery,
    useQueryClient: () => sharedQueryClient,
  };
});

vi.mock("expo-router", () => ({
  router: {
    push: vi.fn(),
    replace: vi.fn(),
  },
  useSegments: () => ["(tabs)"],
}));

vi.mock("react-native-paper", () => ({
  ActivityIndicator: ({ children }: React.PropsWithChildren) => <div role="status">{children ?? "Loading"}</div>,
  Button: ({
    accessibilityLabel,
    children,
    disabled,
    onPress,
  }: React.PropsWithChildren<{ accessibilityLabel?: string; disabled?: boolean; onPress?: () => void }>) => (
    <button
      aria-label={accessibilityLabel ?? (typeof children === "string" ? children : undefined)}
      disabled={disabled}
      onClick={onPress}
      type="button"
    >
      {children}
    </button>
  ),
  Card,
  Chip: ({
    children,
    onPress,
  }: React.PropsWithChildren<{ onPress?: () => void }>) => (
    <button onClick={onPress} type="button">
      {children}
    </button>
  ),
  HelperText: ({
    children,
    type,
    visible,
  }: React.PropsWithChildren<{ type?: string; visible?: boolean }>) =>
    visible === false ? null : <p role={type === "error" ? "alert" : undefined}>{children}</p>,
  IconButton: ({ icon, onPress }: { icon?: string; onPress?: () => void }) => (
    <button aria-label={icon ?? "icon"} onClick={onPress} type="button">
      {icon ?? "icon"}
    </button>
  ),
  PaperProvider: ({ children }: React.PropsWithChildren) => <>{children}</>,
  Portal: ({ children }: React.PropsWithChildren) => <>{children}</>,
  ProgressBar: ({ progress = 0 }: { progress?: number }) => <progress max={1} value={progress} />,
  RadioButton,
  Searchbar,
  SegmentedButtons: ({
    buttons,
    onValueChange,
  }: {
    buttons: { label: string; value: string }[];
    onValueChange?: (value: string) => void;
    value?: string;
  }) => (
    <div>
      {buttons.map((button) => (
        <button key={button.value} onClick={() => onValueChange?.(button.value)} type="button">
          {button.label}
        </button>
      ))}
    </div>
  ),
  Surface: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
  Switch: ({ onValueChange, value }: { onValueChange?: (value: boolean) => void; value?: boolean }) => (
    <label>
      <input
        aria-label="toggle"
        checked={Boolean(value)}
        onChange={(event) => onValueChange?.(event.currentTarget.checked)}
        type="checkbox"
      />
    </label>
  ),
  Text: ({ children }: React.PropsWithChildren) => <span>{children}</span>,
  TextInput,
  useTheme: () => mockTheme,
}));

vi.mock("@expo/vector-icons", () => ({
  MaterialCommunityIcons: ({ name }: { name?: string }) => <span>{name ?? "icon"}</span>,
}));

vi.mock("@react-native-community/netinfo", () => ({
  default: {
    addEventListener: netInfoAddEventListenerSpy,
  },
}));

vi.mock("react-native-safe-area-context", () => ({
  SafeAreaProvider: ({ children }: React.PropsWithChildren) => <>{children}</>,
  SafeAreaView: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
  useSafeAreaInsets: () => ({
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
  }),
}));

vi.mock("@/components/ScreenContainer", () => ({
  ScreenContainer: ({
    actions,
    children,
    description,
    title,
  }: React.PropsWithChildren<{ actions?: React.ReactNode; description?: string; title: string }>) => (
    <section>
      <h1>{title}</h1>
      {description ? <p>{description}</p> : null}
      {actions}
      <div>{children}</div>
    </section>
  ),
}));

vi.mock("@/components/InfoCard", () => ({
  InfoCard: ({
    caption,
    children,
    title,
  }: React.PropsWithChildren<{ caption?: string; title: string }>) => (
    <section>
      <h2>{title}</h2>
      {caption ? <p>{caption}</p> : null}
      <div>{children}</div>
    </section>
  ),
}));

vi.mock("@/components/BottomSheet", () => ({
  BottomSheet: ({
    children,
    footer,
    subtitle,
    title,
    visible,
  }: React.PropsWithChildren<{ footer?: React.ReactNode; subtitle?: string; title: string; visible: boolean }>) =>
    visible ? (
      <div>
        <h2>{title}</h2>
        {subtitle ? <p>{subtitle}</p> : null}
        <div>{children}</div>
        {footer}
      </div>
    ) : null,
}));

vi.mock("@/components/AppLogoMark", () => ({
  AppLogoMark: () => <span>EcoTrack</span>,
}));

vi.mock("@/components/ProfileAvatar", () => ({
  ProfileAvatar: ({ accessibilityLabel, name, onPress }: { accessibilityLabel?: string; name?: string; onPress?: () => void }) => (
    <button aria-label={accessibilityLabel ?? name ?? "profile"} onClick={onPress} type="button">
      {name ?? "profile"}
    </button>
  ),
}));
