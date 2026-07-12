/**
 * alarm-log.tsx — Alarm History Screen
 *
 * Displays the in-memory alarm log from the Zustand DeviceStore.
 * Accessible from SideMenu → "Notifications".
 *
 * Features:
 *  - Color-coded severity badges
 *  - Device name + time per entry
 *  - Swipe-to-clear or header clear button
 *  - Premium empty-state illustration
 */

import React from "react";
import {
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useColorScheme } from "nativewind";
import { router } from "expo-router";

import { getThemeColors } from "@/constants/theme";
import { useDeviceStore } from "@/store";
import {
  ALARM_META_BY_KEY,
  SEVERITY_COLOR,
  SEVERITY_LABEL,
  AlarmSeverity,
} from "@/constants/alarms";

// ── Helpers ────────────────────────────────────────────────────────────────

function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  const date = d.toLocaleDateString([], { month: "short", day: "numeric" });
  const time = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return `${date} · ${time}`;
}

// ── AlarmRow ───────────────────────────────────────────────────────────────

interface AlarmRowProps {
  entry: AlarmLogEntry;
  isDark: boolean;
  colors: ReturnType<typeof getThemeColors>;
}

function AlarmRow({ entry, isDark, colors }: AlarmRowProps) {
  const meta = ALARM_META_BY_KEY[entry.alarm_type] ?? {
    label: "Device Alarm",
    icon: "alert-circle" as const,
    severity: "medium" as AlarmSeverity,
  };

  const severityColor = SEVERITY_COLOR[meta.severity as AlarmSeverity];

  return (
    <View
      style={[
        styles.row,
        {
          backgroundColor: isDark ? colors.surface.card : "#FFFFFF",
          borderColor: isDark ? colors.surface.border : "#F1F5F9",
          borderLeftColor: severityColor,
        },
      ]}
    >
      {/* Icon */}
      <View style={[styles.iconWrap, { backgroundColor: severityColor + "18" }]}>
        <Ionicons name={meta.icon as any} size={20} color={severityColor} />
      </View>

      {/* Text */}
      <View style={styles.textWrap}>
        <View style={styles.rowTop}>
          <Text style={[styles.alarmLabel, { color: isDark ? "#F1F5F9" : "#0F172A" }]}>
            {meta.label}
          </Text>
          {/* Severity badge */}
          <View style={[styles.badge, { backgroundColor: severityColor + "22", borderColor: severityColor }]}>
            <Text style={[styles.badgeText, { color: severityColor }]}>
              {SEVERITY_LABEL[meta.severity as AlarmSeverity]}
            </Text>
          </View>
        </View>
        <Text style={[styles.deviceName, { color: colors.text.secondary }]}>
          {entry.device_name}
        </Text>
        <Text style={[styles.timestamp, { color: colors.text.muted }]}>
          {formatTimestamp(entry.timestamp)}
        </Text>
      </View>
    </View>
  );
}

// ── Empty state ────────────────────────────────────────────────────────────

function EmptyState({ isDark, colors }: { isDark: boolean; colors: ReturnType<typeof getThemeColors> }) {
  return (
    <View style={styles.emptyWrap}>
      <View style={[styles.emptyIcon, { backgroundColor: isDark ? colors.surface.card : "#F1F5F9" }]}>
        <Ionicons name="notifications-off-outline" size={52} color={colors.text.muted} />
      </View>
      <Text style={[styles.emptyTitle, { color: isDark ? "#F1F5F9" : "#0F172A" }]}>
        No alarms yet
      </Text>
      <Text style={[styles.emptyBody, { color: colors.text.secondary }]}>
        Alarm events from your GPS trackers will appear here in real time.
      </Text>
    </View>
  );
}

// ── Screen ─────────────────────────────────────────────────────────────────

export default function AlarmLogScreen() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const colors = getThemeColors(isDark ? "dark" : "light");

  const alarmLog   = useDeviceStore((s) => s.alarmLog);
  const clearAlarmLog = useDeviceStore((s) => s.clearAlarmLog);

  return (
    <SafeAreaView
      style={[styles.root, { backgroundColor: isDark ? "#0F172A" : "#F8FAFC" }]}
    >
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.surface.border }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={styles.backBtn}
        >
          <Ionicons name="arrow-back" size={24} color={isDark ? "#F1F5F9" : "#0F172A"} />
        </TouchableOpacity>

        <Text style={[styles.headerTitle, { color: isDark ? "#F1F5F9" : "#0F172A" }]}>
          Alarm History
        </Text>

        {alarmLog.length > 0 ? (
          <TouchableOpacity
            onPress={clearAlarmLog}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={[styles.clearBtn, { color: colors.status.error }]}>Clear</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 40 }} />
        )}
      </View>

      {/* Count pill */}
      {alarmLog.length > 0 && (
        <View style={styles.countRow}>
          <View style={[styles.countPill, { backgroundColor: isDark ? colors.surface.card : "#EFF6FF" }]}>
            <Ionicons name="shield-checkmark-outline" size={13} color="#3B82F6" style={{ marginRight: 4 }} />
            <Text style={[styles.countText, { color: "#3B82F6" }]}>
              {alarmLog.length} event{alarmLog.length !== 1 ? "s" : ""} recorded this session
            </Text>
          </View>
        </View>
      )}

      {/* List */}
      <FlatList
        data={alarmLog}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.list,
          alarmLog.length === 0 && styles.listEmpty,
        ]}
        ListEmptyComponent={<EmptyState isDark={isDark} colors={colors} />}
        renderItem={({ item }) => (
          <AlarmRow entry={item} isDark={isDark} colors={colors} />
        )}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1 },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  backBtn: { width: 36 },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 17,
    fontFamily: "Jakarta-Bold",
  },
  clearBtn: {
    fontSize: 14,
    fontFamily: "Jakarta-SemiBold",
    width: 40,
    textAlign: "right",
  },

  // Count row
  countRow: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 4,
  },
  countPill: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
  },
  countText: {
    fontSize: 12,
    fontFamily: "Jakarta-SemiBold",
  },

  // List
  list: { padding: 16, gap: 10 },
  listEmpty: { flex: 1, justifyContent: "center" },

  // Row
  row: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderLeftWidth: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  textWrap: { flex: 1 },
  rowTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 2,
  },
  alarmLabel: {
    fontSize: 14,
    fontFamily: "Jakarta-Bold",
    flex: 1,
    marginRight: 8,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 10,
    fontFamily: "Jakarta-Bold",
  },
  deviceName: {
    fontSize: 12,
    fontFamily: "Jakarta-SemiBold",
    marginBottom: 2,
  },
  timestamp: {
    fontSize: 11,
    fontFamily: "Jakarta-Medium",
  },

  // Empty
  emptyWrap: {
    alignItems: "center",
    paddingVertical: 40,
    paddingHorizontal: 32,
  },
  emptyIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontFamily: "Jakarta-Bold",
    marginBottom: 8,
  },
  emptyBody: {
    fontSize: 14,
    fontFamily: "Jakarta-Medium",
    textAlign: "center",
    lineHeight: 21,
  },
});
