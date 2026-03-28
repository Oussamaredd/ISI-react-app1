import { screen } from "@testing-library/dom";
import NetInfo, { type NetInfoState } from "@react-native-community/netinfo";
import { focusManager, onlineManager } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ReactQueryLifecycleProvider } from "@/providers/ReactQueryLifecycleProvider";
import { AppState, Platform } from "react-native";
import { renderMobileScreen } from "./test-utils";

type AppLifecycleStatus = "active" | "background" | "inactive";

describe("ReactQueryLifecycleProvider", () => {
  const originalPlatform = Platform.OS;
  const originalAppState = AppState.currentState;
  const originalAddEventListener = AppState.addEventListener;

  afterEach(() => {
    Platform.OS = originalPlatform;
    AppState.currentState = originalAppState;
    AppState.addEventListener = originalAddEventListener;
  });

  it("syncs focus state with native app lifecycle events", () => {
    const removeSpy = vi.fn();
    let appStateListener: ((status: AppLifecycleStatus) => void) | null = null;

    Platform.OS = "ios";
    AppState.currentState = "background";
    AppState.addEventListener = vi.fn((event: "change", listener: (status: AppLifecycleStatus) => void) => {
      expect(event).toBe("change");
      appStateListener = listener;

      return {
        remove: removeSpy,
      };
    });

    const view = renderMobileScreen(
      <ReactQueryLifecycleProvider>
        <div>child</div>
      </ReactQueryLifecycleProvider>,
    );

    expect(screen.getByText("child")).toBeTruthy();
    expect(focusManager.setFocused).toHaveBeenCalledWith(false);

    expect(appStateListener).toBeTruthy();
    const lifecycleListener = appStateListener as unknown as (status: AppLifecycleStatus) => void;
    lifecycleListener("active");

    expect(focusManager.setFocused).toHaveBeenLastCalledWith(true);

    view.unmount();

    expect(removeSpy).toHaveBeenCalledTimes(1);
  });

  it("maps NetInfo reachability changes into the online manager listener", () => {
    let networkListener: ((state: NetInfoState) => void) | null = null;
    const addEventListenerMock = NetInfo.addEventListener as unknown as ReturnType<typeof vi.fn>;
    const setEventListenerMock = onlineManager.setEventListener as unknown as ReturnType<typeof vi.fn>;

    addEventListenerMock.mockImplementation((listener: (state: NetInfoState) => void) => {
      networkListener = listener;
      return () => undefined;
    });

    renderMobileScreen(
      <ReactQueryLifecycleProvider>
        <div>network child</div>
      </ReactQueryLifecycleProvider>,
    );

    expect(screen.getByText("network child")).toBeTruthy();
    expect(setEventListenerMock).toHaveBeenCalled();

    const setOnline = vi.fn();
    const attachListener = setEventListenerMock.mock.calls[setEventListenerMock.mock.calls.length - 1]?.[0] as
      | ((listener: (isOnline: boolean) => void) => void)
      | undefined;
    const emitNetworkState = (state: {
      isConnected: boolean | null;
      isInternetReachable: boolean | null;
    }) => {
      networkListener?.({
        type: "unknown",
        details: null,
        ...state,
      } as NetInfoState);
    };

    expect(attachListener).toBeTruthy();
    attachListener?.(setOnline);
    emitNetworkState({
      isConnected: null,
      isInternetReachable: null,
    });
    emitNetworkState({
      isConnected: true,
      isInternetReachable: false,
    });
    emitNetworkState({
      isConnected: false,
      isInternetReachable: null,
    });

    expect(setOnline).toHaveBeenNthCalledWith(1, true);
    expect(setOnline).toHaveBeenNthCalledWith(2, false);
    expect(setOnline).toHaveBeenNthCalledWith(3, false);
  });
});
