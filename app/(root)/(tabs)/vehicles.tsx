import { useState, useCallback } from "react";
import { router } from "expo-router";
import {
  ActivityIndicator,
  Dimensions,
  Modal,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useColorScheme } from "nativewind";
import { formatDistanceToNow } from "date-fns";

import { getThemeColors } from "@/constants/theme";
import { fetchAPI } from "@/lib/fetch";
import { useDeviceStore, useUserStore } from "@/store";
import { refreshDevices } from "@/app/(root)/_layout";
import { AlertDialog, useDialog } from "@/components/AppModals";
import { Device } from "@/types/type";

const { width } = Dimensions.get("window");

// ── Add Device modal ────────────────────────────────────────────────────────

interface AddDeviceModalProps {
  visible: boolean;
  isDark: boolean;
  colors: ReturnType<typeof getThemeColors>;
  onClose: () => void;
  onSuccess: () => void;
}

function AddDeviceModal({ visible, isDark, colors, onClose, onSuccess }: AddDeviceModalProps) {
  const [imei, setImei] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!imei.trim() || !name.trim()) {
      setError("IMEI and device name are required.");
      return;
    }
    if (!/^\d{15}$/.test(imei.trim())) {
      setError("IMEI must be exactly 15 digits.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await fetchAPI("/api/devices/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imei: imei.trim(),
          name: name.trim(),
          description: description.trim() || undefined,
        }),
      });
      setImei("");
      setName("");
      setDescription("");
      onSuccess();
    } catch (err: any) {
      const msg = err?.message ?? "Failed to register device.";
      setError(msg.includes("400") ? "A device with this IMEI already exists." : msg);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setImei("");
    setName("");
    setDescription("");
    setError(null);
    onClose();
  };

  const inputCls = `border rounded-xl px-4 py-3 text-base mb-3 font-JakartaMedium ${
    isDark ? "border-slate-600 text-slate-100 bg-slate-700" : "border-slate-300 text-slate-900 bg-white"
  }`;

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View className="flex-1 justify-end" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
        <View className={`rounded-t-3xl px-6 pt-6 pb-10 ${isDark ? "bg-slate-800" : "bg-white"}`}>
          {/* Handle bar */}
          <View className="w-12 h-1 rounded-full bg-slate-400 self-center mb-5" />

          <View className="flex-row items-center mb-5">
            <View className={`w-10 h-10 rounded-full items-center justify-center mr-3 ${isDark ? "bg-slate-700" : "bg-accent-100"}`}>
              <Ionicons name="add-circle" size={24} color={colors.accent[400]} />
            </View>
            <Text className={`text-xl font-JakartaBold ${isDark ? "text-slate-100" : "text-slate-900"}`}>
              Register New Device
            </Text>
          </View>

          <Text className={`text-sm font-JakartaMedium mb-1 ${isDark ? "text-slate-400" : "text-slate-600"}`}>
            IMEI (15 digits) *
          </Text>
          <TextInput
            value={imei}
            onChangeText={setImei}
            placeholder="e.g. 123456789012345"
            keyboardType="number-pad"
            maxLength={15}
            className={inputCls}
            placeholderTextColor={colors.status.muted}
          />

          <Text className={`text-sm font-JakartaMedium mb-1 ${isDark ? "text-slate-400" : "text-slate-600"}`}>
            Device name *
          </Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="e.g. Delivery Truck 01"
            className={inputCls}
            placeholderTextColor={colors.status.muted}
          />

          <Text className={`text-sm font-JakartaMedium mb-1 ${isDark ? "text-slate-400" : "text-slate-600"}`}>
            Description (optional)
          </Text>
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="e.g. Main delivery vehicle"
            className={inputCls}
            placeholderTextColor={colors.status.muted}
          />

          {error && (
            <View className="flex-row items-center mb-3 px-3 py-2 rounded-xl bg-red-50 border border-red-200">
              <Ionicons name="warning-outline" size={16} color={colors.status.error} />
              <Text className="text-sm font-JakartaMedium text-red-600 ml-2 flex-1">{error}</Text>
            </View>
          )}

          <View className="flex-row gap-3 mt-2">
            <TouchableOpacity
              onPress={handleClose}
              className={`flex-1 py-4 rounded-2xl items-center border ${isDark ? "border-slate-600" : "border-slate-300"}`}
            >
              <Text className={`font-JakartaBold ${isDark ? "text-slate-300" : "text-slate-600"}`}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleSubmit}
              disabled={loading}
              className="flex-1 py-4 rounded-2xl items-center bg-accent-400"
            >
              {loading
                ? <ActivityIndicator size="small" color="#fff" />
                : <Text className="font-JakartaBold text-white">Register</Text>
              }
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ── Helper ──────────────────────────────────────────────────────────────────

