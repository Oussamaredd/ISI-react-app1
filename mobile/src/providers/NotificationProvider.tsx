import type { PropsWithChildren } from "react";
import { startTransition, createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Platform } from "react-native";
import Constants from "expo-constants";
import { router, useSegments } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { citizenApi, type CitizenNotificationItem } from "@api/modules/citizen";
import {
  addNotificationReceivedListener,
  addNotificationResponseListener,
  configureNotificationPresentation,
  extractNotificationRouteData,
  getLastNotificationResponse,
  getNotificationPermissionState,
  registerForPushNotifications,
  type NotificationPermissionState,
} from "@/device/notifications";
import { queryKeys } from "@/lib/queryKeys";
import { reportMobileError } from "@/monitoring/clientTelemetry";

import { useSession } from "./SessionProvider";

type NotificationProviderValue = {
  permissionState: NotificationPermissionState | null;
  registrationState: "idle" | "registering" | "registered" | "error";
  registrationError: string | null;
  lastNotification: CitizenNotificationItem | null;
  inbox: CitizenNotificationItem[];
  unreadCount: number;
  requestRegistration: () => Promise<void>;
  refreshPermissionState: () => Promise<void>;
  markNotificationRead: (notificationId: string) => Promise<void>;
};

const NotificationContext = createContext<NotificationProviderValue | null>(null);

