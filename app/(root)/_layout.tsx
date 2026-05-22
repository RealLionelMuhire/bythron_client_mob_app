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

import { useEffect, useRef, useCallback } from "react";
import { Slot } from "expo-router";
import { useUser, useAuth } from "@clerk/clerk-expo";

import { fetchAPI, setAuthTokenGetter } from "@/lib/fetch";
import { useDeviceStore, useUserStore } from "@/store";
import { Device } from "@/types/type";

export const refreshDevices = async (): Promise<void> => {
  const { setDevices, setDevicesReady } = useDeviceStore.getState();
  try {
    const res = await fetchAPI("/api/devices/") as { data?: Device[] } | Device[];
    const list: Device[] = Array.isArray(res)
      ? res
      : (res as { data?: Device[] }).data ?? [];
    setDevices(list);
  } catch (err) {
    console.error("[refreshDevices] Failed:", err);
  } finally {
    setDevicesReady(true);
  }
};

export default function RootLayout() {
  const { user } = useUser();
  const { getToken } = useAuth();

  const setUserData = useUserStore((s) => s.setUserData);
  const setDevicesReady = useDeviceStore((s) => s.setDevicesReady);

  // Track whether we've already run the bootstrap so it only fires once
  // per auth session, not on every re-render or navigation.
  const bootstrappedRef = useRef(false);

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
    };

    bootstrap();
  }, [user]);           // re-run if the logged-in user changes (e.g. after sign-out/in)

  return <Slot />;
}
