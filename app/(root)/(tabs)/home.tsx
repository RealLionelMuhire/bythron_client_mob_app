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

import { icons } from "@/constants";
import { fetchAPI, useFetch } from "@/lib/fetch";
import { useLocationStore, useDeviceStore } from "@/store";
import { Device } from "@/types/type";

const { width } = Dimensions.get("window");

const Home = () => {
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
        router.push("/(root)/(tabs)/alerts");
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
    <View className="flex-1" style={{ backgroundColor: "#F7FAFF" }}>
      {/* Fixed Top Bar */}
      <View style={{ backgroundColor: "#A8D8F0", paddingTop: 40 }}>
        <View className="px-5 py-2">
          <View className="flex-row justify-between items-center">
            {/* Hamburger Menu Icon */}
            <TouchableOpacity className="p-2">
              <Ionicons name="menu" size={28} color="white" />
            </TouchableOpacity>
            <Text className="text-white text-xl font-JakartaBold">Dashboard</Text>
            {/* Settings Gear Icon */}
            <TouchableOpacity className="p-2" onPress={() => router.push("/(root)/(tabs)/settings")}>
              <Ionicons name="settings-outline" size={26} color="white" />
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
        <View style={{ backgroundColor: "#A8D8F0", paddingBottom: 24 }}>
          <View className="px-5">
            <View className="flex-row items-center mb-5">
              <View className="w-20 h-20 rounded-full items-center justify-center mr-4" style={{ backgroundColor: "#EAF4FF", borderWidth: 1, borderColor: "#5BB8E8" }}>
                {user?.imageUrl ? (
                  <Image
                    source={{ uri: user.imageUrl }}
                    className="w-full h-full rounded-full"
                  />
                ) : (
                  <Image source={icons.person} className="w-12 h-12" tintColor="#5BB8E8" />
                )}
              </View>
              <View className="flex-1">
                <Text className="text-slate-700 text-base font-JakartaMedium opacity-90">
                  {greeting}
                </Text>
                <Text className="text-slate-900 text-xl font-JakartaBold">
                  {user?.fullName || user?.firstName || "User"}
                </Text>
              </View>
              <View className="flex-row">
                <TouchableOpacity className="w-10 h-10 items-center justify-center mr-2">
                  <Image source={icons.chat} className="w-6 h-6" tintColor="#1A2A3A" />
                </TouchableOpacity>
                <TouchableOpacity
                  className="w-10 h-10 items-center justify-center"
                  onPress={() => router.push("/(root)/(tabs)/settings")}
                >
                  <Image source={icons.profile} className="w-6 h-6" tintColor="#1A2A3A" />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>

        {/* Statistics Card */}
        <View className="px-5 -mt-2">
          <View
            className="rounded-2xl p-5"
            style={{
              backgroundColor: "#FFFFFF",
              borderWidth: 1,
              borderColor: "#D9EAF7",
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.08,
              shadowRadius: 10,
              elevation: 3,
            }}
          >
            {/* Header */}
            <View className="flex-row justify-between items-center mb-4">
              <View className="px-4 py-2 rounded-full" style={{ backgroundColor: "#EAF4FF", borderWidth: 1, borderColor: "#5BB8E8" }}>
                <Text className="text-slate-900 font-JakartaBold text-sm">
                  Total Vehicles: {stats.total}
                </Text>
              </View>
              <TouchableOpacity onPress={refetch}>
                <Image source={icons.search} className="w-6 h-6" tintColor="#5BB8E8" />
              </TouchableOpacity>
            </View>

            {/* Stats Grid */}
            {loading ? (
              <ActivityIndicator size="small" color="#5BB8E8" />
            ) : (
              <View className="flex-row justify-between">
                {/* Moving */}
                <View className="items-center">
                  <View
                    className="w-20 h-20 rounded-full items-center justify-center mb-2"
                    style={{ borderWidth: 6, borderColor: "#5BB8E8", backgroundColor: "#F5FBFF" }}
                  >
                    <Text className="text-2xl font-JakartaBold text-slate-900">{stats.moving}</Text>
                  </View>
                  <Text className="text-sm font-JakartaMedium text-slate-700">Moving</Text>
                </View>

                {/* Idle */}
                <View className="items-center">
                  <View
                    className="w-20 h-20 rounded-full items-center justify-center mb-2"
                    style={{ borderWidth: 6, borderColor: "#9DD6F0", backgroundColor: "#F5FBFF" }}
                  >
                    <Text className="text-2xl font-JakartaBold text-slate-900">{stats.idle}</Text>
                  </View>
                  <Text className="text-sm font-JakartaMedium text-slate-700">Idle</Text>
                </View>

                {/* Parked */}
                <View className="items-center">
                  <View
                    className="w-20 h-20 rounded-full items-center justify-center mb-2"
                    style={{ borderWidth: 6, borderColor: "#4CAF50", backgroundColor: "#F5FBFF" }}
                  >
                    <Text className="text-2xl font-JakartaBold text-slate-900">{stats.parked}</Text>
                  </View>
                  <Text className="text-sm font-JakartaMedium text-slate-700">Parked</Text>
                </View>

                {/* NR */}
                <View className="items-center">
                  <View
                    className="w-20 h-20 rounded-full items-center justify-center mb-2"
                    style={{ borderWidth: 6, borderColor: "#9E9E9E", backgroundColor: "#F5FBFF" }}
                  >
                    <Text className="text-2xl font-JakartaBold text-slate-900">{stats.nr}</Text>
                  </View>
                  <Text className="text-sm font-JakartaMedium text-slate-700">NR</Text>
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
              className="rounded-2xl p-6 mb-4 items-center justify-center"
              style={{
                width: (width - 50) / 2,
                height: 160,
                backgroundColor: "#FFFFFF",
                borderWidth: 1,
                borderColor: "#D9EAF7",
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 3 },
                shadowOpacity: 0.06,
                shadowRadius: 8,
                elevation: 2,
              }}
            >
              <View className="w-16 h-16 rounded-full items-center justify-center mb-3" style={{ backgroundColor: "#EAF4FF", borderWidth: 1, borderColor: "#5BB8E8" }}>
                <Image source={icons.marker} className="w-10 h-10" tintColor="#5BB8E8" />
              </View>
              <Text className="text-base font-JakartaBold text-slate-900">Live Tracking</Text>
            </TouchableOpacity>

            {/* Vehicle List */}
            <TouchableOpacity
              onPress={() => handleNavigation("vehicles")}
              className="rounded-2xl p-6 mb-4 items-center justify-center"
              style={{
                width: (width - 50) / 2,
                height: 160,
                backgroundColor: "#FFFFFF",
                borderWidth: 1,
                borderColor: "#D9EAF7",
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 3 },
                shadowOpacity: 0.06,
                shadowRadius: 8,
                elevation: 2,
              }}
            >
              <View className="w-16 h-16 rounded-full items-center justify-center mb-3" style={{ backgroundColor: "#EAF4FF", borderWidth: 1, borderColor: "#5BB8E8" }}>
                <Image source={icons.list} className="w-10 h-10" tintColor="#5BB8E8" />
              </View>
              <Text className="text-base font-JakartaBold text-slate-900">Vehicle List</Text>
            </TouchableOpacity>

            {/* Alerts */}
            <TouchableOpacity
              onPress={() => handleNavigation("alerts")}
              className="rounded-2xl p-6 mb-4 items-center justify-center"
              style={{
                width: (width - 50) / 2,
                height: 160,
                backgroundColor: "#FFFFFF",
                borderWidth: 1,
                borderColor: "#D9EAF7",
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 3 },
                shadowOpacity: 0.06,
                shadowRadius: 8,
                elevation: 2,
              }}
            >
              <View className="w-16 h-16 rounded-full items-center justify-center mb-3" style={{ backgroundColor: "#EAF4FF", borderWidth: 1, borderColor: "#5BB8E8" }}>
                <Image source={icons.star} className="w-10 h-10" tintColor="#5BB8E8" />
              </View>
              <Text className="text-base font-JakartaBold text-slate-900">Alerts</Text>
            </TouchableOpacity>

            {/* Settings */}
            <TouchableOpacity
              onPress={() => handleNavigation("settings")}
              className="rounded-2xl p-6 mb-4 items-center justify-center"
              style={{
                width: (width - 50) / 2,
                height: 160,
                backgroundColor: "#FFFFFF",
                borderWidth: 1,
                borderColor: "#D9EAF7",
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 3 },
                shadowOpacity: 0.06,
                shadowRadius: 8,
                elevation: 2,
              }}
            >
              <View className="w-16 h-16 rounded-full items-center justify-center mb-3" style={{ backgroundColor: "#EAF4FF", borderWidth: 1, borderColor: "#5BB8E8" }}>
                <Image source={icons.profile} className="w-10 h-10" tintColor="#5BB8E8" />
              </View>
              <Text className="text-base font-JakartaBold text-slate-900">Settings</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Disclaimer */}
        <View className="px-5 pb-6 items-center">
          <Text className="text-gray-400 text-xs font-JakartaMedium">Disclaimer</Text>
        </View>
      </ScrollView>
    </View>
  );
};

export default Home;
