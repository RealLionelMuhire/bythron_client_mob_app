/**
 * AppModals.tsx — shared modal components used across Alerts, Command, Settings.
 *
 * Previously each screen had ~80 lines of identical Modal JSX duplicated 3 times.
 * These components replace all of those copies.
 *
 * Usage:
 *   import { AlertDialog, ConfirmModal, useDialog, useConfirmModal } from "@/components/AppModals";
 *
 *   const { dialog, showDialog, hideDialog } = useDialog();
 *   const { confirmModal, showConfirm } = useConfirmModal();
 *
 *   <AlertDialog dialog={dialog} onClose={hideDialog} isDark={isDark} />
 *   <ConfirmModal modal={confirmModal} isDark={isDark} />
 */

import { useCallback, useState } from "react";
import { Modal, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { DIALOG_COLORS } from "@/constants/theme";

// ── Types ──────────────────────────────────────────────────────────────────

export type DialogType = "success" | "error" | "warning" | "info";

export interface DialogState {
  visible: boolean;
  type: DialogType;
  title: string;
  message: string;
  icon: keyof typeof Ionicons.glyphMap;
}

export interface ConfirmModalState {
  visible: boolean;
  title: string;
  message: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  label: string;
  color: string;
  onConfirm: () => void;
}

// ── Hooks ──────────────────────────────────────────────────────────────────

const DIALOG_DEFAULTS: Record<DialogType, keyof typeof Ionicons.glyphMap> = {
  success: "checkmark-circle",
  error: "close-circle",
  warning: "warning",
  info: "information-circle",
};

/** Manages the state for an AlertDialog. */
export function useDialog() {
  const [dialog, setDialog] = useState<DialogState>({
    visible: false, type: "info", title: "", message: "", icon: "checkmark-circle",
  });

  const showDialog = useCallback(
    (type: DialogType, title: string, message: string, icon?: keyof typeof Ionicons.glyphMap) => {
      setDialog({ visible: true, type, title, message, icon: icon ?? DIALOG_DEFAULTS[type] });
    },
    [],
  );

  const hideDialog = useCallback(() => {
    setDialog((p) => ({ ...p, visible: false }));
  }, []);

  return { dialog, showDialog, hideDialog };
}

/** Manages the state for a ConfirmModal. */
export function useConfirmModal(fallbackColor = "#EF4444") {
  const [confirmModal, setConfirmModal] = useState<ConfirmModalState>({
    visible: false, title: "", message: "",
    icon: "alert-circle", iconColor: fallbackColor,
    label: "", color: fallbackColor, onConfirm: () => {},
  });

  const showConfirm = useCallback((opts: Omit<ConfirmModalState, "visible">) => {
    setConfirmModal({ visible: true, ...opts });
  }, []);

  const hideConfirm = useCallback(() => {
    setConfirmModal((p) => ({ ...p, visible: false }));
  }, []);

  return { confirmModal, showConfirm, hideConfirm };
}

// ── Components ─────────────────────────────────────────────────────────────

interface AlertDialogProps {
  dialog: DialogState;
  onClose: () => void;
  isDark: boolean;
}

/**
 * Full-screen modal overlay that shows a success / error / warning / info message.
 * Replaces the inline Dialog block previously copy-pasted in alerts, command, settings.
 */
export function AlertDialog({ dialog, onClose, isDark }: AlertDialogProps) {
  return (
    <Modal visible={dialog.visible} transparent animationType="fade">
      <View className="flex-1 justify-center items-center px-6" style={{ backgroundColor: "rgba(0,0,0,0.45)" }}>
        <View className={`rounded-2xl w-full max-w-sm overflow-hidden ${isDark ? "bg-slate-800" : "bg-white"}`}>
          <View className="items-center pt-6 pb-4 px-5" style={{ backgroundColor: DIALOG_COLORS[dialog.type].bg }}>
            <View className={`w-16 h-16 rounded-full items-center justify-center mb-3 ${isDark ? "bg-slate-700" : "bg-white"}`}>
              <Ionicons name={dialog.icon} size={40} color={DIALOG_COLORS[dialog.type].icon} />
            </View>
            <Text className={`text-lg font-JakartaBold text-center ${isDark ? "text-slate-100" : "text-slate-800"}`}>
              {dialog.title}
            </Text>
          </View>
          <View className="px-5 pt-4 pb-5">
            <Text className={`text-sm font-JakartaMedium text-center leading-5 ${isDark ? "text-slate-300" : "text-slate-600"}`}>
              {dialog.message}
            </Text>
            <TouchableOpacity
              onPress={onClose}
              className="mt-5 py-3 rounded-xl items-center"
              style={{ backgroundColor: DIALOG_COLORS[dialog.type].btn }}
            >
              <Text className="text-white font-JakartaBold">OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

interface ConfirmModalProps {
  modal: ConfirmModalState;
  isDark: boolean;
  onClose?: () => void;
}

/**
 * Full-screen modal overlay that asks the user to confirm a destructive action.
 * Has Cancel and a labelled confirm button.
 * Replaces the inline ConfirmModal block copy-pasted in command and settings.
 */
export function ConfirmModal({ modal, isDark, onClose }: ConfirmModalProps) {
  const handleCancel = () => {
    onClose?.();
  };

  return (
    <Modal visible={modal.visible} transparent animationType="fade">
      <View className="flex-1 justify-center items-center px-6" style={{ backgroundColor: "rgba(0,0,0,0.45)" }}>
        <View className={`rounded-2xl w-full max-w-sm overflow-hidden ${isDark ? "bg-slate-800" : "bg-white"}`}>
          <View className={`items-center pt-6 pb-4 px-5 ${isDark ? "bg-slate-700" : "bg-amber-50"}`}>
            <View className={`w-16 h-16 rounded-full items-center justify-center mb-3 ${isDark ? "bg-slate-600" : "bg-white"}`}>
              <Ionicons name={modal.icon} size={40} color={modal.iconColor} />
            </View>
            <Text className={`text-lg font-JakartaBold text-center ${isDark ? "text-slate-100" : "text-slate-800"}`}>
              {modal.title}
            </Text>
          </View>
          <View className="px-5 pt-4 pb-5">
            <Text className={`text-sm font-JakartaMedium text-center leading-5 ${isDark ? "text-slate-300" : "text-slate-600"}`}>
              {modal.message}
            </Text>
            <View className="flex-row gap-3 mt-5">
              <TouchableOpacity
                onPress={handleCancel}
                className={`flex-1 py-3 rounded-xl items-center border ${isDark ? "border-slate-600" : "border-slate-300"}`}
              >
                <Text className={`font-JakartaBold ${isDark ? "text-slate-300" : "text-slate-600"}`}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={modal.onConfirm}
                className="flex-1 py-3 rounded-xl items-center"
                style={{ backgroundColor: modal.color }}
              >
                <Text className="font-JakartaBold text-white">{modal.label}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}
