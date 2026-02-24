import { Tabs, usePathname } from "expo-router";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useColorScheme } from "nativewind";

import { getThemeColors } from "@/constants/theme";
import { useDeviceStore } from "@/store";

export default function Layout() {
  const pathname = usePathname();
  const historyFullScreen = useDeviceStore((s) => s.historyFullScreen);
  const hideTabBar = pathname?.includes("history") && historyFullScreen;
  const { colorScheme } = useColorScheme();
  const colors = getThemeColors(colorScheme === "dark" ? "dark" : "light");

  const defaultTabBarStyle = {
    backgroundColor: colors.surface.card,
    borderTopWidth: 1,
    borderTopColor: colors.surface.border,
    height: 80,
    paddingTop: 4,
    position: "absolute" as const,
    left: 0,
    right: 0,
    bottom: 0,
  };

  return (
    <Tabs
      initialRouteName="alerts"
      screenOptions={{
        tabBarActiveTintColor: colors.accent[400],
        tabBarInactiveTintColor: colors.text.muted,
        tabBarShowLabel: true,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "600",
          marginBottom: 6,
        },
        tabBarIconStyle: {
          marginTop: 6,
        },
        tabBarStyle: hideTabBar ? { display: "none" } : defaultTabBarStyle,
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: "Home",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" size={size} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="vehicles"
        options={{
          title: "Vehicles",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="car-outline" size={size} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="history"
        options={{
          title: "History",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="time-outline" size={size} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="command"
        options={{
          title: "Command",
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons
              name="swap-horizontal"
              size={size}
              color={color}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="alerts"
        options={{
          title: "Alerts",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="notifications" size={size} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="settings-outline" size={size} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="tracking"
        options={{
          title: "Tracking",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="navigate" size={size} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="home_old"
        options={{
          href: null,
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}