export function NotificationProvider({ children }: PropsWithChildren) {
  const queryClient = useQueryClient();
  const { authState } = useSession();
  const segments = useSegments();
  const [permissionState, setPermissionState] = useState<NotificationPermissionState | null>(null);
  const [registrationState, setRegistrationState] = useState<NotificationProviderValue["registrationState"]>("idle");
  const [registrationError, setRegistrationError] = useState<string | null>(null);
  const [lastNotification, setLastNotification] = useState<CitizenNotificationItem | null>(null);
  const isAuthenticated = authState === "authenticated";
  const rootSegment = String(segments[0] ?? "index");
  const isPassiveSessionRoute =
    rootSegment === "index" ||
    rootSegment === "login" ||
    rootSegment === "signup" ||
    rootSegment === "forgot-password" ||
    rootSegment === "reset-password";
  const shouldActivateNotifications = isAuthenticated && !isPassiveSessionRoute;

  const inboxQuery = useQuery({
    queryKey: queryKeys.citizenNotifications(20),
    queryFn: () => citizenApi.getNotifications(20),
    enabled: shouldActivateNotifications
  });

  const refreshPermissionState = useCallback(async () => {
    try {
      const nextState = await getNotificationPermissionState();
      setPermissionState(nextState);
    } catch (error) {
      setPermissionState(null);
      void reportMobileError({
        type: "MOBILE_NOTIFICATION",
        message: error instanceof Error ? error.message : "Unable to read notification permissions",
        context: "mobile.notifications.permission.read",
        severity: "high",
        error
      });
    }
  }, []);

  const markNotificationRead = useCallback(
    async (notificationId: string) => {
      await citizenApi.markNotificationRead(notificationId);
      await queryClient.invalidateQueries({
        queryKey: queryKeys.citizenNotifications(20)
      });
    },
    [queryClient]
  );

  const requestRegistration = useCallback(async () => {
    setRegistrationState("registering");
    setRegistrationError(null);

    try {
      const registration = await registerForPushNotifications();
      setPermissionState(registration.permissionState);

      if (registration.permissionState !== "granted") {
        setRegistrationState("error");
        setRegistrationError(registration.reason);
        return;
      }

      const response = await citizenApi.registerNotificationDevice({
        provider: registration.provider,
        platform: registration.platform,
        pushToken: registration.pushToken,
        appVersion: Constants.expoConfig?.version,
        deviceLabel: Platform.OS
      });

      setRegistrationState(response.registered ? "registered" : "error");
      if (!response.registered) {
        setRegistrationError("The push device could not be registered.");
      }
      await queryClient.invalidateQueries({
        queryKey: queryKeys.notificationDevice
      });
    } catch (error) {
      setRegistrationState("error");
      setRegistrationError(error instanceof Error ? error.message : "Notification registration failed.");
      void reportMobileError({
        type: "MOBILE_NOTIFICATION",
        message: error instanceof Error ? error.message : "Notification registration failed",
        context: "mobile.notifications.register",
        severity: "high",
        error
      });
    }
  }, [queryClient]);

  useEffect(() => {
    void configureNotificationPresentation();
  }, []);

  useEffect(() => {
    if (!shouldActivateNotifications) {
      setLastNotification(null);
      setRegistrationState("idle");
      setRegistrationError(null);
      return;
    }

    void refreshPermissionState();
  }, [refreshPermissionState, shouldActivateNotifications]);

  useEffect(() => {
    if (!shouldActivateNotifications) {
      return;
    }

    const inbox = inboxQuery.data?.notifications ?? [];
    const inboxById = new Map(inbox.map((notification) => [notification.id, notification]));
    let didDispose = false;
    let receivedSubscription: { remove?: () => void } | null = null;
    let responseSubscription: { remove?: () => void } | null = null;

    const handleNotificationRoute = async (
      payload: Awaited<ReturnType<typeof getLastNotificationResponse>> | null
    ) => {
      const routeData = extractNotificationRouteData(payload);
      if (routeData.notificationId) {
        await markNotificationRead(routeData.notificationId);
      }

      if (routeData.deepLink) {
        startTransition(() => {
          router.push(routeData.deepLink as never);
        });
      }
    };

    void getLastNotificationResponse()
      .then((payload) => {
        if (!didDispose) {
          void handleNotificationRoute(payload);
        }
      })
      .catch((error) => {
        void reportMobileError({
          type: "MOBILE_NOTIFICATION",
          message: error instanceof Error ? error.message : "Unable to resume notification route",
          context: "mobile.notifications.resume",
          severity: "medium",
          error
        });
      });

    void addNotificationReceivedListener((notification) => {
      const routeData = extractNotificationRouteData({
        notification
      });
      if (routeData.notificationId) {
        const inboxMatch = inboxById.get(routeData.notificationId);
        if (inboxMatch) {
          setLastNotification(inboxMatch);
          return;
        }
      }

      setLastNotification({
        id: routeData.notificationId ?? `runtime-${Date.now()}`,
        eventType: "runtime_push",
        title: String(notification.request.content.title ?? "EcoTrack notification"),
        body: String(notification.request.content.body ?? ""),
        status: "unread",
        deepLink: routeData.deepLink,
        payload:
          notification.request.content.data &&
          typeof notification.request.content.data === "object"
            ? (notification.request.content.data as Record<string, unknown>)
            : {},
        readAt: null,
        createdAt: new Date().toISOString()
      });
    })
      .then((subscription) => {
        receivedSubscription = subscription;
      })
      .catch((error) => {
        void reportMobileError({
          type: "MOBILE_NOTIFICATION",
          message: error instanceof Error ? error.message : "Unable to attach notification listener",
          context: "mobile.notifications.listener.received",
          severity: "high",
          error
        });
      });

    void addNotificationResponseListener((response) => {
      void handleNotificationRoute(response);
    })
      .then((subscription) => {
        responseSubscription = subscription;
      })
      .catch((error) => {
        void reportMobileError({
          type: "MOBILE_NOTIFICATION",
          message: error instanceof Error ? error.message : "Unable to attach notification response listener",
          context: "mobile.notifications.listener.response",
          severity: "high",
          error
        });
      });

    return () => {
      didDispose = true;
      receivedSubscription?.remove?.();
      responseSubscription?.remove?.();
    };
  }, [inboxQuery.data?.notifications, markNotificationRead, shouldActivateNotifications]);

  useEffect(() => {
    if (
      !shouldActivateNotifications ||
      permissionState !== "granted" ||
      registrationState === "registered"
    ) {
      return;
    }

    void requestRegistration();
  }, [permissionState, registrationState, requestRegistration, shouldActivateNotifications]);

  const inbox = useMemo(() => inboxQuery.data?.notifications ?? [], [inboxQuery.data?.notifications]);
  const unreadCount = inbox.filter((notification) => notification.status !== "read").length;

  const value = useMemo<NotificationProviderValue>(
    () => ({
      permissionState,
      registrationState,
      registrationError,
      lastNotification,
      inbox,
      unreadCount,
      requestRegistration,
      refreshPermissionState,
      markNotificationRead
    }),
    [
      inbox,
      lastNotification,
      markNotificationRead,
      permissionState,
      refreshPermissionState,
      registrationError,
      registrationState,
      requestRegistration,
      unreadCount
    ]
  );

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
}

export const useNotificationController = () => {
  const context = useContext(NotificationContext);

  if (!context) {
    throw new Error("useNotificationController must be used inside NotificationProvider.");
  }

  return context;
};
