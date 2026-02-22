import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { fetchAPI } from "@/lib/fetch";
import { useDeviceStore } from "@/store";

type AlarmExtra = "speed_kmh" | "radius_meters" | null;
type DialogType = "success" | "error" | "warning" | "info";

interface AlarmConfig {
  label: string;
  endpoint: string;
  extra: AlarmExtra;
  icon: keyof typeof Ionicons.glyphMap;
  onMsg: string;
  offMsg: string;
}

const DIALOG_COLORS: Record<DialogType, { bg: string; icon: string; btn: string }> = {
  success: { bg: "#ECFDF5", icon: "#10B981", btn: "#10B981" },
  error:   { bg: "#FEF2F2", icon: "#EF4444", btn: "#EF4444" },
  warning: { bg: "#FFFBEB", icon: "#F59E0B", btn: "#F59E0B" },
  info:    { bg: "#EFF6FF", icon: "#5BB8E8", btn: "#5BB8E8" },
};

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

const Alerts = () => {
  const devices = useDeviceStore((s) => s.devices);
  const selectedDevice = useDeviceStore((s) => s.selectedDevice);
  const setSelectedDevice = useDeviceStore((s) => s.setSelectedDevice);

  const deviceId = selectedDevice ?? devices[0]?.id ?? null;

  const [alarmState, setAlarmState] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(ALARMS.map((a) => [a.label, false]))
  );
  const [loadingKey, setLoadingKey] = useState<string | null>(null);

  const [extraModal, setExtraModal] = useState<{ alarm: AlarmConfig; enabled: boolean } | null>(null);
  const [extraValue, setExtraValue] = useState("");

  const [dialog, setDialog] = useState<{
    visible: boolean; type: DialogType; title: string; message: string; icon: keyof typeof Ionicons.glyphMap;
  }>({ visible: false, type: "info", title: "", message: "", icon: "checkmark-circle" });

  const showDialog = useCallback((type: DialogType, title: string, message: string, icon?: keyof typeof Ionicons.glyphMap) => {
    const defaults: Record<DialogType, keyof typeof Ionicons.glyphMap> = {
      success: "checkmark-circle", error: "close-circle", warning: "warning", info: "information-circle",
    };
    setDialog({ visible: true, type, title, message, icon: icon ?? defaults[type] });
  }, []);

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
    <SafeAreaView className="flex-1" style={{ backgroundColor: "#F7FAFF" }}>
      <ScrollView className="px-5" contentContainerStyle={{ paddingBottom: 120, paddingTop: 10 }}>
        <Text className="text-2xl font-JakartaBold my-5">Alerts</Text>

        {/* Device selector */}
        {devices.length > 1 && (
          <View className="bg-white rounded-2xl shadow-sm shadow-neutral-300 px-5 py-4 mb-4">
            <Text className="text-sm font-JakartaMedium text-gray-500 mb-2">Select device</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {devices.map((d) => (
                <TouchableOpacity
                  key={d.id}
                  onPress={() => setSelectedDevice(d.id)}
                  className="mr-3 px-4 py-2 rounded-xl"
                  style={{ backgroundColor: deviceId === d.id ? "#5BB8E8" : "#E2E8F0" }}
                >
                  <Text className="text-sm font-JakartaBold" style={{ color: deviceId === d.id ? "#fff" : "#475569" }}>{d.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {deviceId == null ? (
          <View className="bg-white rounded-2xl shadow-sm shadow-neutral-300 px-5 py-8 items-center mb-4">
            <Ionicons name="notifications-off" size={48} color="#94A3B8" />
            <Text className="text-base font-JakartaMedium text-slate-500 mt-3">No device available</Text>
            <Text className="text-xs font-JakartaMedium text-slate-400 mt-1">Add a tracker to manage alerts.</Text>
          </View>
        ) : (
          <View className="bg-white rounded-2xl shadow-sm shadow-neutral-300 px-5 py-4 mb-4">
            <View className="flex-row items-center mb-4">
              <Ionicons name="notifications" size={22} color="#E36060" />
              <Text className="text-lg font-JakartaBold text-slate-800 ml-2">Alert settings</Text>
            </View>
            <Text className="text-xs font-JakartaMedium text-gray-400 mb-3">Toggle alarms on the tracker device</Text>

            {ALARMS.map((alarm) => (
              <View
                key={alarm.label}
                className="flex-row items-center justify-between py-3 border-b border-neutral-100"
              >
                <View className="flex-row items-center flex-1">
                  <Ionicons name={alarm.icon} size={18} color={alarmState[alarm.label] ? "#5BB8E8" : "#94A3B8"} />
                  <Text className="text-base font-JakartaMedium text-slate-700 ml-2">{alarm.label}</Text>
                </View>
                <View className="flex-row items-center">
                  <Text className="text-xs font-JakartaBold mr-2" style={{ color: alarmState[alarm.label] ? "#5BB8E8" : "#94A3B8" }}>
                    {alarmState[alarm.label] ? "ON" : "OFF"}
                  </Text>
                  {loadingKey === alarm.label ? (
                    <ActivityIndicator size="small" color="#5BB8E8" />
                  ) : (
                    <Switch
                      value={alarmState[alarm.label]}
                      onValueChange={(v) => handleAlarmToggle(alarm, v)}
                      trackColor={{ false: "#CBD5E1", true: "#5BB8E8" }}
                      thumbColor="#FFFFFF"
                    />
                  )}
                </View>
              </View>
            ))}
          </View>
        )}
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

      {/* Extra value modal */}
      <Modal visible={!!extraModal} transparent animationType="fade">
        <View className="flex-1 justify-center items-center px-6" style={{ backgroundColor: "rgba(0,0,0,0.45)" }}>
          <View className="bg-white rounded-2xl w-full max-w-sm overflow-hidden">
            <View className="items-center pt-6 pb-4 px-5" style={{ backgroundColor: "#EFF6FF" }}>
              <View className="w-16 h-16 rounded-full items-center justify-center mb-3" style={{ backgroundColor: "#fff" }}>
                <Ionicons
                  name={extraModal?.alarm.extra === "speed_kmh" ? "speedometer" : "locate"}
                  size={40}
                  color="#5BB8E8"
                />
              </View>
              <Text className="text-lg font-JakartaBold text-slate-800 text-center">
                {extraModal?.alarm.extra === "speed_kmh" ? "Set speed limit" : "Set displacement radius"}
              </Text>
              <Text className="text-xs font-JakartaMedium text-slate-500 text-center mt-1">
                {extraModal?.alarm.extra === "speed_kmh"
                  ? "You will be notified if the vehicle exceeds this speed."
                  : "You will be notified if the vehicle moves beyond this distance."}
              </Text>
            </View>
            <View className="px-5 pt-4 pb-5">
              <Text className="text-sm font-JakartaMedium text-slate-600 mb-2">
                {extraModal?.alarm.extra === "speed_kmh" ? "Speed (km/h)" : "Radius (meters)"}
              </Text>
              <TextInput
                value={extraValue}
                onChangeText={setExtraValue}
                keyboardType="number-pad"
                placeholder={extraModal?.alarm.extra === "speed_kmh" ? "120" : "200"}
                className="border border-slate-300 rounded-xl px-4 py-3 text-base mb-4"
              />
              <View className="flex-row gap-3">
                <TouchableOpacity
                  onPress={() => setExtraModal(null)}
                  className="flex-1 py-3 rounded-xl items-center border border-slate-300"
                >
                  <Text className="font-JakartaBold text-slate-600">Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={submitExtraModal}
                  className="flex-1 py-3 rounded-xl items-center"
                  style={{ backgroundColor: "#5BB8E8" }}
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
