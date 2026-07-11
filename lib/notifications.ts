/**
 * lib/notifications.ts
 *
 * Expo Push Notification utilities for Track IQ.
 *
 * Usage (from (root)/_layout.tsx after user bootstrap):
 *   const token = await registerForPushNotificationsAsync();
 *   const cleanup = setupNotificationTapHandler();
 *   // POST token to /api/auth/push-token
 *   return cleanup; // in useEffect cleanup
 */

import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import Constants from "expo-constants";
import { router } from "expo-router";

// ── Foreground display handler ─────────────────────────────────────────────
// Runs when a push arrives while the app is in the FOREGROUND.
// We show an alert + play sound; the in-app AlarmBanner handles WS events.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// ── Token registration ─────────────────────────────────────────────────────

/**
 * Request push-notification permission and return the Expo push token.
 * Returns null on simulators, web, or if permission is denied.
 */
export async function registerForPushNotificationsAsync(): Promise<string | null> {
  if (Platform.OS === "web") return null;

  // Check / request permission
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") {
    console.warn("[Notifications] Permission not granted — push disabled");
    return null;
  }

  // On Android, a notification channel is required (SDK 26+)
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("gps-alarms", {
      name: "GPS Alarms",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#2F80ED",
      sound: "default",
    });
  }

  try {
    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      (Constants as any).easConfig?.projectId;

    if (!projectId) {
      console.warn("[Notifications] No EAS projectId — cannot get push token");
      return null;
    }

    const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
    console.log("[Notifications] Push token:", tokenData.data);
    return tokenData.data;
  } catch (err) {
    console.error("[Notifications] Failed to get push token:", err);
    return null;
  }
}

// ── Tap handler (deep-link) ────────────────────────────────────────────────

/**
 * Listen for notification taps and navigate to the tracking screen.
 * Returns a cleanup function — call it in the useEffect return.
 */
export function setupNotificationTapHandler(): () => void {
  const sub = Notifications.addNotificationResponseReceivedListener((response) => {
    const data = response.notification.request.content.data as Record<string, unknown>;
    const type = data?.type;

    if (type === "alarm") {
      // Deep-link into the tracking screen.
      // The Zustand store already holds the correct device from the WS session.
      router.push("/(root)/(tabs)/tracking");
    }
  });

  return () => sub.remove();
}
