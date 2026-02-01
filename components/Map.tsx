import React, { useEffect, useState, useRef } from "react";
import { ActivityIndicator, Text, View, StyleSheet } from "react-native";
import Mapbox from "@rnmapbox/maps";

import { useDeviceStore, useLocationStore } from "@/store";
import { Device, MarkerData } from "@/types/type";

// Set Mapbox access token
const accessToken = process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN;
if (accessToken) {
  Mapbox.setAccessToken(accessToken);
}

const Map = () => {
  const {
    userLongitude,
    userLatitude,
  } = useLocationStore();

  const {
    devices,
    selectedDevice,
    currentLocation,
    historicalRoute
  } = useDeviceStore();

  const cameraRef = useRef<Mapbox.Camera>(null);
  const [deviceMarkers, setDeviceMarkers] = useState<MarkerData[]>([]);

  // Convert devices to marker format
  useEffect(() => {
    if (devices && devices.length > 0) {
      // For now, we'll position devices at user location
      // In reality, you'd fetch actual device locations
      const markers: MarkerData[] = devices.map((device) => ({
        id: device.id,
        latitude: userLatitude || 0,
        longitude: userLongitude || 0,
        title: device.name,
        course: 0,
        speed: 0,
        status: device.status,
      }));
      setDeviceMarkers(markers);
    }
  }, [devices, userLatitude, userLongitude]);

  // Update selected device marker with live location
  useEffect(() => {
    if (currentLocation && selectedDevice) {
      setDeviceMarkers((prevMarkers) =>
        prevMarkers.map((marker) =>
          marker.id === selectedDevice
            ? {
              ...marker,
              latitude: currentLocation.latitude,
              longitude: currentLocation.longitude,
              course: currentLocation.course || 0,
              speed: currentLocation.speed || 0,
            }
            : marker
        )
      );

      // Center camera on selected device
      if (cameraRef.current) {
        cameraRef.current.setCamera({
          centerCoordinate: [currentLocation.longitude, currentLocation.latitude],
          zoomLevel: 15,
          animationDuration: 1000,
        });
      }
    }
  }, [currentLocation, selectedDevice]);

  if (!userLatitude && !userLongitude) {
    return (
      <View className="flex justify-center items-center w-full h-full">
        <ActivityIndicator size="small" color="#000" />
        <Text className="mt-2">Loading map...</Text>
      </View>
    );
  }

  // Create GeoJSON for device markers
  const devicesGeoJSON = {
    type: 'FeatureCollection',
    features: deviceMarkers.map((marker) => ({
      type: 'Feature',
      id: marker.id.toString(),
      geometry: {
        type: 'Point',
        coordinates: [marker.longitude, marker.latitude],
      },
      properties: {
        title: marker.title,
        course: marker.course || 0,
        status: marker.status,
        isSelected: marker.id === selectedDevice,
      },
    })),
  };

  return (
    <View style={styles.container}>
      <Mapbox.MapView
        style={styles.map}
        styleURL="mapbox://styles/mapbox/dark-v11"
        compassEnabled={true}
        scaleBarEnabled={false}
      >
        <Mapbox.Camera
          ref={cameraRef}
          zoomLevel={14}
          centerCoordinate={[userLongitude || 0, userLatitude || 0]}
          animationMode="flyTo"
          animationDuration={2000}
        />

        {/* User Location */}
        <Mapbox.UserLocation
          visible={true}
          showsUserHeadingIndicator={true}
        />

        {/* Device Markers */}
        {deviceMarkers.map((marker) => (
          <Mapbox.PointAnnotation
            key={marker.id}
            id={`device-${marker.id}`}
            coordinate={[marker.longitude, marker.latitude]}
            anchor={{ x: 0.5, y: 0.5 }}
          >
            <View
              style={[
                styles.markerContainer,
                marker.id === selectedDevice && styles.selectedMarker,
              ]}
            >
              <View
                style={[
                  styles.marker,
                  { transform: [{ rotate: `${marker.course || 0}deg` }] },
                ]}
              >
                <Text style={styles.markerIcon}>🚗</Text>
              </View>
            </View>
          </Mapbox.PointAnnotation>
        ))}

        {/* Historical Route */}
        {historicalRoute && historicalRoute.route && (
          <Mapbox.ShapeSource
            id="routeSource"
            shape={historicalRoute.route as any}
          >
            <Mapbox.LineLayer
              id="routeLine"
              style={{
                lineColor: '#00ff00',
                lineWidth: 3,
                lineCap: 'round',
                lineJoin: 'round',
              }}
            />
          </Mapbox.ShapeSource>
        )}
      </Mapbox.MapView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  markerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  marker: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 20,
    padding: 5,
    borderWidth: 2,
    borderColor: '#fff',
  },
  selectedMarker: {
    transform: [{ scale: 1.2 }],
  },
  markerIcon: {
    fontSize: 24,
  },
});

export default Map;
