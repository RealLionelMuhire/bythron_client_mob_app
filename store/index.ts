import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { DeviceStore, LocationStore, UserStore, Device, Location, UserData } from "@/types/type";

export const ALARM_LOG_STORAGE_KEY = "bythron:alarmLog";

export const useLocationStore = create<LocationStore>((set) => ({
  userLatitude: null,
  userLongitude: null,
  userAddress: null,
  destinationLatitude: null,
  destinationLongitude: null,
  destinationAddress: null,
  setUserLocation: ({
    latitude,
    longitude,
    address,
  }: {
    latitude: number;
    longitude: number;
    address: string;
  }) => {
    set(() => ({
      userLatitude: latitude,
      userLongitude: longitude,
      userAddress: address,
    }));

    // if device is selected and now new location is set, clear the selected device
    const { selectedDevice, clearSelectedDevice } = useDeviceStore.getState();
    if (selectedDevice) clearSelectedDevice();
  },

  setDestinationLocation: ({
    latitude,
    longitude,
    address,
  }: {
    latitude: number;
    longitude: number;
    address: string;
  }) => {
    set(() => ({
      destinationLatitude: latitude,
      destinationLongitude: longitude,
      destinationAddress: address,
    }));

    // if device is selected and now new location is set, clear the selected device
    const { selectedDevice, clearSelectedDevice } = useDeviceStore.getState();
    if (selectedDevice) clearSelectedDevice();
  },
}));

export const useDeviceStore = create<DeviceStore>((set) => ({
  devices: [] as Device[],
  selectedDevice: null,
  currentLocation: null,
  isLoadingLocation: false,
  historyFullScreen: false,
  devicesReady: false,
  alarmLog: [] as AlarmLogEntry[],
  globalBanner: null,
  setSelectedDevice: (deviceId: number) =>
    set(() => ({ selectedDevice: deviceId })),
  setDevices: (devices: Device[]) => set(() => ({ devices })),
  clearSelectedDevice: () => set(() => ({ selectedDevice: null })),
  setCurrentLocation: (location: Location | null) => set(() => ({ currentLocation: location })),
  setLoadingLocation: (loading: boolean) => set(() => ({ isLoadingLocation: loading })),
  setHistoryFullScreen: (v: boolean) => set(() => ({ historyFullScreen: v })),
  setDevicesReady: (v: boolean) => set(() => ({ devicesReady: v })),
  addAlarmToLog: (entry: AlarmLogEntry) =>
    set((state) => {
      const next = [entry, ...state.alarmLog].slice(0, 100);
      // Persist to AsyncStorage (fire-and-forget)
      AsyncStorage.setItem(ALARM_LOG_STORAGE_KEY, JSON.stringify(next)).catch(() => {});
      return { alarmLog: next };
    }),
  clearAlarmLog: () => {
    AsyncStorage.removeItem(ALARM_LOG_STORAGE_KEY).catch(() => {});
    set(() => ({ alarmLog: [] }));
  },
  setGlobalBanner: (banner: AlarmBannerState) => set(() => ({ globalBanner: banner })),
  clearGlobalBanner: () => set(() => ({ globalBanner: null })),
}));

export const useUserStore = create<UserStore>((set) => ({
  userData: null,
  setUserData: (data: UserData) => set(() => ({ userData: data })),
}));
