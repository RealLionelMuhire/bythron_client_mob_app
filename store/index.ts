import { create } from "zustand";

import { DeviceStore, LocationStore, Device, Location, HistoricalRoute } from "@/types/type";

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
  historicalRoute: null,
  isLoadingLocation: false,
  historyFullScreen: false,
  setSelectedDevice: (deviceId: number) =>
    set(() => ({ selectedDevice: deviceId })),
  setDevices: (devices: Device[]) => set(() => ({ devices })),
  clearSelectedDevice: () => set(() => ({ selectedDevice: null })),
  setCurrentLocation: (location: Location) => set(() => ({ currentLocation: location })),
  setHistoricalRoute: (route: HistoricalRoute | null) => set(() => ({ historicalRoute: route })),
  setLoadingLocation: (loading: boolean) => set(() => ({ isLoadingLocation: loading })),
  setHistoryFullScreen: (v: boolean) => set(() => ({ historyFullScreen: v })),
}));
