import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Redirect, Tabs } from "expo-router";
import { useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppStateScreen } from "@/components/AppStateScreen";
import { hasCitizenAccess } from "@/lib/authz";
import { resolveAuthenticatedHomeRoute } from "@/lib/roleRoutes";
import { useSession } from "@/providers/SessionProvider";
import { resolveCitizenTabLayout } from "@/theme/layout";
import { useAppTheme } from "@/theme/useAppTheme";

export default function TabsLayout() {
  const { authState, user } = useSession();
  const theme = useAppTheme();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const tabLayout = resolveCitizenTabLayout(width, insets.bottom);

  if (authState === "unknown") {
    return (
      <AppStateScreen
        title="Opening citizen tools"
        description="EcoTrack is confirming access to the citizen lane."
        isBusy
      />
    );
  }

  if (authState !== "authenticated") {
    return <Redirect href="/login" />;
  }

  if (!hasCitizenAccess(user)) {
    return <Redirect href={resolveAuthenticatedHomeRoute(user)} />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        sceneStyle: {
          backgroundColor: theme.colors.background
        },
        tabBarHideOnKeyboard: true,
        tabBarShowLabel: tabLayout.showLabels,
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopWidth: 1,
          borderTopColor: theme.colors.outlineVariant,
          height: tabLayout.tabBarHeight,
          paddingTop: tabLayout.tabBarPaddingTop,
          paddingBottom: tabLayout.tabBarPaddingBottom,
          paddingHorizontal: tabLayout.tabBarPaddingHorizontal
        },
        tabBarItemStyle: {
          minWidth: 0,
          flex: 1,
          marginHorizontal: 0,
          marginVertical: tabLayout.tabBarItemMarginVertical,
          paddingHorizontal: 0,
          paddingVertical: tabLayout.tabBarItemPaddingVertical,
          borderRadius: 12
        },
        tabBarLabelStyle: {
          fontSize: tabLayout.tabBarLabelFontSize,
          fontWeight: "600"
        },
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textMuted
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarLabel: "Home",
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="view-dashboard-outline" color={color} size={size} />
          )
        }}
      />
      <Tabs.Screen
        name="report"
        options={{
          title: "Report",
          tabBarLabel: "Report",
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="alert-circle-outline" color={color} size={size} />
          )
        }}
      />
      <Tabs.Screen
        name="challenges"
        options={{
          title: "Challenges",
          tabBarLabel: "Challenges",
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="star-circle-outline" color={color} size={size} />
          )
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: "History",
          tabBarLabel: "History",
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="history" color={color} size={size} />
          )
        }}
      />
      <Tabs.Screen
        name="schedule"
        options={{
          title: "Schedule",
          href: tabLayout.hideScheduleTab ? null : undefined,
          tabBarLabel: "Schedule",
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="calendar-clock-outline" color={color} size={size} />
          )
        }}
      />
    </Tabs>
  );
}
