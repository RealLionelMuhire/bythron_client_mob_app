import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";

import { DIALOG_COLORS, getThemeColors } from "@/constants/theme";
import { fetchAPI } from "@/lib/fetch";
import { useDeviceStore } from "@/store";
import { useColorScheme } from "nativewind";

type DialogType = "success" | "error" | "warning" | "info";

const Command = () => {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const colors = getThemeColors(isDark ? "dark" : "light");
  const devices = useDeviceStore((s) => s.devices);
  const selectedDevice = useDeviceStore((s) => s.selectedDevice);
  const setSelectedDevice = useDeviceStore((s) => s.setSelectedDevice);

  const deviceId = selectedDevice ?? devices[0]?.id ?? null;

  const [commandLoading, setCommandLoading] = useState<string | null>(null);
  const [rawCommand, setRawCommand] = useState("");
  const [fuelStatus, setFuelStatus] = useState<"active" | "cut" | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

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

  const sendCommand = useCallback(
    async (label: string, endpoint: string, bodyData?: object) => {
      if (deviceId == null) { showDialog("error", "No device", "Please select a device first."); return; }
      setCommandLoading(label);
      try {
        const opts: RequestInit = { method: "POST", headers: { "Content-Type": "application/json" } };
        if (bodyData) opts.body = JSON.stringify(bodyData);
        const res = await fetchAPI(`/api/devices/${deviceId}${endpoint}`, opts);
        if (res.device_response) {
          showDialog("info", label, `Response from device:\n\n${res.device_response}`);
        } else {
          showDialog("success", label, "Command sent successfully. The device will process it shortly.");
        }
      } catch {
        showDialog("error", "Failed", `Could not send the "${label}" command. Please check your connection and try again.`);
      } finally {
        setCommandLoading(null);
      }
    },
    [deviceId, showDialog]
  );

  const sendRawCommand = useCallback(async () => {
    if (!rawCommand.trim()) { showDialog("warning", "Empty command", "Please type a command before sending."); return; }
    await sendCommand("Raw command", "/command", { command: rawCommand.trim() });
  }, [rawCommand, sendCommand, showDialog]);

  const handleFuelCut = useCallback(() => {
    setConfirmModal({
      visible: true,
      title: "Stop the vehicle?",
      message: "This will cut the fuel supply and the vehicle will stop moving. This is used for immobilization.\n\nAre you sure you want to proceed?",
      icon: "warning",
      iconColor: colors.status.error,
      label: "Yes, cut fuel",
      color: colors.status.error,
      onConfirm: async () => {
        setConfirmModal((p) => ({ ...p, visible: false }));
        setCommandLoading("Cut fuel");
        try {
          await fetchAPI(`/api/devices/${deviceId}/fuel/cut`, { method: "POST" });
          setFuelStatus("cut");
          showDialog("success", "Fuel supply cut",
            "The fuel supply has been cut successfully. The vehicle will stop moving shortly.\n\nTo restore, use the \"Restore fuel\" button.");
        } catch {
          showDialog("error", "Failed", "Could not send the fuel cut command. Please try again.");
        } finally {
          setCommandLoading(null);
        }
      },
    });
  }, [deviceId, showDialog]);

  const handleFuelRestore = useCallback(() => {
    setConfirmModal({
      visible: true,
      title: "Restore fuel supply?",
      message: "This will restore the fuel supply and the vehicle will be able to move again.\n\nAre you sure?",
      icon: "information-circle",
      iconColor: colors.status.success,
      label: "Yes, restore fuel",
      color: colors.status.success,
      onConfirm: async () => {
        setConfirmModal((p) => ({ ...p, visible: false }));
        setCommandLoading("Restore fuel");
        try {
          await fetchAPI(`/api/devices/${deviceId}/fuel/restore`, { method: "POST" });
          setFuelStatus("active");
          showDialog("success", "Fuel supply restored",
            "The fuel supply has been restored successfully. The vehicle can now move normally.");
        } catch {
          showDialog("error", "Failed", "Could not send the restore command. Please try again.");
        } finally {
          setCommandLoading(null);
        }
      },
    });
  }, [deviceId, showDialog]);

  const fuelLabel = fuelStatus === "cut" ? "Fuel is currently CUT — vehicle cannot move" : fuelStatus === "active" ? "Fuel supply is active — vehicle can move" : null;
  const fuelColor = fuelStatus === "cut" ? colors.status.error : colors.status.success;

  return (
    <SafeAreaView className={`flex-1 ${isDark ? "bg-slate-900" : "bg-surface-light"}`}>
      <ScrollView className="px-5" contentContainerStyle={{ paddingBottom: 120, paddingTop: 10 }}>
        <Text className={`text-2xl font-JakartaBold my-5 ${isDark ? "text-slate-100" : "text-slate-900"}`}>Commands</Text>

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
            <Ionicons name="terminal-outline" size={48} color={colors.status.muted} />
            <Text className={`text-base font-JakartaMedium mt-3 ${isDark ? "text-slate-400" : "text-slate-600"}`}>No device available</Text>
            <Text className={`text-xs font-JakartaMedium mt-1 ${isDark ? "text-slate-400" : "text-slate-500"}`}>Add a tracker to send commands.</Text>
          </View>
        ) : (
          <>
            {/* Fuel control */}
            <View className={`rounded-2xl shadow-sm border px-5 py-4 mb-4 ${isDark ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200"}`}>
              <View className="flex-row items-center mb-2">
                <MaterialCommunityIcons name="fuel" size={22} color={colors.accent[400]} />
                <Text className={`text-lg font-JakartaBold ml-2 ${isDark ? "text-slate-100" : "text-slate-900"}`}>Fuel control</Text>
              </View>
              <Text className="text-xs font-JakartaMedium text-slate-500 dark:text-slate-400 mb-3">
                Control the vehicle's fuel supply remotely. Cutting fuel will stop the vehicle from moving.
              </Text>

              {fuelLabel && (
                <View className={`flex-row items-center rounded-xl px-3 py-2 mb-3 ${fuelStatus === "cut" ? "bg-danger-100" : "bg-success-100"}`}>
                  <Ionicons name={fuelStatus === "cut" ? "alert-circle" : "checkmark-circle"} size={16} color={fuelColor} />
                  <Text className="text-xs font-JakartaBold ml-2" style={{ color: fuelColor }}>{fuelLabel}</Text>
                </View>
              )}

              <View className="flex-row gap-3">
                <TouchableOpacity
                  onPress={handleFuelCut}
                  disabled={commandLoading !== null}
                  className="flex-1 flex-row items-center justify-center py-3 rounded-xl bg-status-error"
                >
                  {commandLoading === "Cut fuel" ? <ActivityIndicator size="small" color="#fff" /> : (
                    <>
                      <MaterialCommunityIcons name="fuel" size={18} color="#fff" />
                      <Text className="text-white font-JakartaBold ml-2">Cut fuel</Text>
                    </>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleFuelRestore}
                  disabled={commandLoading !== null}
                  className="flex-1 flex-row items-center justify-center py-3 rounded-xl bg-status-success"
                >
                  {commandLoading === "Restore fuel" ? <ActivityIndicator size="small" color="#fff" /> : (
                    <>
                      <MaterialCommunityIcons name="fuel" size={18} color="#fff" />
                      <Text className="text-white font-JakartaBold ml-2">Restore</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>

            {/* Query */}
            <View className={`rounded-2xl shadow-sm border px-5 py-4 mb-4 ${isDark ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200"}`}>
              <View className="flex-row items-center mb-3">
                <Ionicons name="search" size={22} color={colors.accent[400]} />
                <Text className={`text-lg font-JakartaBold ml-2 ${isDark ? "text-slate-100" : "text-slate-900"}`}>Query device</Text>
              </View>

              <TouchableOpacity
                onPress={() => sendCommand("Query status", "/query/status")}
                disabled={commandLoading !== null}
                className="flex-row items-center py-3 px-4 rounded-xl mb-2 bg-accent-400"
              >
                {commandLoading === "Query status" ? <ActivityIndicator size="small" color="#fff" /> : (
                  <>
                    <Ionicons name="information-circle" size={18} color="#fff" />
                    <Text className="text-white font-JakartaBold ml-2">Query status</Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => sendCommand("Query location", "/query/location")}
                disabled={commandLoading !== null}
                className="flex-row items-center py-3 px-4 rounded-xl bg-accent-400"
              >
                {commandLoading === "Query location" ? <ActivityIndicator size="small" color="#fff" /> : (
                  <>
                    <Ionicons name="location" size={18} color="#fff" />
                    <Text className="text-white font-JakartaBold ml-2">Query location</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            {/* Advanced - collapsible */}
            <View className={`rounded-2xl shadow-sm border px-5 py-4 mb-4 ${isDark ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200"}`}>
              <TouchableOpacity
                onPress={() => setShowAdvanced((v) => !v)}
                className="flex-row items-center justify-between"
              >
                <View className="flex-row items-center">
                  <Ionicons name="terminal" size={22} color={colors.accent[500]} />
                  <Text className={`text-lg font-JakartaBold ml-2 ${isDark ? "text-slate-100" : "text-slate-900"}`}>Advanced</Text>
                </View>
                <Ionicons name={showAdvanced ? "chevron-up" : "chevron-down"} size={22} color={colors.status.muted} />
              </TouchableOpacity>

              {showAdvanced && (
                <View className="mt-4">
                  <Text className={`text-sm font-JakartaBold mb-2 ${isDark ? "text-slate-400" : "text-slate-600"}`}>Send raw command</Text>
                  <Text className={`text-xs font-JakartaMedium mb-3 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                    Send a custom command directly to the tracker device.
                  </Text>
                  <View className="flex-row items-center gap-2">
                    <TextInput
                      value={rawCommand}
                      onChangeText={setRawCommand}
                      placeholder="e.g. STATUS#"
                      placeholderTextColor={colors.status.muted}
                      className={`flex-1 border rounded-xl px-4 py-2 text-sm font-JakartaMedium ${isDark ? "border-slate-600 text-slate-100 bg-slate-800" : "border-slate-300 text-slate-900 bg-white"}`}
                    />
                    <TouchableOpacity
                      onPress={sendRawCommand}
                      disabled={commandLoading !== null}
                      className="py-2 px-4 rounded-xl bg-accent-400"
                    >
                      {commandLoading === "Raw command" ? <ActivityIndicator size="small" color="#fff" /> : (
                        <Text className="text-white font-JakartaBold">Send</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
          </>
        )}
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

export default Command;
