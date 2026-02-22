import React, { useEffect, useRef, useState, useMemo } from "react";
import { View, Text, ActivityIndicator, StyleSheet, TouchableOpacity, Platform, Dimensions } from "react-native";
import Mapbox from "@rnmapbox/maps";
import { useDeviceStore, useLocationStore } from "@/store";
import { Device } from "@/types/type";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { startLocationPolling } from "@/lib/liveTracking";
import { Speedometer } from "@/components/Speedometer";
import { NavigationArrow } from "@/components/NavigationArrow";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

const accessToken = process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN;
if (accessToken) {
  Mapbox.setAccessToken(accessToken);
}

const Tracking = () => {
  const devices = useDeviceStore((s) => s.devices);
  const currentLocation = useDeviceStore((s) => s.currentLocation);
  const setCurrentLocation = useDeviceStore((s) => s.setCurrentLocation);
  const userLatitude = useLocationStore((s) => s.userLatitude);
  const userLongitude = useLocationStore((s) => s.userLongitude);
  const userAddress = useLocationStore((s) => s.userAddress);
  const cameraRef = useRef<Mapbox.Camera>(null);
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [mapStyle, setMapStyle] = useState("mapbox://styles/mapbox/satellite-streets-v12");
  const [zoomLevel, setZoomLevel] = useState(14);
  const [pitch, setPitch] = useState(45);
  const [streetName, setStreetName] = useState("Locating...");
  const [batteryLevel, setBatteryLevel] = useState<number | null>(null);

  const device = selectedDevice || devices?.[0];
  const speed = currentLocation?.speed ?? device?.speed ?? 0;
  const course = currentLocation?.course ?? 0;
  const status = device?.status === "online" ? "Moving" : "Stopped";
  const targetLatitude = currentLocation?.latitude ?? userLatitude;
  const targetLongitude = currentLocation?.longitude ?? userLongitude;

  useEffect(() => {
    if (devices && devices.length > 0 && !selectedDevice) {
      setSelectedDevice(devices[0]);
    }
  }, [devices, selectedDevice]);

  useEffect(() => {
    if (!device?.id) return;
    const cleanup = startLocationPolling(device.id, (location) => {
      setCurrentLocation(location);
    });
    return () => { if (cleanup) cleanup(); };
  }, [device?.id, setCurrentLocation]);

  useEffect(() => {
    setBatteryLevel(typeof device?.battery_level === "number" ? device.battery_level : null);
  }, [device?.battery_level, device?.id]);

  useEffect(() => {
    let isActive = true;
    const fetchNearestStreet = async () => {
      if (!targetLatitude || !targetLongitude) return;
      if (!accessToken) {
        if (isActive) setStreetName(userAddress || "No Mapbox token");
        return;
      }
      try {
        const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${targetLongitude},${targetLatitude}.json?types=address,street&limit=1&language=en&access_token=${accessToken}`;
        const response = await fetch(url);
        const data = await response.json();
        const feature = data?.features?.[0];
        const name = feature?.place_name || feature?.text;
        if (isActive && name) setStreetName(name);
        else if (isActive) setStreetName(userAddress || "Unknown street");
      } catch {
        if (isActive) setStreetName(userAddress || "Unknown street");
      }
    };
    if (userAddress && isActive) setStreetName(userAddress);
    fetchNearestStreet();
    return () => { isActive = false; };
  }, [targetLatitude, targetLongitude, userAddress]);

  const recenterMap = (options?: { zoom?: number; pitch?: number }) => {
    const nextZoom = options?.zoom ?? zoomLevel;
    const nextPitch = options?.pitch ?? pitch;
    setZoomLevel(nextZoom);
    setPitch(nextPitch);
    if (targetLongitude == null || targetLatitude == null) return;
    cameraRef.current?.setCamera({
      centerCoordinate: [targetLongitude, targetLatitude],
      zoomLevel: nextZoom,
      pitch: nextPitch,
      animationMode: "flyTo",
      animationDuration: 800,
    });
  };

  const handleToggleStyle = () => {
    setMapStyle((prev) =>
      prev.includes("satellite")
        ? "mapbox://styles/mapbox/dark-v11"
        : "mapbox://styles/mapbox/satellite-streets-v12"
    );
  };

  const handleToggle3D = () => {
    recenterMap({ pitch: pitch > 0 ? 0 : 60 });
  };

  const handleRecenter = () => {
    if (targetLongitude == null || targetLatitude == null || !cameraRef.current) return;
    cameraRef.current.setCamera({
      centerCoordinate: [targetLongitude, targetLatitude],
      zoomLevel,
      pitch,
      animationMode: "easeTo",
      animationDuration: 50,
    });
  };

  const formatTimeAgo = (date?: string) => {
    if (!date) return "N/A";
    const now = new Date();
    const lastSeen = new Date(date);
    const diffMs = now.getTime() - lastSeen.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return lastSeen.toLocaleDateString();
  };

  const batteryIcon = useMemo(() => {
    if (batteryLevel == null) return "battery-half" as const;
    if (batteryLevel > 75) return "battery-full" as const;
    if (batteryLevel > 40) return "battery-half" as const;
    return "battery-dead" as const;
  }, [batteryLevel]);

  const batteryColor = useMemo(() => {
    if (batteryLevel == null) return "#94A3B8";
    if (batteryLevel > 40) return "#10B981";
    if (batteryLevel > 20) return "#F59E0B";
    return "#EF4444";
  }, [batteryLevel]);

  if (!targetLatitude || !targetLongitude) {
    return (
      <View className="flex-1 items-center justify-center" style={{ backgroundColor: "#1A2A3A" }}>
        <ActivityIndicator size="large" color="#5BB8E8" />
        <Text className="text-gray-400 mt-4 font-JakartaMedium">Getting your location...</Text>
      </View>
    );
  }

  if (Platform.OS === "web") {
    return (
      <View className="flex-1 items-center justify-center p-5" style={{ backgroundColor: "#1A2A3A" }}>
        <Ionicons name="map" size={64} color="#5BB8E8" />
        <Text className="text-xl font-JakartaBold text-white mt-4 text-center">Live Tracking</Text>
        <Text className="text-base font-JakartaMedium text-gray-400 mt-2 text-center">
          Map view is only available on mobile devices
        </Text>
      </View>
    );
  }

  return (
    <View className="flex-1" style={{ backgroundColor: "#1A2A3A" }}>
      {/* ═══ Top Info Section ═══ */}
      <View style={[styles.topSection, { height: SCREEN_HEIGHT * 0.30 - 6 }]}>
        <View style={styles.statusBarBg}>
          <View style={styles.statusBadge}>
            <View style={[styles.statusDot, { backgroundColor: device?.status === "online" ? "#10B981" : "#9E9E9E" }]} />
            <Text style={styles.statusBadgeText}>{status}</Text>
          </View>
          <Text style={styles.deviceNameText} numberOfLines={1}>{device?.name || "Tracker"}</Text>
        </View>

        <View style={styles.infoContainer}>
          {/* Left */}
          <View style={styles.leftIcons}>
            <View style={styles.iconButton}>
              <Ionicons name={batteryIcon} size={20} color={batteryColor} />
              <Text style={styles.iconLabel}>Battery</Text>
              <Text style={[styles.iconStatus, { color: batteryColor }]}>
                {batteryLevel != null ? `${batteryLevel}%` : "--"}
              </Text>
            </View>
            <View style={styles.iconButton}>
              <MaterialCommunityIcons name="key" size={20} color="#5BB8E8" />
              <Text style={styles.iconLabel}>Ignition</Text>
              <Text style={styles.iconStatus}>
                {device?.status === "online" ? "On" : "Off"}
              </Text>
            </View>
          </View>

          {/* Center */}
          <View style={styles.speedometerContainer}>
            <Speedometer speed={speed} maxSpeed={120} size="large" />
            <Text style={styles.currentSpeed}>{speed.toFixed(0)} KM/H</Text>
            <View style={styles.distanceRow}>
              <MaterialCommunityIcons name="road-variant" size={16} color="#5BB8E8" style={{ marginRight: 4 }} />
              <Text style={styles.lastSeenText}>{formatTimeAgo(device?.last_seen)}</Text>
            </View>
          </View>

          {/* Right */}
          <View style={styles.rightInfo}>
            <View style={styles.infoCard}>
              <View style={styles.infoRow}>
                <Text style={styles.infoCardLabel}>{status}</Text>
                <Ionicons name={device?.status === "online" ? "radio-button-on" : "radio-button-off"} size={14} color={device?.status === "online" ? "#10B981" : "#9E9E9E"} />
              </View>
            </View>
            <View style={styles.infoCard}>
              <View style={styles.infoRow}>
                <Text style={styles.infoCardLabel}>Updated</Text>
                <Ionicons name="time-outline" size={14} color="#5BB8E8" />
              </View>
              <Text style={styles.infoCardValue}>{formatTimeAgo(device?.last_seen)}</Text>
            </View>
            {device?.speed != null && (
              <View style={styles.infoCard}>
                <View style={styles.infoRow}>
                  <Text style={styles.infoCardLabel}>Speed</Text>
                  <Ionicons name="speedometer-outline" size={14} color="#5BB8E8" />
                </View>
                <Text style={styles.infoCardValue}>{speed.toFixed(0)} km/h</Text>
              </View>
            )}
          </View>
        </View>

        {/* Address bar */}
        <View style={styles.addressBar}>
          <Ionicons name="location" size={16} color="#5BB8E8" />
          <Text style={styles.addressText} numberOfLines={1}>{streetName}</Text>
        </View>
      </View>

      {/* ═══ Map Section ═══ */}
      <View style={{ flex: 1, position: "relative" }}>
        <Mapbox.MapView
          style={styles.map}
          styleURL={mapStyle}
          zoomEnabled
          scrollEnabled
          pitchEnabled
          rotateEnabled
        >
          <Mapbox.Camera
            ref={cameraRef}
            zoomLevel={zoomLevel}
            centerCoordinate={[targetLongitude, targetLatitude]}
            animationMode="flyTo"
            animationDuration={1000}
            pitch={pitch}
          />

          {/* Vehicle marker with direction arrow */}
          <Mapbox.MarkerView
            id="vehicle-marker"
            coordinate={[targetLongitude, targetLatitude]}
            anchor={{ x: 0.5, y: 0.5 }}
          >
            <View
              style={[
                styles.vehicleMarker,
                {
                  shadowOffset: { width: 0, height: pitch > 0 ? 4 : 2 },
                  shadowOpacity: pitch > 0 ? 0.35 : 0.2,
                  shadowRadius: pitch > 0 ? 6 : 3,
                  elevation: pitch > 0 ? 8 : 4,
                  transform: [
                    { rotate: `${course}deg` },
                    ...(pitch > 0 ? [{ perspective: 1000 }, { rotateX: "25deg" as any }] : []),
                  ],
                },
              ]}
            >
              <NavigationArrow size={27} color="#E36060" />
            </View>
          </Mapbox.MarkerView>
        </Mapbox.MapView>

        {/* Left map controls */}
        <View style={styles.mapControls}>
          <TouchableOpacity onPress={handleToggleStyle} style={styles.mapControlBtn}>
            <MaterialCommunityIcons name="layers" size={22} color="#5BB8E8" />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleToggle3D} style={styles.mapControlBtn}>
            <MaterialCommunityIcons name="cube-outline" size={22} color="#5BB8E8" />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleRecenter} style={styles.mapControlBtn} accessibilityLabel="Recenter">
            <Ionicons name="navigate-circle" size={22} color="#5BB8E8" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  topSection: {
    backgroundColor: "#1A2A3A",
    paddingTop: 0,
  },
  statusBarBg: {
    height: 44,
    backgroundColor: "rgba(91, 184, 232, 0.15)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(17, 30, 44, 0.8)",
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 5,
  },
  statusBadgeText: {
    color: "#A8D8F0",
    fontSize: 11,
    fontWeight: "600",
  },
  deviceNameText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "700",
    maxWidth: 160,
  },
  infoContainer: {
    flexDirection: "row",
    paddingHorizontal: 12,
    paddingTop: 4,
    paddingBottom: 4,
  },
  leftIcons: {
    width: 65,
    justifyContent: "space-around",
  },
  iconButton: {
    alignItems: "center",
    marginBottom: 6,
  },
  iconLabel: {
    fontSize: 9,
    color: "#94A3B8",
    marginTop: 2,
    fontWeight: "600",
  },
  iconStatus: {
    fontSize: 10,
    color: "white",
    marginTop: 1,
    fontWeight: "700",
  },
  speedometerContainer: {
    flex: 1,
    alignItems: "center",
    paddingTop: 0,
    marginTop: -2,
  },
  currentSpeed: {
    fontSize: 18,
    fontWeight: "bold",
    color: "white",
    marginTop: -2,
  },
  distanceRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 0,
  },
  lastSeenText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#A8D8F0",
  },
  rightInfo: {
    width: 90,
    justifyContent: "flex-start",
    gap: 4,
  },
  infoCard: {
    backgroundColor: "rgba(30, 58, 82, 0.6)",
    borderRadius: 8,
    padding: 6,
    borderWidth: 1,
    borderColor: "rgba(91, 184, 232, 0.3)",
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  infoCardLabel: {
    color: "#94A3B8",
    fontSize: 10,
    fontWeight: "600",
  },
  infoCardValue: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "700",
    marginTop: 2,
  },
  addressBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(30, 58, 82, 0.8)",
    borderRadius: 10,
    paddingVertical: 6,
    paddingHorizontal: 10,
    marginHorizontal: 12,
    marginTop: 2,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: "rgba(91, 184, 232, 0.3)",
  },
  addressText: {
    flex: 1,
    color: "#A8D8F0",
    fontSize: 11,
    marginLeft: 6,
    lineHeight: 15,
  },
  map: {
    flex: 1,
  },
  vehicleMarker: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(17, 30, 44, 0.92)",
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.1)",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
  },
  mapControls: {
    position: "absolute",
    left: 16,
    top: 16,
    gap: 10,
  },
  mapControlBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(17, 30, 44, 0.92)",
    borderWidth: 2,
    borderColor: "#5BB8E8",
    alignItems: "center",
    justifyContent: "center",
  },
});

export default Tracking;
