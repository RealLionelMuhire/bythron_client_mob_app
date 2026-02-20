import { useState, useEffect, useCallback, useRef } from "react";

const CACHE_TTL_MS = 30_000; // 30 seconds
const cache = new Map<string, { data: unknown; at: number }>();

export const fetchAPI = async (url: string, options?: RequestInit) => {
  try {
    const baseUrl = process.env.EXPO_PUBLIC_API_BASE_URL;
    const isLocalApiRoute = url.startsWith("/(api)");
    if (!baseUrl && !url.startsWith("http") && !isLocalApiRoute) {
      throw new Error("Missing EXPO_PUBLIC_API_BASE_URL for relative API request");
    }
    const normalizedPath = isLocalApiRoute ? url.replace("/(api)", "/api") : url;
    const fullUrl = url.startsWith("http") || isLocalApiRoute ? normalizedPath : `${baseUrl}${normalizedPath}`;
    const response = await fetch(fullUrl, options);
    const contentType = response.headers.get("content-type") || "";
    const isJson = contentType.includes("application/json");

    if (!response.ok) {
      const errorBody = isJson ? await response.json() : await response.text();
      const errorPayload = typeof errorBody === "string" ? errorBody : JSON.stringify(errorBody);
      throw new Error(`HTTP ${response.status} (${fullUrl}): ${errorPayload}`);
    }

    if (!isJson) {
      const text = await response.text();
      throw new Error(`Expected JSON but got: ${text.slice(0, 200)}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Fetch error:", error);
    throw error;
  }
};

export const useFetch = <T>(url: string, options?: RequestInit) => {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const fetchData = useCallback(async (bypassCache = false) => {
    setLoading(true);
    setError(null);

    if (!bypassCache) {
      const hit = cache.get(url);
      if (hit && Date.now() - hit.at < CACHE_TTL_MS) {
        setData(hit.data as T);
        setLoading(false);
        return;
      }
    }

    try {
      const result = await fetchAPI(url, optionsRef.current);
      cache.set(url, { data: result, at: Date.now() });
      setData(result as T);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [url]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const refetch = useCallback(() => fetchData(true), [fetchData]);
  return { data, loading, error, refetch };
};
