/**
 * lib/deviceService.ts
 *
 * Shared device data utilities. Kept in lib/ (not in a layout file) so any
 * screen or hook can import without creating circular module dependencies with
 * Expo Router's route modules.
 */

import { fetchAPI } from "@/lib/fetch";
import { useDeviceStore } from "@/store";
import { Device } from "@/types/type";

/**
 * Fetch the current user's device list from the backend and push it into the
 * Zustand store. Always marks `devicesReady = true` regardless of success or
 * failure so screens don't stay stuck on the loading skeleton.
 *
 * Safe to call from any screen or hook — auth is handled automatically by the
 * module-level token getter registered in `(root)/_layout.tsx`.
 */
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
