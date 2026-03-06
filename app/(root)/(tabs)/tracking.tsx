import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Dimensions,
  Animated,
  PanResponder,
  LayoutAnimation,
  UIManager,
} from "react-native";

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}
import Mapbox from "@rnmapbox/maps";
import { useColorScheme } from "nativewind";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { getThemeColors } from "@/constants/theme";
import { useDeviceStore, useLocationStore } from "@/store";
import { Device } from "@/types/type";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { startLocationPolling } from "@/lib/liveTracking";
import { Speedometer } from "@/components/Speedometer";
import { TrackingMarker } from "@/components/TrackingMarker";
import { fetchAPI } from "@/lib/fetch";

const normalizeBearing = (value: number) => ((value % 360) + 360) % 360;
const interpolateBearing = (from: number, to: number, t: number) => {
  const start = normalizeBearing(from);
  const end = normalizeBearing(to);
  let delta = end - start;
  if (delta > 180) delta -= 360;
  if (delta < -180) delta += 360;
  return normalizeBearing(start + delta * t);
};

const { height: SCREEN_HEIGHT } = Dimensions.get("window");
const PANEL_HEIGHT = SCREEN_HEIGHT * 0.30 - 6;
const COLLAPSED_BAR_HEIGHT = 40;
const TAB_BAR_HEIGHT = 80;

const accessToken = process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN;
if (accessToken) {
  Mapbox.setAccessToken(accessToken);
}

