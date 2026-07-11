import { TextInputProps, TouchableOpacityProps } from "react-native";

declare interface UserData {
  id: number;
  clerk_user_id: string;
  email: string;
  name: string | null;
  is_admin: boolean;
}

declare interface Device {
  id: number;
  name: string;
  vehicle_info?: string;
  status: 'online' | 'offline';
  last_seen: string;
  imei?: string;
  speed?: number;
  battery_level?: number;
}

declare interface Location {
  id: number;
  device_id: number;
  latitude: number;
  longitude: number;
  altitude?: number;
  speed?: number;
  course?: number;
  timestamp: string;
}

/** An alarm event recorded to the in-memory alarm log. */
declare interface AlarmLogEntry {
  /** Unique ID for list rendering (timestamp-deviceId). */
  id: string;
  alarm_type: string;    // raw key from WebSocket (e.g. "sos", "overspeed")
  device_id: number;
  device_name: string;   // resolved at insert time from Zustand device list
  latitude: number;
  longitude: number;
  timestamp: string;     // ISO-8601
}

/**
 * Shape of the global alarm banner state.
 * Mirrors BannerAlarm from AlarmBanner.tsx but uses plain types so it can
 * live in a .d.ts declaration file without importing from components.
 */
declare interface AlarmBannerState {
  title: string;
  message: string;
  icon: string;
  type: "error" | "warning" | "info" | "success";
  autoDismissMs?: number;
}

/**
 * Real-time location frame pushed by the server over WebSocket.
 * Matches the payload built in tcp_server.py → broadcast_location_update().
 * Unlike the DB-backed `Location`, this has no `id` or `altitude`.
 */
declare interface LiveLocation {
  type: "location";
  device_id: number;
  latitude: number;
  longitude: number;
  speed?: number;
  course?: number;
  timestamp: string;
  gps_valid?: boolean;
}

declare interface MarkerData {
  latitude: number;
  longitude: number;
  id: number;
  title: string;
  course?: number;
  speed?: number;
  status?: 'online' | 'offline';
}

declare interface MapProps {
  destinationLatitude?: number;
  destinationLongitude?: number;
  onDriverTimesCalculated?: (driversWithTimes: MarkerData[]) => void;
  selectedDriver?: number | null;
  onMapReady?: () => void;
}

declare interface Trip {
  id: number;
  device_id: number;
  user_id: number;
  name: string;
  display_name: string | null;
  start_time: string;
  end_time: string | null;  // null = active trip (in progress)
  total_distance_km: number;
  created_at: string;
}

declare interface TripDetail extends Trip {
  device_name: string;
  device_imei: string;
  route?: {
    type: "LineString";
    coordinates: [number, number][];
    timestamps: string[];
    speeds: number[];
    courses: number[];
    properties: {
      device_id: number;
      device_name: string;
      device_imei: string;
      start_time: string;
      end_time: string | null;
      point_count: number;
    };
  };
}

declare interface ButtonProps extends TouchableOpacityProps {
  title: string;
  bgVariant?: "primary" | "secondary" | "danger" | "outline" | "success";
  textVariant?: "primary" | "default" | "secondary" | "danger" | "success";
  IconLeft?: React.ComponentType<any>;
  IconRight?: React.ComponentType<any>;
  className?: string;
}



declare interface InputFieldProps extends TextInputProps {
  label: string;
  icon?: any;
  secureTextEntry?: boolean;
  labelStyle?: string;
  containerStyle?: string;
  inputStyle?: string;
  iconStyle?: string;
  className?: string;
}



declare interface LocationStore {
  userLatitude: number | null;
  userLongitude: number | null;
  userAddress: string | null;
  destinationLatitude: number | null;
  destinationLongitude: number | null;
  destinationAddress: string | null;
  setUserLocation: ({
    latitude,
    longitude,
    address,
  }: {
    latitude: number;
    longitude: number;
    address: string;
  }) => void;
  setDestinationLocation: ({
    latitude,
    longitude,
    address,
  }: {
    latitude: number;
    longitude: number;
    address: string;
  }) => void;
}

declare interface DeviceStore {
  devices: Device[];
  selectedDevice: number | null;
  currentLocation: LiveLocation | Location | null;
  isLoadingLocation: boolean;
  historyFullScreen: boolean;
  devicesReady: boolean;
  /** In-memory log of the last 100 alarm events (newest first). Persisted via AsyncStorage. */
  alarmLog: AlarmLogEntry[];
  /** Global alarm banner — shown by (root)/_layout.tsx so it overlays all screens. */
  globalBanner: AlarmBannerState | null;
  setSelectedDevice: (deviceId: number) => void;
  setDevices: (devices: Device[]) => void;
  clearSelectedDevice: () => void;
  setCurrentLocation: (location: LiveLocation | Location | null) => void;
  setLoadingLocation: (loading: boolean) => void;
  setHistoryFullScreen: (v: boolean) => void;
  setDevicesReady: (v: boolean) => void;
  addAlarmToLog: (entry: AlarmLogEntry) => void;
  clearAlarmLog: () => void;
  setGlobalBanner: (banner: AlarmBannerState) => void;
  clearGlobalBanner: () => void;
}

declare interface UserStore {
  userData: UserData | null;
  setUserData: (data: UserData) => void;
}

declare interface DeviceCardProps {
  item: Device;
  selected: number | null;
  setSelected: () => void;
  onHistoryPress?: () => void;
}
