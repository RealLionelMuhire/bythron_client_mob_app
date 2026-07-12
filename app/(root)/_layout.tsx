/**
 * (root)/_layout.tsx
 *
 * Root layout for the authenticated section of the app.
 * Runs once after sign-in, regardless of which tab opens first:
 *   - Registers the Clerk token getter for all fetchAPI calls app-wide
 *   - Syncs the Clerk user to the backend
 *   - Fetches the device list into Zustand
 *   - Marks devicesReady=true so screens can show skeletons while loading
 *
 * Also exposes refreshDevices() so screens can pull-to-refresh without
 * bypassing the auth token logic.
 */

import { useEffect, useRef } from "react";
import { View } from "react-native";
import { Stack } from "expo-router";
import { useUser, useAuth } from "@clerk/clerk-expo";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { fetchAPI, setAuthTokenGetter } from "@/lib/fetch";
import { refreshDevices } from "@/lib/deviceService";
import { useDeviceStore, useUserStore, ALARM_LOG_STORAGE_KEY } from "@/store";
import {
  registerForPushNotificationsAsync,
  setupNotificationTapHandler,
} from "@/lib/notifications";
import { AlarmBanner } from "@/components/AlarmBanner";


export default function RootLayout() {
  const { user } = useUser();
  const { getToken } = useAuth();
  const insets = useSafeAreaInsets();

  const setUserData    = useUserStore((s) => s.setUserData);
  const setDevicesReady = useDeviceStore((s) => s.setDevicesReady);
  const globalBanner   = useDeviceStore((s) => s.globalBanner);
  const clearGlobalBanner = useDeviceStore((s) => s.clearGlobalBanner);

  // Track whether we've already run the bootstrap so it only fires once
  // per auth session, not on every re-render or navigation.
  const bootstrappedRef = useRef(false);

  // ── Load persisted alarm log from last session ──────────────────────────
  useEffect(() => {
    AsyncStorage.getItem(ALARM_LOG_STORAGE_KEY)
      .then((raw) => {
        if (!raw) return;
        const log: AlarmLogEntry[] = JSON.parse(raw);
        if (Array.isArray(log) && log.length > 0) {
          useDeviceStore.setState({ alarmLog: log });
        }
      })
      .catch(() => {}); // Non-fatal
  }, []);

  useEffect(() => {
    if (!user || bootstrappedRef.current) return;
    bootstrappedRef.current = true;

    const bootstrap = async () => {
      // ── 0. Register auth token getter for all fetchAPI calls app-wide ───
      //    Must run before any child screen's fetchAPI call fires.
      setAuthTokenGetter(getToken);

      // ── 1. Build auth header ──────────────────────────────────────────────
      let headers: Record<string, string> = { "Content-Type": "application/json" };
      try {
        const token = await getToken();
        if (token) headers["Authorization"] = `Bearer ${token}`;
      } catch {
        // Non-fatal — proceed without auth header in dev/offline scenarios
        console.warn("[RootLayout] Could not get Clerk token");
      }

      // ── 2. Sync user to backend ───────────────────────────────────────────
      const safeName =
        user.fullName ||
        [user.firstName, user.lastName].filter(Boolean).join(" ") ||
        user.primaryEmailAddress?.emailAddress?.split("@")[0] ||
        "Unknown";

      fetchAPI("/api/auth/sync", {
        method: "POST",
        headers,
        body: JSON.stringify({
          clerk_user_id: user.id,
          email: user.primaryEmailAddress?.emailAddress,
          name: safeName,
        }),
      })
        .then((data) => { if (data) setUserData(data); })
        .catch((err) => console.error("[RootLayout] Auth sync failed:", err));

      // ── 3. Fetch devices ──────────────────────────────────────────────────
      await refreshDevices();

      // ── 4. Register push notification token ──────────────────────────────
      try {
        const pushToken = await registerForPushNotificationsAsync();
        if (pushToken) {
          fetchAPI("/api/auth/push-token", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token: pushToken }),
          }).catch((err) => console.warn("[RootLayout] Could not save push token:", err));
        }
      } catch (err) {
        console.warn("[RootLayout] Push registration failed:", err);
      }
    };

    bootstrap();
  }, [user]);           // re-run if the logged-in user changes (e.g. after sign-out/in)

  // Set up notification tap handler (deep-link on push notification press)
  useEffect(() => setupNotificationTapHandler(), []);

  return (
    <View style={{ flex: 1 }}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="alarm-log" options={{ title: "Alarm Log", presentation: "modal" }} />
      </Stack>
      {/* Global alarm banner — overlays all tabs so alarms are visible app-wide */}
      <AlarmBanner
        alarm={globalBanner as any}
        topOffset={insets.top + 8}
        onDismiss={clearGlobalBanner}
      />
    </View>
  );
}