const Tracking = () => {
  const { colorScheme } = useColorScheme();
  const colors = getThemeColors(colorScheme === "dark" ? "dark" : "light");
  const styles = useMemo(() => createTrackingStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const devices = useDeviceStore((s) => s.devices);
  const setDevices = useDeviceStore((s) => s.setDevices);
  const currentLocation = useDeviceStore((s) => s.currentLocation);
  const setCurrentLocation = useDeviceStore((s) => s.setCurrentLocation);
  const userLatitude = useLocationStore((s) => s.userLatitude);
  const userLongitude = useLocationStore((s) => s.userLongitude);
  const userAddress = useLocationStore((s) => s.userAddress);
  const cameraRef = useRef<Mapbox.Camera>(null);
  const smoothedCourseRef = useRef<number | null>(null);
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [mapStyle, setMapStyle] = useState("mapbox://styles/mapbox/satellite-streets-v12");
  const [zoomLevel, setZoomLevel] = useState(14);
  const [pitch, setPitch] = useState(45);
  const [streetName, setStreetName] = useState("Locating...");
  const [batteryLevel, setBatteryLevel] = useState<number | null>(null);
  const [controlsExpanded, setControlsExpanded] = useState(false);
  const [topPanelExpanded, setTopPanelExpanded] = useState(true);
  const panelTranslateY = useRef(new Animated.Value(0)).current;
  const topPanelExpandedRef = useRef(true);

  const device = selectedDevice || devices?.[0];
  const speed = currentLocation?.speed ?? device?.speed ?? 0;
  const rawCourse = currentLocation?.course ?? 0;

  const displayCourse = useMemo(() => {
    const target = typeof rawCourse === "number" ? rawCourse : 0;
    const prev = smoothedCourseRef.current;
    const next = prev == null ? target : interpolateBearing(prev, target, 0.15);
    smoothedCourseRef.current = next;
    return next;
  }, [rawCourse]);
  const status = device?.status === "online" ? "Moving" : "Stopped";
  const targetLatitude = currentLocation?.latitude ?? userLatitude;
  const targetLongitude = currentLocation?.longitude ?? userLongitude;

  useEffect(() => {
    if (devices && devices.length > 0 && !selectedDevice) {
      setSelectedDevice(devices[0]);
    }
  }, [devices, selectedDevice]);

  useEffect(() => {
    const refreshDevices = async () => {
      try {
        const res = await fetchAPI("/api/devices/") as { data?: Device[] };
        if (res?.data) setDevices(res.data);
      } catch (e) {
        console.error("Failed to refresh devices:", e);
      }
    };
    refreshDevices();
  }, [setDevices]);

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

  const lastUpdated = currentLocation?.timestamp ?? device?.last_seen;

  const snapTopPanel = (expanded: boolean) => {
    topPanelExpandedRef.current = expanded;
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setTopPanelExpanded(expanded);
    Animated.spring(panelTranslateY, {
      toValue: expanded ? 0 : -(PANEL_HEIGHT - COLLAPSED_BAR_HEIGHT),
      useNativeDriver: true,
      damping: 20,
      stiffness: 200,
    }).start();
  };

  const topPanelPanResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: () => {
          topPanelExpandedRef.current = topPanelExpanded;
        },
        onPanResponderMove: (_, g) => {
          const maxDrag = PANEL_HEIGHT - COLLAPSED_BAR_HEIGHT;
          const expanded = topPanelExpandedRef.current;
          if (expanded && g.dy < 0) {
            panelTranslateY.setValue(Math.max(-maxDrag, g.dy));
          } else if (!expanded && g.dy > 0) {
            panelTranslateY.setValue(Math.min(0, -maxDrag + g.dy));
          }
        },
        onPanResponderRelease: (_, g) => {
          const threshold = 40;
          const velocity = g.vy;
          const expanded = topPanelExpandedRef.current;
          const isTap = Math.abs(g.dy) < 8 && Math.abs(velocity) < 0.2;
          if (isTap && !expanded) {
            snapTopPanel(true);
            return;
          }
          if (expanded) {
            if (g.dy < -threshold || velocity < -0.3) snapTopPanel(false);
            else snapTopPanel(true);
          } else {
            if (g.dy > threshold || velocity > 0.3) snapTopPanel(true);
            else snapTopPanel(false);
          }
        },
      }),
    [topPanelExpanded]
  );

  const toggleControlsExpanded = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setControlsExpanded((prev) => !prev);
  };

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
    if (batteryLevel == null) return colors.status.muted;
    if (batteryLevel > 40) return colors.status.success;
    if (batteryLevel > 20) return colors.status.warning;
    return colors.status.error;
  }, [batteryLevel, colors]);

  if (!targetLatitude || !targetLongitude) {
    return (
      <View className="flex-1 items-center justify-center bg-surface-light dark:bg-slate-900">
        <ActivityIndicator size="large" color={colors.accent[400]} />
        <Text className="text-status-muted mt-4 font-JakartaMedium">Getting your location...</Text>
      </View>
    );
  }

  if (Platform.OS === "web") {
    return (
      <View className="flex-1 items-center justify-center p-5 bg-surface-light dark:bg-slate-900">
        <Ionicons name="map" size={64} color={colors.accent[400]} />
        <Text className="text-xl font-JakartaBold text-slate-900 mt-4 text-center">Live Tracking</Text>
        <Text className="text-base font-JakartaMedium text-status-muted mt-2 text-center">
          Map view is only available on mobile devices
        </Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-surface-light dark:bg-slate-900">
      {/* Top safe area spacer - keeps panel below notch/camera */}
      <View style={{ height: insets.top, backgroundColor: colors.accent[200] }} />
      {/* ═══ Swipeable Top Info Section ═══ - shrinks when collapsed so map expands */}
      <View
        style={[
          styles.topSection,
          { height: topPanelExpanded ? PANEL_HEIGHT : COLLAPSED_BAR_HEIGHT },
        ]}
        pointerEvents="box-none"
      >
        {/* Collapsible content (above the handle) */}
        <Animated.View
          style={[
            styles.panelContent,
            {
              transform: [{ translateY: panelTranslateY }],
            },
          ]}
        >
          <View style={styles.statusBarBg}>
            <View style={styles.statusBadge}>
              <View style={[styles.statusDot, { backgroundColor: device?.status === "online" ? colors.status.success : colors.status.muted }]} />
              <Text style={styles.statusBadgeText}>{status}</Text>
            </View>
            <Text style={styles.deviceNameText} numberOfLines={1}>{device?.name || "Tracker"}</Text>
          </View>

          <View style={styles.infoContainer}>
            <View style={styles.leftIcons}>
              <View style={styles.iconButton}>
                <Ionicons name={batteryIcon} size={20} color={batteryColor} />
                <Text style={styles.iconLabel}>Battery</Text>
                <Text style={[styles.iconStatus, { color: batteryColor }]}>
                  {batteryLevel != null ? `${batteryLevel}%` : "--"}
                </Text>
              </View>
              <View style={styles.iconButton}>
                <MaterialCommunityIcons name="key" size={20} color={colors.accent[400]} />
                <Text style={styles.iconLabel}>Ignition</Text>
                <Text style={styles.iconStatus}>
                  {device?.status === "online" ? "On" : "Off"}
                </Text>
              </View>
            </View>

            <View style={styles.speedometerContainer}>
              <Speedometer speed={speed} maxSpeed={120} size="large" />
              <Text style={styles.currentSpeed}>{speed.toFixed(0)} KM/H</Text>
              <View style={styles.distanceRow}>
                <MaterialCommunityIcons name="road-variant" size={16} color={colors.accent[400]} style={{ marginRight: 4 }} />
                <Text style={styles.lastSeenText}>{formatTimeAgo(lastUpdated)}</Text>
              </View>
            </View>

            <View style={styles.rightInfo}>
              <View style={styles.infoCard}>
                <View style={styles.infoRow}>
                  <Text style={styles.infoCardLabel}>{status}</Text>
                  <Ionicons name={device?.status === "online" ? "radio-button-on" : "radio-button-off"} size={14} color={device?.status === "online" ? colors.status.success : colors.status.muted} />
                </View>
              </View>
              <View style={styles.infoCard}>
                <View style={styles.infoRow}>
                  <Text style={styles.infoCardLabel}>Updated</Text>
                  <Ionicons name="time-outline" size={14} color={colors.accent[400]} />
                </View>
                <Text style={styles.infoCardValue}>{formatTimeAgo(lastUpdated)}</Text>
              </View>
              {device?.speed != null && (
                <View style={styles.infoCard}>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoCardLabel}>Speed</Text>
                    <Ionicons name="speedometer-outline" size={14} color={colors.accent[400]} />
                  </View>
                  <Text style={styles.infoCardValue}>{speed.toFixed(0)} km/h</Text>
                </View>
              )}
            </View>
          </View>

          <View style={styles.addressBar}>
            <Ionicons name="location" size={16} color={colors.accent[400]} />
            <Text style={styles.addressText} numberOfLines={1}>{streetName}</Text>
          </View>
        </Animated.View>

        {/* Pill handle + chevron at base of panel - swipeable */}
        <View
          {...topPanelPanResponder.panHandlers}
          style={[styles.panelHandle, { backgroundColor: colors.accent[100] }]}
        >
          <View style={[styles.pill, { backgroundColor: colors.surface.border }]} />
          <TouchableOpacity
            onPress={() => snapTopPanel(!topPanelExpanded)}
            style={styles.chevronBtn}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Ionicons
              name={topPanelExpanded ? "chevron-up" : "chevron-down"}
              size={20}
              color={colors.text.secondary}
            />
          </TouchableOpacity>
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

          {/* Vehicle marker (shared with History - identical circle, arrow, transparency, 3D) */}
          <TrackingMarker
            id="vehicle-marker"
            coordinate={[targetLongitude, targetLatitude]}
            course={displayCourse}
            pitch={pitch}
          />
        </Mapbox.MapView>

        {/* Bottom-right map controls (collapsible, single-hand friendly) */}
        <View style={[styles.mapControls, { bottom: 16 + insets.bottom + TAB_BAR_HEIGHT }]}>
          {controlsExpanded ? (
            <>
              <TouchableOpacity onPress={handleToggleStyle} style={styles.mapControlBtn}>
                <MaterialCommunityIcons name="layers" size={22} color={colors.accent[400]} />
              </TouchableOpacity>
              <TouchableOpacity onPress={handleToggle3D} style={styles.mapControlBtn}>
                <MaterialCommunityIcons name="cube-outline" size={22} color={colors.accent[400]} />
              </TouchableOpacity>
              <TouchableOpacity onPress={handleRecenter} style={styles.mapControlBtn} accessibilityLabel="Recenter">
                <Ionicons name="navigate-circle" size={22} color={colors.accent[400]} />
              </TouchableOpacity>
              <TouchableOpacity onPress={toggleControlsExpanded} style={styles.mapControlBtn} accessibilityLabel="Collapse controls">
                <Ionicons name="remove" size={22} color={colors.accent[400]} />
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity onPress={toggleControlsExpanded} style={styles.mapControlBtn} accessibilityLabel="Expand controls">
              <Ionicons name="add" size={22} color={colors.accent[400]} />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
};

function createTrackingStyles(colors: ReturnType<typeof getThemeColors>) {
  return StyleSheet.create({
  topSection: {
    backgroundColor: colors.accent[200],
    paddingTop: 0,
    overflow: "hidden",
  },
  panelHandle: {
    height: COLLAPSED_BAR_HEIGHT,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 6,
  },
  pill: {
    width: 40,
    height: 5,
    borderRadius: 3,
    marginBottom: 4,
  },
  chevronBtn: {
    padding: 4,
  },
  panelContent: {
    flex: 1,
    overflow: "hidden",
  },
  statusBarBg: {
    height: 44,
    backgroundColor: colors.accent[100],
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface.card,
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
    color: colors.text.secondary,
    fontSize: 11,
    fontWeight: "600",
  },
  deviceNameText: {
    color: colors.text.primary,
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
    color: colors.status.muted,
    marginTop: 2,
    fontWeight: "600",
  },
  iconStatus: {
    fontSize: 10,
    color: colors.text.primary,
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
    color: colors.text.primary,
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
    color: colors.text.secondary,
  },
  rightInfo: {
    width: 90,
    justifyContent: "flex-start",
    gap: 4,
  },
  infoCard: {
    backgroundColor: colors.surface.card,
    borderRadius: 8,
    padding: 6,
    borderWidth: 1,
    borderColor: colors.surface.border,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  infoCardLabel: {
    color: colors.status.muted,
    fontSize: 10,
    fontWeight: "600",
  },
  infoCardValue: {
    color: colors.text.primary,
    fontSize: 11,
    fontWeight: "700",
    marginTop: 2,
  },
  addressBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface.card,
    borderRadius: 10,
    paddingVertical: 6,
    paddingHorizontal: 10,
    marginHorizontal: 12,
    marginTop: 2,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: colors.surface.border,
  },
  addressText: {
    flex: 1,
    color: colors.text.secondary,
    fontSize: 11,
    marginLeft: 6,
    lineHeight: 15,
  },
  map: {
    flex: 1,
  },
  mapControls: {
    position: "absolute",
    right: 16,
    zIndex: 1000,
    elevation: 10,
  },
  mapControlBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surface.card,
    borderWidth: 2,
    borderColor: colors.surface.border,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
});
}

export default Tracking;
