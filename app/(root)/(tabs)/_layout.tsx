import { Tabs, usePathname } from "expo-router";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";

import { useDeviceStore } from "@/store";

const defaultTabBarStyle = {
  backgroundColor: "rgba(26, 42, 58, 0.95)",
  borderTopWidth: 1,
  borderTopColor: "#5BB8E8",
  height: 80,
  paddingTop: 4,
  position: "absolute" as const,
  left: 0,
  right: 0,
  bottom: 0,
};

export default function Layout() {
  const pathname = usePathname();
  const historyFullScreen = useDeviceStore((s) => s.historyFullScreen);
  const hideTabBar = pathname?.includes("history") && historyFullScreen;

  return (
    <Tabs
      initialRouteName="alerts"
      screenOptions={{
        tabBarActiveTintColor: "white",
        tabBarInactiveTintColor: "#A8D8F0",
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
        name="home_old"
        options={{
          href: null,
        }}
      />

      <Tabs.Screen
        name="tracking"
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
