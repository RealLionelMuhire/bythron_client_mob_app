import { fetchAPI } from "@/lib/fetch";
import type { Trip, TripDetail } from "@/types/type";

const headers = { "Content-Type": "application/json" };

export const fetchTrips = async (deviceId: number): Promise<Trip[]> => {
  const data = await fetchAPI(`/api/trips?device_id=${deviceId}`, { headers });
  return Array.isArray(data) ? data : (data?.data ?? data?.trips ?? []);
};

export const fetchTripDetail = async (
  tripId: number,
  deviceId: number
): Promise<TripDetail> => {
  const data = await fetchAPI(`/api/trips/${tripId}?device_id=${deviceId}`, {
    headers,
  });
  return data as TripDetail;
};

export const deleteTrip = async (
  tripId: number,
  deviceId: number
): Promise<void> => {
  await fetchAPI(`/api/trips/${tripId}?device_id=${deviceId}`, {
    method: "DELETE",
    headers,
  });
};

export const startTrip = async (
  deviceId: number,
  name: string
): Promise<Trip> => {
  const data = await fetchAPI("/api/trips/start", {
    method: "POST",
    headers,
    body: JSON.stringify({ device_id: deviceId, name }),
  });
  return data as Trip;
};

export const endTrip = async (
  tripId: number,
  deviceId: number
): Promise<Trip> => {
  const data = await fetchAPI(`/api/trips/${tripId}/end?device_id=${deviceId}`, {
    method: "POST",
    headers,
  });
  return data as Trip;
};
