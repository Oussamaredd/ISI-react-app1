import type { PropsWithChildren } from "react";
import { useEffect } from "react";
import NetInfo from "@react-native-community/netinfo";
import { focusManager, onlineManager } from "@tanstack/react-query";
import { AppState, Platform, type AppStateStatus } from "react-native";

const applyFocusState = (status: AppStateStatus) => {
  if (Platform.OS !== "web") {
    focusManager.setFocused(status === "active");
  }
};

const resolveOnlineState = (
  isConnected: boolean | null,
  isInternetReachable: boolean | null
) => {
  if (typeof isInternetReachable === "boolean") {
    return isInternetReachable;
  }

  if (typeof isConnected === "boolean") {
    return isConnected;
  }

  return true;
};

export function ReactQueryLifecycleProvider({ children }: PropsWithChildren) {
  useEffect(() => {
    applyFocusState(AppState.currentState);

    const subscription = AppState.addEventListener("change", applyFocusState);

    return () => {
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    onlineManager.setEventListener((setOnline) =>
      NetInfo.addEventListener((state) => {
        setOnline(
          resolveOnlineState(state.isConnected, state.isInternetReachable)
        );
      })
    );
  }, []);

  return children;
}
