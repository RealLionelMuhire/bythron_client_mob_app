import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
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

import { getThemeColors } from "@/constants/theme";
import { fetchAPI } from "@/lib/fetch";
import { saveColorScheme } from "@/lib/theme";
import { useDeviceStore } from "@/store";
import { AlertDialog, ConfirmModal, useDialog, useConfirmModal } from "@/components/AppModals";
import { clearOnboardingState, getCurrentPlan, getPlanExpiresAt } from "@/lib/onboarding";
import { getPlan, PlanId } from "@/constants/plans";

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

  const { dialog, showDialog, hideDialog } = useDialog();
  const { confirmModal, showConfirm, hideConfirm } = useConfirmModal(colors.status.error);

  const [diagnostics, setDiagnostics] = useState<any>(null);
  const [diagLoading, setDiagLoading] = useState(false);

  // Subscription Plan State
  const [currentPlan, setCurrentPlan] = useState<string>("trial");
  const [expiresAt, setExpiresAt] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const p = await getCurrentPlan();
      const e = await getPlanExpiresAt();
      setCurrentPlan(p || "trial");
      setExpiresAt(e);
    })();
  }, []);

  const daysLeft = expiresAt
    ? Math.max(0, Math.ceil((new Date(expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0;

  const planBadgeColor = daysLeft <= 0 ? colors.status.error : daysLeft <= 3 ? "#F59E0B" : colors.accent[500];

  const upgradeLabel = () => {
    if (daysLeft <= 0) return "Renew Plan";
    if (currentPlan === "trial") return "Upgrade to Basic";
    if (currentPlan === "basic") return "Upgrade to Fleet";
    return "Renew Plan"; // fleet
  };

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
    showConfirm({
      title: "Sign out?",
      message: "You will need to sign in again to access your account and devices.",
      icon: "log-out",
      iconColor: colors.status.error,
      label: "Sign out",
      color: colors.status.error,
      onConfirm: async () => {
        hideConfirm();
        await clearOnboardingState();
        await signOut();
        router.replace("/(auth)/sign-up");
      },
    });
  }, [signOut, showConfirm, hideConfirm]);

  const SectionHeader = ({ icon, title }: { icon: React.ReactNode; title: string }) => (
    <View className="flex-row items-center mb-4">
      {icon}
      <Text className={`text-lg font-JakartaBold ml-2 ${isDark ? "text-slate-100" : "text-slate-900"}`}>{title}</Text>
    </View>
  );

  return (
    <View className={`flex-1 ${isDark ? "bg-slate-900" : "bg-surface-light"}`}>
      <ScrollView className="px-5" contentContainerStyle={{ paddingBottom: 120, paddingTop: 20 }}>
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
                className={`flex-row items-center py-3 px-4 rounded-xl border mt-3 ${isDark ? "bg-slate-700 border-slate-600" : "bg-accent-100 border-accent-400"}`}
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
              
              <TouchableOpacity
                onPress={() => router.push("/(root)/(tabs)/alerts")}
                className={`flex-row items-center py-3 px-4 rounded-xl border mt-3 ${isDark ? "bg-slate-700 border-slate-600" : "bg-slate-100 border-slate-300"}`}
              >
                <Ionicons name="notifications" size={18} color={isDark ? "#94A3B8" : "#475569"} />
                <Text className={`text-sm font-JakartaBold ml-2 ${isDark ? "text-slate-300" : "text-slate-700"}`}>Configure Alerts</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* ════════ SUBSCRIPTION & BILLING ════════ */}
        <View className={`rounded-2xl shadow-sm border px-5 py-4 mb-4 ${isDark ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200"}`}>
          <SectionHeader icon={<Ionicons name="card" size={22} color={colors.accent[400]} />} title="Billing & Plan" />
          <View style={{ padding: 14, borderRadius: 14, borderWidth: 1, backgroundColor: isDark ? colors.surface.light : colors.accent[50], borderColor: colors.accent[200] }}>
            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 6 }}>
              <Ionicons name="cube-outline" size={18} color={planBadgeColor} style={{ marginRight: 6 }} />
              <Text style={{ fontSize: 12, fontFamily: "Jakarta-Medium", flex: 1, color: colors.text.secondary }}>Current Plan</Text>
              <View style={{ paddingHorizontal: 8, paddingVertical: 2, borderRadius: 20, borderWidth: 1, backgroundColor: planBadgeColor + "20", borderColor: planBadgeColor }}>
                <Text style={{ fontSize: 11, fontFamily: "Jakarta-Bold", color: planBadgeColor }}>
                  {daysLeft <= 0 ? "Expired" : `${daysLeft}d left`}
                </Text>
              </View>
            </View>
            <Text style={{ fontSize: 18, fontFamily: "Jakarta-Bold", marginBottom: 12, color: colors.text.primary }}>
              {getPlan(currentPlan as PlanId).name}
            </Text>
            <TouchableOpacity
              style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 10, borderRadius: 10, backgroundColor: planBadgeColor }}
              onPress={() => router.push("/(onboarding)/billing")}
            >
              <Ionicons name="arrow-up-circle-outline" size={16} color="#fff" style={{ marginRight: 6 }} />
              <Text style={{ color: "#fff", fontFamily: "Jakarta-Bold", fontSize: 14 }}>{upgradeLabel()}</Text>
            </TouchableOpacity>
          </View>
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
                {user?.primaryEmailAddress?.emailAddress || user?.primaryPhoneNumber?.phoneNumber || ""}
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

      {/* Shared modals */}
      <AlertDialog dialog={dialog} onClose={hideDialog} isDark={isDark} />
      <ConfirmModal modal={confirmModal} isDark={isDark} onClose={hideConfirm} />
    </View>
  );
};

export default Settings;
