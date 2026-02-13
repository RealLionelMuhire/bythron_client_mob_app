import { useState, useEffect, useCallback } from "react";

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

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await fetchAPI(url, options);
      setData(result);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [url, options]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
};
