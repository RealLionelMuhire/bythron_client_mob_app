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
            const response = await fetch(`/(api)/locations/${deviceId}/latest`);

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

/**
 * Fetch historical route data for a device
 * @param deviceId - The ID of the device
 * @param startTime - ISO 8601 start time
 * @param endTime - ISO 8601 end time
 * @returns RouteData GeoJSON FeatureCollection
 */
export const fetchHistoricalRoute = async (
    deviceId: number,
    startTime: string,
    endTime: string
) => {
    try {
        const response = await fetch(
            `/(api)/locations/${deviceId}/route?start_time=${encodeURIComponent(startTime)}&end_time=${encodeURIComponent(endTime)}`
        );

        if (!response.ok) {
            throw new Error(`Failed to fetch route: ${response.status}`);
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error("Error fetching historical route:", error);
        throw error;
    }
};
