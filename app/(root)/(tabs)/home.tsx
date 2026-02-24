import { useUser, useAuth } from "@clerk/clerk-expo";
import * as Location from "expo-location";
import { router } from "expo-router";
import { useState, useEffect, useMemo } from "react";
import {
  Text,
  View,
  TouchableOpacity,
  Image,
  ScrollView,
  ActivityIndicator,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";

import { useColorScheme } from "nativewind";
import { icons } from "@/constants";
import { getThemeColors } from "@/constants/theme";
import { fetchAPI, useFetch } from "@/lib/fetch";
import { useLocationStore, useDeviceStore } from "@/store";
import { Device } from "@/types/type";

const { width } = Dimensions.get("window");

const Home = () => {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const colors = getThemeColors(isDark ? "dark" : "light");
  const { user } = useUser();
  const { signOut } = useAuth();

  const setUserLocation = useLocationStore((s) => s.setUserLocation);
  const devices = useDeviceStore((s) => s.devices);
  const setDevices = useDeviceStore((s) => s.setDevices);

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 18) return "Good Afternoon";
    return "Good Evening";
  }, []);

  const stats = useMemo(() => {
    if (!devices || devices.length === 0) {
      return { total: 0, moving: 0, idle: 0, parked: 0, nr: 0 };
    }
    const moving = devices.filter((d) => d.status === "online" && d.speed && d.speed > 5).length;
    const idle = devices.filter((d) => d.status === "online" && (!d.speed || d.speed <= 5)).length;
    const parked = devices.filter((d) => d.status === "offline").length;
    const nr = 0;
    return {
      total: devices.length,
      moving,
      idle,
      parked,
      nr,
    };
  }, [devices]);

  // Sync user to backend on load
  useEffect(() => {
    if (user) {
      const safeName =
        user.fullName ||
        [user.firstName, user.lastName].filter(Boolean).join(" ") ||
        user.primaryEmailAddress?.emailAddress?.split("@")[0] ||
        "Unknown";

      fetchAPI("/api/auth/sync", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          clerk_user_id: user.id,
          email: user.primaryEmailAddress?.emailAddress,
          name: safeName,
        }),
      }).catch((err) => console.error("Auth sync failed", err));
    }
  }, [user]);

  // Fetch devices
  const {
    data: devicesData,
    loading,
    refetch,
  } = useFetch<{ data: Device[] }>("/api/devices/");

  useEffect(() => {
    if (devicesData?.data) {
      setDevices(devicesData.data);
    }
  }, [devicesData]);

  // Request user location permissions
  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        return;
      }

      let location = await Location.getCurrentPositionAsync({});
      const address = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });

      setUserLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        address: `${address[0].name}, ${address[0].region}`,
      });
    })();
  }, []);

  const handleNavigation = (screen: string) => {
    // Navigate to different screens/tabs
    switch (screen) {
      case "tracking":
        router.push("/(root)/(tabs)/tracking");
        break;
      case "vehicles":
        router.push("/(root)/(tabs)/vehicles");
        break;
      case "alerts":
        router.push("/(root)/(tabs)/alerts");
        break;
      case "settings":
        router.push("/(root)/(tabs)/settings");
        break;
      default:
        break;
    }
  };

  return (
    <View className={`flex-1 ${isDark ? "bg-slate-900" : "bg-surface-light"}`}>
      {/* Fixed Top Bar */}
      <View className={`pt-10 ${isDark ? "bg-slate-800" : "bg-accent-200"}`}>
        <View className="px-5 py-2">
          <View className="flex-row justify-between items-center">
            {/* Hamburger Menu Icon */}
            <TouchableOpacity className="p-2">
              <Ionicons name="menu" size={28} color={colors.text.primary} />
            </TouchableOpacity>
            <Text className={`text-xl font-JakartaBold ${isDark ? "text-slate-100" : "text-slate-900"}`}>Dashboard</Text>
            {/* Settings Gear Icon */}
            <TouchableOpacity className="p-2" onPress={() => router.push("/(root)/(tabs)/settings")}>
              <Ionicons name="settings-outline" size={26} color={colors.text.primary} />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        {/* User Profile Section */}
        <View className={`pb-6 ${isDark ? "bg-slate-800" : "bg-accent-200"}`}>
          <View className="px-5">
            <View className="flex-row items-center mb-5">
              <View className={`w-20 h-20 rounded-full items-center justify-center mr-4 border ${isDark ? "bg-slate-700 border-slate-600" : "bg-accent-100 border-accent-400"}`}>
                {user?.imageUrl ? (
                  <Image
                    source={{ uri: user.imageUrl }}
                    className="w-full h-full rounded-full"
                  />
                ) : (
                  <Image source={icons.person} className="w-12 h-12" tintColor={colors.accent[400]} />
                )}
              </View>
              <View className="flex-1">
                <Text className={`text-base font-JakartaMedium ${isDark ? "text-slate-300" : "text-slate-600"}`}>
                  {greeting}
                </Text>
                <Text className={`text-xl font-JakartaBold ${isDark ? "text-slate-100" : "text-slate-900"}`}>
                  {user?.fullName || user?.firstName || "User"}
                </Text>
              </View>
              <View className="flex-row">
                <TouchableOpacity className="w-10 h-10 items-center justify-center mr-2">
                  <Image source={icons.chat} className="w-6 h-6" tintColor={colors.accent[500]} />
                </TouchableOpacity>
                <TouchableOpacity
                  className="w-10 h-10 items-center justify-center"
                  onPress={() => router.push("/(root)/(tabs)/settings")}
                >
                  <Image source={icons.profile} className="w-6 h-6" tintColor={colors.accent[500]} />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>

        {/* Statistics Card */}
        <View className="px-5 -mt-2">
          <View className={`rounded-2xl p-5 border shadow-sm ${isDark ? "bg-slate-800 border-slate-700" : "bg-white border-surface-border"}`}>
            {/* Header */}
            <View className="flex-row justify-between items-center mb-4">
              <View className={`px-4 py-2 rounded-full border ${isDark ? "bg-slate-700 border-slate-600" : "bg-accent-100 border-accent-400"}`}>
                <Text className={`font-JakartaBold text-sm ${isDark ? "text-slate-200" : "text-slate-900"}`}>
                  Total Vehicles: {stats.total}
                </Text>
              </View>
              <TouchableOpacity onPress={refetch}>
                <Image source={icons.search} className="w-6 h-6" tintColor={colors.accent[400]} />
              </TouchableOpacity>
            </View>

            {/* Stats Grid */}
            {loading ? (
              <ActivityIndicator size="small" color={colors.accent[400]} />
            ) : (
              <View className="flex-row justify-between">
                {/* Moving */}
                <View className="items-center">
                  <View className={`w-20 h-20 rounded-full items-center justify-center mb-2 border-[6px] border-accent-400 ${isDark ? "bg-slate-700" : "bg-accent-50"}`}>
                    <Text className={`text-2xl font-JakartaBold ${isDark ? "text-slate-100" : "text-slate-900"}`}>{stats.moving}</Text>
                  </View>
                  <Text className={`text-sm font-JakartaMedium ${isDark ? "text-slate-300" : "text-slate-700"}`}>Moving</Text>
                </View>

                {/* Idle */}
                <View className="items-center">
                  <View className={`w-20 h-20 rounded-full items-center justify-center mb-2 border-[6px] border-accent-300 ${isDark ? "bg-slate-700" : "bg-accent-50"}`}>
                    <Text className={`text-2xl font-JakartaBold ${isDark ? "text-slate-100" : "text-slate-900"}`}>{stats.idle}</Text>
                  </View>
                  <Text className={`text-sm font-JakartaMedium ${isDark ? "text-slate-300" : "text-slate-700"}`}>Idle</Text>
                </View>

                {/* Parked */}
                <View className="items-center">
                  <View className={`w-20 h-20 rounded-full items-center justify-center mb-2 border-[6px] border-success-400 ${isDark ? "bg-slate-700" : "bg-accent-50"}`}>
                    <Text className={`text-2xl font-JakartaBold ${isDark ? "text-slate-100" : "text-slate-900"}`}>{stats.parked}</Text>
                  </View>
                  <Text className={`text-sm font-JakartaMedium ${isDark ? "text-slate-300" : "text-slate-700"}`}>Parked</Text>
                </View>

                {/* NR */}
                <View className="items-center">
                  <View className={`w-20 h-20 rounded-full items-center justify-center mb-2 border-[6px] border-status-muted ${isDark ? "bg-slate-700" : "bg-accent-50"}`}>
                    <Text className={`text-2xl font-JakartaBold ${isDark ? "text-slate-100" : "text-slate-900"}`}>{stats.nr}</Text>
                  </View>
                  <Text className={`text-sm font-JakartaMedium ${isDark ? "text-slate-300" : "text-slate-700"}`}>NR</Text>
                </View>
              </View>
            )}
          </View>
        </View>

        {/* Action Cards Grid */}
        <View className="px-5 mt-5">
          <View className="flex-row flex-wrap justify-between">
            {/* Live Tracking */}
            <TouchableOpacity
              onPress={() => handleNavigation("tracking")}
              className={`rounded-2xl p-6 mb-4 items-center justify-center border shadow-sm ${isDark ? "bg-slate-800 border-slate-700" : "bg-white border-surface-border"}`}
              style={{ width: (width - 50) / 2, height: 160 }}
            >
              <View className={`w-16 h-16 rounded-full items-center justify-center mb-3 border ${isDark ? "bg-slate-700 border-slate-600" : "bg-accent-100 border-accent-400"}`}>
                <Image source={icons.marker} className="w-10 h-10" tintColor={colors.accent[400]} />
              </View>
              <Text className={`text-base font-JakartaBold ${isDark ? "text-slate-100" : "text-slate-900"}`}>Live Tracking</Text>
            </TouchableOpacity>

            {/* Vehicle List */}
            <TouchableOpacity
              onPress={() => handleNavigation("vehicles")}
              className={`rounded-2xl p-6 mb-4 items-center justify-center border shadow-sm ${isDark ? "bg-slate-800 border-slate-700" : "bg-white border-surface-border"}`}
              style={{ width: (width - 50) / 2, height: 160 }}
            >
              <View className={`w-16 h-16 rounded-full items-center justify-center mb-3 border ${isDark ? "bg-slate-700 border-slate-600" : "bg-accent-100 border-accent-400"}`}>
                <Image source={icons.list} className="w-10 h-10" tintColor={colors.accent[400]} />
              </View>
              <Text className={`text-base font-JakartaBold ${isDark ? "text-slate-100" : "text-slate-900"}`}>Vehicle List</Text>
            </TouchableOpacity>

            {/* Alerts */}
            <TouchableOpacity
              onPress={() => handleNavigation("alerts")}
              className={`rounded-2xl p-6 mb-4 items-center justify-center border shadow-sm ${isDark ? "bg-slate-800 border-slate-700" : "bg-white border-surface-border"}`}
              style={{ width: (width - 50) / 2, height: 160 }}
            >
              <View className={`w-16 h-16 rounded-full items-center justify-center mb-3 border ${isDark ? "bg-slate-700 border-slate-600" : "bg-accent-100 border-accent-400"}`}>
                <Image source={icons.star} className="w-10 h-10" tintColor={colors.accent[400]} />
              </View>
              <Text className={`text-base font-JakartaBold ${isDark ? "text-slate-100" : "text-slate-900"}`}>Alerts</Text>
            </TouchableOpacity>

            {/* Settings */}
            <TouchableOpacity
              onPress={() => handleNavigation("settings")}
              className={`rounded-2xl p-6 mb-4 items-center justify-center border shadow-sm ${isDark ? "bg-slate-800 border-slate-700" : "bg-white border-surface-border"}`}
              style={{ width: (width - 50) / 2, height: 160 }}
            >
              <View className={`w-16 h-16 rounded-full items-center justify-center mb-3 border ${isDark ? "bg-slate-700 border-slate-600" : "bg-accent-100 border-accent-400"}`}>
                <Image source={icons.profile} className="w-10 h-10" tintColor={colors.accent[400]} />
              </View>
              <Text className={`text-base font-JakartaBold ${isDark ? "text-slate-100" : "text-slate-900"}`}>Settings</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Disclaimer */}
        <View className="px-5 pb-6 items-center">
          <Text className={`text-xs font-JakartaMedium ${isDark ? "text-slate-500" : "text-status-muted"}`}>Disclaimer</Text>
        </View>
      </ScrollView>
    </View>
  );
};

export default Home;
