import { Tabs, usePathname, router } from "expo-router";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { TouchableOpacity, View, Text } from "react-native";
import { useColorScheme } from "nativewind";
import { useState } from "react";

import { getThemeColors } from "@/constants/theme";
import { useDeviceStore } from "@/store";
import SideMenu from "@/components/SideMenu";

export default function Layout() {
  const pathname = usePathname();
  const historyFullScreen = useDeviceStore((s) => s.historyFullScreen);
  const hideTabBar = pathname?.includes("history") && historyFullScreen;
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const colors = getThemeColors(isDark ? "dark" : "light");
  const alarmLog = useDeviceStore((s) => s.alarmLog);
  const [showMenu, setShowMenu] = useState(false);

  const defaultTabBarStyle = {
    backgroundColor: colors.surface.card,
    borderTopWidth: 1,
    borderTopColor: colors.surface.border,
    height: 68,
    paddingTop: 2,
    paddingBottom: 4,
    position: "absolute" as const,
    left: 0,
    right: 0,
    bottom: 0,
  };

  return (
    <>
    <Tabs
      initialRouteName="home"
      screenOptions={{
        tabBarActiveTintColor: colors.accent[400],
        tabBarInactiveTintColor: colors.text.muted,
        tabBarShowLabel: true,
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: "600",
          marginBottom: 4,
        },
        tabBarIconStyle: {
          marginTop: 4,
        },
        tabBarStyle: hideTabBar ? { display: "none" } : defaultTabBarStyle,
        headerShown: true,
        headerStyle: {
          backgroundColor: colors.surface.card,
          elevation: 0,
          shadowOpacity: 0,
          borderBottomWidth: 1,
          borderBottomColor: colors.surface.border,
        },
        headerTitleStyle: {
          fontFamily: "Jakarta-Bold",
          fontSize: 18,
          color: isDark ? "#F1F5F9" : "#0F172A",
        },
        headerLeft: () => (
          <TouchableOpacity
            onPress={() => setShowMenu(true)}
            style={{ marginLeft: 16, padding: 4 }}
            accessibilityLabel="Open menu"
          >
            <Ionicons name="menu" size={26} color={isDark ? "#F1F5F9" : "#0F172A"} />
          </TouchableOpacity>
        ),
        headerRight: () => (
          <TouchableOpacity
            onPress={() => router.push("/(root)/alarm-log" as any)}
            style={{ marginRight: 16, padding: 4 }}
          >
            <Ionicons name="notifications-outline" size={24} color={isDark ? "#F1F5F9" : "#0F172A"} />
            {alarmLog.length > 0 && (
              <View style={{
                position: "absolute",
                top: 2,
                right: 2,
                backgroundColor: colors.status.error,
                minWidth: 16,
                height: 16,
                borderRadius: 8,
                alignItems: "center",
                justifyContent: "center",
                paddingHorizontal: 4,
              }}>
                <Text style={{ color: "white", fontSize: 9, fontFamily: "Jakarta-Bold" }}>
                  {alarmLog.length > 99 ? "99+" : alarmLog.length}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        ),
      }}
    >
      {/* ── Core Tabs ── */}
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
        name="tracking"
        options={{
          title: "Live",
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="map-marker-radius" size={size} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="history"
        options={{
          title: "History",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="time" size={size} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="command"
        options={{
          title: "Commands",
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="console-line" size={size} color={color} />
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

      {/* Hidden screens — exist in tabs folder but not shown in tab bar */}
      <Tabs.Screen name="vehicles" options={{ href: null, title: "Vehicles" }} />
      <Tabs.Screen name="profile" options={{ href: null }} />
    </Tabs>

    {/* Global side drawer — accessible from any tab via hamburger icon */}
    <SideMenu isVisible={showMenu} onDismiss={() => setShowMenu(false)} />
  </>
  );
}
