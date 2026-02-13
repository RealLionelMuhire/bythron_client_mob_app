import { TextInputProps, TouchableOpacityProps } from "react-native";

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

declare interface RouteData {
  type: 'FeatureCollection';
  features: {
    type: 'Feature';
    geometry: {
      type: 'LineString';
      coordinates: number[][];
    };
    properties: any;
  }[];
}

declare interface HistoricalRoute {
  device_id: number;
  start_time: string;
  end_time: string;
  route: RouteData;
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
  currentLocation: Location | null;
  historicalRoute: HistoricalRoute | null;
  isLoadingLocation: boolean;
  setSelectedDevice: (deviceId: number) => void;
  setDevices: (devices: Device[]) => void;
  clearSelectedDevice: () => void;
  setCurrentLocation: (location: Location) => void;
  setHistoricalRoute: (route: HistoricalRoute | null) => void;
  setLoadingLocation: (loading: boolean) => void;
}

declare interface DeviceCardProps {
  item: Device;
  selected: number | null;
  setSelected: () => void;
  onHistoryPress?: () => void;
}
