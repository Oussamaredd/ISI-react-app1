import Constants from "expo-constants";
import { Platform } from "react-native";

export type NotificationPermissionState =
  | "granted"
  | "denied"
  | "undetermined"
  | "development-build-required"
  | "unsupported";

export const getNotificationPermissionState = async (): Promise<NotificationPermissionState> => {
  if (Platform.OS === "web") {
    return "unsupported";
  }

  if (Constants.executionEnvironment === "storeClient") {
    return "development-build-required";
  }

  const notifications = await import("expo-notifications");
  const settings = await notifications.getPermissionsAsync();
  return settings.status as NotificationPermissionState;
};

export const formatNotificationPermissionState = (
  state?: NotificationPermissionState | null
) => {
  switch (state) {
    case "granted":
      return "Granted";
    case "denied":
      return "Denied";
    case "undetermined":
      return "Not requested yet";
    case "development-build-required":
      return "Expo Go cannot test remote push. Use a development build.";
    case "unsupported":
      return "Unavailable on web";
    default:
      return "Unknown";
  }
};
