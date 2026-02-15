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
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import Svg, { Circle, Line, Path, Text as SvgText } from "react-native-svg";

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

type RouteLineFeature = {
  type: "Feature";
  geometry: {
    type: "LineString";
    coordinates: [number, number][];
  };
  properties?: Record<string, any>;
};

const toRad = (value: number) => (value * Math.PI) / 180;

const haversineMeters = (a: [number, number], b: [number, number]) => {
  const R = 6371000;
  const dLat = toRad(b[1] - a[1]);
  const dLon = toRad(b[0] - a[0]);
  const lat1 = toRad(a[1]);
  const lat2 = toRad(b[1]);

  const sinDLat = Math.sin(dLat / 2);
  const sinDLon = Math.sin(dLon / 2);
  const h = sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLon * sinDLon;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
};

const bearingDegrees = (from: [number, number], to: [number, number]) => {
  const fromLat = toRad(from[1]);
  const toLat = toRad(to[1]);
  const dLon = toRad(to[0] - from[0]);

  const y = Math.sin(dLon) * Math.cos(toLat);
  const x =
    Math.cos(fromLat) * Math.sin(toLat) -
    Math.sin(fromLat) * Math.cos(toLat) * Math.cos(dLon);
  const brng = (Math.atan2(y, x) * 180) / Math.PI;
  return (brng + 360) % 360;
};

const toNumberOrNull = (value: unknown) => {
  const num = typeof value === "number" ? value : Number(value);
  return Number.isFinite(num) ? num : null;
};

const normalizeBearing = (value: number) => {
  const normalized = ((value % 360) + 360) % 360;
  return normalized;
};

const interpolateBearing = (from: number, to: number, t: number) => {
  const start = normalizeBearing(from);
  const end = normalizeBearing(to);
  let delta = end - start;
  if (delta > 180) delta -= 360;
  if (delta < -180) delta += 360;
  return normalizeBearing(start + delta * t);
};

const interpolateLine = (coords: [number, number][], stepMeters: number) => {
  if (coords.length <= 1) return coords;
  const result: [number, number][] = [];

  for (let i = 0; i < coords.length - 1; i += 1) {
    const start = coords[i];
    const end = coords[i + 1];
    const dist = haversineMeters(start, end);

    result.push(start);

    if (dist <= stepMeters) continue;

    const steps = Math.floor(dist / stepMeters);
    for (let s = 1; s < steps; s += 1) {
      const t = s / steps;
      result.push([
        start[0] + (end[0] - start[0]) * t,
        start[1] + (end[1] - start[1]) * t,
      ]);
    }
  }

  result.push(coords[coords.length - 1]);
  return result;
};

const accessToken = process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN;
if (accessToken) {
  Mapbox.setAccessToken(accessToken);
}

const Speedometer = ({ speed = 0, maxSpeed = 200 }: { speed: number; maxSpeed?: number }) => {
  const size = 90;
  const strokeWidth = 10;
  const center = size / 2;
  const radius = (size - strokeWidth) / 2;

  const startAngle = -180;
  const endAngle = 0;
  const totalAngle = endAngle - startAngle;

  const speedPercentage = Math.min(speed / maxSpeed, 1);
  const needleAngle = startAngle + totalAngle * speedPercentage;
  const needleRad = (needleAngle * Math.PI) / 180;

  const needleLength = radius - 6;
  const needleX = center + needleLength * Math.cos(needleRad);
  const needleY = center + needleLength * Math.sin(needleRad);

  const createArcPath = (startDeg: number, endDeg: number, r: number) => {
    const start = (startDeg * Math.PI) / 180;
    const end = (endDeg * Math.PI) / 180;
    const x1 = center + r * Math.cos(start);
    const y1 = center + r * Math.sin(start);
    const x2 = center + r * Math.cos(end);
    const y2 = center + r * Math.sin(end);
    const largeArc = endDeg - startDeg > 180 ? 1 : 0;
    return `M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`;
  };

  return (
    <View style={{ alignItems: "center" }}>
      <Svg width={size} height={size}>
        <Path
          d={createArcPath(startAngle, endAngle, radius)}
          stroke="#1E3A52"
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
        />
        <Path
          d={createArcPath(startAngle, needleAngle, radius)}
          stroke="#5BB8E8"
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
        />
        {[0, 100, 200].map((value) => {
          const angle = startAngle + totalAngle * (value / maxSpeed);
          const rad = (angle * Math.PI) / 180;
          const x = center + (radius - 14) * Math.cos(rad);
          const y = center + (radius - 14) * Math.sin(rad);
          return (
            <SvgText
              key={value}
              x={x}
              y={y}
              fontSize="8"
              fill="#A8D8F0"
              textAnchor="middle"
              alignmentBaseline="middle"
            >
              {value}
            </SvgText>
          );
        })}
        <Circle cx={center} cy={center} r="3" fill="#333" />
        <Line
          x1={center}
          y1={center}
          x2={needleX}
          y2={needleY}
          stroke="white"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </Svg>
    </View>
  );
};

