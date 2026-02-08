import { useUser, useAuth } from "@clerk/clerk-expo";
import * as Location from "expo-location";
import { router } from "expo-router";
import { useState, useEffect, useRef } from "react";
import {
  Text,
  View,
  TouchableOpacity,
  Image,
  FlatList,
  ActivityIndicator,
  ScrollView,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import Map from "@/components/Map";
import DeviceCard from "@/components/DeviceCard";
import HistorySheet from "@/components/HistorySheet";
import { icons } from "@/constants";
import { useFetch } from "@/lib/fetch";
import { useLocationStore, useDeviceStore } from "@/store";
import { Device } from "@/types/type";
import { startLocationPolling } from "@/lib/liveTracking";

type TabType = "devices" | "tracking" | "history" | "commands" | "geofence";

const Home = () => {
  const { user } = useUser();
  const { signOut } = useAuth();

  const { setUserLocation } = useLocationStore();
  const {
    devices,
    setDevices,
    selectedDevice,
    setSelectedDevice,
    setCurrentLocation
  } = useDeviceStore();

  const [activeTab, setActiveTab] = useState<TabType>("devices");
  const [selectedHistoryDate, setSelectedHistoryDate] = useState<Date | null>(null);

  // Sync user to backend on load
  useEffect(() => {
    if (user) {
      fetch('/(api)/auth/sync', {
        method: 'POST',
        body: JSON.stringify({
          userId: user.id,
          email: user.primaryEmailAddress?.emailAddress,
          name: user.fullName || `${user.firstName} ${user.lastName}`,
        })
      }).catch(err => console.error("Auth sync failed", err));
    }
  }, [user]);

  const handleSignOut = () => {
    signOut();
    router.replace("/(auth)/sign-in");
  };

  // Fetch devices
  const {
    data: devicesData,
    loading,
    error,
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

  // Handle device selection and polling
  useEffect(() => {
    let cleanup: (() => void) | undefined;

    if (selectedDevice) {
      // Start polling for the selected device
      cleanup = startLocationPolling(selectedDevice, (location) => {
        setCurrentLocation(location);
      });
      // Expand bottom sheet to show details or keep it accessible
      bottomSheetRef.current?.snapToIndex(0);
    }

    return () => {
      if (cleanup) cleanup();
    };
  }, [selectedDevice]);

  const handleDeviceSelect = (id: number) => {
    if (selectedDevice === id) {
      // Deselect if already selected
      setSelectedDevice(null as any); // Type cast specific for current store definition issue if any
    } else {
      setSelectedDevice(id);
    }
  };

  return (
    <SafeAreaView className="bg-general-500 h-full">
      <View className="flex-1 h-full">
        {/* Header / Top Bar */}
        <View className="absolute top-10 left-5 z-10 flex flex-row items-center justify-between w-[90%]">
          {/* You might want a better header here */}
        </View>

        <Map />

        <SimpleBottomSheet
          ref={bottomSheetRef}
          snapPoints={["40%", "85%"]}
          index={0}
        >
          <BottomSheetView style={{ flex: 1, padding: 20 }}>
            {showHistory && selectedDevice ? (
              <HistorySheet
                deviceId={selectedDevice}
                onClose={() => setShowHistory(false)}
              />
            ) : (
              <>
                <View className="flex flex-row items-center justify-between mb-5">
                  <Text className="text-xl font-JakartaBold">
                    Your Devices {devices?.length ? `(${devices.length})` : ""}
                  </Text>
                  <TouchableOpacity onPress={handleSignOut}>
                    <Image source={icons.out} className="w-6 h-6" />
                  </TouchableOpacity>
                </View>

                {loading ? (
                  <ActivityIndicator size="small" color="#000" />
                ) : (
                  <FlatList
                    data={devices}
                    renderItem={({ item }) => (
                      <DeviceCard
                        item={item}
                        selected={selectedDevice}
                        setSelected={() => handleDeviceSelect(item.id)}
                        onHistoryPress={() => {
                          handleDeviceSelect(item.id);
                          setShowHistory(true);
                        }}
                      />
                    )}
                    keyExtractor={(item) => item.id.toString()}
                    contentContainerStyle={{ paddingBottom: 20 }}
                    ListEmptyComponent={() => (
                      <View className="flex flex-col items-center justify-center mt-10">
                        <Text className="text-sm font-JakartaMedium text-general-200">
                          No devices found
                        </Text>
                      </View>
                    )}
                  />
                )}
              </>
            )}
          </BottomSheetView>
        </SimpleBottomSheet>
      </View>
    </SafeAreaView>
  );
};

export default Home;
