import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { getThemeColors } from "@/constants/theme";
import { fetchAPI } from "@/lib/fetch";
import { useDeviceStore } from "@/store";
import { useColorScheme } from "nativewind";
import { AlertDialog, useDialog } from "@/components/AppModals";

type AlarmExtra = "speed_kmh" | "radius_meters" | null;

interface AlarmConfig {
  label: string;
  endpoint: string;
  extra: AlarmExtra;
  icon: keyof typeof Ionicons.glyphMap;
  onMsg: string;
  offMsg: string;
}

const ALARMS: AlarmConfig[] = [
  { label: "SOS alarm", endpoint: "/alarm/sos", extra: null, icon: "alert-circle",
    onMsg: "SOS alarm is now active. You will be alerted if the SOS button is pressed on the device.",
    offMsg: "SOS alarm has been turned off." },
  { label: "Vibration alarm", endpoint: "/alarm/vibration", extra: null, icon: "phone-portrait",
    onMsg: "Vibration alarm is now active. You will be notified if the device detects unusual movement.",
    offMsg: "Vibration alarm has been turned off." },
  { label: "Low battery alarm", endpoint: "/alarm/lowbattery", extra: null, icon: "battery-dead",
    onMsg: "Low battery alarm is now active. You will be notified when battery is running low.",
    offMsg: "Low battery alarm has been turned off." },
  { label: "ACC alarm", endpoint: "/alarm/acc", extra: null, icon: "key",
    onMsg: "Ignition alarm is now active. You will be notified when the vehicle ignition is turned on or off.",
    offMsg: "Ignition alarm has been turned off." },
  { label: "Overspeed alarm", endpoint: "/alarm/overspeed", extra: "speed_kmh", icon: "speedometer",
    onMsg: "Overspeed alarm is now active. You will be notified if the vehicle exceeds the speed limit.",
    offMsg: "Overspeed alarm has been turned off." },
  { label: "Displacement alarm", endpoint: "/alarm/displacement", extra: "radius_meters", icon: "locate",
    onMsg: "Displacement alarm is now active. You will be notified if the vehicle moves outside the set radius.",
    offMsg: "Displacement alarm has been turned off." },
];

/** Keys used in the device STATUS response from the backend */
const STATUS_LABEL_MAP: Record<string, string> = {
  sos: "SOS alarm",
  vibration: "Vibration alarm",
  low_battery: "Low battery alarm",
  acc: "ACC alarm",
  overspeed: "Overspeed alarm",
  displacement: "Displacement alarm",
};

