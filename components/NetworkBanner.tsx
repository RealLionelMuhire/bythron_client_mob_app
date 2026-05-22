/**
 * components/NetworkBanner.tsx
 *
 * App-wide offline/network indicator.
 *
 * Behaviour:
 * - Invisible when online.
 * - Slides down from the top of the screen when the device loses connectivity.
 * - Shows a pulsing "No internet connection" banner.
 * - When connectivity is restored a green "Back online" banner slides in for
 *   2.5 seconds, then slides back up and disappears.
 *
 * Mount once in app/_layout.tsx just inside <ThemeWrapper>.
 */

import { useEffect, useRef, useState } from "react";
import { Animated, Easing, StyleSheet, Text, View } from "react-native";
import NetInfo from "@react-native-community/netinfo";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type BannerState = "hidden" | "offline" | "restored";

const SLIDE_DURATION = 320;
const RESTORED_HOLD_MS = 2500;
const BANNER_HEIGHT = 48;

export function NetworkBanner() {
  const insets = useSafeAreaInsets();
  const [bannerState, setBannerState] = useState<BannerState>("hidden");
  const translateY = useRef(new Animated.Value(-BANNER_HEIGHT - insets.top)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const restoredTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFirstCheck = useRef(true);

  // ── Slide helpers ───────────────────────────────────────────────────────────
  const slideIn = () =>
    Animated.timing(translateY, {
      toValue: 0,
      duration: SLIDE_DURATION,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();

  const slideOut = (onDone?: () => void) =>
    Animated.timing(translateY, {
      toValue: -BANNER_HEIGHT - insets.top - 8,
      duration: SLIDE_DURATION,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(onDone);

  // ── Pulse animation for offline state ──────────────────────────────────────
  useEffect(() => {
    if (bannerState !== "offline") {
      pulseAnim.setValue(1);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 0.65,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [bannerState]);

  // ── Network state listener ──────────────────────────────────────────────────
  useEffect(() => {
    const unsub = NetInfo.addEventListener((state) => {
      const isConnected = state.isConnected && state.isInternetReachable !== false;

      // Ignore the very first check on mount so we don't flash "Back online"
      // when the app starts and the network is already available.
      if (isFirstCheck.current) {
        isFirstCheck.current = false;
        if (!isConnected) {
          setBannerState("offline");
          slideIn();
        }
        return;
      }

      if (!isConnected) {
        // Clear any pending "restored" timer and switch to offline banner
        if (restoredTimer.current) clearTimeout(restoredTimer.current);
        setBannerState("offline");
        slideIn();
      } else {
        // Connectivity restored
        setBannerState("restored");
        slideIn();
        restoredTimer.current = setTimeout(() => {
          slideOut(() => setBannerState("hidden"));
        }, RESTORED_HOLD_MS);
      }
    });

    return () => {
      unsub();
      if (restoredTimer.current) clearTimeout(restoredTimer.current);
    };
  }, []);

  if (bannerState === "hidden") return null;

  const isOffline = bannerState === "offline";

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateY }],
          paddingTop: insets.top + 6,
          backgroundColor: isOffline ? "#1E293B" : "#064E3B",
        },
      ]}
    >
      <Animated.View
        style={[styles.inner, { opacity: isOffline ? pulseAnim : 1 }]}
      >
        <View style={[styles.iconWrap, { backgroundColor: isOffline ? "#F43F5E22" : "#10B98122" }]}>
          <Ionicons
            name={isOffline ? "cloud-offline-outline" : "checkmark-circle"}
            size={18}
            color={isOffline ? "#F43F5E" : "#10B981"}
          />
        </View>
        <View style={styles.textBlock}>
          <Text style={[styles.title, { color: isOffline ? "#F8FAFC" : "#D1FAE5" }]}>
            {isOffline ? "No internet connection" : "Back online"}
          </Text>
          <Text style={[styles.subtitle, { color: isOffline ? "#94A3B8" : "#6EE7B7" }]}>
            {isOffline
              ? "Some features may be unavailable"
              : "Everything is working again"}
          </Text>
        </View>
        <View style={[styles.dot, { backgroundColor: isOffline ? "#F43F5E" : "#10B981" }]} />
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
    elevation: 20,
    paddingBottom: 10,
    paddingHorizontal: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
  },
  inner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  textBlock: {
    flex: 1,
  },
  title: {
    fontSize: 13,
    fontFamily: "Jakarta-Bold",
    letterSpacing: 0.1,
  },
  subtitle: {
    fontSize: 11,
    fontFamily: "Jakarta-Medium",
    marginTop: 1,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
