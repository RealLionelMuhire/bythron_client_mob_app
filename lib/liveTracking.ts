/**
 * @deprecated This module uses HTTP polling (setInterval every 5 s).
 * Use the `useDeviceWebSocket` hook from `@/lib/useDeviceWebSocket` instead,
 * which provides real-time updates via WebSocket with auto-reconnect and
 * AppState-driven pause/resume. This file will be removed in a future cleanup.
 */

import { Location } from "@/types/type";

/**
 * Start polling for live location updates from a GPS device
 * @param deviceId - The ID of the device to track
 * @param callback - Function called with each location update
 * @returns Cleanup function to stop polling
 */
export const startLocationPolling = (
    deviceId: number,
    callback: (location: Location) => void
): (() => void) => {
    const interval = setInterval(async () => {
        try {
            const baseUrl = process.env.EXPO_PUBLIC_API_BASE_URL;
            if (!baseUrl) {
                console.error("API base URL not configured");
                return;
            }

            const response = await fetch(`${baseUrl}/api/locations/${deviceId}/latest`);

            if (!response.ok) {
                console.error(`Failed to fetch location: ${response.status}`);
                return;
            }

            const data = await response.json();
            callback(data);
        } catch (error) {
            console.error("Error polling location:", error);
        }
    }, 5000); // Poll every 5 seconds

    // Return cleanup function
    return () => clearInterval(interval);
};
