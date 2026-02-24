import { router } from "expo-router";
import { Dimensions, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useColorScheme } from "nativewind";

import { getThemeColors } from "@/constants/theme";
import { useDeviceStore } from "@/store";

const { width } = Dimensions.get("window");

const Vehicles = () => {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const colors = getThemeColors(isDark ? "dark" : "light");
  const devices = useDeviceStore((s) => s.devices);
  const setSelectedDevice = useDeviceStore((s) => s.setSelectedDevice);

  return (
    <SafeAreaView className={`flex-1 ${isDark ? "bg-slate-900" : "bg-surface-light"}`}>
      <ScrollView
        className="px-5"
        contentContainerStyle={{ paddingBottom: 120, paddingTop: 10 }}
        showsVerticalScrollIndicator={false}
      >
        <Text className={`text-2xl font-JakartaBold my-5 ${isDark ? "text-slate-100" : "text-slate-900"}`}>Vehicle List</Text>

        {devices.length === 0 ? (
          <View className={`rounded-2xl shadow-sm border px-5 py-12 items-center ${isDark ? "bg-slate-800 border-slate-700" : "bg-white border-surface-border"}`}>
            <Ionicons name="car-outline" size={48} color={colors.status.muted} />
            <Text className={`text-base font-JakartaMedium mt-3 ${isDark ? "text-slate-400" : "text-slate-600"}`}>No vehicles</Text>
            <Text className={`text-xs font-JakartaMedium mt-1 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
              Add a tracker to see your vehicles here.
            </Text>
          </View>
        ) : (
          <View className="flex-row flex-wrap justify-between">
            {devices.map((device) => (
              <TouchableOpacity
                key={device.id}
                onPress={() => {
                  setSelectedDevice(device.id);
                  router.push("/(root)/(tabs)/tracking");
                }}
                className={`rounded-2xl p-6 mb-4 items-center justify-center border shadow-sm ${isDark ? "bg-slate-800 border-slate-700" : "bg-white border-surface-border"}`}
                style={{ width: (width - 50) / 2, height: 160 }}
              >
                <View className={`w-16 h-16 rounded-full items-center justify-center mb-3 border ${isDark ? "bg-slate-700 border-slate-600" : "bg-accent-100 border-accent-400"}`}>
                  <Ionicons name="car-outline" size={32} color={colors.accent[400]} />
                </View>
                <Text className={`text-base font-JakartaBold text-center ${isDark ? "text-slate-100" : "text-slate-900"}`} numberOfLines={2}>
                  {device.name}
                </Text>
                <View className="flex-row items-center mt-2">
                  <View
                    className={`w-2 h-2 rounded-full mr-1 ${device.status === "online" ? "bg-status-success" : "bg-status-muted"}`}
                  />
                  <Text className={`text-xs font-JakartaMedium ${isDark ? "text-slate-400" : "text-slate-600"}`}>{device.status}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

export default Vehicles;