const Alerts = () => {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const colors = getThemeColors(isDark ? "dark" : "light");
  const devices = useDeviceStore((s) => s.devices);
  const selectedDevice = useDeviceStore((s) => s.selectedDevice);
  const setSelectedDevice = useDeviceStore((s) => s.setSelectedDevice);

  const deviceId = selectedDevice ?? devices[0]?.id ?? null;

  // Alarm toggle state — initialised false, then loaded from backend
  const [alarmState, setAlarmState] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(ALARMS.map((a) => [a.label, false]))
  );
  const [stateLoading, setStateLoading] = useState(false);
  const [loadingKey, setLoadingKey] = useState<string | null>(null);

  const [extraModal, setExtraModal] = useState<{ alarm: AlarmConfig; enabled: boolean } | null>(null);
  const [extraValue, setExtraValue] = useState("");

  const { dialog, showDialog, hideDialog } = useDialog();

  // ── Load alarm state from device status ──────────────────────────────────
  useEffect(() => {
    if (deviceId == null) return;

    let cancelled = false;
    setStateLoading(true);

    fetchAPI(`/api/devices/${deviceId}/query/status`, { method: "POST" })
      .then((res: any) => {
        if (cancelled) return;
        // The device replies with a plain text response like "ACC:ON,SOS:ON,..."
        // Parse it and map to our label keys.
        const raw: string = res?.device_response ?? "";
        if (!raw) return;

        const updates: Record<string, boolean> = {};
        raw.split(",").forEach((part: string) => {
          const [key, val] = part.trim().split(":");
          const label = STATUS_LABEL_MAP[key?.toLowerCase()];
          if (label) updates[label] = val?.trim().toUpperCase() === "ON";
        });
        setAlarmState((prev) => ({ ...prev, ...updates }));
      })
      .catch(() => {
        // Non-fatal — backend may not be reachable or device may be offline.
        // Silently keep the default all-OFF state; the user can still toggle.
      })
      .finally(() => {
        if (!cancelled) setStateLoading(false);
      });

    return () => { cancelled = true; };
  }, [deviceId]);

  const sendAlarm = useCallback(
    async (alarm: AlarmConfig, enabled: boolean, extra?: { speed_kmh?: number; radius_meters?: number }) => {
      if (deviceId == null) { showDialog("error", "No device", "Please select a device first."); return; }
      setLoadingKey(alarm.label);
      try {
        const body: Record<string, unknown> = { enabled };
        if (enabled && alarm.extra === "speed_kmh" && extra?.speed_kmh != null) body.speed_kmh = extra.speed_kmh;
        if (enabled && alarm.extra === "radius_meters" && extra?.radius_meters != null) body.radius_meters = extra.radius_meters;

        await fetchAPI(`/api/devices/${deviceId}${alarm.endpoint}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        setAlarmState((prev) => ({ ...prev, [alarm.label]: enabled }));
        showDialog("success", enabled ? "Alarm activated" : "Alarm deactivated", enabled ? alarm.onMsg : alarm.offMsg);
      } catch {
        showDialog("error", "Something went wrong", "Could not update the alarm. Please check your connection and try again.");
      } finally {
        setLoadingKey(null);
      }
    },
    [deviceId, showDialog]
  );

  const handleAlarmToggle = useCallback(
    (alarm: AlarmConfig, value: boolean) => {
      if (alarm.extra && value) {
        setExtraModal({ alarm, enabled: true });
        setExtraValue(alarm.extra === "speed_kmh" ? "120" : "200");
        return;
      }
      sendAlarm(alarm, value);
    },
    [sendAlarm]
  );

  const submitExtraModal = useCallback(() => {
    if (!extraModal) return;
    const num = parseInt(extraValue, 10);
    if (Number.isNaN(num) || num <= 0) {
      showDialog("error", "Invalid value",
        extraModal.alarm.extra === "speed_kmh"
          ? "Please enter a valid speed in km/h (e.g. 120)."
          : "Please enter a valid radius in meters (e.g. 200).");
      return;
    }
    const payload = extraModal.alarm.extra === "speed_kmh" ? { speed_kmh: num } : { radius_meters: num };
    setExtraModal(null);
    sendAlarm(extraModal.alarm, true, payload);
  }, [extraModal, extraValue, sendAlarm, showDialog]);

  return (
    <SafeAreaView className={`flex-1 ${isDark ? "bg-slate-900" : "bg-surface-light"}`}>
      <ScrollView className="px-5" contentContainerStyle={{ paddingBottom: 120, paddingTop: 10 }}>
        <Text className={`text-2xl font-JakartaBold my-5 ${isDark ? "text-slate-100" : "text-slate-900"}`}>Alerts</Text>

        {/* Device selector */}
        {devices.length > 1 && (
          <View className={`rounded-2xl shadow-sm border px-5 py-4 mb-4 ${isDark ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200"}`}>
            <Text className={`text-sm font-JakartaMedium mb-2 ${isDark ? "text-slate-400" : "text-slate-600"}`}>Select device</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {devices.map((d) => (
                <TouchableOpacity
                  key={d.id}
                  onPress={() => setSelectedDevice(d.id)}
                  className={`mr-3 px-4 py-2 rounded-xl ${deviceId === d.id ? "bg-accent-400" : isDark ? "bg-slate-600" : "bg-slate-200"}`}
                >
                  <Text className={`text-sm font-JakartaBold ${deviceId === d.id ? "text-white" : isDark ? "text-slate-300" : "text-slate-600"}`}>{d.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {deviceId == null ? (
          <View className={`rounded-2xl shadow-sm border px-5 py-8 items-center mb-4 ${isDark ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200"}`}>
            <Ionicons name="notifications-off" size={48} color={colors.status.muted} />
            <Text className={`text-base font-JakartaMedium mt-3 ${isDark ? "text-slate-400" : "text-slate-600"}`}>No device available</Text>
            <Text className={`text-xs font-JakartaMedium mt-1 ${isDark ? "text-slate-400" : "text-slate-500"}`}>Add a tracker to manage alerts.</Text>
          </View>
        ) : (
          <View className={`rounded-2xl shadow-sm border px-5 py-4 mb-4 ${isDark ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200"}`}>
            <View className="flex-row items-center mb-4">
              <Ionicons name="notifications" size={22} color={colors.status.error} />
              <Text className={`text-lg font-JakartaBold ml-2 ${isDark ? "text-slate-100" : "text-slate-900"}`}>Alert settings</Text>
              {stateLoading && <ActivityIndicator size="small" color={colors.accent[400]} style={{ marginLeft: 8 }} />}
            </View>
            <Text className={`text-xs font-JakartaMedium mb-3 ${isDark ? "text-slate-400" : "text-slate-500"}`}>Toggle alarms on the tracker device</Text>

            {ALARMS.map((alarm) => (
              <View
                key={alarm.label}
                className={`flex-row items-center justify-between py-3 border-b ${isDark ? "border-slate-700" : "border-slate-200"}`}
              >
                <View className="flex-row items-center flex-1">
                  <Ionicons name={alarm.icon} size={18} color={alarmState[alarm.label] ? colors.accent[400] : colors.status.muted} />
                  <Text className={`text-base font-JakartaMedium ml-2 ${isDark ? "text-slate-300" : "text-slate-700"}`}>{alarm.label}</Text>
                </View>
                <View className="flex-row items-center">
                  <Text className={`text-xs font-JakartaBold mr-2 ${alarmState[alarm.label] ? "text-accent-400" : "text-status-muted"}`}>
                    {alarmState[alarm.label] ? "ON" : "OFF"}
                  </Text>
                  {loadingKey === alarm.label ? (
                    <ActivityIndicator size="small" color={colors.accent[400]} />
                  ) : (
                    <Switch
                      value={alarmState[alarm.label]}
                      onValueChange={(v) => handleAlarmToggle(alarm, v)}
                      trackColor={{ false: "#CBD5E1", true: colors.accent[400] }}
                      thumbColor="#FFFFFF"
                      disabled={stateLoading}
                    />
                  )}
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Shared alert dialog */}
      <AlertDialog dialog={dialog} onClose={hideDialog} isDark={isDark} />

      {/* Extra value modal (speed / radius input) */}
      <Modal visible={!!extraModal} transparent animationType="fade">
        <View className="flex-1 justify-center items-center px-6" style={{ backgroundColor: "rgba(0,0,0,0.45)" }}>
          <View className={`rounded-2xl w-full max-w-sm overflow-hidden ${isDark ? "bg-slate-800" : "bg-white"}`}>
            <View className={`items-center pt-6 pb-4 px-5 ${isDark ? "bg-slate-700" : "bg-sky-50"}`}>
              <View className={`w-16 h-16 rounded-full items-center justify-center mb-3 ${isDark ? "bg-slate-600" : "bg-white"}`}>
                <Ionicons
                  name={extraModal?.alarm.extra === "speed_kmh" ? "speedometer" : "locate"}
                  size={40}
                  color={colors.accent[400]}
                />
              </View>
              <Text className={`text-lg font-JakartaBold text-center ${isDark ? "text-slate-100" : "text-slate-800"}`}>
                {extraModal?.alarm.extra === "speed_kmh" ? "Set speed limit" : "Set displacement radius"}
              </Text>
              <Text className={`text-xs font-JakartaMedium text-center mt-1 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                {extraModal?.alarm.extra === "speed_kmh"
                  ? "You will be notified if the vehicle exceeds this speed."
                  : "You will be notified if the vehicle moves beyond this distance."}
              </Text>
            </View>
            <View className="px-5 pt-4 pb-5">
              <Text className={`text-sm font-JakartaMedium mb-2 ${isDark ? "text-slate-400" : "text-slate-600"}`}>
                {extraModal?.alarm.extra === "speed_kmh" ? "Speed (km/h)" : "Radius (meters)"}
              </Text>
              <TextInput
                value={extraValue}
                onChangeText={setExtraValue}
                keyboardType="number-pad"
                placeholder={extraModal?.alarm.extra === "speed_kmh" ? "120" : "200"}
                className={`border rounded-xl px-4 py-3 text-base mb-4 ${isDark ? "border-slate-600 text-slate-100 bg-slate-800" : "border-slate-300 text-slate-900 bg-white"}`}
              />
              <View className="flex-row gap-3">
                <TouchableOpacity
                  onPress={() => setExtraModal(null)}
                  className={`flex-1 py-3 rounded-xl items-center border ${isDark ? "border-slate-600" : "border-slate-300"}`}
                >
                  <Text className={`font-JakartaBold ${isDark ? "text-slate-300" : "text-slate-600"}`}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={submitExtraModal}
                  className="flex-1 py-3 rounded-xl items-center bg-accent-400"
                >
                  <Text className="font-JakartaBold text-white">Activate</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default Alerts;
