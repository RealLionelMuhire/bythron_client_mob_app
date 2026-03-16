/**
 * Shared route geometry and normalization utilities for history playback.
 */

export type RouteFeature = {
  type: "Feature";
  geometry: {
    type: "Point";
    coordinates: [number, number];
  };
  properties?: Record<string, unknown>;
};

export type RouteFeatureCollection = {
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

export type RouteLineFeature = {
  type: "Feature";
  geometry: {
    type: "LineString";
    coordinates: [number, number][];
  };
  properties?: Record<string, unknown>;
};

const toRad = (value: number) => (value * Math.PI) / 180;

export const haversineMeters = (a: [number, number], b: [number, number]) => {
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

export const bearingDegrees = (from: [number, number], to: [number, number]) => {
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

export const toNumberOrNull = (value: unknown) => {
  const num = typeof value === "number" ? value : Number(value);
  return Number.isFinite(num) ? num : null;
};

const normalizeBearing = (value: number) => {
  return ((value % 360) + 360) % 360;
};

export const interpolateBearing = (from: number, to: number, t: number) => {
  const start = normalizeBearing(from);
  const end = normalizeBearing(to);
  let delta = end - start;
  if (delta > 180) delta -= 360;
  if (delta < -180) delta += 360;
  return normalizeBearing(start + delta * t);
};

export const interpolateLine = (coords: [number, number][], stepMeters: number) => {
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

/**
 * Add bearing (course) to route features. Calculates from consecutive points if missing.
 */
export const addBearingToFeatures = (features: RouteFeature[]): RouteFeature[] => {
  return features.map((feature, idx) => {
    let course = toNumberOrNull(feature.properties?.course);
    if ((course == null || !Number.isFinite(course)) && idx < features.length - 1) {
      course = bearingDegrees(
        feature.geometry.coordinates,
        features[idx + 1].geometry.coordinates
      );
    }
    return {
      ...feature,
      properties: { ...feature.properties, course: course ?? 0 },
    };
  });
};
