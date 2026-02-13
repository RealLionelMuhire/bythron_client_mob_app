import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { format } from "date-fns";
import Mapbox from "@rnmapbox/maps";

import { fetchAPI } from "@/lib/fetch";
import { useDeviceStore, useLocationStore } from "@/store";
import { Device } from "@/types/type";

type RouteFeature = {
  type: "Feature";
  geometry: {
    type: "Point";
    coordinates: [number, number];
  };
  properties?: Record<string, any>;
};

type RouteFeatureCollection = {
  type: "FeatureCollection";
  features: RouteFeature[];
  properties?: {
    device_id?: number;
    device_name?: string;
    start_time?: string;
    end_time?: string;
    point_count?: number;
  };
};

const accessToken = process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN;
if (accessToken) {
  Mapbox.setAccessToken(accessToken);
}

const History = () => {
  const cameraRef = useRef<Mapbox.Camera>(null);
  const { userLatitude, userLongitude } = useLocationStore();
  const { devices, selectedDevice, setSelectedDevice, setDevices } = useDeviceStore();

  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [routeData, setRouteData] = useState<RouteFeatureCollection | null>(null);

  useEffect(() => {
    if (devices.length > 0 || loading) return;

    const fetchDevices = async () => {
      try {
        const data = await fetchAPI("/api/devices/");
        if (Array.isArray(data)) {
          setDevices(data as Device[]);
        } else if (Array.isArray(data?.data)) {
          setDevices(data.data as Device[]);
        }
      } catch (err) {
        console.error("Failed to fetch devices", err);
      }
    };

    fetchDevices();
  }, [devices.length, loading, setDevices]);

  useEffect(() => {
    if (!selectedDevice && devices.length > 0) {
      setSelectedDevice(devices[0].id);
    }
  }, [devices, selectedDevice, setSelectedDevice]);

  const handleLoadRoute = async () => {
    if (!selectedDevice) {
      setError("Please select a device");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const startTime = new Date(date);
      startTime.setHours(0, 0, 0, 0);

      const endTime = new Date(date);
      endTime.setHours(23, 59, 59, 999);

      const query = `start_time=${encodeURIComponent(startTime.toISOString())}&end_time=${encodeURIComponent(endTime.toISOString())}`;
      const data = await fetchAPI(`/api/locations/${selectedDevice}/route?${query}`);

      setRouteData(data as RouteFeatureCollection);
    } catch (err) {
      console.error("Failed to load route", err);
      setRouteData(null);
      setError("Failed to load route history");
    } finally {
      setLoading(false);
    }
  };

  const routeLine = useMemo(() => {
    if (!routeData || routeData.features.length < 2) return null;

    return {
      type: "Feature",
      geometry: {
        type: "LineString",
        coordinates: routeData.features.map((feature) => feature.geometry.coordinates),
      },
      properties: {},
    };
  }, [routeData]);

  const centerCoordinate = useMemo<[number, number]>(() => {
    const firstPoint = routeData?.features?.[0]?.geometry?.coordinates;
    if (firstPoint) return firstPoint;
    return [userLongitude || 0, userLatitude || 0];
  }, [routeData, userLatitude, userLongitude]);

  const deviceName = useMemo(() => {
    const current = devices.find((device) => device.id === selectedDevice);
    return routeData?.properties?.device_name || current?.name || "Device";
  }, [devices, routeData, selectedDevice]);

  if (Platform.OS === "web") {
    return (
      <View className="flex-1 items-center justify-center p-5" style={{ backgroundColor: "#1A2A3A" }}>
        <Text className="text-white text-lg font-JakartaBold">History</Text>
        <Text className="text-gray-400 mt-2 font-JakartaMedium text-center">
          Map view is only available on mobile devices.
        </Text>
      </View>
    );
  }

  return (
    <View className="flex-1" style={{ backgroundColor: "#1A2A3A" }}>
      <View className="px-5 pt-4 pb-3">
        <Text className="text-white text-xl font-JakartaBold">History</Text>
        <Text className="text-gray-400 mt-1 font-JakartaMedium">
          Select a date to view route history.
        </Text>
      </View>

      <View className="px-5 pb-3">
        <View className="flex-row justify-between items-center mb-3">
          <View className="flex-1 mr-3">
            <Text className="text-white font-JakartaMedium mb-2">Device</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {devices.map((device) => {
                const isActive = device.id === selectedDevice;
                return (
                  <TouchableOpacity
                    key={device.id}
                    onPress={() => setSelectedDevice(device.id)}
                    className={`mr-3 px-4 py-2 rounded-full ${isActive ? "text-white" : "text-gray-300"}`}
                    style={{
                      backgroundColor: isActive ? "#5BB8E8" : "#243345",
                    }}
                  >
                    <Text className={`font-JakartaMedium ${isActive ? "text-white" : "text-gray-300"}`}>
                      {device.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          <View className="flex-1">
            <Text className="text-white font-JakartaMedium mb-2">Date</Text>
            <TouchableOpacity
              onPress={() => setShowDatePicker(true)}
              className="bg-[#243345] px-4 py-3 rounded-xl"
              style={{
                borderWidth: 2,
                borderColor: routeData ? "#5BB8E8" : "transparent",
              }}
            >
              <Text className="text-gray-200 font-JakartaMedium">
                {format(date, "MMM dd")}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {showDatePicker && (
          <DateTimePicker
            value={date}
            mode="date"
            display="default"
            onChange={(event, selectedDate) => {
              setShowDatePicker(false);
              if (selectedDate) {
                setDate(selectedDate);
              }
            }}
          />
        )}

        {error && (
          <Text className="text-red-400 mt-2 font-JakartaMedium">
            {error}
          </Text>
        )}

        <TouchableOpacity
          onPress={handleLoadRoute}
          disabled={loading}
          className="mt-4 w-full py-4 rounded-full flex items-center justify-center"
          style={{
            backgroundColor: loading ? "#666" : "#5BB8E8",
          }}
        >
          <Text className="text-white text-lg font-JakartaBold">
            {loading ? "Loading..." : "Load Route"}
          </Text>
        </TouchableOpacity>
      </View>

      <View className="flex-1">
        {loading && !routeData ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color="#5BB8E8" />
          </View>
        ) : (
          <Mapbox.MapView
            style={{ flex: 1 }}
            styleURL="mapbox://styles/mapbox/dark-v11"
            compassEnabled
            scaleBarEnabled={false}
          >
            <Mapbox.Camera
              ref={cameraRef}
              zoomLevel={13}
              centerCoordinate={centerCoordinate}
              animationMode="flyTo"
              animationDuration={1200}
            />

            {routeData && (
              <Mapbox.ShapeSource id="historyPoints" shape={routeData as any}>
                <Mapbox.CircleLayer
                  id="historyPointsLayer"
                  style={{
                    circleRadius: 4,
                    circleColor: "#5BB8E8",
                    circleOpacity: 0.9,
                  }}
                />
              </Mapbox.ShapeSource>
            )}

            {routeLine && (
              <Mapbox.ShapeSource
                id="historyLine"
                shape={{ type: "FeatureCollection", features: [routeLine] } as any}
              >
                <Mapbox.LineLayer
                  id="historyLineLayer"
                  style={{
                    lineColor: "#00E676",
                    lineWidth: 3,
                    lineCap: "round",
                    lineJoin: "round",
                  }}
                />
              </Mapbox.ShapeSource>
            )}
          </Mapbox.MapView>
        )}
      </View>

      <View className="px-5 py-4" style={{ backgroundColor: "#111E2C" }}>
        <Text className="text-white font-JakartaBold">{deviceName}</Text>
        <Text className="text-gray-400 mt-1 font-JakartaMedium">
          {routeData?.properties?.start_time || ""}
          {routeData?.properties?.end_time ? ` → ${routeData.properties.end_time}` : ""}
        </Text>
        <Text className="text-gray-400 mt-1 font-JakartaMedium">
          Points: {routeData?.properties?.point_count ?? routeData?.features?.length ?? 0}
        </Text>
      </View>
    </View>
  );
};

export default History;
