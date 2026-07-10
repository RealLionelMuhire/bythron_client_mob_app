/**
 * app/(onboarding)/device-wait.tsx  — Step 6
 *
 * Polls GET /api/devices/{imei}/status every 5 seconds (max 6 attempts = 30s).
 *
 * States:
 *   "searching" — animated ping, polling active
 *   "online"    — success checkmark, auto-advance after 1.5s
 *   "failed"    — troubleshoot message + "Try again" button back to device-pair
 */

import { useAuth } from "@clerk/clerk-expo";
import { router } from "expo-router";
import { useEffect, useRef, useState, useMemo } from "react";
import {
  Animated,
  Easing,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useColorScheme } from "nativewind";

import { getThemeColors } from "@/constants/theme";
import { fetchAPI } from "@/lib/fetch";
import { getPairedImei, setOnboardingStep } from "@/lib/onboarding";

type Status = "searching" | "online" | "failed";

const POLL_INTERVAL_MS = 5_000;
const MAX_ATTEMPTS     = 6;

export default function DeviceWait() {
  const { getToken } = useAuth();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const colors = getThemeColors(isDark ? "dark" : "light");
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [status, setStatus]   = useState<Status>("searching");
  const attemptsRef           = useRef(0);
  const intervalRef           = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Ping animation ────────────────────────────────────────────────────────
  const pingScale = useRef(new Animated.Value(0.6)).current;
  const pingOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.parallel([
        Animated.timing(pingScale, {
          toValue: 2.2,
          duration: 1400,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pingOpacity, {
          toValue: 0,
          duration: 1400,
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  // ── Polling ───────────────────────────────────────────────────────────────
  useEffect(() => {
    startPolling();
    return () => stopPolling();
  }, []);

  function stopPolling() {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }

  async function startPolling() {
    attemptsRef.current = 0;
    setStatus("searching");

    intervalRef.current = setInterval(async () => {
      attemptsRef.current += 1;

      try {
        const imei  = await getPairedImei();
        const token = await getToken();
        const res   = await fetchAPI(`/api/devices/imei/${imei}/status`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res?.status === "online") {
          stopPolling();
          await setOnboardingStep(7);
          setStatus("online");
          setTimeout(() => router.replace("/(onboarding)/vehicle" as any), 1500);
          return;
        }
      } catch (err) {
        console.warn("[DeviceWait] poll error:", err);
      }

      if (attemptsRef.current >= MAX_ATTEMPTS) {
        stopPolling();
        setStatus("failed");
      }
    }, POLL_INTERVAL_MS);
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.surface.light }]}>
      <View style={styles.center}>
        {/* ── SEARCHING ── */}
        {status === "searching" && (
          <>
            {/* Animated ping ring */}
            <View style={styles.pingContainer}>
              <Animated.View
                style={[
                  styles.pingRing,
                  {
                    borderColor: colors.accent[500],
                    transform: [{ scale: pingScale }],
                    opacity: pingOpacity,
                  },
                ]}
              />
              <View style={[styles.pingDot, { backgroundColor: colors.accent[500] }]} />
            </View>
            <Text style={[styles.title, { color: colors.text.primary }]}>
              Waiting for device signal
            </Text>
            <Text style={[styles.subtitle, { color: colors.text.muted }]}>
              Make sure your GPS device is powered on with a SIM card inserted.
              This can take up to 30 seconds.
            </Text>
          </>
        )}

        {/* ── ONLINE ── */}
        {status === "online" && (
          <>
            <View style={[styles.successCircle, { backgroundColor: "#22c55e18" }]}>
              <Text style={styles.successIcon}>✅</Text>
            </View>
            <Text style={[styles.title, { color: colors.text.primary }]}>Device connected!</Text>
            <Text style={[styles.subtitle, { color: colors.text.muted }]}>
              Your device is online. Moving to vehicle setup…
            </Text>
          </>
        )}

        {/* ── FAILED ── */}
        {status === "failed" && (
          <>
            <View style={[styles.failCircle, { backgroundColor: colors.status.error + "18" }]}>
              <Text style={styles.failIcon}>📵</Text>
            </View>
            <Text style={[styles.title, { color: colors.text.primary }]}>No signal detected</Text>
            <Text style={[styles.subtitle, { color: colors.text.muted }]}>
              Make sure the device is{"\n"}
              • Powered on{"\n"}
              • SIM card inserted{"\n"}
              • Placed outdoors or near a window
            </Text>
            <TouchableOpacity
              style={[styles.retryBtn, { backgroundColor: colors.accent[500] }]}
              onPress={() => router.replace("/(onboarding)/device-pair" as any)}
            >
              <Text style={styles.retryText}>Try again</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

function createStyles(colors: ReturnType<typeof getThemeColors>) {
  return StyleSheet.create({
    safe: { flex: 1 },
    center: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 32,
      gap: 16,
    },
    pingContainer: {
      width: 120,
      height: 120,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 8,
    },
    pingRing: {
      position: "absolute",
      width: 80,
      height: 80,
      borderRadius: 40,
      borderWidth: 3,
    },
    pingDot: {
      width: 28,
      height: 28,
      borderRadius: 14,
    },
    successCircle: {
      width: 90,
      height: 90,
      borderRadius: 45,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 8,
    },
    successIcon: { fontSize: 42 },
    failCircle: {
      width: 90,
      height: 90,
      borderRadius: 45,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 8,
    },
    failIcon: { fontSize: 42 },
    title: { fontSize: 22, fontFamily: "Jakarta-Bold", textAlign: "center" },
    subtitle: {
      fontSize: 14,
      fontFamily: "Jakarta-Medium",
      textAlign: "center",
      lineHeight: 22,
      color: "#888",
    },
    retryBtn: {
      marginTop: 8,
      paddingHorizontal: 36,
      paddingVertical: 14,
      borderRadius: 14,
    },
    retryText: { color: "#fff", fontFamily: "Jakarta-Bold", fontSize: 16 },
  });
}