function lastSeenLabel(lastSeen: string | undefined): string {
  if (!lastSeen) return "Never";
  try {
    return formatDistanceToNow(new Date(lastSeen), { addSuffix: true });
  } catch {
    return "Unknown";
  }
}

function batteryColor(level: number | undefined, colors: ReturnType<typeof getThemeColors>): string {
  if (level == null) return colors.status.muted;
  if (level > 50) return colors.status.success;
  if (level > 20) return colors.status.warning;
  return colors.status.error;
}

// ── Main screen ─────────────────────────────────────────────────────────────

const Vehicles = () => {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const colors = getThemeColors(isDark ? "dark" : "light");

  const devices = useDeviceStore((s) => s.devices);
  const devicesReady = useDeviceStore((s) => s.devicesReady);
  const setSelectedDevice = useDeviceStore((s) => s.setSelectedDevice);
  const userData = useUserStore((s) => s.userData);
  const isAdmin = userData?.is_admin ?? false;

  const [refreshing, setRefreshing] = useState(false);
  const [addModalVisible, setAddModalVisible] = useState(false);
  const { dialog, showDialog, hideDialog } = useDialog();

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshDevices();
    setRefreshing(false);
  }, []);

  const handleAddSuccess = useCallback(async () => {
    setAddModalVisible(false);
    await refreshDevices();
    showDialog("success", "Device registered", "The device has been registered and will appear in the list once it connects.");
  }, [showDialog]);

  return (
    <SafeAreaView className={`flex-1 ${isDark ? "bg-slate-900" : "bg-surface-light"}`}>
      <ScrollView
        className="px-5"
        contentContainerStyle={{ paddingBottom: 120, paddingTop: 10 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.accent[400]}
            colors={[colors.accent[400]]}
          />
        }
      >
        {/* Header */}
        <View className="flex-row justify-between items-center my-5">
          <Text className={`text-2xl font-JakartaBold ${isDark ? "text-slate-100" : "text-slate-900"}`}>
            Vehicle List
          </Text>
          {isAdmin && (
            <TouchableOpacity
              onPress={() => setAddModalVisible(true)}
              className="flex-row items-center px-4 py-2 rounded-xl bg-accent-400"
            >
              <Ionicons name="add" size={18} color="#fff" />
              <Text className="text-white font-JakartaBold ml-1 text-sm">Add Device</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Loading skeleton */}
        {!devicesReady ? (
          <View className={`rounded-2xl shadow-sm border px-5 py-12 items-center ${isDark ? "bg-slate-800 border-slate-700" : "bg-white border-surface-border"}`}>
            <ActivityIndicator size="large" color={colors.accent[400]} />
            <Text className={`text-sm font-JakartaMedium mt-3 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
              Loading vehicles…
            </Text>
          </View>
        ) : devices.length === 0 ? (
          <View className={`rounded-2xl shadow-sm border px-5 py-12 items-center ${isDark ? "bg-slate-800 border-slate-700" : "bg-white border-surface-border"}`}>
            <Ionicons name="car-outline" size={48} color={colors.status.muted} />
            <Text className={`text-base font-JakartaMedium mt-3 ${isDark ? "text-slate-400" : "text-slate-600"}`}>
              No vehicles
            </Text>
            <Text className={`text-xs font-JakartaMedium mt-1 text-center ${isDark ? "text-slate-400" : "text-slate-500"}`}>
              {isAdmin
                ? "Tap \"Add Device\" above to register a GPS tracker."
                : "Ask your administrator to register a tracker for you."}
            </Text>
          </View>
        ) : (
          <View className="gap-3">
            {devices.map((device: Device) => {
              const isOnline = device.status === "online";
              const sinceLabel = lastSeenLabel(device.last_seen);
              const batColor = batteryColor(device.battery_level, colors);

              return (
                <TouchableOpacity
                  key={device.id}
                  onPress={() => {
                    setSelectedDevice(device.id);
                    router.push("/(root)/(tabs)/tracking");
                  }}
                  activeOpacity={0.85}
                  className={`rounded-2xl p-4 border shadow-sm ${isDark ? "bg-slate-800 border-slate-700" : "bg-white border-surface-border"}`}
                >
                  <View className="flex-row items-center">
                    {/* Vehicle icon */}
                    <View className={`w-14 h-14 rounded-full items-center justify-center mr-4 border ${
                      isOnline
                        ? isDark ? "bg-slate-700 border-accent-400" : "bg-accent-100 border-accent-400"
                        : isDark ? "bg-slate-700 border-slate-600" : "bg-slate-100 border-slate-300"
                    }`}>
                      <Ionicons
                        name="car-outline"
                        size={28}
                        color={isOnline ? colors.accent[400] : colors.status.muted}
                      />
                    </View>

                    {/* Main info */}
                    <View className="flex-1">
                      <Text
                        className={`text-base font-JakartaBold ${isDark ? "text-slate-100" : "text-slate-900"}`}
                        numberOfLines={1}
                      >
                        {device.name}
                      </Text>
                      {device.imei && (
                        <Text className={`text-xs font-JakartaMedium mt-0.5 ${isDark ? "text-slate-500" : "text-slate-400"}`}>
                          IMEI: {device.imei}
                        </Text>
                      )}
                      <View className="flex-row items-center mt-1.5">
                        <View className={`w-2 h-2 rounded-full mr-1.5 ${isOnline ? "bg-status-success" : "bg-status-muted"}`} />
                        <Text className={`text-xs font-JakartaMedium ${isOnline ? "text-status-success" : isDark ? "text-slate-400" : "text-slate-500"}`}>
                          {isOnline ? "Online" : "Offline"}
                        </Text>
                        <Text className={`text-xs font-JakartaMedium mx-2 ${isDark ? "text-slate-600" : "text-slate-300"}`}>·</Text>
                        <Text className={`text-xs font-JakartaMedium ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                          {sinceLabel}
                        </Text>
                      </View>
                    </View>

                    {/* Right — battery + chevron */}
                    <View className="items-end ml-2">
                      {device.battery_level != null && (
                        <View className="flex-row items-center mb-1">
                          <Ionicons name="battery-half" size={16} color={batColor} />
                          <Text className="text-xs font-JakartaBold ml-1" style={{ color: batColor }}>
                            {device.battery_level}%
                          </Text>
                        </View>
                      )}
                      {device.speed != null && device.speed > 0 && (
                        <Text className={`text-xs font-JakartaMedium ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                          {device.speed.toFixed(0)} km/h
                        </Text>
                      )}
                      <Ionicons name="chevron-forward" size={18} color={colors.status.muted} style={{ marginTop: 4 }} />
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Footer count */}
        {devicesReady && devices.length > 0 && (
          <Text className={`text-xs font-JakartaMedium text-center mt-4 ${isDark ? "text-slate-500" : "text-slate-400"}`}>
            {devices.length} device{devices.length !== 1 ? "s" : ""} registered · Pull down to refresh
          </Text>
        )}
      </ScrollView>

      {/* Add Device modal */}
      <AddDeviceModal
        visible={addModalVisible}
        isDark={isDark}
        colors={colors}
        onClose={() => setAddModalVisible(false)}
        onSuccess={handleAddSuccess}
      />

      {/* Success dialog */}
      <AlertDialog dialog={dialog} onClose={hideDialog} isDark={isDark} />
    </SafeAreaView>
  );
};

export default Vehicles;
