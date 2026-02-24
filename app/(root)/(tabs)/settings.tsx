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
import { NativeWindStyleSheet, useColorScheme } from "nativewind";
import { router } from "expo-router";

import { DIALOG_COLORS, getThemeColors } from "@/constants/theme";
import { fetchAPI } from "@/lib/fetch";
import { saveColorScheme } from "@/lib/theme";
import { useDeviceStore } from "@/store";

type DialogType = "success" | "error" | "warning" | "info";

const Settings = () => {
  const { user } = useUser();
  const { signOut } = useAuth();
  const { colorScheme, setColorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const colors = getThemeColors(isDark ? "dark" : "light");

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
  }>({ visible: false, title: "", message: "", icon: "alert-circle", iconColor: colors.status.error, label: "", color: colors.status.error, onConfirm: () => {} });

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

  const handleDarkModeToggle = useCallback(
    (value: boolean) => {
      const next = value ? "dark" : "light";
      setColorScheme(next);
      NativeWindStyleSheet.setColorScheme(next);
      saveColorScheme(next);
    },
    [setColorScheme]
  );

  const handleSignOut = useCallback(() => {
    setConfirmModal({
      visible: true,
      title: "Sign out?",
      message: "You will need to sign in again to access your account and devices.",
      icon: "log-out",
      iconColor: colors.status.error,
      label: "Sign out",
      color: colors.status.error,
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
      <Text className={`text-lg font-JakartaBold ml-2 ${isDark ? "text-slate-100" : "text-slate-900"}`}>{title}</Text>
    </View>
  );

  return (
    <SafeAreaView className={`flex-1 ${isDark ? "bg-slate-900" : "bg-surface-light"}`}>
      <ScrollView className="px-5" contentContainerStyle={{ paddingBottom: 120, paddingTop: 10 }}>
        <Text className={`text-2xl font-JakartaBold my-5 ${isDark ? "text-slate-100" : "text-slate-900"}`}>Settings</Text>

        {/* ════════ APPEARANCE ════════ */}
        <View className={`rounded-2xl shadow-sm border px-5 py-4 mb-4 ${isDark ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200"}`}>
          <SectionHeader
            icon={<Ionicons name="moon" size={22} color={colors.accent[400]} />}
            title="Appearance"
          />
          <View className="flex-row items-center justify-between py-3">
            <Text className={`text-base font-JakartaMedium ${isDark ? "text-slate-300" : "text-slate-700"}`}>Dark mode</Text>
            <Switch
              value={colorScheme === "dark"}
              onValueChange={handleDarkModeToggle}
              trackColor={{ false: "#CBD5E1", true: colors.accent[400] }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>

        {/* ════════ DEVICE SETTINGS ════════ */}
        <View className={`rounded-2xl shadow-sm border px-5 py-4 mb-4 ${isDark ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200"}`}>
          <SectionHeader icon={<Ionicons name="hardware-chip" size={22} color={colors.accent[400]} />} title="Device settings" />

          {devices.length === 0 ? (
            <Text className={`text-sm font-JakartaMedium ${isDark ? "text-slate-400" : "text-slate-500"}`}>No devices found. Add a tracker to get started.</Text>
          ) : (
            <>
              {devices.length > 1 && (
                <View className="mb-4">
                  <Text className={`text-sm font-JakartaMedium mb-2 ${isDark ? "text-slate-400" : "text-slate-600"}`}>Select device</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {devices.map((d) => (
                      <TouchableOpacity
                        key={d.id}
                        onPress={() => setSelectedDevice(d.id)}
                        className={`mr-3 px-4 py-2 rounded-xl ${deviceId === d.id ? "bg-accent-400" : isDark ? "bg-slate-600" : "bg-slate-200"}`}
                      >
                        <Text className={`text-sm font-JakartaBold ${deviceId === d.id ? "text-white" : isDark ? "text-slate-300" : "text-slate-600"}`}>
                          {d.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}

              {currentDevice && (
                <View className={`border rounded-xl p-3 mb-3 ${isDark ? "border-slate-600" : "border-slate-200"}`}>
                  <View className="flex-row justify-between mb-1">
                    <Text className={`text-sm font-JakartaMedium ${isDark ? "text-slate-400" : "text-slate-500"}`}>Name</Text>
                    <Text className={`text-sm font-JakartaBold ${isDark ? "text-slate-200" : "text-slate-700"}`}>{currentDevice.name}</Text>
                  </View>
                  {currentDevice.imei && (
                    <View className="flex-row justify-between mb-1">
                      <Text className={`text-sm font-JakartaMedium ${isDark ? "text-slate-400" : "text-slate-500"}`}>IMEI</Text>
                      <Text className={`text-sm font-JakartaBold ${isDark ? "text-slate-200" : "text-slate-700"}`}>{currentDevice.imei}</Text>
                    </View>
                  )}
                  <View className="flex-row justify-between mb-1">
                    <Text className={`text-sm font-JakartaMedium ${isDark ? "text-slate-400" : "text-slate-500"}`}>Status</Text>
                    <View className="flex-row items-center">
                      <View className={`w-2 h-2 rounded-full mr-1 ${currentDevice.status === "online" ? "bg-status-success" : "bg-status-muted"}`} />
                      <Text className={`text-sm font-JakartaBold ${currentDevice.status === "online" ? "text-status-success" : "text-status-muted"}`}>
                        {currentDevice.status}
                      </Text>
                    </View>
                  </View>
                  {currentDevice.battery_level != null && (
                    <View className="flex-row justify-between">
                      <Text className={`text-sm font-JakartaMedium ${isDark ? "text-slate-400" : "text-slate-500"}`}>Battery</Text>
                      <Text className={`text-sm font-JakartaBold ${isDark ? "text-slate-200" : "text-slate-700"}`}>{currentDevice.battery_level}%</Text>
                    </View>
                  )}
                </View>
              )}

              <TouchableOpacity
                onPress={fetchDiagnostics}
                disabled={diagLoading}
                className={`flex-row items-center py-3 px-4 rounded-xl border ${isDark ? "bg-slate-700 border-slate-600" : "bg-accent-100 border-accent-400"}`}
              >
                {diagLoading ? (
                  <ActivityIndicator size="small" color={colors.accent[400]} />
                ) : (
                  <>
                    <Ionicons name="analytics" size={18} color={colors.accent[400]} />
                    <Text className={`text-sm font-JakartaBold ml-2 ${isDark ? "text-sky-300" : "text-sky-700"}`}>View diagnostics</Text>
                  </>
                )}
              </TouchableOpacity>
              {diagnostics && (
                <View className={`border rounded-xl p-3 mt-2 ${isDark ? "border-slate-600" : "border-slate-200"}`}>
                  <View className="flex-row justify-between mb-1">
                    <Text className={`text-xs font-JakartaMedium ${isDark ? "text-slate-400" : "text-slate-500"}`}>Sending status</Text>
                    <Text className={`text-xs font-JakartaBold ${isDark ? "text-slate-200" : "text-slate-700"}`}>{diagnostics.sending_status}</Text>
                  </View>
                  <View className="flex-row justify-between mb-1">
                    <Text className={`text-xs font-JakartaMedium ${isDark ? "text-slate-400" : "text-slate-500"}`}>Since last update</Text>
                    <Text className={`text-xs font-JakartaBold ${isDark ? "text-slate-200" : "text-slate-700"}`}>{diagnostics.seconds_since_last_update}s</Text>
                  </View>
                  {diagnostics.location_intervals && (
                    <>
                      <View className="flex-row justify-between mb-1">
                        <Text className={`text-xs font-JakartaMedium ${isDark ? "text-slate-400" : "text-slate-500"}`}>Avg interval</Text>
                        <Text className={`text-xs font-JakartaBold ${isDark ? "text-slate-200" : "text-slate-700"}`}>{diagnostics.location_intervals.avg_seconds?.toFixed(0)}s</Text>
                      </View>
                      <View className="flex-row justify-between">
                        <Text className={`text-xs font-JakartaMedium ${isDark ? "text-slate-400" : "text-slate-500"}`}>Last interval</Text>
                        <Text className={`text-xs font-JakartaBold ${isDark ? "text-slate-200" : "text-slate-700"}`}>{diagnostics.location_intervals.last_interval_seconds?.toFixed(0)}s</Text>
                      </View>
                    </>
                  )}
                </View>
              )}
            </>
          )}
        </View>

        {/* ════════ NOTIFICATION PREFERENCES ════════ */}
        <View className={`rounded-2xl shadow-sm border px-5 py-4 mb-4 ${isDark ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200"}`}>
          <SectionHeader icon={<Ionicons name="volume-high" size={22} color={colors.status.warning} />} title="Notification preferences" />
          {Object.entries(notifSettings).map(([key, val]) => (
            <View key={key} className={`flex-row items-center justify-between py-3 border-b ${isDark ? "border-slate-700" : "border-neutral-100"}`}>
              <Text className={`text-base font-JakartaMedium capitalize ${isDark ? "text-slate-300" : "text-slate-700"}`}>{key}</Text>
              <Switch
                value={val}
                onValueChange={(v) => setNotifSettings((prev) => ({ ...prev, [key]: v }))}
                trackColor={{ false: "#CBD5E1", true: colors.accent[400] }}
                thumbColor="#FFFFFF"
              />
            </View>
          ))}
        </View>

        {/* ════════ ACCOUNT ════════ */}
        <View className={`rounded-2xl shadow-sm border px-5 py-4 mb-4 ${isDark ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200"}`}>
          <SectionHeader icon={<Ionicons name="person-circle" size={22} color={colors.accent[400]} />} title="Account" />
          <View className="flex-row items-center mb-4">
            <View className={`w-14 h-14 rounded-full items-center justify-center mr-3 border ${isDark ? "bg-slate-700 border-slate-600" : "bg-accent-100 border-accent-400"}`}>
              {user?.imageUrl ? (
                <Image source={{ uri: user.imageUrl }} className="w-full h-full rounded-full" />
              ) : (
                <Ionicons name="person" size={28} color={colors.accent[400]} />
              )}
            </View>
            <View className="flex-1">
              <Text className={`text-base font-JakartaBold ${isDark ? "text-slate-200" : "text-slate-800"}`}>
                {user?.fullName || user?.firstName || "User"}
              </Text>
              <Text className={`text-sm font-JakartaMedium ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                {user?.primaryEmailAddress?.emailAddress || ""}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            onPress={handleSignOut}
            className={`flex-row items-center justify-center py-3 rounded-xl border ${isDark ? "bg-danger-900/30 border-danger-800" : "bg-danger-100 border-danger-200"}`}
          >
            <Ionicons name="log-out" size={18} color={colors.status.error} />
            <Text className={`font-JakartaBold ml-2 ${isDark ? "text-red-400" : "text-red-600"}`}>Sign out</Text>
          </TouchableOpacity>
        </View>

        {/* ════════ ABOUT ════════ */}
        <View className={`rounded-2xl shadow-sm border px-5 py-4 mb-4 ${isDark ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200"}`}>
          <SectionHeader icon={<Ionicons name="information-circle" size={22} color={colors.status.muted} />} title="About" />
          <Text className={`text-sm font-JakartaMedium ${isDark ? "text-slate-400" : "text-slate-500"}`}>BYThron GPS Tracker v1.0.0</Text>
          <Text className={`text-xs font-JakartaMedium mt-1 ${isDark ? "text-slate-500" : "text-slate-400"}`}>GPS tracking and fleet management</Text>
        </View>
      </ScrollView>

      {/* Dialog */}
      <Modal visible={dialog.visible} transparent animationType="fade">
        <View className="flex-1 justify-center items-center px-6" style={{ backgroundColor: "rgba(0,0,0,0.45)" }}>
          <View className={`rounded-2xl w-full max-w-sm overflow-hidden ${isDark ? "bg-slate-800" : "bg-white"}`}>
            <View className="items-center pt-6 pb-4 px-5" style={{ backgroundColor: DIALOG_COLORS[dialog.type].bg }}>
              <View className={`w-16 h-16 rounded-full items-center justify-center mb-3 ${isDark ? "bg-slate-700" : "bg-white"}`}>
                <Ionicons name={dialog.icon} size={40} color={DIALOG_COLORS[dialog.type].icon} />
              </View>
              <Text className={`text-lg font-JakartaBold text-center ${isDark ? "text-slate-100" : "text-slate-800"}`}>{dialog.title}</Text>
            </View>
            <View className="px-5 pt-4 pb-5">
              <Text className={`text-sm font-JakartaMedium text-center leading-5 ${isDark ? "text-slate-300" : "text-slate-600"}`}>{dialog.message}</Text>
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
          <View className={`rounded-2xl w-full max-w-sm overflow-hidden ${isDark ? "bg-slate-800" : "bg-white"}`}>
            <View className={`items-center pt-6 pb-4 px-5 ${isDark ? "bg-slate-700" : "bg-amber-50"}`}>
              <View className={`w-16 h-16 rounded-full items-center justify-center mb-3 ${isDark ? "bg-slate-600" : "bg-white"}`}>
                <Ionicons name={confirmModal.icon} size={40} color={confirmModal.iconColor} />
              </View>
              <Text className={`text-lg font-JakartaBold text-center ${isDark ? "text-slate-100" : "text-slate-800"}`}>{confirmModal.title}</Text>
            </View>
            <View className="px-5 pt-4 pb-5">
              <Text className={`text-sm font-JakartaMedium text-center leading-5 ${isDark ? "text-slate-300" : "text-slate-600"}`}>{confirmModal.message}</Text>
              <View className="flex-row gap-3 mt-5">
                <TouchableOpacity
                  onPress={() => setConfirmModal((p) => ({ ...p, visible: false }))}
                  className={`flex-1 py-3 rounded-xl items-center border ${isDark ? "border-slate-600" : "border-slate-300"}`}
                >
                  <Text className={`font-JakartaBold ${isDark ? "text-slate-300" : "text-slate-600"}`}>Cancel</Text>
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
