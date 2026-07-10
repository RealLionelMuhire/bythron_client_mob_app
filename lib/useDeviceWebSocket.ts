/**
 * useDeviceWebSocket
 *
 * React hook that opens a WebSocket connection to the backend and delivers
 * real-time GPS location updates, replacing the 5-second HTTP polling loop.
 *
 * Features:
 * - Auto-reconnect with a 3-second delay on unexpected disconnect
 * - Keep-alive ping every 25 seconds to prevent proxy/NAT timeouts
 * - Pauses when the app moves to background (saves battery & data)
 * - Resumes automatically when the app returns to the foreground
 * - Passes Clerk session token for server-side authentication
 */

import { useEffect, useRef, useCallback } from "react";
import { AppState, AppStateStatus } from "react-native";

import { Location, LiveLocation } from "@/types/type";

const WS_RECONNECT_DELAY_MS = 3_000;  // wait 3s before reconnecting
const WS_PING_INTERVAL_MS   = 25_000; // keep-alive ping cadence

export type AlarmPayload = {
  type: "alarm";
  device_id: number;
  alarm_type: string | null;
  latitude: number;
  longitude: number;
  timestamp: string;
};

/**
 * Subscribe to real-time location updates for a GPS device.
 *
 * @param deviceId   - ID of the device to track. Pass `null` to do nothing.
 * @param onLocation - Called on every incoming location frame.
 * @param onAlarm    - Optional: called when the device sends an alarm event.
 */
export function useDeviceWebSocket(
  deviceId: number | null,
  onLocation: (location: LiveLocation) => void,
  onAlarm?: (data: AlarmPayload) => void,
  getToken?: () => Promise<string | null>,
): void {
  const wsRef        = useRef<WebSocket | null>(null);
  const pingRef      = useRef<ReturnType<typeof setInterval> | null>(null);
  const reconnectRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef   = useRef(true);

  // Stable ref for the current deviceId — used to detect device switches
  // inside the onclose handler so we don't reconnect to the wrong device.
  const deviceIdRef = useRef(deviceId);
  deviceIdRef.current = deviceId;

  // Stable refs so connect() can always call the latest callbacks without
  // being recreated every render (avoids reconnect storms).
  const onLocationRef = useRef(onLocation);
  const onAlarmRef    = useRef(onAlarm);
  const getTokenRef   = useRef(getToken);
  onLocationRef.current = onLocation;
  onAlarmRef.current    = onAlarm;
  getTokenRef.current   = getToken;

  /** Tear down the current connection and all timers. */
  const cleanup = useCallback(() => {
    if (pingRef.current)      { clearInterval(pingRef.current);  pingRef.current = null; }
    if (reconnectRef.current) { clearTimeout(reconnectRef.current); reconnectRef.current = null; }
    if (wsRef.current) {
      // Null out onclose BEFORE calling close() so the onclose handler does not
      // schedule another reconnect when we are intentionally shutting down.
      wsRef.current.onclose = null;
      wsRef.current.close();
      wsRef.current = null;
    }
  }, []);

  /** Open a fresh WebSocket to the backend location stream. */
  const connect = useCallback(() => {
    if (!deviceId || !mountedRef.current) return;

    const base = process.env.EXPO_PUBLIC_API_BASE_URL ?? "";
    if (!base) {
      console.error("[WS] EXPO_PUBLIC_API_BASE_URL is not set");
      return;
    }

    // Fetch auth token then open socket (getToken is async)
    const openSocket = async () => {
      let tokenSuffix = "";
      if (getTokenRef.current) {
        try {
          const tok = await getTokenRef.current();
          if (tok) tokenSuffix = `?token=${encodeURIComponent(tok)}`;
        } catch {
          console.warn("[WS] Could not fetch Clerk token — connecting without auth");
        }
      }

      if (!mountedRef.current) return; // component unmounted while awaiting token

      // Convert http(s):// → ws(s)://  so HTTPS servers get wss:// automatically
      const wsUrl = base.replace(/^http/, "ws") + `/ws/locations/${deviceId}` + tokenSuffix;

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log(`[WS] Connected to device ${deviceId}`);
        // Send a keep-alive ping on a regular cadence to prevent NAT/proxy timeouts
        pingRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) ws.send("ping");
        }, WS_PING_INTERVAL_MS);
      };

      ws.onmessage = (event: MessageEvent) => {
        try {
          const msg = JSON.parse(event.data as string);
          if (msg.type === "location") {
            onLocationRef.current(msg as LiveLocation);
          } else if (msg.type === "alarm" && onAlarmRef.current) {
            onAlarmRef.current(msg as AlarmPayload);
          }
        } catch {
          // Ignore malformed / non-JSON frames (e.g. server pong text)
        }
      };

      ws.onerror = () => {
        // The `onclose` handler below will take care of reconnection;
        // logging is handled there to avoid duplicate messages.
      };

      ws.onclose = (event: CloseEvent) => {
        if (pingRef.current) { clearInterval(pingRef.current); pingRef.current = null; }
        if (!mountedRef.current) return; // component unmounted — stop here
        // Guard: if the device changed while this socket was open, the new
        // connect() is already running — don't schedule another reconnect.
        if (deviceIdRef.current !== deviceId) return;
        console.log(`[WS] Disconnected from device ${deviceId} (code ${event.code}) — reconnecting in ${WS_RECONNECT_DELAY_MS}ms`);
        reconnectRef.current = setTimeout(connect, WS_RECONNECT_DELAY_MS);
      };
    };

    openSocket();
  }, [deviceId]); // only re-create when deviceId changes

  useEffect(() => {
    mountedRef.current = true;
    connect();

    // Pause the WebSocket when the app goes to background (saves battery),
    // resume it when the app comes back to the foreground.
    const handleAppStateChange = (nextState: AppStateStatus) => {
      if (nextState === "background" || nextState === "inactive") {
        console.log("[WS] App backgrounded — closing WebSocket");
        cleanup();
      } else if (nextState === "active") {
        console.log("[WS] App foregrounded — reconnecting WebSocket");
        connect();
      }
    };

    const sub = AppState.addEventListener("change", handleAppStateChange);

    return () => {
      mountedRef.current = false;
      cleanup();
      sub.remove();
    };
  }, [connect, cleanup]);
}
