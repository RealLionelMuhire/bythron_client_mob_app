import React, { useEffect, useRef, useState } from "react";
import { View, Text, ActivityIndicator, StyleSheet, TouchableOpacity, Platform, Dimensions } from "react-native";
import Svg, { Circle, Line, Text as SvgText, G, Path } from "react-native-svg";
import Mapbox from "@rnmapbox/maps";
import { useDeviceStore, useLocationStore } from "@/store";
import { Device } from "@/types/type";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";

const { height } = Dimensions.get("window");

// Set Mapbox access token
const accessToken = process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN;
if (accessToken) {
  Mapbox.setAccessToken(accessToken);
}

// Speedometer Component
const Speedometer = ({ speed = 0, maxSpeed = 200 }: { speed: number; maxSpeed?: number }) => {
  const size = 140;
  const strokeWidth = 12;
  const center = size / 2;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  // Speed arc (goes from -135° to 135° = 270° total)
  const startAngle = -135;
  const endAngle = 135;
  const totalAngle = endAngle - startAngle;
  
  // Calculate needle angle based on speed
  const speedPercentage = Math.min(speed / maxSpeed, 1);
  const needleAngle = startAngle + (totalAngle * speedPercentage);
  const needleRad = (needleAngle * Math.PI) / 180;
  
  // Needle coordinates
  const needleLength = radius - 10;
  const needleX = center + needleLength * Math.cos(needleRad);
  const needleY = center + needleLength * Math.sin(needleRad);

  // Create arc path for the gauge background
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
        {/* Background arc */}
        <Path
          d={createArcPath(startAngle, endAngle, radius)}
          stroke="#1E3A52"
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
        />
        
        {/* Active speed arc (blue gradient effect) */}
        <Path
          d={createArcPath(startAngle, needleAngle, radius)}
          stroke="#5BB8E8"
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
        />

        {/* Speed markers */}
        {[0, 50, 100, 150, 200].map((value, index) => {
          const angle = startAngle + (totalAngle * (value / maxSpeed));
          const rad = (angle * Math.PI) / 180;
          const x = center + (radius - 20) * Math.cos(rad);
          const y = center + (radius - 20) * Math.sin(rad);
          
          return (
            <SvgText
              key={value}
              x={x}
              y={y}
              fontSize="10"
              fill="#A8D8F0"
              textAnchor="middle"
              alignmentBaseline="middle"
            >
              {value}
            </SvgText>
          );
        })}

        {/* Center dot */}
        <Circle cx={center} cy={center} r="4" fill="#333" />
        
        {/* Needle */}
        <Line
          x1={center}
          y1={center}
          x2={needleX}
          y2={needleY}
          stroke="white"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <Circle cx={center} cy={center} r="6" fill="white" />
        <Circle cx={center} cy={center} r="3" fill="#5BB8E8" />
      </Svg>
    </View>
  );
};

