/**
 * AlarmBanner.tsx
 *
 * A non-blocking toast-style banner that slides in from the top of the
 * tracking screen when the GPS device sends an alarm event over WebSocket.
 * Unlike a modal, it does NOT block map interaction.
 *
 * - Slides in with a spring animation
 * - Auto-dismisses after `autoDismissMs` (default 5s); pass 0 to require manual tap
 * - Color-coded by alarm severity (error / warning / info)
 * - Tap X or wait to dismiss
 */

import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

// ── Types ──────────────────────────────────────────────────────────────────

export type BannerType = "error" | "warning" | "info" | "success";

export interface BannerAlarm {
  title: string;
  message: string;
  icon: keyof typeof Ionicons.glyphMap;
  type: BannerType;
  /** ms until auto-dismiss. 0 = manual dismiss only (use for SOS). Default 5000. */
  autoDismissMs?: number;
}

interface AlarmBannerProps {
  alarm: BannerAlarm | null;
  topOffset?: number;   // distance from top of screen (insets.top + padding)
  isDark?: boolean;
  onDismiss: () => void;
}

// ── Theme ──────────────────────────────────────────────────────────────────

const LIGHT: Record<BannerType, { bg: string; border: string; text: string; sub: string }> = {
  error:   { bg: "#FEE2E2", border: "#EF4444", text: "#991B1B", sub: "#B91C1C" },
  warning: { bg: "#FEF3C7", border: "#F59E0B", text: "#78350F", sub: "#92400E" },
  info:    { bg: "#DBEAFE", border: "#3B82F6", text: "#1E3A8A", sub: "#1D4ED8" },
  success: { bg: "#DCFCE7", border: "#22C55E", text: "#14532D", sub: "#15803D" },
};

const DARK: Record<BannerType, { bg: string; border: string; text: string; sub: string }> = {
  error:   { bg: "#3B0606", border: "#EF4444", text: "#FCA5A5", sub: "#F87171" },
  warning: { bg: "#3B1A02", border: "#F59E0B", text: "#FCD34D", sub: "#FBBF24" },
  info:    { bg: "#0A1628", border: "#3B82F6", text: "#93C5FD", sub: "#60A5FA" },
  success: { bg: "#042910", border: "#22C55E", text: "#86EFAC", sub: "#4ADE80" },
};

// ── Component ──────────────────────────────────────────────────────────────

export function AlarmBanner({ alarm, topOffset = 0, isDark = false, onDismiss }: AlarmBannerProps) {
  const translateY = useRef(new Animated.Value(-120)).current;
  const opacity    = useRef(new Animated.Value(0)).current;
  const timerRef   = useRef<ReturnType<typeof setTimeout> | null>(null);

  const slideIn = () => {
    Animated.parallel([
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        tension: 120,
        friction: 14,
      }),
      Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }),
    ]).start();
  };

  const slideOut = (cb?: () => void) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    Animated.parallel([
      Animated.timing(translateY, { toValue: -120, duration: 220, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 0, duration: 180, useNativeDriver: true }),
    ]).start(() => { translateY.setValue(-120); opacity.setValue(0); cb?.(); });
  };

  useEffect(() => {
    if (!alarm) return;

    slideIn();

    const ms = alarm.autoDismissMs ?? 5000;
    if (ms > 0) {
      timerRef.current = setTimeout(() => slideOut(onDismiss), ms);
    }

    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [alarm]);

  if (!alarm) return null;

  const palette = isDark ? DARK[alarm.type] : LIGHT[alarm.type];

  return (
    <Animated.View
      style={[
        styles.container,
        {
          top: topOffset,
          backgroundColor: palette.bg,
          borderLeftColor: palette.border,
          transform: [{ translateY }],
          opacity,
        },
      ]}
    >
      {/* Left accent icon */}
      <View style={[styles.iconWrap, { backgroundColor: palette.border + "22" }]}>
        <Ionicons name={alarm.icon} size={22} color={palette.border} />
      </View>

      {/* Text */}
      <View style={styles.textWrap}>
        <Text style={[styles.title, { color: palette.text }]} numberOfLines={1}>
          {alarm.title}
        </Text>
        <Text style={[styles.message, { color: palette.sub }]} numberOfLines={2}>
          {alarm.message}
        </Text>
      </View>

      {/* Close */}
      <TouchableOpacity
        onPress={() => slideOut(onDismiss)}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        style={styles.closeBtn}
        accessibilityLabel="Dismiss alarm"
      >
        <Ionicons name="close-circle" size={20} color={palette.text} />
      </TouchableOpacity>
    </Animated.View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    left: 12,
    right: 12,
    zIndex: 9999,
    elevation: 20,
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    borderLeftWidth: 4,
    paddingVertical: 10,
    paddingRight: 12,
    paddingLeft: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  textWrap: {
    flex: 1,
    marginRight: 4,
  },
  title: {
    fontFamily: "Jakarta-Bold",
    fontSize: 13,
    marginBottom: 2,
  },
  message: {
    fontFamily: "Jakarta-Medium",
    fontSize: 11,
    lineHeight: 15,
  },
  closeBtn: {
    padding: 2,
  },
});
