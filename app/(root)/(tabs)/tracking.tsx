import React, { useEffect, useRef, useState } from "react";
import { View, Text, ActivityIndicator, StyleSheet, TouchableOpacity, Platform, Dimensions } from "react-native";
import Mapbox from "@rnmapbox/maps";
import { useDeviceStore, useLocationStore } from "@/store";
import { Device } from "@/types/type";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { startLocationPolling } from "@/lib/liveTracking";
import { Speedometer } from "@/components/Speedometer";

const { height } = Dimensions.get("window");

// Set Mapbox access token
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
  const [mapStyle, setMapStyle] = useState(
    "mapbox://styles/mapbox/satellite-streets-v12"
  );
  const [zoomLevel, setZoomLevel] = useState(14);
  const [pitch, setPitch] = useState(45);
  const [streetName, setStreetName] = useState("Locating...");
  const [batteryLevel, setBatteryLevel] = useState<number | null>(null);
  const device = selectedDevice || devices?.[0];
  const speed = currentLocation?.speed ?? device?.speed ?? 0;
  const totalDistance = 83337.62; // This would come from device data
  const status = device?.status === "online" ? "Moving" : "Stopped";
  const address = streetName;
  const targetLatitude = currentLocation?.latitude ?? userLatitude;
  const targetLongitude = currentLocation?.longitude ?? userLongitude;

  // Select first device by default
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

    return () => {
      if (cleanup) cleanup();
    };
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

        if (isActive && name) {
          setStreetName(name);
        } else if (isActive) {
          setStreetName(userAddress || "Unknown street");
        }
      } catch (error) {
        if (isActive) setStreetName(userAddress || "Unknown street");
      }
    };

    if (userAddress && isActive) {
      setStreetName(userAddress);
    }

    fetchNearestStreet();

    return () => {
      isActive = false;
    };
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

  const handleNavigationView = () => {
    recenterMap({ zoom: 16, pitch: 60 });
  };

  const handleZoomIn = () => {
    const nextZoom = Math.min(20, zoomLevel + 1);
    recenterMap({ zoom: nextZoom });
  };

  const handleToggle3D = () => {
    const nextPitch = pitch > 0 ? 0 : 60;
    recenterMap({ pitch: nextPitch });
  };

  // Format time ago
  const formatTimeAgo = (date?: string) => {
    if (!date) return "N/A";
    const now = new Date();
    const lastSeen = new Date(date);
    const diffMs = now.getTime() - lastSeen.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins} min ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    return lastSeen.toLocaleDateString();
  };

  if (!targetLatitude || !targetLongitude) {
    return (
      <View className="flex-1 items-center justify-center" style={{ backgroundColor: "#1A2A3A" }}>
        <ActivityIndicator size="large" color="#5BB8E8" />
        <Text className="text-gray-400 mt-4 font-JakartaMedium">
          Getting your location...
        </Text>
      </View>
    );
  }

  // Web fallback
  if (Platform.OS === "web") {
    return (
      <View className="flex-1 items-center justify-center p-5" style={{ backgroundColor: "#1A2A3A" }}>
        <Ionicons name="map" size={64} color="#5BB8E8" />
        <Text className="text-xl font-JakartaBold text-white mt-4 text-center">
          Live Tracking
        </Text>
        <Text className="text-base font-JakartaMedium text-gray-400 mt-2 text-center">
          Map view is only available on mobile devices
        </Text>
      </View>
    );
  }

  return (
    <View className="flex-1" style={{ backgroundColor: "#1A2A3A" }}>
      {/* Top Info Section - trimmed to reduce blank space */}
      <View style={[styles.topSection, { height: height * 0.32 }]}>
        {/* Status Bar Background */}
        <View style={styles.statusBarBg} />
        
        {/* Main Info Container */}
        <View style={styles.infoContainer}>
          {/* Left Side Icons */}
          <View style={styles.leftIcons}>
            <View style={styles.iconButton}>
              <Ionicons name="battery-half" size={20} color="#5BB8E8" />
              <Text style={styles.iconLabel}>Battery</Text>
              <Text style={styles.iconStatus}>
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

          {/* Center - Speedometer */}
          <View style={styles.speedometerContainer}>
            <Speedometer speed={speed} maxSpeed={120} size="large" />
            <Text style={styles.currentSpeed}>{speed.toFixed(0)} KM/H</Text>
            <View style={styles.distanceRow}>
              <MaterialCommunityIcons name="road-variant" size={18} color="#5BB8E8" style={styles.distanceIcon} />
              <Text style={styles.totalDistance}>{totalDistance.toFixed(1)} km</Text>
            </View>
          </View>

          {/* Right Side - Status Info */}
          <View style={styles.rightInfo}>
            <View style={styles.statusCard}>
              <View style={styles.statusHeader}>
                <Text style={styles.statusText}>{status}</Text>
                <Ionicons name="create-outline" size={18} color="#5BB8E8" />
              </View>
              <Text style={styles.statusLabel}>M</Text>
            </View>

            <View style={styles.infoCard}>
              <View style={styles.infoRow}>
                <Text style={styles.infoDate}>22-05-24</Text>
                <Ionicons name="time-outline" size={16} color="#5BB8E8" />
              </View>
              <Text style={styles.infoLabel}>Last Pos...</Text>
              <Text style={styles.infoTime}>{formatTimeAgo(device?.last_seen)}</Text>
            </View>
          </View>
        </View>

        {/* Address Bar */}
        <View style={styles.addressBar}>
          <Ionicons name="location" size={18} color="#5BB8E8" />
          <MaterialCommunityIcons name="road-variant" size={16} color="#5BB8E8" />
          <Text style={styles.addressText} numberOfLines={2}>
            {address}
          </Text>
        </View>
      </View>

      {/* Map Section - fills rest below top bar */}
      <View style={[styles.mapSection, { flex: 1 }]}>
        <Mapbox.MapView
          style={styles.map}
          styleURL={mapStyle}
          zoomEnabled={true}
          scrollEnabled={true}
          pitchEnabled={true}
          rotateEnabled={true}
        >
          <Mapbox.Camera
            ref={cameraRef}
            zoomLevel={zoomLevel}
            centerCoordinate={[targetLongitude, targetLatitude]}
            animationMode="flyTo"
            animationDuration={1000}
            pitch={pitch}
          />

          {/* Device Marker */}
          <Mapbox.PointAnnotation
            id="device-marker"
            coordinate={[targetLongitude, targetLatitude]}
          >
            <View style={styles.carMarker}>
              <Ionicons name="car" size={32} color="white" />
            </View>
          </Mapbox.PointAnnotation>

          {/* Location Pin */}
          <Mapbox.PointAnnotation
            id="location-pin"
            coordinate={[targetLongitude + 0.002, targetLatitude + 0.002]}
          >
            <View style={styles.locationPin}>
              <Ionicons name="location" size={24} color="#5BB8E8" />
            </View>
          </Mapbox.PointAnnotation>
        </Mapbox.MapView>

        {/* Left Side Menu */}
        <View style={styles.leftMenu}>
          <TouchableOpacity style={styles.menuButton} onPress={handleToggleStyle}>
            <MaterialCommunityIcons name="routes" size={24} color="#5BB8E8" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuButton} onPress={() => recenterMap({ zoom: 12, pitch: 0 })}>
            <Ionicons name="information-circle" size={24} color="#5BB8E8" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuButton} onPress={() => recenterMap()}>
            <MaterialCommunityIcons name="map-marker" size={24} color="#5BB8E8" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuButton} onPress={handleNavigationView}>
            <Ionicons name="car-sport" size={24} color="#5BB8E8" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuButton} onPress={handleZoomIn}>
            <Ionicons name="refresh" size={24} color="#5BB8E8" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuButton} onPress={handleToggle3D}>
            <Ionicons name="cube" size={24} color="#5BB8E8" />
          </TouchableOpacity>
        </View>

        {/* Right Side Menu Button */}
        <TouchableOpacity style={styles.rightMenuButton}>
          <Ionicons name="ellipsis-vertical" size={24} color="white" />
        </TouchableOpacity>

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
    height: 40,
    backgroundColor: "#E04848",
    opacity: 0.8,
  },
  infoContainer: {
    flexDirection: "row",
    paddingHorizontal: 12,
    paddingTop: 6,
    paddingBottom: 6,
  },
  leftIcons: {
    width: 70,
    justifyContent: "space-around",
  },
  iconButton: {
    alignItems: "center",
    marginBottom: 8,
  },
  iconLabel: {
    fontSize: 9,
    color: "#5BB8E8",
    marginTop: 2,
    fontWeight: "600",
  },
  iconStatus: {
    fontSize: 9,
    color: "white",
    marginTop: 1,
    fontWeight: "600",
  },
  speedometerContainer: {
    flex: 1,
    alignItems: "center",
    paddingTop: 0,
    marginTop: -2,
    paddingBottom: 0,
  },
  distanceRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 0,
  },
  distanceIcon: {
    marginRight: 6,
  },
  totalDistance: {
    fontSize: 14,
    fontWeight: "600",
    color: "white",
  },
  currentSpeed: {
    fontSize: 20,
    fontWeight: "bold",
    color: "white",
    marginTop: -2,
  },
  rightInfo: {
    width: 100,
    justifyContent: "flex-start",
    gap: 4,
  },
  statusCard: {
    backgroundColor: "rgba(30, 58, 82, 0.6)",
    borderRadius: 8,
    padding: 6,
    borderWidth: 1,
    borderColor: "#5BB8E8",
    marginBottom: 2,
  },
  statusHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  statusText: {
    color: "#5BB8E8",
    fontSize: 12,
    fontWeight: "600",
  },
  statusLabel: {
    color: "white",
    fontSize: 12,
    fontWeight: "bold",
    marginTop: 4,
  },
  infoCard: {
    backgroundColor: "rgba(30, 58, 82, 0.6)",
    borderRadius: 8,
    padding: 6,
    borderWidth: 1,
    borderColor: "#5BB8E8",
    marginBottom: 2,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  infoDate: {
    color: "white",
    fontSize: 9,
    fontWeight: "600",
  },
  infoLabel: {
    color: "#A8D8F0",
    fontSize: 11,
    marginTop: 2,
  },
  infoTime: {
    color: "white",
    fontSize: 11,
    fontWeight: "600",
    marginTop: 2,
  },
  addressBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(30, 58, 82, 0.8)",
    borderRadius: 10,
    paddingVertical: 5,
    paddingHorizontal: 8,
    marginHorizontal: 12,
    marginTop: 2,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: "#5BB8E8",
  },
  addressText: {
    flex: 1,
    color: "#A8D8F0",
    fontSize: 10,
    marginLeft: 4,
    lineHeight: 14,
  },
  mapSection: {
    position: "relative",
  },
  map: {
    flex: 1,
  },
  carMarker: {
    width: 50,
    height: 50,
    alignItems: "center",
    justifyContent: "center",
  },
  locationPin: {
    width: 40,
    height: 40,
    backgroundColor: "white",
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: "#5BB8E8",
  },
  leftMenu: {
    position: "absolute",
    left: 15,
    top: 20,
    gap: 12,
  },
  menuButton: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
    backgroundColor: "rgba(26, 42, 58, 0.9)",
    borderWidth: 2,
    borderColor: "#5BB8E8",
    alignItems: "center",
    justifyContent: "center",
  },
  rightMenuButton: {
    position: "absolute",
    right: 15,
    bottom: 100,
    width: 45,
    height: 45,
    borderRadius: 22.5,
    backgroundColor: "#5BB8E8",
    borderWidth: 2,
    borderColor: "#5BB8E8",
    alignItems: "center",
    justifyContent: "center",
  },
});

export default Tracking;
