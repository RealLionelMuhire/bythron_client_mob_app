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
  setSelectedDevice: (deviceId: number) => void;
  setDevices: (devices: Device[]) => void;
  clearSelectedDevice: () => void;
  setCurrentLocation: (location: LiveLocation | Location | null) => void;
  setLoadingLocation: (loading: boolean) => void;
  setHistoryFullScreen: (v: boolean) => void;
  setDevicesReady: (v: boolean) => void;
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
