import React from "react";
import { StyleSheet, View } from "react-native";
import Mapbox from "@rnmapbox/maps";

import { NavigationArrow } from "@/components/NavigationArrow";

const MARKER_SIZE = 30;
const ARROW_SIZE = 27;
const BORDER_WIDTH = 2;

export interface TrackingMarkerProps {
  id: string;
  coordinate: [number, number];
  course: number;
  pitch: number;
}

/**
 * Shared marker for real-time tracking and history playback.
 * Fixed: white circle border, transparent inner, 30x30 size, red arrow.
 */
export const TrackingMarker: React.FC<TrackingMarkerProps> = ({
  id,
  coordinate,
  course,
  pitch,
}) => {
  const shadowOffset = pitch > 0 ? { width: 0 as const, height: 4 } : { width: 0 as const, height: 2 };
  const shadowOpacity = pitch > 0 ? 0.35 : 0.2;
  const shadowRadius = pitch > 0 ? 6 : 3;
  const elevation = pitch > 0 ? 8 : 4;
  const transform: any[] = [{ rotate: `${course}deg` }];
  if (pitch > 0) {
    transform.push({ perspective: 1000 }, { rotateX: "25deg" });
  }

  return (
    <Mapbox.MarkerView
      id={id}
      coordinate={coordinate}
      allowOverlap
      anchor={{ x: 0.5, y: 0.5 }}
    >
      <View
        style={[
          styles.circle,
          {
            shadowOffset,
            shadowOpacity,
            shadowRadius,
            elevation,
            transform,
          },
        ]}
      >
        <NavigationArrow size={ARROW_SIZE} color="#E36060" />
      </View>
    </Mapbox.MarkerView>
  );
};

const styles = StyleSheet.create({
  circle: {
    width: MARKER_SIZE,
    height: MARKER_SIZE,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    borderWidth: BORDER_WIDTH,
    borderColor: "#FFFFFF",
    borderRadius: MARKER_SIZE / 2,
    backgroundColor: "transparent",
    shadowColor: "#000000",
  },
});
