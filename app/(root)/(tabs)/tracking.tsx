import React, { useEffect, useRef, useState } from "react";
import { View, Text, ActivityIndicator, StyleSheet, TouchableOpacity, Platform } from "react-native";
import Mapbox from "@rnmapbox/maps";
import { useDeviceStore, useLocationStore } from "@/store";
import { Device } from "@/types/type";
import { Ionicons } from "@expo/vector-icons";

// Set Mapbox access token
const accessToken = process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN;
if (accessToken) {
  Mapbox.setAccessToken(accessToken);
}

const Tracking = () => {
  const { devices } = useDeviceStore();
  const { userLatitude, userLongitude } = useLocationStore();
  const cameraRef = useRef<Mapbox.Camera>(null);
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);

  // Fly to device location when selected
  const flyToDevice = (device: Device) => {
    setSelectedDevice(device);
    // In a real app, you would have actual device coordinates
    // For now, we'll use user location as placeholder
    if (cameraRef.current && userLatitude && userLongitude) {
      cameraRef.current.setCamera({
        centerCoordinate: [userLongitude, userLatitude],
        zoomLevel: 14,
        animationDuration: 1000,
      });
    }
  };

  // Get device marker color based on status and speed
  const getMarkerColor = (device: Device) => {
    if (device.status === "offline") return "#9E9E9E"; // Gray
    if (device.speed && device.speed > 5) return "#4CAF50"; // Green (moving)
    return "#FFC107"; // Yellow (idle)
  };

  if (!userLatitude || !userLongitude) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-100">
        <ActivityIndicator size="large" color="#5BB8E8" />
        <Text className="text-gray-600 mt-4 font-JakartaMedium">
          Getting your location...
        </Text>
      </View>
    );
  }

  // Web fallback
  if (Platform.OS === "web") {
    return (
      <View className="flex-1 bg-gray-100 items-center justify-center p-5">
        <Ionicons name="map" size={64} color="#5BB8E8" />
        <Text className="text-xl font-JakartaBold text-gray-800 mt-4 text-center">
          Live Tracking
        </Text>
        <Text className="text-base font-JakartaMedium text-gray-600 mt-2 text-center">
          Map view is only available on mobile devices
        </Text>
        <View className="mt-6 w-full">
          {devices && devices.length > 0 ? (
            devices.map((device) => (
              <View
                key={device.id}
                className="bg-white rounded-xl p-4 mb-3 shadow"
                style={{ elevation: 2 }}
              >
                <View className="flex-row justify-between items-center">
                  <View className="flex-1">
                    <Text className="text-lg font-JakartaBold text-gray-800">
                      {device.name}
                    </Text>
                    <Text className="text-sm font-JakartaMedium text-gray-600 mt-1">
                      {device.vehicle_info}
                    </Text>
                    <View className="flex-row items-center mt-2">
                      <View
                        className="w-3 h-3 rounded-full mr-2"
                        style={{
                          backgroundColor:
                            device.status === "online" ? "#4CAF50" : "#9E9E9E",
                        }}
                      />
                      <Text className="text-sm font-JakartaMedium text-gray-600">
                        {device.status === "online" ? "Online" : "Offline"}
                      </Text>
                      {device.speed !== undefined && (
                        <Text className="text-sm font-JakartaMedium text-gray-600 ml-4">
                          {device.speed} km/h
                        </Text>
                      )}
                    </View>
                  </View>
                  <Ionicons name="location" size={32} color="#5BB8E8" />
                </View>
              </View>
            ))
          ) : (
            <Text className="text-center text-gray-600 font-JakartaMedium mt-4">
              No devices available
            </Text>
          )}
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1">
      {/* Header */}
      <View className="bg-blue-500" style={{ backgroundColor: "#5BB8E8", paddingTop: 40 }}>
        <View className="px-5 py-3">
          <Text className="text-white text-xl font-JakartaBold text-center">
            Live Tracking
          </Text>
        </View>
      </View>

      {/* Map View */}
      <View className="flex-1">
        <Mapbox.MapView
          style={styles.map}
          styleURL="mapbox://styles/mapbox/dark-v11"
          zoomEnabled={true}
          scrollEnabled={true}
          pitchEnabled={false}
          rotateEnabled={false}
        >
          <Mapbox.Camera
            ref={cameraRef}
            zoomLevel={12}
            centerCoordinate={[userLongitude, userLatitude]}
            animationMode="flyTo"
            animationDuration={1000}
          />

          {/* User Location */}
          <Mapbox.PointAnnotation
            id="user-location"
            coordinate={[userLongitude, userLatitude]}
          >
            <View style={styles.userMarker}>
              <View style={styles.userMarkerInner} />
            </View>
          </Mapbox.PointAnnotation>

          {/* Device Markers */}
          {devices && devices.length > 0 && devices.map((device) => {
            // In a real app, you would have actual device coordinates
            // For now, we'll offset them slightly from user location for demo
            const offset = Math.random() * 0.01;
            const deviceLon = userLongitude + (Math.random() > 0.5 ? offset : -offset);
            const deviceLat = userLatitude + (Math.random() > 0.5 ? offset : -offset);

            return (
              <Mapbox.PointAnnotation
                key={device.id}
                id={`device-${device.id}`}
                coordinate={[deviceLon, deviceLat]}
                onSelected={() => setSelectedDevice(device)}
              >
                <View style={styles.deviceMarkerContainer}>
                  {/* Marker Icon */}
                  <View
                    style={[
                      styles.deviceMarker,
                      { backgroundColor: getMarkerColor(device) },
                    ]}
                  >
                    <Ionicons name="car" size={16} color="white" />
                  </View>
                  {/* Device Name Label */}
                  <View style={styles.deviceLabel}>
                    <Text style={styles.deviceLabelText} numberOfLines={1}>
                      {device.name}
                    </Text>
                  </View>
                </View>
              </Mapbox.PointAnnotation>
            );
          })}
        </Mapbox.MapView>
      </View>

      {/* Selected Device Info Card */}
      {selectedDevice && (
        <View style={styles.infoCard}>
          <View className="flex-row justify-between items-start mb-2">
            <View className="flex-1 mr-3">
              <Text className="text-lg font-JakartaBold text-gray-800">
                {selectedDevice.name}
              </Text>
              <Text className="text-sm font-JakartaMedium text-gray-600 mt-1">
                {selectedDevice.vehicle_info}
              </Text>
            </View>
            <TouchableOpacity onPress={() => setSelectedDevice(null)}>
              <Ionicons name="close-circle" size={24} color="#9E9E9E" />
            </TouchableOpacity>
          </View>
          
          <View className="flex-row items-center mt-2">
            <View
              className="w-3 h-3 rounded-full mr-2"
              style={{
                backgroundColor:
                  selectedDevice.status === "online" ? "#4CAF50" : "#9E9E9E",
              }}
            />
            <Text className="text-sm font-JakartaMedium text-gray-600">
              {selectedDevice.status === "online" ? "Online" : "Offline"}
            </Text>
            {selectedDevice.speed !== undefined && (
              <>
                <View className="w-1 h-1 rounded-full bg-gray-400 mx-3" />
                <Text className="text-sm font-JakartaMedium text-gray-600">
                  Speed: {selectedDevice.speed} km/h
                </Text>
              </>
            )}
          </View>

          {selectedDevice.last_seen && (
            <Text className="text-xs font-JakartaMedium text-gray-500 mt-2">
              Last seen: {new Date(selectedDevice.last_seen).toLocaleString()}
            </Text>
          )}
        </View>
      )}

      {/* Device List Toggle Button */}
      <View style={styles.deviceListButton}>
        <TouchableOpacity
          className="bg-white rounded-full p-3 shadow"
          style={{ elevation: 5 }}
          onPress={() => {
            // Cycle through devices
            const currentIndex = selectedDevice
              ? devices.findIndex((d) => d.id === selectedDevice.id)
              : -1;
            const nextDevice = devices[(currentIndex + 1) % devices.length];
            flyToDevice(nextDevice);
          }}
        >
          <Ionicons name="list" size={24} color="#5BB8E8" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  map: {
    flex: 1,
  },
  userMarker: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "rgba(91, 184, 232, 0.3)",
    borderWidth: 2,
    borderColor: "#5BB8E8",
    alignItems: "center",
    justifyContent: "center",
  },
  userMarkerInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#5BB8E8",
  },
  deviceMarkerContainer: {
    alignItems: "center",
  },
  deviceMarker: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "white",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  deviceLabel: {
    marginTop: 4,
    backgroundColor: "white",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    maxWidth: 120,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
  deviceLabelText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#333",
    textAlign: "center",
  },
  infoCard: {
    position: "absolute",
    bottom: 100,
    left: 20,
    right: 20,
    backgroundColor: "white",
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  deviceListButton: {
    position: "absolute",
    top: 120,
    right: 20,
  },
});

export default Tracking;
