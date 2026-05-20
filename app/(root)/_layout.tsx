/**
 * (root)/_layout.tsx
 *
 * Root layout for the authenticated section of the app.
 * Runs once after sign-in, regardless of which tab opens first:
 *   - Syncs the Clerk user to the backend
 *   - Fetches the device list into Zustand
 *
 * This ensures Tracking, Alerts, Command, Settings, and Vehicles all have
 * device data available even if the user never visits the Home tab.
 */

import { useEffect, useRef } from "react";
import { Slot } from "expo-router";
import { useUser, useAuth } from "@clerk/clerk-expo";

import { fetchAPI } from "@/lib/fetch";
import { useDeviceStore, useUserStore } from "@/store";
import { Device } from "@/types/type";

export default function RootLayout() {
  const { user } = useUser();
  const { getToken } = useAuth();

  const setDevices  = useDeviceStore((s) => s.setDevices);
  const setUserData = useUserStore((s) => s.setUserData);

  // Track whether we've already run the bootstrap so it only fires once
  // per auth session, not on every re-render or navigation.
  const bootstrappedRef = useRef(false);

  useEffect(() => {
    if (!user || bootstrappedRef.current) return;
    bootstrappedRef.current = true;

    const bootstrap = async () => {
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
      try {
        const res = await fetchAPI("/api/devices/", { headers }) as
          | { data?: Device[] }
          | Device[];

        // Backend returns either { data: [...] } or a plain array
        const list: Device[] = Array.isArray(res)
          ? res
          : (res as { data?: Device[] }).data ?? [];

        setDevices(list);
      } catch (err) {
        console.error("[RootLayout] Failed to fetch devices:", err);
      }
    };

    bootstrap();
  }, [user]);           // re-run if the logged-in user changes (e.g. after sign-out/in)

  return <Slot />;
}
