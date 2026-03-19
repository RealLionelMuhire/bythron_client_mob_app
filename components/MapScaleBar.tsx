import React, { useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";

/**
 * Web Mercator: meters per pixel at equator for zoom 0
 * Formula: 1 px = (2 * pi * 6378137) / 256 / 2^zoom at equator
 * At other latitudes: divide by cos(lat)
 */
const METERS_PER_PX_ZOOM0_EQUATOR = 156543.03392;

export interface MapScaleBarProps {
  zoomLevel: number;
  latitude: number;
  barWidthPx?: number;
  textColor?: string;
  lineColor?: string;
  backgroundColor?: string;
  style?: object;
}

/**
 * Custom scale bar that always displays distances in meters (metric).
 * Uses Web Mercator projection to compute real-world scale.
 */
export const MapScaleBar: React.FC<MapScaleBarProps> = ({
  zoomLevel,
  latitude,
  barWidthPx = 80,
  textColor = "#64748b",
  lineColor = "#64748b",
  backgroundColor = "rgba(255,255,255,0.85)",
  style,
}) => {
  const { distanceM, barPx, label } = useMemo(() => {
    const latRad = (latitude * Math.PI) / 180;
    const cosLat = Math.max(0.001, Math.cos(latRad));
    const metersPerPx =
      (METERS_PER_PX_ZOOM0_EQUATOR * cosLat) / Math.pow(2, zoomLevel);

    // Target: bar represents a "nice" round distance
    const possibleDistances = [
      5, 10, 25, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000, 50000,
      100000,
    ];
    const maxBarPx = barWidthPx;
    const maxDistanceM = maxBarPx * metersPerPx;

    let chosenDistanceM = possibleDistances[0];
    for (const d of possibleDistances) {
      if (d <= maxDistanceM && (d / metersPerPx) <= maxBarPx) {
        chosenDistanceM = d;
      }
    }

    const barPx = Math.round(chosenDistanceM / metersPerPx);
    const label =
      chosenDistanceM >= 1000
        ? `${chosenDistanceM / 1000} km`
        : `${chosenDistanceM} m`;

    return { distanceM: chosenDistanceM, barPx, label };
  }, [zoomLevel, latitude, barWidthPx]);

  return (
    <View style={[styles.container, { backgroundColor }, style]}>
      <View style={[styles.barRow, { width: barPx }]}>
        <View style={[styles.barSegment, styles.barLeft, { borderColor: lineColor }]} />
        <View style={[styles.barSegment, styles.barRight, { borderColor: lineColor }]} />
      </View>
      <Text style={[styles.label, { color: textColor }]}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 4,
    alignItems: "flex-start",
  },
  barRow: {
    flexDirection: "row",
    height: 4,
  },
  barSegment: {
    flex: 1,
    borderTopWidth: 2,
  },
  barLeft: {
    borderTopLeftRadius: 1,
    borderTopRightRadius: 0,
  },
  barRight: {
    borderTopLeftRadius: 0,
    borderTopRightRadius: 1,
  },
  label: {
    fontSize: 10,
    fontWeight: "600",
    marginTop: 2,
  },
});
