import { useUser, useAuth } from "@clerk/clerk-expo";
import * as Location from "expo-location";
import { router } from "expo-router";
import { useState, useEffect } from "react";
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

import { icons } from "@/constants";
import { useFetch } from "@/lib/fetch";
import { useLocationStore, useDeviceStore } from "@/store";
import { Device } from "@/types/type";

const { width } = Dimensions.get("window");

const Home = () => {
  const { user } = useUser();
  const { signOut } = useAuth();

  const { setUserLocation } = useLocationStore();
  const { devices, setDevices } = useDeviceStore();

  // Get greeting based on time of day
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 18) return "Good Afternoon";
    return "Good Evening";
  };

  // Sync user to backend on load
  useEffect(() => {
    if (user) {
      fetch("/(api)/auth/sync", {
        method: "POST",
        body: JSON.stringify({
          userId: user.id,
          email: user.primaryEmailAddress?.emailAddress,
          name: user.fullName || `${user.firstName} ${user.lastName}`,
        }),
      }).catch((err) => console.error("Auth sync failed", err));
    }
  }, [user]);

  // Fetch devices
  const {
    data: devicesData,
    loading,
    refetch,
  } = useFetch<{ data: Device[] }>("/(api)/devices");

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

  // Calculate vehicle statistics
  const getVehicleStats = () => {
    if (!devices || devices.length === 0) {
      return { total: 0, moving: 0, idle: 0, parked: 0, nr: 0 };
    }

    const moving = devices.filter((d) => d.status === "online" && d.speed && d.speed > 5).length;
    const idle = devices.filter((d) => d.status === "online" && (!d.speed || d.speed <= 5)).length;
    const parked = devices.filter((d) => d.status === "offline").length;
    const nr = 0; // Not Responding - can be calculated based on last_seen

    return {
      total: devices.length,
      moving,
      idle,
      parked,
      nr,
    };
  };

  const stats = getVehicleStats();

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
        router.push("/(root)/(tabs)/profile");
        break;
      default:
        break;
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-100">
      {/* Fixed Top Bar */}
      <View className="bg-blue-500" style={{ backgroundColor: "#5BB8E8" }}>
        <View className="px-5 py-3">
          <View className="flex-row justify-between items-center">
            <TouchableOpacity>
              <Image source={icons.list} className="w-7 h-7" tintColor="white" />
            </TouchableOpacity>
            <Text className="text-white text-xl font-JakartaBold">Dashboard</Text>
            <TouchableOpacity onPress={() => router.push("/(root)/(tabs)/profile")}>
              <Image source={icons.profile} className="w-7 h-7" tintColor="white" />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* User Profile Section */}
        <View className="bg-blue-500 pb-8" style={{ backgroundColor: "#5BB8E8" }}>
          <View className="px-5">
            <View className="flex-row items-center mb-5">
              <View className="w-20 h-20 rounded-full bg-white items-center justify-center mr-4">
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
                <Text className="text-white text-base font-JakartaMedium opacity-90">
                  {getGreeting()}
                </Text>
                <Text className="text-white text-xl font-JakartaBold">
                  {user?.fullName || user?.firstName || "User"}
                </Text>
              </View>
              <View className="flex-row">
                <TouchableOpacity className="w-10 h-10 items-center justify-center mr-2">
                  <Image source={icons.chat} className="w-6 h-6" tintColor="white" />
                </TouchableOpacity>
                <TouchableOpacity
                  className="w-10 h-10 items-center justify-center"
                  onPress={() => router.push("/(root)/(tabs)/profile")}
                >
                  <Image source={icons.profile} className="w-6 h-6" tintColor="white" />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>

        {/* Statistics Card */}
        <View className="px-5 -mt-6">
          <View className="bg-white rounded-2xl p-5 shadow-lg" style={{ elevation: 5 }}>
            {/* Header */}
            <View className="flex-row justify-between items-center mb-4">
              <View className="bg-blue-500 px-4 py-2 rounded-full" style={{ backgroundColor: "#5BB8E8" }}>
                <Text className="text-white font-JakartaBold text-sm">
                  Total Vehicles: {stats.total}
                </Text>
              </View>
              <TouchableOpacity onPress={refetch}>
                <Image source={icons.search} className="w-6 h-6" tintColor="#666" />
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
                    style={{ borderWidth: 6, borderColor: "#5BB8E8" }}
                  >
                    <Text className="text-2xl font-JakartaBold">{stats.moving}</Text>
                  </View>
                  <Text className="text-sm font-JakartaMedium text-gray-700">Moving</Text>
                </View>

                {/* Idle */}
                <View className="items-center">
                  <View
                    className="w-20 h-20 rounded-full items-center justify-center mb-2"
                    style={{ borderWidth: 6, borderColor: "#9DD6F0" }}
                  >
                    <Text className="text-2xl font-JakartaBold">{stats.idle}</Text>
                  </View>
                  <Text className="text-sm font-JakartaMedium text-gray-700">Idle</Text>
                </View>

                {/* Parked */}
                <View className="items-center">
                  <View
                    className="w-20 h-20 rounded-full items-center justify-center mb-2"
                    style={{ borderWidth: 6, borderColor: "#4CAF50" }}
                  >
                    <Text className="text-2xl font-JakartaBold">{stats.parked}</Text>
                  </View>
                  <Text className="text-sm font-JakartaMedium text-gray-700">Parked</Text>
                </View>

                {/* NR */}
                <View className="items-center">
                  <View
                    className="w-20 h-20 rounded-full items-center justify-center mb-2"
                    style={{ borderWidth: 6, borderColor: "#9E9E9E" }}
                  >
                    <Text className="text-2xl font-JakartaBold">{stats.nr}</Text>
                  </View>
                  <Text className="text-sm font-JakartaMedium text-gray-700">NR</Text>
                </View>
              </View>
            )}
          </View>
        </View>

        {/* Action Cards Grid */}
        <View className="px-5 mt-6 pb-10">
          <View className="flex-row flex-wrap justify-between">
            {/* Live Tracking */}
            <TouchableOpacity
              onPress={() => handleNavigation("tracking")}
              className="bg-white rounded-2xl p-6 mb-4 items-center justify-center shadow"
              style={{
                width: (width - 50) / 2,
                height: 160,
                elevation: 3,
              }}
            >
              <View className="w-16 h-16 rounded-full bg-blue-50 items-center justify-center mb-3">
                <Image source={icons.marker} className="w-10 h-10" tintColor="#5BB8E8" />
              </View>
              <Text className="text-base font-JakartaBold text-gray-800">Live Tracking</Text>
            </TouchableOpacity>

            {/* Vehicle List */}
            <TouchableOpacity
              onPress={() => handleNavigation("vehicles")}
              className="bg-white rounded-2xl p-6 mb-4 items-center justify-center shadow"
              style={{
                width: (width - 50) / 2,
                height: 160,
                elevation: 3,
              }}
            >
              <View className="w-16 h-16 rounded-full bg-blue-50 items-center justify-center mb-3">
                <Image source={icons.list} className="w-10 h-10" tintColor="#5BB8E8" />
              </View>
              <Text className="text-base font-JakartaBold text-gray-800">Vehicle List</Text>
            </TouchableOpacity>

            {/* Alerts */}
            <TouchableOpacity
              onPress={() => handleNavigation("alerts")}
              className="bg-white rounded-2xl p-6 mb-4 items-center justify-center shadow"
              style={{
                width: (width - 50) / 2,
                height: 160,
                elevation: 3,
              }}
            >
              <View className="w-16 h-16 rounded-full bg-blue-50 items-center justify-center mb-3">
                <Image source={icons.star} className="w-10 h-10" tintColor="#5BB8E8" />
              </View>
              <Text className="text-base font-JakartaBold text-gray-800">Alerts</Text>
            </TouchableOpacity>

            {/* Settings */}
            <TouchableOpacity
              onPress={() => handleNavigation("settings")}
              className="bg-white rounded-2xl p-6 mb-4 items-center justify-center shadow"
              style={{
                width: (width - 50) / 2,
                height: 160,
                elevation: 3,
              }}
            >
              <View className="w-16 h-16 rounded-full bg-blue-50 items-center justify-center mb-3">
                <Image source={icons.profile} className="w-10 h-10" tintColor="#5BB8E8" />
              </View>
              <Text className="text-base font-JakartaBold text-gray-800">Settings</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Disclaimer */}
        <View className="px-5 pb-10 items-center">
          <Text className="text-gray-400 text-xs font-JakartaMedium">Disclaimer</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default Home;
