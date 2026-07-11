/**
 * constants/alarms.ts
 *
 * Single source of truth for all GPS alarm types.
 * Imported by:
 *   — alerts.tsx   (toggle list, severity badges, persistent defaults)
 *   — tracking.tsx (AlarmBanner metadata, alarm-log entries)
 *   — alarm-log.tsx (history display)
 *
 * Sorted by severity (critical → low) so UIs can display in priority order.
 */

import { BannerType } from "@/components/AlarmBanner";
import { Ionicons } from "@expo/vector-icons";

export type AlarmSeverity = "critical" | "high" | "medium" | "low";

export interface AlarmMeta {
  /** Matches alarm_type from WebSocket payload (lowercase) */
  key: string;
  label: string;
  endpoint: string;
  icon: keyof typeof Ionicons.glyphMap;
  /** Visual severity — drives banner color and severity badge */
  bannerType: BannerType;
  severity: AlarmSeverity;
  extra: "speed_kmh" | "radius_meters" | null;
  defaultExtra?: number;
  onMsg: string;
  offMsg: string;
  /** Raw keys the device STATUS string uses (case-insensitive) */
  statusKeys: string[];
}

/** Ordered critical → low — use this for sorted displays */
export const ALARM_META: AlarmMeta[] = [
  {
    key: "sos",
    label: "SOS Alarm",
    endpoint: "/alarm/sos",
    icon: "alert-circle",
    bannerType: "error",
    severity: "critical",
    extra: null,
    statusKeys: ["sos"],
    onMsg: "SOS alarm is now active. You will be alerted if the SOS button is pressed on the device.",
    offMsg: "SOS alarm has been turned off.",
  },
  {
    key: "overspeed",
    label: "Overspeed Alarm",
    endpoint: "/alarm/overspeed",
    icon: "speedometer",
    bannerType: "error",
    severity: "high",
    extra: "speed_kmh",
    defaultExtra: 120,
    statusKeys: ["overspeed", "speed"],
    onMsg: "Overspeed alarm is now active. You will be notified if the vehicle exceeds the speed limit.",
    offMsg: "Overspeed alarm has been turned off.",
  },
  {
    key: "displacement",
    label: "Displacement Alarm",
    endpoint: "/alarm/displacement",
    icon: "locate",
    bannerType: "warning",
    severity: "high",
    extra: "radius_meters",
    defaultExtra: 200,
    statusKeys: ["displacement", "shock"],
    onMsg: "Displacement alarm is now active. You will be notified if the vehicle moves outside the set radius.",
    offMsg: "Displacement alarm has been turned off.",
  },
  {
    key: "vibration",
    label: "Vibration Alarm",
    endpoint: "/alarm/vibration",
    icon: "phone-portrait",
    bannerType: "warning",
    severity: "medium",
    extra: null,
    statusKeys: ["vibration", "move"],
    onMsg: "Vibration alarm is now active. You will be notified if the device detects unusual movement.",
    offMsg: "Vibration alarm has been turned off.",
  },
  {
    key: "acc",
    label: "Ignition Alarm",
    endpoint: "/alarm/acc",
    icon: "key",
    bannerType: "info",
    severity: "medium",
    extra: null,
    statusKeys: ["acc"],
    onMsg: "Ignition alarm is now active. You will be notified when the vehicle ignition changes state.",
    offMsg: "Ignition alarm has been turned off.",
  },
  {
    key: "low_battery",
    label: "Low Battery Alarm",
    endpoint: "/alarm/lowbattery",
    icon: "battery-dead",
    bannerType: "warning",
    severity: "low",
    extra: null,
    statusKeys: ["battery", "low_battery"],
    onMsg: "Low battery alarm is now active. You will be notified when battery is running low.",
    offMsg: "Low battery alarm has been turned off.",
  },
];

/** O(1) lookup by alarm_type key */
export const ALARM_META_BY_KEY: Record<string, AlarmMeta> = Object.fromEntries(
  ALARM_META.map((a) => [a.key, a])
);

/**
 * Find alarm metadata by a raw STATUS response key (e.g. "SOS", "ACC", "OVERSPEED").
 * Case-insensitive. Returns undefined for unknown keys.
 */
export function findAlarmMetaByStatusKey(rawKey: string): AlarmMeta | undefined {
  const lower = rawKey.toLowerCase().trim();
  return ALARM_META.find((a) => a.statusKeys.includes(lower));
}

/** Severity → accent color */
export const SEVERITY_COLOR: Record<AlarmSeverity, string> = {
  critical: "#EF4444",
  high:     "#F59E0B",
  medium:   "#3B82F6",
  low:      "#6B7280",
};

export const SEVERITY_LABEL: Record<AlarmSeverity, string> = {
  critical: "Critical",
  high:     "High",
  medium:   "Medium",
  low:      "Low",
};
