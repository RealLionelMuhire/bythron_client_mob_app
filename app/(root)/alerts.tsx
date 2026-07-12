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
import * as SecureStore from "expo-secure-store";

import { getThemeColors } from "@/constants/theme";
import { fetchAPI } from "@/lib/fetch";
import { useDeviceStore } from "@/store";
import { useColorScheme } from "nativewind";
import { AlertDialog, useDialog } from "@/components/AppModals";
import { ALARM_META, AlarmMeta, findAlarmMetaByStatusKey, SEVERITY_COLOR, SEVERITY_LABEL } from "@/constants/alarms";

// AlarmConfig and ALARMS are now supplied by ALARM_META from @/constants/alarms.
// Re-export AlarmConfig alias for internal use.
type AlarmConfig = AlarmMeta;

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
    Object.fromEntries(ALARM_META.map((a) => [a.label, false]))
  );
  const [stateLoading, setStateLoading] = useState(false);
  const [loadingKey, setLoadingKey] = useState<string | null>(null);

  const [extraModal, setExtraModal] = useState<{ alarm: AlarmConfig; enabled: boolean } | null>(null);
  const [extraValue, setExtraValue] = useState("");
  // Persistent per-device defaults for speed and radius inputs
  const [savedDefaults, setSavedDefaults] = useState<{ speed_kmh: number; radius_meters: number }>({
    speed_kmh: 120,
    radius_meters: 200,
  });

  const { dialog, showDialog, hideDialog } = useDialog();

  // ── Load alarm state from device status ──────────────────────────────────
  useEffect(() => {
    if (deviceId == null) return;

    // Load saved extra defaults for this device
    SecureStore.getItemAsync(`alarm_defaults_${deviceId}`)
      .then((raw) => { if (raw) setSavedDefaults(JSON.parse(raw)); })
      .catch(() => {});

    let cancelled = false;
    setStateLoading(true);

    fetchAPI(`/api/devices/${deviceId}/query/status`, { method: "POST" })
      .then((res: any) => {
        if (cancelled) return;
        // Device responds with a plain-text string like "ACC:ON,SOS:ON,OVERSPEED:ON"
        // Robust parser: handle spaces, semicolons, = separators, unknown keys.
        const raw: string = res?.device_response ?? "";
        if (!raw) return;

        const updates: Record<string, boolean> = {};
        // Match every KEY:VALUE or KEY=VALUE pair (case-insensitive, with optional spaces)
        const pairs = raw.match(/[A-Za-z_]+\s*[:=]\s*[A-Za-z]+/g) ?? [];
        pairs.forEach((pair) => {
          const sep = pair.includes(":") ? ":" : "=";
          const [rawKey, rawVal] = pair.split(sep).map((s) => s.trim());
          const meta = findAlarmMetaByStatusKey(rawKey);
          if (meta) updates[meta.label] = rawVal.toUpperCase() === "ON";
        });
        setAlarmState((prev) => ({ ...prev, ...updates }));
      })
      .catch(() => {
        // Non-fatal — device may be offline; keep default all-OFF state.
      })
      .finally(() => { if (!cancelled) setStateLoading(false); });

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

        // Persist extra defaults so next time the input is pre-filled
        if (enabled && extra && deviceId != null) {
          const next = {
            ...savedDefaults,
            ...(extra.speed_kmh != null    ? { speed_kmh: extra.speed_kmh }       : {}),
            ...(extra.radius_meters != null ? { radius_meters: extra.radius_meters } : {}),
          };
          setSavedDefaults(next);
          SecureStore.setItemAsync(`alarm_defaults_${deviceId}`, JSON.stringify(next)).catch(() => {});
        }

        showDialog("success", enabled ? "Alarm activated" : "Alarm deactivated", enabled ? alarm.onMsg : alarm.offMsg);
      } catch {
        showDialog("error", "Something went wrong", "Could not update the alarm. Please check your connection and try again.");
      } finally {
        setLoadingKey(null);
      }
    },
    [deviceId, savedDefaults, showDialog]
  );

  const handleAlarmToggle = useCallback(
    (alarm: AlarmConfig, value: boolean) => {
      if (alarm.extra && value) {
        setExtraModal({ alarm, enabled: true });
        // Pre-fill with the last saved default for this alarm type
        const def = alarm.extra === "speed_kmh" ? savedDefaults.speed_kmh : savedDefaults.radius_meters;
        setExtraValue(String(def));
        return;
      }
      sendAlarm(alarm, value);
    },
    [savedDefaults, sendAlarm]
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

            {ALARM_META.map((alarm) => {
              const severityColor = SEVERITY_COLOR[alarm.severity];
              return (
              <View
                key={alarm.label}
                className={`flex-row items-center justify-between py-3 border-b ${isDark ? "border-slate-700" : "border-slate-200"}`}
              >
                <View className="flex-row items-center flex-1">
                  <Ionicons name={alarm.icon} size={18} color={alarmState[alarm.label] ? colors.accent[400] : colors.status.muted} />
                  <View style={{ flex: 1, marginLeft: 8 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                      <Text className={`text-base font-JakartaMedium ${isDark ? "text-slate-300" : "text-slate-700"}`}>{alarm.label}</Text>
                      {/* Severity badge */}
                      <View style={[{ paddingHorizontal: 6, paddingVertical: 1, borderRadius: 8, borderWidth: 1, borderColor: severityColor, backgroundColor: severityColor + "18" }]}>
                        <Text style={{ fontSize: 9, fontFamily: "Jakarta-Bold", color: severityColor }}>{SEVERITY_LABEL[alarm.severity].toUpperCase()}</Text>
                      </View>
                    </View>
                  </View>
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
              );
            })}
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
