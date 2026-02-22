import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Modal,
  ScrollView,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useUser, useAuth } from "@clerk/clerk-expo";
import { router } from "expo-router";

import { fetchAPI } from "@/lib/fetch";
import { useDeviceStore } from "@/store";

type DialogType = "success" | "error" | "warning" | "info";

const DIALOG_COLORS: Record<DialogType, { bg: string; icon: string; btn: string }> = {
  success: { bg: "#ECFDF5", icon: "#10B981", btn: "#10B981" },
  error:   { bg: "#FEF2F2", icon: "#EF4444", btn: "#EF4444" },
  warning: { bg: "#FFFBEB", icon: "#F59E0B", btn: "#F59E0B" },
  info:    { bg: "#EFF6FF", icon: "#5BB8E8", btn: "#5BB8E8" },
};

const Settings = () => {
  const { user } = useUser();
  const { signOut } = useAuth();

  const devices = useDeviceStore((s) => s.devices);
  const selectedDevice = useDeviceStore((s) => s.selectedDevice);
  const setSelectedDevice = useDeviceStore((s) => s.setSelectedDevice);

  const deviceId = selectedDevice ?? devices[0]?.id ?? null;
  const currentDevice = devices.find((d) => d.id === deviceId);

  const [diagnostics, setDiagnostics] = useState<any>(null);
  const [diagLoading, setDiagLoading] = useState(false);

  const [notifSettings, setNotifSettings] = useState<Record<string, boolean>>({
    enable: false,
    sound: true,
    vibration: true,
  });

  const [dialog, setDialog] = useState<{
    visible: boolean; type: DialogType; title: string; message: string; icon: keyof typeof Ionicons.glyphMap;
  }>({ visible: false, type: "info", title: "", message: "", icon: "checkmark-circle" });

  const [confirmModal, setConfirmModal] = useState<{
    visible: boolean; title: string; message: string; icon: keyof typeof Ionicons.glyphMap;
    iconColor: string; label: string; color: string; onConfirm: () => void;
  }>({ visible: false, title: "", message: "", icon: "alert-circle", iconColor: "#E36060", label: "", color: "#E36060", onConfirm: () => {} });

  const showDialog = useCallback((type: DialogType, title: string, message: string, icon?: keyof typeof Ionicons.glyphMap) => {
    const defaults: Record<DialogType, keyof typeof Ionicons.glyphMap> = {
      success: "checkmark-circle", error: "close-circle", warning: "warning", info: "information-circle",
    };
    setDialog({ visible: true, type, title, message, icon: icon ?? defaults[type] });
  }, []);

  const fetchDiagnostics = useCallback(async () => {
    if (deviceId == null) return;
    setDiagLoading(true);
    try {
      const res = await fetchAPI(`/api/devices/${deviceId}/diagnostics?samples=5`);
      setDiagnostics(res);
    } catch {
      showDialog("error", "Failed", "Could not fetch diagnostics. Please try again.");
    } finally {
      setDiagLoading(false);
    }
  }, [deviceId, showDialog]);

  const handleSignOut = useCallback(() => {
    setConfirmModal({
      visible: true,
      title: "Sign out?",
      message: "You will need to sign in again to access your account and devices.",
      icon: "log-out",
      iconColor: "#DC2626",
      label: "Sign out",
      color: "#DC2626",
      onConfirm: () => {
        setConfirmModal((p) => ({ ...p, visible: false }));
        signOut();
        router.replace("/(auth)/sign-in");
      },
    });
  }, [signOut]);

  const SectionHeader = ({ icon, title }: { icon: React.ReactNode; title: string }) => (
    <View className="flex-row items-center mb-4">
      {icon}
      <Text className="text-lg font-JakartaBold text-slate-800 ml-2">{title}</Text>
    </View>
  );

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: "#F7FAFF" }}>
      <ScrollView className="px-5" contentContainerStyle={{ paddingBottom: 120, paddingTop: 10 }}>
        <Text className="text-2xl font-JakartaBold my-5">Settings</Text>

        {/* ════════ DEVICE SETTINGS ════════ */}
        <View className="bg-white rounded-2xl shadow-sm shadow-neutral-300 px-5 py-4 mb-4">
          <SectionHeader icon={<Ionicons name="hardware-chip" size={22} color="#5BB8E8" />} title="Device settings" />

          {devices.length === 0 ? (
            <Text className="text-sm font-JakartaMedium text-slate-500">No devices found. Add a tracker to get started.</Text>
          ) : (
            <>
              {devices.length > 1 && (
                <View className="mb-4">
                  <Text className="text-sm font-JakartaMedium text-gray-500 mb-2">Select device</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {devices.map((d) => (
                      <TouchableOpacity
                        key={d.id}
                        onPress={() => setSelectedDevice(d.id)}
                        className="mr-3 px-4 py-2 rounded-xl"
                        style={{ backgroundColor: deviceId === d.id ? "#5BB8E8" : "#E2E8F0" }}
                      >
                        <Text className="text-sm font-JakartaBold" style={{ color: deviceId === d.id ? "#fff" : "#475569" }}>
                          {d.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}

              {currentDevice && (
                <View className="border border-slate-200 rounded-xl p-3 mb-3">
                  <View className="flex-row justify-between mb-1">
                    <Text className="text-sm font-JakartaMedium text-slate-500">Name</Text>
                    <Text className="text-sm font-JakartaBold text-slate-700">{currentDevice.name}</Text>
                  </View>
                  {currentDevice.imei && (
                    <View className="flex-row justify-between mb-1">
                      <Text className="text-sm font-JakartaMedium text-slate-500">IMEI</Text>
                      <Text className="text-sm font-JakartaBold text-slate-700">{currentDevice.imei}</Text>
                    </View>
                  )}
                  <View className="flex-row justify-between mb-1">
                    <Text className="text-sm font-JakartaMedium text-slate-500">Status</Text>
                    <View className="flex-row items-center">
                      <View className="w-2 h-2 rounded-full mr-1" style={{ backgroundColor: currentDevice.status === "online" ? "#4CAF50" : "#9E9E9E" }} />
                      <Text className="text-sm font-JakartaBold" style={{ color: currentDevice.status === "online" ? "#4CAF50" : "#9E9E9E" }}>
                        {currentDevice.status}
                      </Text>
                    </View>
                  </View>
                  {currentDevice.battery_level != null && (
                    <View className="flex-row justify-between">
                      <Text className="text-sm font-JakartaMedium text-slate-500">Battery</Text>
                      <Text className="text-sm font-JakartaBold text-slate-700">{currentDevice.battery_level}%</Text>
                    </View>
                  )}
                </View>
              )}

              <TouchableOpacity
                onPress={fetchDiagnostics}
                disabled={diagLoading}
                className="flex-row items-center py-3 px-4 rounded-xl"
                style={{ backgroundColor: "#EAF4FF", borderWidth: 1, borderColor: "#5BB8E8" }}
              >
                {diagLoading ? (
                  <ActivityIndicator size="small" color="#5BB8E8" />
                ) : (
                  <>
                    <Ionicons name="analytics" size={18} color="#5BB8E8" />
                    <Text className="text-sm font-JakartaBold text-sky-700 ml-2">View diagnostics</Text>
                  </>
                )}
              </TouchableOpacity>
              {diagnostics && (
                <View className="border border-slate-200 rounded-xl p-3 mt-2">
                  <View className="flex-row justify-between mb-1">
                    <Text className="text-xs font-JakartaMedium text-slate-500">Sending status</Text>
                    <Text className="text-xs font-JakartaBold text-slate-700">{diagnostics.sending_status}</Text>
                  </View>
                  <View className="flex-row justify-between mb-1">
                    <Text className="text-xs font-JakartaMedium text-slate-500">Since last update</Text>
                    <Text className="text-xs font-JakartaBold text-slate-700">{diagnostics.seconds_since_last_update}s</Text>
                  </View>
                  {diagnostics.location_intervals && (
                    <>
                      <View className="flex-row justify-between mb-1">
                        <Text className="text-xs font-JakartaMedium text-slate-500">Avg interval</Text>
                        <Text className="text-xs font-JakartaBold text-slate-700">{diagnostics.location_intervals.avg_seconds?.toFixed(0)}s</Text>
                      </View>
                      <View className="flex-row justify-between">
                        <Text className="text-xs font-JakartaMedium text-slate-500">Last interval</Text>
                        <Text className="text-xs font-JakartaBold text-slate-700">{diagnostics.location_intervals.last_interval_seconds?.toFixed(0)}s</Text>
                      </View>
                    </>
                  )}
                </View>
              )}
            </>
          )}
        </View>

        {/* ════════ NOTIFICATION PREFERENCES ════════ */}
        <View className="bg-white rounded-2xl shadow-sm shadow-neutral-300 px-5 py-4 mb-4">
          <SectionHeader icon={<Ionicons name="volume-high" size={22} color="#F59E0B" />} title="Notification preferences" />
          {Object.entries(notifSettings).map(([key, val]) => (
            <View key={key} className="flex-row items-center justify-between py-3 border-b border-neutral-100">
              <Text className="text-base font-JakartaMedium text-slate-700 capitalize">{key}</Text>
              <Switch
                value={val}
                onValueChange={(v) => setNotifSettings((prev) => ({ ...prev, [key]: v }))}
                trackColor={{ false: "#CBD5E1", true: "#5BB8E8" }}
                thumbColor="#FFFFFF"
              />
            </View>
          ))}
        </View>

        {/* ════════ ACCOUNT ════════ */}
        <View className="bg-white rounded-2xl shadow-sm shadow-neutral-300 px-5 py-4 mb-4">
          <SectionHeader icon={<Ionicons name="person-circle" size={22} color="#5BB8E8" />} title="Account" />
          <View className="flex-row items-center mb-4">
            <View
              className="w-14 h-14 rounded-full items-center justify-center mr-3"
              style={{ backgroundColor: "#EAF4FF", borderWidth: 1, borderColor: "#5BB8E8" }}
            >
              {user?.imageUrl ? (
                <Image source={{ uri: user.imageUrl }} className="w-full h-full rounded-full" />
              ) : (
                <Ionicons name="person" size={28} color="#5BB8E8" />
              )}
            </View>
            <View className="flex-1">
              <Text className="text-base font-JakartaBold text-slate-800">
                {user?.fullName || user?.firstName || "User"}
              </Text>
              <Text className="text-sm font-JakartaMedium text-slate-500">
                {user?.primaryEmailAddress?.emailAddress || ""}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            onPress={handleSignOut}
            className="flex-row items-center justify-center py-3 rounded-xl"
            style={{ backgroundColor: "#FEE2E2", borderWidth: 1, borderColor: "#FECACA" }}
          >
            <Ionicons name="log-out" size={18} color="#DC2626" />
            <Text className="font-JakartaBold text-red-600 ml-2">Sign out</Text>
          </TouchableOpacity>
        </View>

        {/* ════════ ABOUT ════════ */}
        <View className="bg-white rounded-2xl shadow-sm shadow-neutral-300 px-5 py-4 mb-4">
          <SectionHeader icon={<Ionicons name="information-circle" size={22} color="#94A3B8" />} title="About" />
          <Text className="text-sm font-JakartaMedium text-slate-500">BYThron GPS Tracker v1.0.0</Text>
          <Text className="text-xs font-JakartaMedium text-slate-400 mt-1">GPS tracking and fleet management</Text>
        </View>
      </ScrollView>

      {/* Dialog */}
      <Modal visible={dialog.visible} transparent animationType="fade">
        <View className="flex-1 justify-center items-center px-6" style={{ backgroundColor: "rgba(0,0,0,0.45)" }}>
          <View className="bg-white rounded-2xl w-full max-w-sm overflow-hidden">
            <View className="items-center pt-6 pb-4 px-5" style={{ backgroundColor: DIALOG_COLORS[dialog.type].bg }}>
              <View className="w-16 h-16 rounded-full items-center justify-center mb-3" style={{ backgroundColor: "#fff" }}>
                <Ionicons name={dialog.icon} size={40} color={DIALOG_COLORS[dialog.type].icon} />
              </View>
              <Text className="text-lg font-JakartaBold text-slate-800 text-center">{dialog.title}</Text>
            </View>
            <View className="px-5 pt-4 pb-5">
              <Text className="text-sm font-JakartaMedium text-slate-600 text-center leading-5">{dialog.message}</Text>
              <TouchableOpacity
                onPress={() => setDialog((p) => ({ ...p, visible: false }))}
                className="mt-5 py-3 rounded-xl items-center"
                style={{ backgroundColor: DIALOG_COLORS[dialog.type].btn }}
              >
                <Text className="text-white font-JakartaBold">OK</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Confirm modal */}
      <Modal visible={confirmModal.visible} transparent animationType="fade">
        <View className="flex-1 justify-center items-center px-6" style={{ backgroundColor: "rgba(0,0,0,0.45)" }}>
          <View className="bg-white rounded-2xl w-full max-w-sm overflow-hidden">
            <View className="items-center pt-6 pb-4 px-5" style={{ backgroundColor: "#FFFBEB" }}>
              <View className="w-16 h-16 rounded-full items-center justify-center mb-3" style={{ backgroundColor: "#fff" }}>
                <Ionicons name={confirmModal.icon} size={40} color={confirmModal.iconColor} />
              </View>
              <Text className="text-lg font-JakartaBold text-slate-800 text-center">{confirmModal.title}</Text>
            </View>
            <View className="px-5 pt-4 pb-5">
              <Text className="text-sm font-JakartaMedium text-slate-600 text-center leading-5">{confirmModal.message}</Text>
              <View className="flex-row gap-3 mt-5">
                <TouchableOpacity
                  onPress={() => setConfirmModal((p) => ({ ...p, visible: false }))}
                  className="flex-1 py-3 rounded-xl items-center border border-slate-300"
                >
                  <Text className="font-JakartaBold text-slate-600">Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={confirmModal.onConfirm}
                  className="flex-1 py-3 rounded-xl items-center"
                  style={{ backgroundColor: confirmModal.color }}
                >
                  <Text className="font-JakartaBold text-white">{confirmModal.label}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default Settings;
