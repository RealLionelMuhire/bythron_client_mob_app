import React, { useEffect, useMemo, useRef, useState } from "react";
import ReactNative, {
  ActivityIndicator,
  Dimensions,
  Platform,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const { StyleSheet } = ReactNative;
const { height: SCREEN_HEIGHT } = Dimensions.get("window");
import DateTimePicker from "@react-native-community/datetimepicker";
import { format, differenceInSeconds } from "date-fns";
import Mapbox from "@rnmapbox/maps";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useColorScheme } from "nativewind";

import { getThemeColors, theme } from "@/constants/theme";
import { fetchAPI } from "@/lib/fetch";
import { useDeviceStore, useLocationStore } from "@/store";
import { Device } from "@/types/type";
import { NavigationArrow } from "@/components/NavigationArrow";
import { Speedometer } from "@/components/Speedometer";

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

const SPEEDOMETER_MAX = 120;
// Set to 1 for km/h; use 3.6 if backend speeds are in m/s.
const SPEED_DISPLAY_MULTIPLIER = 1;

const History = () => {
  const { colorScheme } = useColorScheme();
  const colors = getThemeColors(colorScheme === "dark" ? "dark" : "light");
  const styles = useMemo(() => createHistoryStyles(colors), [colors]);
  const cameraRef = useRef<Mapbox.Camera>(null);
  const userLatitude = useLocationStore((s) => s.userLatitude);
  const userLongitude = useLocationStore((s) => s.userLongitude);
  const devices = useDeviceStore((s) => s.devices);
  const selectedDevice = useDeviceStore((s) => s.selectedDevice);
  const setSelectedDevice = useDeviceStore((s) => s.setSelectedDevice);
  const setDevices = useDeviceStore((s) => s.setDevices);
  const setHistoryFullScreen = useDeviceStore((s) => s.setHistoryFullScreen);

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
  const [controlsExpanded, setControlsExpanded] = useState(true);
  const smoothedCourseRef = useRef<number | null>(null);
  const playbackPositionRef = useRef(0);
  const lastFrameTimeRef = useRef<number | null>(null);

  const routeLoaded = !!(routeData || routeLine);

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
      setControlsExpanded(false);
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

  const displayCourse = useMemo(() => {
    if (!animatedPoint) return 0;
    const target = toNumberOrNull(animatedPoint.properties?.course) ?? 0;
    const prev = smoothedCourseRef.current;
    const next = prev == null ? target : interpolateBearing(prev, target, 0.15);
    smoothedCourseRef.current = next;
    return next;
  }, [animatedPoint?.properties?.course]);

  const currentSpeed = useMemo(() => {
    const speedValue = animatedPoint?.properties?.speed;
    return typeof speedValue === "number" ? speedValue : 0;
  }, [animatedPoint]);

  const displaySpeed = useMemo(() => {
    const next = Math.max(0, currentSpeed) * SPEED_DISPLAY_MULTIPLIER;
    return Number.isFinite(next) ? next : 0;
  }, [currentSpeed]);

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
    const duration = isPlaying ? 50 : 800;
    const mode = isPlaying ? "easeTo" : "flyTo";
    cameraRef.current.setCamera({
      centerCoordinate: animatedPoint.geometry.coordinates,
      zoomLevel: 13,
      pitch,
      animationMode: mode,
      animationDuration: duration,
    });
  }, [animatedPoint, pitch, isPlaying]);

  const handleRecenter = () => {
    if (!animatedPoint || !cameraRef.current) return;
    cameraRef.current.setCamera({
      centerCoordinate: animatedPoint.geometry.coordinates,
      zoomLevel: 13,
      pitch,
      animationMode: "easeTo",
      animationDuration: 50,
    });
  };

  useEffect(() => {
    if (!isPlaying || !playbackPoints.length) return;
    let animationFrameId: number;

    const tick = (time: number) => {
      if (lastFrameTimeRef.current == null) {
        lastFrameTimeRef.current = time;
      }
      const deltaSeconds = (time - lastFrameTimeRef.current) / 1000;
      lastFrameTimeRef.current = time;

      const basePointsPerSecond = 2;
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

  const routeSummary = useMemo(() => {
    if (!playbackPoints.length) return null;
    const firstTs = playbackPoints[0].properties?.timestamp;
    const lastTs = playbackPoints[playbackPoints.length - 1].properties?.timestamp;
    let durationSec = 0;
    let startLabel = "";
    let endLabel = "";
    if (firstTs && lastTs) {
      const start = new Date(firstTs);
      const end = new Date(lastTs);
      durationSec = differenceInSeconds(end, start);
      startLabel = format(start, "h:mm a");
      endLabel = format(end, "h:mm a");
    }
    let distanceKm = 0;
    for (let i = 0; i < playbackPoints.length - 1; i++) {
      distanceKm += haversineMeters(
        playbackPoints[i].geometry.coordinates,
        playbackPoints[i + 1].geometry.coordinates
      ) / 1000;
    }
    const pointCount = playbackPoints.length;
    const durationLabel = durationSec <= 0
      ? "—"
      : durationSec >= 3600
        ? `${Math.floor(durationSec / 3600)}h ${Math.floor((durationSec % 3600) / 60)}m`
        : `${Math.floor(durationSec / 60)}m`;
    return { durationSec, durationLabel, startLabel, endLabel, distanceKm, pointCount };
  }, [playbackPoints]);

  const currentPlaybackTimeLabel = useMemo(() => {
    if (!playbackPoints.length || !routeSummary) return "0:00";
    const index = Math.min(Math.floor(playbackPosition), playbackPoints.length - 1);
    const ts = playbackPoints[index].properties?.timestamp;
    if (!ts) return "0:00";
    const t = new Date(ts);
    return format(t, "h:mm a");
  }, [playbackPoints, playbackPosition, routeSummary]);

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

  const handleChangeRoute = () => {
    setRouteData(null);
    setRouteLineData(null);
    setMovingPoints([]);
    setPlaybackPosition(0);
    playbackPositionRef.current = 0;
    setIsPlaying(false);
    setError(null);
    setControlsExpanded(true);
    setHistoryFullScreen(false);
  };

  useEffect(() => {
    const fullScreen = routeLoaded && !controlsExpanded;
    setHistoryFullScreen(fullScreen);
    return () => setHistoryFullScreen(false);
  }, [routeLoaded, controlsExpanded, setHistoryFullScreen]);

  if (Platform.OS === "web") {
    return (
      <View className="flex-1 items-center justify-center p-5 bg-surface-light">
        <Text className="text-slate-900 text-lg font-JakartaBold">History</Text>
        <Text className="text-status-muted mt-2 font-JakartaMedium text-center">
          Map view is only available on mobile devices.
        </Text>
      </View>
    );
  }

  const isToday = useMemo(() => {
    const today = new Date();
    return date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear();
  }, [date]);
  const isYesterday = useMemo(() => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return date.getDate() === yesterday.getDate() &&
      date.getMonth() === yesterday.getMonth() &&
      date.getFullYear() === yesterday.getFullYear();
  }, [date]);
  const dateLabel = isToday ? "Today" : isYesterday ? "Yesterday" : format(date, "EEE, MMM d");

  const showFullControls = !routeLoaded || controlsExpanded;

  return (
    <View style={styles.screen}>
      {/* Live Tracking–style top section when route loaded and controls collapsed */}
      {routeLoaded && !controlsExpanded && (
        <View style={[styles.trackingTopSection, { height: SCREEN_HEIGHT * 0.30 - 6 }]}>
          <View style={styles.trackingStatusBarBg} />
          <View style={styles.trackingInfoContainer}>
            <View style={styles.trackingLeftIcons}>
              <View style={styles.trackingIconButton}>
                <Ionicons name="time-outline" size={20} color={colors.accent[400]} />
                <Text style={styles.trackingIconLabel}>Speed</Text>
                <Text style={styles.trackingIconStatus}>{playbackSpeed.toFixed(1)}×</Text>
              </View>
              <View style={styles.trackingIconButton}>
                <MaterialCommunityIcons name="map-marker-path" size={20} color={colors.accent[400]} />
                <Text style={styles.trackingIconLabel}>Playback</Text>
                <Text style={styles.trackingIconStatus}>{isPlaying ? "On" : "Off"}</Text>
              </View>
            </View>
            <View style={styles.trackingSpeedometerContainer}>
              <Speedometer speed={displaySpeed} maxSpeed={SPEEDOMETER_MAX} size="large" />
              <Text style={styles.trackingCurrentSpeed}>{displaySpeed.toFixed(0)} KM/H</Text>
              <View style={styles.trackingDistanceRow}>
                <MaterialCommunityIcons name="road-variant" size={18} color={colors.accent[400]} style={styles.trackingDistanceIcon} />
                <Text style={styles.trackingTotalDistance}>
                  {routeSummary ? `${routeSummary.distanceKm.toFixed(1)} km` : "— km"}
                </Text>
              </View>
            </View>
            <View style={styles.trackingRightInfo}>
              <View style={styles.trackingStatusCard}>
                <View style={styles.trackingStatusHeader}>
                  <Text style={styles.trackingStatusText}>{isPlaying ? "Playing" : "Paused"}</Text>
                  <Ionicons name={isPlaying ? "play" : "pause"} size={18} color={colors.accent[400]} />
                </View>
                <Text style={styles.trackingStatusLabel}>M</Text>
              </View>
              <View style={styles.trackingInfoCard}>
                <View style={styles.trackingInfoRow}>
                  <Text style={styles.trackingInfoDate}>{format(date, "dd-MM-yy")}</Text>
                  <Ionicons name="calendar-outline" size={16} color={colors.accent[400]} />
                </View>
                <Text style={styles.trackingInfoLabel}>Time</Text>
                <Text style={styles.trackingInfoTime}>
                  {routeSummary ? `${currentPlaybackTimeLabel} → ${routeSummary.endLabel}` : "—"}
                </Text>
              </View>
            </View>
          </View>
          <TouchableOpacity
            style={styles.trackingAddressBar}
            onPress={handleChangeRoute}
            activeOpacity={0.9}
          >
            <Ionicons name="location" size={18} color={colors.accent[400]} />
            <MaterialCommunityIcons name="road-variant" size={16} color={colors.accent[400]} />
            <Text style={styles.trackingAddressText} numberOfLines={1}>
              {deviceName} · {dateLabel} · Tap to change route
            </Text>
            <Ionicons name="chevron-down" size={18} color={colors.accent[400]} />
          </TouchableOpacity>
        </View>
      )}

      {/* Full header + controls: when no route or when expanded */}
      {showFullControls && (
        <>
          <View style={[styles.header, routeLoaded && styles.headerWithDone]}>
            <View style={styles.headerTextWrap}>
              <Text style={styles.headerTitle}>Route History</Text>
              <Text style={styles.headerSubtitle}>Play back past routes by device and date</Text>
            </View>
            {routeLoaded && (
              <TouchableOpacity style={styles.doneButton} onPress={() => setControlsExpanded(false)}>
                <Text style={styles.doneButtonText}>Done</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.controlsCard}>
            <Text style={styles.label}>Device</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.deviceScroll}>
              {devices.length === 0 ? (
                <Text style={styles.placeholderText}>No devices</Text>
              ) : (
                devices.map((device) => {
                  const isActive = device.id === selectedDevice;
                  return (
                    <TouchableOpacity
                      key={device.id}
                      onPress={() => setSelectedDevice(device.id)}
                      style={[styles.deviceChip, isActive && styles.deviceChipActive]}
                    >
                      <Ionicons name="car-outline" size={16} color={isActive ? colors.surface.card : colors.accent[200]} style={{ marginRight: 6 }} />
                      <Text style={[styles.deviceChipText, isActive && styles.deviceChipTextActive]}>
                        {device.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>

            <View style={styles.dateRow}>
              <View style={styles.dateBlock}>
                <Text style={styles.label}>Date</Text>
                <TouchableOpacity
                  onPress={() => setShowDatePicker(true)}
                  style={[styles.dateButton, routeData && styles.dateButtonSuccess]}
                >
                  <Ionicons name="calendar-outline" size={18} color={colors.accent[400]} style={{ marginRight: 8 }} />
                  <Text style={styles.dateButtonText}>{dateLabel}</Text>
                  <Text style={styles.dateYear}>{format(date, "yyyy")}</Text>
                </TouchableOpacity>
              </View>
              <TouchableOpacity
                onPress={() => setShowDatePicker(true)}
                style={styles.quickDate}
              >
                <Text style={styles.quickDateText}>Pick date</Text>
              </TouchableOpacity>
            </View>

            {showDatePicker && (
              <DateTimePicker
                value={date}
                mode="date"
                display="default"
                onChange={(event, selectedDate) => {
                  setShowDatePicker(false);
                  if (selectedDate) setDate(selectedDate);
                }}
              />
            )}

            {error && (
              <View style={styles.errorCard}>
                <Ionicons name="warning-outline" size={20} color={colors.status.error} />
                <Text style={styles.errorText}>{error}</Text>
                <TouchableOpacity onPress={() => { setError(null); handleLoadRoute(); }} style={styles.retryButton}>
                  <Text style={styles.retryButtonText}>Retry</Text>
                </TouchableOpacity>
              </View>
            )}

            <TouchableOpacity
              onPress={handleLoadRoute}
              disabled={loading}
              style={[styles.loadButton, loading && styles.loadButtonDisabled]}
            >
              {loading ? (
                <>
                  <ActivityIndicator size="small" color="#fff" style={{ marginRight: 10 }} />
                  <Text style={styles.loadButtonText}>Loading route…</Text>
                </>
              ) : (
                <>
                  <Ionicons name="play-circle-outline" size={22} color="#fff" style={{ marginRight: 8 }} />
                  <Text style={styles.loadButtonText}>Load route</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </>
      )}

      <View
        style={[
          styles.mapContainer,
          routeLoaded && !controlsExpanded && styles.mapContainerTracking,
        ]}
      >
        {loading && !routeData ? (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color={colors.accent[400]} />
            <Text style={styles.loadingText}>Loading route data…</Text>
          </View>
        ) : !routeData && !routeLine ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconWrap}>
              <MaterialCommunityIcons name="map-marker-path" size={48} color={colors.accent[400]} />
            </View>
            <Text style={styles.emptyTitle}>No route loaded</Text>
            <Text style={styles.emptySubtitle}>Choose a device and date, then tap "Load route" to see playback</Text>
          </View>
        ) : (
          <Mapbox.MapView
            style={styles.map}
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
              >
                <View
                  style={{
                    width: 30,
                    height: 30,
                    alignItems: "center",
                    justifyContent: "center",
                    borderWidth: 2,
                    borderColor: "white",
                    borderRadius: 15,
                    backgroundColor: "rgba(255, 255, 255, 0.1)",
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: pitch > 0 ? 4 : 2 },
                    shadowOpacity: pitch > 0 ? 0.35 : 0.2,
                    shadowRadius: pitch > 0 ? 6 : 3,
                    elevation: pitch > 0 ? 8 : 4,
                    transform: [
                      { rotate: `${displayCourse}deg` },
                      ...(pitch > 0 ? [{ perspective: 1000 }, { rotateX: '25deg' }] : []),
                    ],
                  }}
                >
                  <NavigationArrow
                    size={27}
                    color="#E36060"
                  />
                </View>
              </Mapbox.MarkerView>
            )}
          </Mapbox.MapView>
        )}

        {routeLoaded && controlsExpanded && (
          <View style={[styles.speedCard, styles.speedCardCompact]}>
            <Text style={styles.speedCardLabel}>Speed</Text>
            <Speedometer speed={displaySpeed} maxSpeed={SPEEDOMETER_MAX} size="small" />
            <Text style={styles.speedCardValue}>{displaySpeed.toFixed(0)} km/h</Text>
          </View>
        )}

        {routeLoaded && (
          <View style={[styles.playbackBar, !controlsExpanded && styles.playbackBarCompact]}>
          <TouchableOpacity
            onPress={() => {
              if (playbackPoints.length && playbackPosition >= playbackPoints.length - 1) {
                playbackPositionRef.current = 0;
                setPlaybackPosition(0);
              }
              setIsPlaying((prev) => !prev);
            }}
            disabled={!playbackPoints.length}
            style={[
              styles.playButton,
              !controlsExpanded && styles.playButtonCompact,
              !playbackPoints.length && styles.playButtonDisabled,
            ]}
          >
            <Ionicons
              name={playbackPosition >= Math.max(playbackPoints.length - 1, 0) && !isPlaying ? "play-skip-back" : isPlaying ? "pause" : "play"}
              size={controlsExpanded ? 24 : 20}
              color="white"
            />
          </TouchableOpacity>

          <View style={styles.playbackSliders}>
            <View style={styles.sliderBlock}>
              <View style={styles.sliderHeader}>
                <Text style={styles.sliderLabel}>Progress</Text>
                {routeSummary && routeSummary.endLabel ? (
                  <Text style={styles.sliderTime} numberOfLines={1}>
                    {currentPlaybackTimeLabel} → {routeSummary.endLabel}
                  </Text>
                ) : null}
              </View>
              <View
                style={styles.sliderTouchArea}
                onLayout={(e) => setProgressWidth(e.nativeEvent.layout.width)}
                onStartShouldSetResponder={() => true}
                onMoveShouldSetResponder={() => true}
                onResponderTerminationRequest={() => false}
                onResponderGrant={(e) => { setIsScrubbing(true); handleProgressTouch(e.nativeEvent.locationX); }}
                onResponderMove={(e) => handleProgressTouch(e.nativeEvent.locationX)}
                onResponderRelease={() => setIsScrubbing(false)}
              >
                <View style={styles.sliderTrack}>
                  <View style={[styles.sliderFill, { width: `${playbackProgress * 100}%` }]} />
                  <View style={[styles.sliderThumb, { left: `${playbackProgress * 100}%` }]} />
                </View>
              </View>
            </View>
            <View style={styles.sliderBlock}>
              <Text style={styles.sliderLabel}>Speed</Text>
              <View
                style={styles.sliderTouchArea}
                onLayout={(e) => setSpeedWidth(e.nativeEvent.layout.width)}
                onStartShouldSetResponder={() => true}
                onMoveShouldSetResponder={() => true}
                onResponderTerminationRequest={() => false}
                onResponderGrant={(e) => { setIsScrubbingSpeed(true); handleSpeedTouch(e.nativeEvent.locationX); }}
                onResponderMove={(e) => handleSpeedTouch(e.nativeEvent.locationX)}
                onResponderRelease={() => setIsScrubbingSpeed(false)}
              >
                <View style={styles.sliderTrack}>
                  <View style={[styles.sliderFill, { width: `${speedProgress * 100}%` }]} />
                  <View style={[styles.sliderThumb, { left: `${speedProgress * 100}%` }]} />
                </View>
              </View>
              <Text style={[styles.sliderValue, isScrubbingSpeed && styles.sliderValueActive]}>{playbackSpeed.toFixed(1)}×</Text>
            </View>
          </View>
        </View>
        )}

        <View style={[styles.mapControls, routeLoaded && !controlsExpanded && styles.mapControlsTracking]}>
          {routeLoaded && !controlsExpanded && (
            <TouchableOpacity onPress={handleChangeRoute} style={styles.mapControlBtn} accessibilityLabel="Back">
              <Ionicons name="arrow-back" size={24} color={colors.accent[400]} />
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={handleToggleStyle} style={styles.mapControlBtn}>
            <MaterialCommunityIcons name="layers" size={22} color={colors.accent[400]} />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleToggle3D} style={styles.mapControlBtn}>
            <MaterialCommunityIcons name="cube-outline" size={22} color={colors.accent[400]} />
          </TouchableOpacity>
          {routeLoaded && (
            <TouchableOpacity onPress={handleRecenter} style={styles.mapControlBtn} accessibilityLabel="Recenter on moving object">
              <Ionicons name="navigate-circle" size={22} color={colors.accent[400]} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={[styles.infoStrip, routeLoaded && !controlsExpanded && styles.infoStripCompact]}>
        <View style={styles.infoStripMain}>
          <Text style={[styles.infoStripTitle, routeLoaded && !controlsExpanded && styles.infoStripTitleCompact]} numberOfLines={1}>
            {deviceName}
          </Text>
          {routeLoaded && !controlsExpanded && routeSummary ? (
            <Text style={styles.infoStripMetaText} numberOfLines={1}>
              {routeSummary.startLabel} – {routeSummary.endLabel} · {routeSummary.durationLabel} · {routeSummary.distanceKm.toFixed(1)} km
            </Text>
          ) : routeSummary ? (
            <View style={styles.infoStripMeta}>
              <Text style={styles.infoStripMetaText}>
                {routeSummary.startLabel} – {routeSummary.endLabel}
              </Text>
              <Text style={styles.infoStripMetaText}>
                Duration {routeSummary.durationLabel} · {routeSummary.distanceKm.toFixed(1)} km · {routeSummary.pointCount} points
              </Text>
            </View>
          ) : (
            (routeData?.properties?.start_time || routeData?.properties?.end_time) ? (
              <Text style={styles.infoStripMetaText}>
                {routeData.properties.start_time || ""}
                {routeData.properties.end_time ? ` → ${routeData.properties.end_time}` : ""}
              </Text>
            ) : (
              <Text style={styles.infoStripMetaText}>
                {routeData?.features?.length ?? 0} points
              </Text>
            )
          )}
        </View>
      </View>
    </View>
  );
};

function createHistoryStyles(colors: ReturnType<typeof getThemeColors>) {
  return StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface.light },
  compactBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: colors.surface.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.surface.border,
  },
  compactBarTitle: { fontSize: 14, color: colors.text.primary, flex: 1, marginRight: 12, fontFamily: "Jakarta-SemiBold" },
  compactBarBadge: { flexDirection: "row", alignItems: "center", gap: 4 },
  compactBarBadgeText: { fontSize: 13, color: colors.accent[400], fontFamily: "Jakarta-Medium" },
  trackingTopSection: { backgroundColor: colors.accent[200], paddingTop: 0 },
  trackingStatusBarBg: {
    height: 40,
    backgroundColor: colors.accent[400],
    opacity: 0.85,
  },
  trackingInfoContainer: {
    flexDirection: "row",
    paddingHorizontal: 12,
    paddingTop: 6,
    paddingBottom: 6,
  },
  trackingLeftIcons: { width: 70, justifyContent: "space-around" },
  trackingIconButton: { alignItems: "center", marginBottom: 4 },
  trackingIconLabel: { fontSize: 9, color: colors.accent[400], marginTop: 2, fontWeight: "600" },
  trackingIconStatus: { fontSize: 9, color: colors.text.primary, marginTop: 1, fontWeight: "600" },
  trackingSpeedometerContainer: {
    flex: 1,
    alignItems: "center",
    paddingTop: 0,
    marginTop: -2,
    paddingBottom: 0,
  },
  trackingDistanceRow: { flexDirection: "row", alignItems: "center", marginTop: 0 },
  trackingDistanceIcon: { marginRight: 6 },
  trackingTotalDistance: { fontSize: 14, fontWeight: "600", color: colors.text.primary },
  trackingCurrentSpeed: { fontSize: 20, fontWeight: "bold", color: colors.text.primary, marginTop: -2 },
  trackingRightInfo: { width: 100, justifyContent: "flex-start", gap: 4 },
  trackingStatusCard: {
    backgroundColor: colors.surface.card,
    borderRadius: 8,
    padding: 6,
    borderWidth: 1,
    borderColor: colors.surface.border,
    marginBottom: 2,
  },
  trackingStatusHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  trackingStatusText: { color: colors.accent[400], fontSize: 12, fontWeight: "600" },
  trackingStatusLabel: { color: colors.text.primary, fontSize: 12, fontWeight: "bold", marginTop: 4 },
  trackingInfoCard: {
    backgroundColor: colors.surface.card,
    borderRadius: 8,
    padding: 6,
    borderWidth: 1,
    borderColor: colors.surface.border,
    marginBottom: 2,
  },
  trackingInfoRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  trackingInfoDate: { color: colors.text.primary, fontSize: 9, fontWeight: "600" },
  trackingInfoLabel: { color: colors.text.secondary, fontSize: 11, marginTop: 2 },
  trackingInfoTime: { color: colors.text.primary, fontSize: 11, fontWeight: "600", marginTop: 2 },
  trackingAddressBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface.card,
    borderRadius: 10,
    paddingVertical: 5,
    paddingHorizontal: 8,
    marginHorizontal: 12,
    marginTop: 2,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: colors.surface.border,
  },
  trackingAddressText: { flex: 1, color: colors.text.secondary, fontSize: 10, marginLeft: 4, lineHeight: 14 },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.surface.border,
  },
  headerWithDone: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  headerTextWrap: { flex: 1 },
  headerTitle: { fontSize: 22, fontWeight: "700", color: colors.text.primary, fontFamily: "Jakarta-Bold" },
  headerSubtitle: { fontSize: 13, color: colors.text.secondary, marginTop: 2, fontFamily: "Jakarta-Medium" },
  doneButton: { paddingVertical: 8, paddingHorizontal: 14 },
  doneButtonText: { fontSize: 16, color: colors.accent[400], fontFamily: "Jakarta-SemiBold" },
  controlsCard: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: colors.surface.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.surface.border,
  },
  label: { fontSize: 12, color: colors.text.secondary, marginBottom: 8, fontFamily: "Jakarta-Medium" },
  deviceScroll: { marginBottom: 14, maxHeight: 44 },
  deviceChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 22,
    backgroundColor: colors.accent[100],
    marginRight: 10,
  },
  deviceChipActive: { backgroundColor: colors.accent[400] },
  deviceChipText: { fontSize: 14, color: colors.text.secondary, fontFamily: "Jakarta-Medium" },
  deviceChipTextActive: { color: "#fff" },
  placeholderText: { fontSize: 14, color: colors.text.muted, fontFamily: "Jakarta-Medium" },
  dateRow: { flexDirection: "row", alignItems: "flex-end", gap: 12 },
  dateBlock: { flex: 1 },
  dateButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.accent[100],
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "transparent",
  },
  dateButtonSuccess: { borderColor: colors.accent[400] },
  dateButtonText: { fontSize: 15, color: colors.text.primary, fontFamily: "Jakarta-Medium", flex: 1 },
  dateYear: { fontSize: 12, color: colors.status.muted },
  quickDate: { paddingVertical: 12, paddingHorizontal: 12, justifyContent: "center" },
  quickDateText: { fontSize: 14, color: colors.accent[400], fontFamily: "Jakarta-Medium" },
  errorCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(248, 113, 113, 0.12)",
    borderRadius: 12,
    padding: 12,
    marginTop: 12,
    borderWidth: 1,
    borderColor: "rgba(248, 113, 113, 0.3)",
    gap: 10,
  },
  errorText: { flex: 1, color: "#FCA5A5", fontSize: 13, fontFamily: "Jakarta-Medium" },
  retryButton: { paddingVertical: 6, paddingHorizontal: 12, backgroundColor: colors.accent[400], borderRadius: 8 },
  retryButtonText: { color: "#fff", fontSize: 13, fontFamily: "Jakarta-SemiBold" },
  loadButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.accent[400],
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 16,
  },
  loadButtonDisabled: { backgroundColor: "#475569", opacity: 0.9 },
  loadButtonText: { color: "#fff", fontSize: 17, fontFamily: "Jakarta-Bold" },
  mapContainer: { flex: 1, position: "relative" },
  mapContainerMax: { minHeight: 0 },
  mapContainerTracking: { position: "relative" },
  map: { flex: 1 },
  loadingOverlay: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.surface.light },
  loadingText: { color: colors.text.secondary, marginTop: 12, fontSize: 14, fontFamily: "Jakarta-Medium" },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
    backgroundColor: colors.surface.light,
  },
  emptyIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.accent[100],
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  emptyTitle: { fontSize: 18, fontWeight: "700", color: colors.text.primary, marginBottom: 8, fontFamily: "Jakarta-Bold" },
  emptySubtitle: { fontSize: 14, color: colors.status.muted, textAlign: "center", lineHeight: 20, fontFamily: "Jakarta-Medium" },
  speedCard: {
    position: "absolute",
    top: 16,
    right: 16,
    backgroundColor: colors.surface.card,
    borderRadius: 16,
    padding: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.surface.border,
    minWidth: 100,
  },
  speedCardLabel: { fontSize: 10, color: colors.text.secondary, marginBottom: 4, fontFamily: "Jakarta-Medium" },
  speedCardValue: { color: colors.text.primary, fontWeight: "700", fontSize: 13, marginTop: 4 },
  speedCardCompact: {
    padding: 8,
    minWidth: 72,
  },
  speedCardValueCompact: { color: colors.text.primary, fontWeight: "700", fontSize: 14 },
  playbackBar: {
    position: "absolute",
    left: 12,
    right: 12,
    bottom: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 10,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: colors.surface.card,
    borderWidth: 1,
    borderColor: colors.surface.border,
  },
  playButton: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: colors.accent[400],
    alignItems: "center",
    justifyContent: "center",
  },
  playButtonDisabled: { opacity: 0.5 },
  playbackBarCompact: { padding: 8, paddingVertical: 6, gap: 8, left: 10, right: 10, bottom: 10 },
  playButtonCompact: { width: 38, height: 38, borderRadius: 8 },
  playbackSliders: { flex: 1, gap: 8, minWidth: 0 },
  sliderBlock: { gap: 2 },
  sliderHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", minHeight: 16 },
  sliderLabel: { fontSize: 10, color: "#94A3B8", fontFamily: "Jakarta-Medium" },
  sliderTime: { fontSize: 9, color: colors.text.secondary, fontFamily: "Jakarta-Medium", flex: 1, marginLeft: 4 },
  sliderValue: { fontSize: 10, color: colors.status.muted, marginTop: 0, fontFamily: "Jakarta-Medium" },
  sliderValueActive: { color: colors.accent[400] },
  sliderTouchArea: {
    paddingVertical: 12,
    marginVertical: -12,
    justifyContent: "center",
  },
  sliderTrack: { height: 6, borderRadius: 3, backgroundColor: colors.accent[100], position: "relative", justifyContent: "center" },
  sliderFill: { position: "absolute", left: 0, top: 0, bottom: 0, backgroundColor: colors.accent[400], borderRadius: 3 },
  sliderThumb: {
    position: "absolute",
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.accent[400],
    borderWidth: 2,
    borderColor: "#fff",
    marginLeft: -7,
    top: -4,
  },
  mapControls: { position: "absolute", left: 16, top: 16, gap: 10 },
  mapControlBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surface.card,
    borderWidth: 2,
    borderColor: colors.surface.border,
    alignItems: "center",
    justifyContent: "center",
  },
  mapControlsTracking: { left: 15, top: 20, gap: 12 },
  infoStrip: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: colors.surface.card,
    borderTopWidth: 1,
    borderTopColor: colors.surface.border,
  },
  infoStripMain: { gap: 4 },
  infoStripTitle: { fontSize: 16, fontWeight: "700", color: colors.text.primary, fontFamily: "Jakarta-Bold" },
  infoStripMeta: { gap: 2 },
  infoStripMetaText: { fontSize: 12, color: colors.status.muted, fontFamily: "Jakarta-Medium" },
  infoStripCompact: { paddingVertical: 8, paddingHorizontal: 16 },
  infoStripTitleCompact: { fontSize: 14 },
});
}

export default History;
