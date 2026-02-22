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

import { fetchAPI } from "@/lib/fetch";
import { useDeviceStore } from "@/store";

type DialogType = "success" | "error" | "warning" | "info";

const DIALOG_COLORS: Record<DialogType, { bg: string; icon: string; btn: string }> = {
  success: { bg: "#ECFDF5", icon: "#10B981", btn: "#10B981" },
  error:   { bg: "#FEF2F2", icon: "#EF4444", btn: "#EF4444" },
  warning: { bg: "#FFFBEB", icon: "#F59E0B", btn: "#F59E0B" },
  info:    { bg: "#EFF6FF", icon: "#5BB8E8", btn: "#5BB8E8" },
};

const Command = () => {
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
  }>({ visible: false, title: "", message: "", icon: "alert-circle", iconColor: "#E36060", label: "", color: "#E36060", onConfirm: () => {} });

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
      iconColor: "#E36060",
      label: "Yes, cut fuel",
      color: "#E36060",
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
      iconColor: "#4CAF50",
      label: "Yes, restore fuel",
      color: "#4CAF50",
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
  const fuelColor = fuelStatus === "cut" ? "#EF4444" : "#10B981";

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: "#F7FAFF" }}>
      <ScrollView className="px-5" contentContainerStyle={{ paddingBottom: 120, paddingTop: 10 }}>
        <Text className="text-2xl font-JakartaBold my-5">Commands</Text>

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
            <Ionicons name="terminal-outline" size={48} color="#94A3B8" />
            <Text className="text-base font-JakartaMedium text-slate-500 mt-3">No device available</Text>
            <Text className="text-xs font-JakartaMedium text-slate-400 mt-1">Add a tracker to send commands.</Text>
          </View>
        ) : (
          <>
            {/* Fuel control */}
            <View className="bg-white rounded-2xl shadow-sm shadow-neutral-300 px-5 py-4 mb-4">
              <View className="flex-row items-center mb-2">
                <MaterialCommunityIcons name="fuel" size={22} color="#5BB8E8" />
                <Text className="text-lg font-JakartaBold text-slate-800 ml-2">Fuel control</Text>
              </View>
              <Text className="text-xs font-JakartaMedium text-gray-400 mb-3">
                Control the vehicle's fuel supply remotely. Cutting fuel will stop the vehicle from moving.
              </Text>

              {fuelLabel && (
                <View className="flex-row items-center rounded-xl px-3 py-2 mb-3" style={{ backgroundColor: fuelStatus === "cut" ? "#FEF2F2" : "#ECFDF5" }}>
                  <Ionicons name={fuelStatus === "cut" ? "alert-circle" : "checkmark-circle"} size={16} color={fuelColor} />
                  <Text className="text-xs font-JakartaBold ml-2" style={{ color: fuelColor }}>{fuelLabel}</Text>
                </View>
              )}

              <View className="flex-row gap-3">
                <TouchableOpacity
                  onPress={handleFuelCut}
                  disabled={commandLoading !== null}
                  className="flex-1 flex-row items-center justify-center py-3 rounded-xl"
                  style={{ backgroundColor: "#E36060" }}
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
                  className="flex-1 flex-row items-center justify-center py-3 rounded-xl"
                  style={{ backgroundColor: "#4CAF50" }}
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
            <View className="bg-white rounded-2xl shadow-sm shadow-neutral-300 px-5 py-4 mb-4">
              <View className="flex-row items-center mb-3">
                <Ionicons name="search" size={22} color="#5BB8E8" />
                <Text className="text-lg font-JakartaBold text-slate-800 ml-2">Query device</Text>
              </View>

              <TouchableOpacity
                onPress={() => sendCommand("Query status", "/query/status")}
                disabled={commandLoading !== null}
                className="flex-row items-center py-3 px-4 rounded-xl mb-2"
                style={{ backgroundColor: "#5BB8E8" }}
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
                className="flex-row items-center py-3 px-4 rounded-xl"
                style={{ backgroundColor: "#5BB8E8" }}
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
            <View className="bg-white rounded-2xl shadow-sm shadow-neutral-300 px-5 py-4 mb-4">
              <TouchableOpacity
                onPress={() => setShowAdvanced((v) => !v)}
                className="flex-row items-center justify-between"
              >
                <View className="flex-row items-center">
                  <Ionicons name="terminal" size={22} color="#0A63A8" />
                  <Text className="text-lg font-JakartaBold text-slate-800 ml-2">Advanced</Text>
                </View>
                <Ionicons name={showAdvanced ? "chevron-up" : "chevron-down"} size={22} color="#94A3B8" />
              </TouchableOpacity>

              {showAdvanced && (
                <View className="mt-4">
                  <Text className="text-sm font-JakartaBold text-slate-600 mb-2">Send raw command</Text>
                  <Text className="text-xs font-JakartaMedium text-gray-400 mb-3">
                    Send a custom command directly to the tracker device.
                  </Text>
                  <View className="flex-row items-center gap-2">
                    <TextInput
                      value={rawCommand}
                      onChangeText={setRawCommand}
                      placeholder="e.g. STATUS#"
                      placeholderTextColor="#94A3B8"
                      className="flex-1 border border-slate-300 rounded-xl px-4 py-2 text-sm font-JakartaMedium"
                    />
                    <TouchableOpacity
                      onPress={sendRawCommand}
                      disabled={commandLoading !== null}
                      className="py-2 px-4 rounded-xl"
                      style={{ backgroundColor: "#5BB8E8" }}
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

export default Command;