const Tracking = () => {
  const { devices } = useDeviceStore();
  const { userLatitude, userLongitude } = useLocationStore();
  const cameraRef = useRef<Mapbox.Camera>(null);
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);

  // Select first device by default
  useEffect(() => {
    if (devices && devices.length > 0 && !selectedDevice) {
      setSelectedDevice(devices[0]);
    }
  }, [devices]);

  const device = selectedDevice || devices?.[0];
  const speed = device?.speed || 9;
  const totalDistance = 83337.62; // This would come from device data
  const status = device?.status === "online" ? "Moving" : "Stopped";
  const address = "Worldclasseducations, 308th Rd, Sheikh Zayed Rd, Rd, Dubai, UAE.";

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

  if (!userLatitude || !userLongitude) {
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
      {/* Top Info Section - 1/3 of screen */}
      <View style={[styles.topSection, { height: height * 0.38 }]}>
        {/* Status Bar Background */}
        <View style={styles.statusBarBg} />
        
        {/* Main Info Container */}
        <View style={styles.infoContainer}>
          {/* Left Side Icons */}
          <View style={styles.leftIcons}>
            <View style={styles.iconButton}>
              <Ionicons name="battery-half" size={20} color="#5BB8E8" />
              <Text style={styles.iconLabel}>Battery</Text>
            </View>
            <View style={styles.iconButton}>
              <MaterialCommunityIcons name="wifi" size={20} color="#5BB8E8" />
              <Text style={styles.iconLabel}>Wi/ebites</Text>
            </View>
            <View style={styles.iconButton}>
              <MaterialCommunityIcons name="key" size={20} color="#5BB8E8" />
              <Text style={styles.iconLabel}>Ignition</Text>
            </View>
          </View>

          {/* Center - Speedometer */}
          <View style={styles.speedometerContainer}>
            <Speedometer speed={speed} maxSpeed={200} />
            <Text style={styles.totalDistance}>{totalDistance.toFixed(2)} KM</Text>
            <Text style={styles.currentSpeed}>{speed.toFixed(2)} KM/H</Text>
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

            <View style={styles.infoCard}>
              <View style={styles.infoRow}>
                <Text style={styles.infoDate}>22-05-24</Text>
                <Ionicons name="time-outline" size={16} color="#5BB8E8" />
              </View>
              <Text style={styles.infoLabel}>Last Upd...</Text>
              <Text style={styles.infoTime}>{formatTimeAgo(device?.last_seen)}</Text>
            </View>
          </View>
        </View>

        {/* Address Bar */}
        <View style={styles.addressBar}>
          <Ionicons name="location" size={20} color="#5BB8E8" />
          <Text style={styles.addressText} numberOfLines={2}>
            {address}
          </Text>
        </View>
      </View>

      {/* Map Section - 2/3 of screen */}
      <View style={[styles.mapSection, { height: height * 0.62 }]}>
        <Mapbox.MapView
          style={styles.map}
          styleURL="mapbox://styles/mapbox/dark-v11"
          zoomEnabled={true}
          scrollEnabled={true}
          pitchEnabled={true}
          rotateEnabled={true}
        >
          <Mapbox.Camera
            ref={cameraRef}
            zoomLevel={14}
            centerCoordinate={[userLongitude, userLatitude]}
            animationMode="flyTo"
            animationDuration={1000}
            pitch={45}
          />

          {/* Device Marker */}
          <Mapbox.PointAnnotation
            id="device-marker"
            coordinate={[userLongitude, userLatitude]}
          >
            <View style={styles.carMarker}>
              <Ionicons name="car" size={32} color="white" />
            </View>
          </Mapbox.PointAnnotation>

          {/* Location Pin */}
          <Mapbox.PointAnnotation
            id="location-pin"
            coordinate={[userLongitude + 0.002, userLatitude + 0.002]}
          >
            <View style={styles.locationPin}>
              <Ionicons name="location" size={24} color="#5BB8E8" />
            </View>
          </Mapbox.PointAnnotation>
        </Mapbox.MapView>

        {/* Left Side Menu */}
        <View style={styles.leftMenu}>
          <TouchableOpacity style={styles.menuButton}>
            <MaterialCommunityIcons name="routes" size={24} color="#5BB8E8" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuButton}>
            <Ionicons name="information-circle" size={24} color="#5BB8E8" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuButton}>
            <MaterialCommunityIcons name="map-marker" size={24} color="#5BB8E8" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuButton}>
            <Ionicons name="car-sport" size={24} color="#5BB8E8" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuButton}>
            <Ionicons name="refresh" size={24} color="#5BB8E8" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuButton}>
            <Ionicons name="cube" size={24} color="#5BB8E8" />
          </TouchableOpacity>
        </View>

        {/* Right Side Menu Button */}
        <TouchableOpacity style={styles.rightMenuButton}>
          <Ionicons name="ellipsis-vertical" size={24} color="white" />
        </TouchableOpacity>

        {/* Bottom Navigation */}
        <View style={styles.bottomNav}>
          <TouchableOpacity style={styles.navButton}>
            <Ionicons name="time-outline" size={28} color="#A8D8F0" />
            <Text style={styles.navText}>History</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.navButton}>
            <MaterialCommunityIcons name="swap-horizontal" size={28} color="#A8D8F0" />
            <Text style={styles.navText}>Command</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={[styles.navButton, styles.navButtonActive]}>
            <Ionicons name="notifications" size={28} color="white" />
            <Text style={[styles.navText, styles.navTextActive]}>Alerts</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.navButton}>
            <Ionicons name="settings-outline" size={28} color="#A8D8F0" />
            <Text style={styles.navText}>Settings</Text>
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
    height: 50,
    backgroundColor: "#5BB8E8",
    opacity: 0.8,
  },
  infoContainer: {
    flexDirection: "row",
    paddingHorizontal: 15,
    paddingTop: 10,
    paddingBottom: 10,
  },
  leftIcons: {
    width: 70,
    justifyContent: "space-around",
  },
  iconButton: {
    alignItems: "center",
    marginBottom: 15,
  },
  iconLabel: {
    fontSize: 9,
    color: "#5BB8E8",
    marginTop: 2,
    fontWeight: "600",
  },
  speedometerContainer: {
    flex: 1,
    alignItems: "center",
    paddingTop: 5,
  },
  totalDistance: {
    fontSize: 18,
    fontWeight: "bold",
    color: "white",
    marginTop: 5,
  },
  currentSpeed: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#5BB8E8",
    marginTop: 2,
  },
  rightInfo: {
    width: 120,
    justifyContent: "space-around",
  },
  statusCard: {
    backgroundColor: "rgba(30, 58, 82, 0.6)",
    borderRadius: 8,
    padding: 8,
    borderWidth: 1,
    borderColor: "#5BB8E8",
    marginBottom: 8,
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
    fontSize: 16,
    fontWeight: "bold",
    marginTop: 4,
  },
  infoCard: {
    backgroundColor: "rgba(30, 58, 82, 0.6)",
    borderRadius: 8,
    padding: 8,
    borderWidth: 1,
    borderColor: "#5BB8E8",
    marginBottom: 8,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  infoDate: {
    color: "white",
    fontSize: 11,
    fontWeight: "600",
  },
  infoLabel: {
    color: "#A8D8F0",
    fontSize: 10,
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
    borderRadius: 12,
    padding: 12,
    marginHorizontal: 15,
    marginTop: 5,
    borderWidth: 1,
    borderColor: "#5BB8E8",
  },
  addressText: {
    flex: 1,
    color: "#A8D8F0",
    fontSize: 11,
    marginLeft: 8,
    lineHeight: 16,
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
    backgroundColor: "rgba(26, 42, 58, 0.9)",
    borderWidth: 2,
    borderColor: "#5BB8E8",
    alignItems: "center",
    justifyContent: "center",
  },
  bottomNav: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 80,
    backgroundColor: "rgba(26, 42, 58, 0.95)",
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: "#5BB8E8",
  },
  navButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
  },
  navButtonActive: {
    backgroundColor: "#5BB8E8",
  },
  navText: {
    color: "#A8D8F0",
    fontSize: 11,
    marginTop: 4,
    fontWeight: "600",
  },
  navTextActive: {
    color: "white",
  },
});

export default Tracking;