const History = () => {
  const cameraRef = useRef<Mapbox.Camera>(null);
  const { userLatitude, userLongitude } = useLocationStore();
  const { devices, selectedDevice, setSelectedDevice, setDevices } = useDeviceStore();

  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [routeData, setRouteData] = useState<RouteFeatureCollection | null>(null);
  const [routeLineData, setRouteLineData] = useState<RouteLineFeature | null>(null);
  const [mapStyle, setMapStyle] = useState("mapbox://styles/mapbox/dark-v11");
  const [pitch, setPitch] = useState(0);
  const [movingPoints, setMovingPoints] = useState<RouteFeature[]>([]);
  const [playbackPosition, setPlaybackPosition] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progressWidth, setProgressWidth] = useState(0);
  const [speedWidth, setSpeedWidth] = useState(0);
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [isScrubbingSpeed, setIsScrubbingSpeed] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [smoothedCourse, setSmoothedCourse] = useState<number | null>(null);
  const playbackPositionRef = useRef(0);
  const lastFrameTimeRef = useRef<number | null>(null);

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
      const [routeResponse, historyResponse, routeLineResult] = await Promise.allSettled([
        fetchAPI(`/api/locations/${selectedDevice}/route?${query}`),
        fetchAPI(`/api/locations/${selectedDevice}/history?${query}`),
        fetchAPI(`/api/locations/${selectedDevice}/route-line?${query}`),
      ]);

      if (routeResponse.status === "rejected") {
        throw routeResponse.reason;
      }

      if (historyResponse.status === "rejected") {
        throw historyResponse.reason;
      }

      setRouteData(routeResponse.value as RouteFeatureCollection);
      let routeLinePoints: RouteFeature[] | null = null;
      if (routeLineResult.status === "fulfilled") {
        const routeLineResponse = routeLineResult.value as any;
        if (routeLineResponse?.type === "Feature") {
          setRouteLineData(routeLineResponse as RouteLineFeature);
        } else if (routeLineResponse?.type === "FeatureCollection") {
          const lineFeature = (routeLineResponse as { features?: RouteLineFeature[] })?.features?.[0];
          setRouteLineData(lineFeature ?? null);
        } else if (routeLineResponse?.type === "LineString") {
          setRouteLineData({
            type: "Feature",
            geometry: {
              type: "LineString",
              coordinates: routeLineResponse.coordinates ?? [],
            },
            properties: routeLineResponse.properties ?? {},
          });

          const coords = routeLineResponse.coordinates ?? [];
          const speeds = routeLineResponse.speeds ?? [];
          const courses = routeLineResponse.courses ?? [];
          const timestamps = routeLineResponse.timestamps ?? [];

          routeLinePoints = coords
            .map((coord: [number, number], idx: number) => ({
              type: "Feature",
              geometry: {
                type: "Point",
                coordinates: coord,
              },
              properties: {
                timestamp: timestamps[idx],
                speed: toNumberOrNull(speeds[idx]) ?? 0,
                course: toNumberOrNull(courses[idx]) ?? null,
              },
            }))
            .filter((feature: RouteFeature) =>
              feature.geometry.coordinates.every((value: any) => typeof value === "number")
            );
        } else {
          setRouteLineData(null);
        }
      } else {
        setRouteLineData(null);
      }

      let historyFeatures = Array.isArray(historyResponse.value)
        ? (historyResponse as any[])
            .map((point) => ({
              type: "Feature",
              geometry: {
                type: "Point",
                coordinates: [
                  point.longitude ?? point.lon ?? point.lng,
                  point.latitude ?? point.lat,
                ],
              },
              properties: {
                timestamp: point.timestamp ?? point.time,
                speed: toNumberOrNull(point.speed) ?? 0,
                course: toNumberOrNull(point.course ?? point.heading) ?? null,
              },
            }))
            .filter((feature) =>
              feature.geometry.coordinates.every((value: any) => typeof value === "number")
            )
        : (historyResponse.value as RouteFeatureCollection)?.features ?? [];
      
      // Calculate bearing between consecutive points if not provided
      const withBearing = (features: RouteFeature[]) =>
        features.map((feature, idx) => {
          let course = toNumberOrNull(feature.properties?.course);
          if ((course == null || !Number.isFinite(course)) && idx < features.length - 1) {
            const nextFeature = features[idx + 1];
            course = bearingDegrees(
              feature.geometry.coordinates,
              nextFeature.geometry.coordinates
            );
          }
          return {
            ...feature,
            properties: {
              ...feature.properties,
              course: course ?? 0,
            },
          };
        });

      const finalMovingPoints = routeLinePoints?.length
        ? withBearing(routeLinePoints)
        : withBearing(historyFeatures);

      setMovingPoints(finalMovingPoints);
      setPlaybackPosition(0);
      playbackPositionRef.current = 0;
      setIsPlaying(false);
    } catch (err) {
      console.error("Failed to load route", err);
      setRouteData(null);
      setRouteLineData(null);
      setMovingPoints([]);
      setError("Failed to load route history");
    } finally {
      setLoading(false);
    }
  };

  const routeLine = useMemo(() => {
    if (routeLineData?.geometry?.coordinates?.length) {
      return routeLineData;
    }

    if (!routeData || routeData.features.length < 2) return null;

    return {
      type: "Feature",
      geometry: {
        type: "LineString",
        coordinates: routeData.features.map((feature) => feature.geometry.coordinates),
      },
      properties: {},
    };
  }, [routeData, routeLineData]);

  const centerCoordinate = useMemo<[number, number]>(() => {
    const firstPoint = routeData?.features?.[0]?.geometry?.coordinates;
    if (firstPoint) return firstPoint;
    return [userLongitude || 0, userLatitude || 0];
  }, [routeData, userLatitude, userLongitude]);

  const playbackPoints = useMemo(() => {
    if (movingPoints.length) return movingPoints;

    if (routeLineData?.geometry?.coordinates?.length) {
      const smoothed = interpolateLine(routeLineData.geometry.coordinates, 5);
      return smoothed.map((coords) => ({
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: coords,
        },
        properties: {},
      }));
    }

    if (routeData?.features?.length) return routeData.features;
    return [];
  }, [movingPoints, routeData, routeLineData]);

  const currentIndex = useMemo(() => {
    if (!playbackPoints.length) return 0;
    return Math.min(Math.floor(playbackPosition), playbackPoints.length - 1);
  }, [playbackPoints.length, playbackPosition]);

  const animatedPoint = useMemo(() => {
    if (!playbackPoints.length) return null;
    const index = Math.min(Math.floor(playbackPosition), playbackPoints.length - 1);
    const nextIndex = Math.min(index + 1, playbackPoints.length - 1);
    const start = playbackPoints[index].geometry.coordinates;
    const end = playbackPoints[nextIndex].geometry.coordinates;
    const t = Math.max(0, Math.min(playbackPosition - index, 1));
    const coord: [number, number] = [
      start[0] + (end[0] - start[0]) * t,
      start[1] + (end[1] - start[1]) * t,
    ];
    const startCourse = toNumberOrNull(playbackPoints[index].properties?.course);
    const endCourse = toNumberOrNull(playbackPoints[nextIndex].properties?.course);
    const fallbackCourse = bearingDegrees(start, end);
    const course =
      startCourse != null && endCourse != null
        ? interpolateBearing(startCourse, endCourse, t)
        : startCourse ?? endCourse ?? fallbackCourse;

    const startSpeed = toNumberOrNull(playbackPoints[index].properties?.speed) ?? 0;
    const endSpeed = toNumberOrNull(playbackPoints[nextIndex].properties?.speed) ?? 0;
    const speed = startSpeed + (endSpeed - startSpeed) * t;

    return {
      type: "Feature",
      geometry: {
        type: "Point",
        coordinates: coord,
      },
      properties: {
        course,
        speed,
      },
    } as RouteFeature;
  }, [playbackPoints, playbackPosition]);

  useEffect(() => {
    if (!animatedPoint) return;
    const target = toNumberOrNull(animatedPoint.properties?.course) ?? 0;
    setSmoothedCourse((prev) =>
      prev == null ? target : interpolateBearing(prev, target, 0.15)
    );
  }, [animatedPoint]);

  const currentSpeed = useMemo(() => {
    const speedValue = animatedPoint?.properties?.speed;
    return typeof speedValue === "number" ? speedValue : 0;
  }, [animatedPoint]);

  const playbackProgress = useMemo(() => {
    if (!playbackPoints.length) return 0;
    return Math.min(playbackPosition / Math.max(playbackPoints.length - 1, 1), 1);
  }, [playbackPosition, playbackPoints.length]);

  const speedProgress = useMemo(() => {
    const minSpeed = 0.5;
    const maxSpeed = 3;
    return Math.min((playbackSpeed - minSpeed) / (maxSpeed - minSpeed), 1);
  }, [playbackSpeed]);

  const handleProgressTouch = (locationX: number) => {
    if (!progressWidth || !playbackPoints.length) return;
    const ratio = Math.min(Math.max(locationX / progressWidth, 0), 1);
    const index = ratio * (playbackPoints.length - 1);
    playbackPositionRef.current = index;
    setPlaybackPosition(index);
  };

  const handleSpeedTouch = (locationX: number) => {
    if (!speedWidth) return;
    const minSpeed = 0.5;
    const maxSpeed = 3;
    const ratio = Math.min(Math.max(locationX / speedWidth, 0), 1);
    const nextSpeed = minSpeed + ratio * (maxSpeed - minSpeed);
    setPlaybackSpeed(Number(nextSpeed.toFixed(1)));
  };

  useEffect(() => {
    if (!animatedPoint || !cameraRef.current) return;
    cameraRef.current.setCamera({
      centerCoordinate: animatedPoint.geometry.coordinates,
      zoomLevel: 13,
      pitch,
      animationMode: "flyTo",
      animationDuration: 800,
    });
  }, [animatedPoint, pitch]);

  useEffect(() => {
    if (!isPlaying || !playbackPoints.length) return;
    let animationFrameId: number;

    const tick = (time: number) => {
      if (lastFrameTimeRef.current == null) {
        lastFrameTimeRef.current = time;
      }
      const deltaSeconds = (time - lastFrameTimeRef.current) / 1000;
      lastFrameTimeRef.current = time;

      const basePointsPerSecond = 12;
      const increment = deltaSeconds * basePointsPerSecond * playbackSpeed;
      const nextPosition = playbackPositionRef.current + increment;

      if (nextPosition >= playbackPoints.length - 1) {
        playbackPositionRef.current = playbackPoints.length - 1;
        setPlaybackPosition(playbackPositionRef.current);
        setIsPlaying(false);
        lastFrameTimeRef.current = null;
        return;
      }

      playbackPositionRef.current = nextPosition;
      setPlaybackPosition(nextPosition);
      animationFrameId = requestAnimationFrame(tick);
    };

    animationFrameId = requestAnimationFrame(tick);

    return () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
      lastFrameTimeRef.current = null;
    };
  }, [isPlaying, playbackPoints, playbackSpeed]);

  const deviceName = useMemo(() => {
    const current = devices.find((device) => device.id === selectedDevice);
    return routeData?.properties?.device_name || current?.name || "Device";
  }, [devices, routeData, selectedDevice]);

  const handleToggleStyle = () => {
    setMapStyle((prev) =>
      prev.includes("satellite")
        ? "mapbox://styles/mapbox/dark-v11"
        : "mapbox://styles/mapbox/satellite-streets-v12"
    );
  };

  const handleToggle3D = () => {
    setPitch((prev) => (prev > 0 ? 0 : 60));
  };

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
            styleURL={mapStyle}
            compassEnabled
            scaleBarEnabled={false}
          >
            <Mapbox.Camera
              ref={cameraRef}
              zoomLevel={13}
              centerCoordinate={centerCoordinate}
              animationMode="flyTo"
              animationDuration={1200}
              pitch={pitch}
            />

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

            {animatedPoint && (
              <Mapbox.MarkerView
                id="historyMovingMarker"
                coordinate={animatedPoint.geometry.coordinates}
                allowOverlap
                key={`${animatedPoint.geometry.coordinates[0]}-${animatedPoint.geometry.coordinates[1]}-${animatedPoint.properties?.course ?? 0}`}
              >
                <View
                  style={{
                    width: pitch > 0 ? 60 : 44,
                    height: pitch > 0 ? 60 : 44,
                    borderRadius: pitch > 0 ? 30 : 22,
                    backgroundColor: "#FF4D4D",
                    alignItems: "center",
                    justifyContent: "center",
                    borderWidth: 3,
                    borderColor: "white",
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: pitch > 0 ? 4 : 2 },
                    shadowOpacity: pitch > 0 ? 0.4 : 0.2,
                    shadowRadius: pitch > 0 ? 6 : 3,
                    elevation: pitch > 0 ? 8 : 4,
                    transform: [
                      { rotate: `${smoothedCourse ?? animatedPoint.properties?.course ?? 0}deg` },
                    ],
                  }}
                >
                  <MaterialCommunityIcons
                    name="navigation"
                    size={pitch > 0 ? 34 : 26}
                    color="white"
                  />
                </View>
              </Mapbox.MarkerView>
            )}
          </Mapbox.MapView>
        )}

        <View
          style={{
            position: "absolute",
            top: 16,
            right: 16,
            backgroundColor: "rgba(26, 42, 58, 0.9)",
            borderRadius: 14,
            padding: 10,
            alignItems: "center",
            borderWidth: 1,
            borderColor: "#5BB8E8",
          }}
        >
          <Speedometer speed={currentSpeed} maxSpeed={200} />
          <Text style={{ color: "white", fontWeight: "700", marginTop: 6, fontSize: 12 }}>
            {currentSpeed.toFixed(0)} KM/H
          </Text>
        </View>

        <View
          style={{
            position: "absolute",
            left: 16,
            right: 16,
            bottom: 16,
            padding: 12,
            borderRadius: 16,
            backgroundColor: "rgba(17, 30, 44, 0.95)",
            borderWidth: 1,
            borderColor: "#5BB8E8",
            flexDirection: "row",
            alignItems: "center",
            gap: 12,
          }}
        >
          <TouchableOpacity
            onPress={() => {
              if (playbackPosition >= Math.max(playbackPoints.length - 1, 0)) {
                playbackPositionRef.current = 0;
                setPlaybackPosition(0);
              }
              setIsPlaying((prev) => !prev);
            }}
            disabled={!playbackPoints.length}
            style={{
              width: 64,
              height: 64,
              borderRadius: 12,
              backgroundColor: "#0A63A8",
              alignItems: "center",
              justifyContent: "center",
              opacity: playbackPoints.length ? 1 : 0.6,
            }}
          >
            <Ionicons name={isPlaying ? "pause" : "play"} size={30} color="white" />
          </TouchableOpacity>

          <View style={{ marginBottom: 10, flex: 1 }}>
            <Text style={{ color: "white", fontSize: 12, marginBottom: 6 }}>
              Progress
            </Text>
            <View
              style={{ height: 6, borderRadius: 3, backgroundColor: "#243345" }}
              onLayout={(event) => setProgressWidth(event.nativeEvent.layout.width)}
              onStartShouldSetResponder={() => true}
              onResponderGrant={(event) => {
                setIsScrubbing(true);
                handleProgressTouch(event.nativeEvent.locationX);
              }}
              onResponderMove={(event) => handleProgressTouch(event.nativeEvent.locationX)}
              onResponderRelease={() => setIsScrubbing(false)}
            >
              <View
                style={{
                  position: "absolute",
                  left: 0,
                  top: 0,
                  bottom: 0,
                  width: `${playbackProgress * 100}%`,
                  backgroundColor: "#5BB8E8",
                  borderRadius: 3,
                }}
              />
              <View
                style={{
                  position: "absolute",
                  left: `${playbackProgress * 100}%`,
                  top: -5,
                  width: 16,
                  height: 16,
                  borderRadius: 8,
                  backgroundColor: "#5BB8E8",
                  borderWidth: 2,
                  borderColor: "white",
                  transform: [{ translateX: -8 }],
                  opacity: playbackPoints.length ? 1 : 0.5,
                }}
              />
            </View>
            <Text style={{ color: isScrubbing ? "#5BB8E8" : "#A8D8F0", fontSize: 11, marginTop: 6 }}>
              {isScrubbing ? "Scrubbing" : "Playback"}
            </Text>
          </View>

          <View>
            <Text style={{ color: "white", fontSize: 12, marginBottom: 6 }}>
              Speed
            </Text>
            <View
              style={{ height: 6, borderRadius: 3, backgroundColor: "#243345" }}
              onLayout={(event) => setSpeedWidth(event.nativeEvent.layout.width)}
              onStartShouldSetResponder={() => true}
              onResponderGrant={(event) => {
                setIsScrubbingSpeed(true);
                handleSpeedTouch(event.nativeEvent.locationX);
              }}
              onResponderMove={(event) => handleSpeedTouch(event.nativeEvent.locationX)}
              onResponderRelease={() => setIsScrubbingSpeed(false)}
            >
              <View
                style={{
                  position: "absolute",
                  left: 0,
                  top: 0,
                  bottom: 0,
                  width: `${speedProgress * 100}%`,
                  backgroundColor: "#5BB8E8",
                  borderRadius: 3,
                }}
              />
              <View
                style={{
                  position: "absolute",
                  left: `${speedProgress * 100}%`,
                  top: -5,
                  width: 16,
                  height: 16,
                  borderRadius: 8,
                  backgroundColor: "#5BB8E8",
                  borderWidth: 2,
                  borderColor: "white",
                  transform: [{ translateX: -8 }],
                }}
              />
            </View>
            <Text style={{ color: isScrubbingSpeed ? "#5BB8E8" : "#A8D8F0", fontSize: 11, marginTop: 6 }}>
              {playbackSpeed.toFixed(1)}x
            </Text>
          </View>
        </View>

        <View
          style={{
            position: "absolute",
            left: 16,
            top: 16,
            gap: 10,
          }}
        >
          <TouchableOpacity
            onPress={handleToggleStyle}
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: "rgba(26, 42, 58, 0.9)",
              borderWidth: 2,
              borderColor: "#5BB8E8",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <MaterialCommunityIcons name="layers" size={22} color="#5BB8E8" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleToggle3D}
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: "rgba(26, 42, 58, 0.9)",
              borderWidth: 2,
              borderColor: "#5BB8E8",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <MaterialCommunityIcons name={pitch > 0 ? "axis-z-rotate-clockwise" : "axis-z-rotate-clockwise"} size={22} color="#5BB8E8" />
          </TouchableOpacity>
        </View>
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
