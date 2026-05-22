/**
 * lib/fetch.ts
 *
 * Central HTTP utility for the BYThron mobile app.
 *
 * Auth pattern
 * ────────────
 * Call `setAuthTokenGetter(getToken)` once — from (root)/_layout.tsx after
 * Clerk has initialised. After that, every `fetchAPI` and `useFetch` call
 * automatically attaches `Authorization: Bearer <token>` without callers
 * needing to think about it.
 *
 * Open endpoints (e.g. /api/auth/sync) are handled transparently: if the
 * token getter returns null the header is simply omitted, which is correct
 * for those unauthenticated routes.
 */

import { useState, useEffect, useCallback, useRef } from "react";

// ── Auth token registry ────────────────────────────────────────────────────

type TokenGetter = () => Promise<string | null>;

let _getToken: TokenGetter | null = null;

/**
 * Register the Clerk `getToken` function so fetchAPI can attach it
 * automatically to every request.  Call this once from (root)/_layout.tsx.
 */
export function setAuthTokenGetter(fn: TokenGetter): void {
  _getToken = fn;
}

/** Resolve the current Bearer token, or null if not available. */
async function resolveToken(): Promise<string | null> {
  if (!_getToken) return null;
  try {
    return await _getToken();
  } catch {
    return null;
  }
}

// ── Response cache ─────────────────────────────────────────────────────────

const CACHE_TTL_MS = 30_000; // 30 seconds

// Cache key includes the URL only (not the token) — POST/mutation calls
// bypass the cache entirely via the useFetch `bypassCache` flag.
// This is acceptable because tokens are short-lived bearer tokens and
// the cache is only used for GET reads; a stale token would cause a
// throw before we'd ever serve a stale 401 from cache.
const cache = new Map<string, { data: unknown; at: number }>();

// ── Core fetch function ────────────────────────────────────────────────────

export const fetchAPI = async (url: string, options?: RequestInit, _retrying = false): Promise<any> => {
  try {
    const baseUrl = process.env.EXPO_PUBLIC_API_BASE_URL;
    const isLocalApiRoute = url.startsWith("/(api)");
    if (!baseUrl && !url.startsWith("http") && !isLocalApiRoute) {
      throw new Error("Missing EXPO_PUBLIC_API_BASE_URL for relative API request");
    }
    const normalizedPath = isLocalApiRoute ? url.replace("/(api)", "/api") : url;
    const fullUrl = url.startsWith("http") || isLocalApiRoute ? normalizedPath : `${baseUrl}${normalizedPath}`;

    // ── Inject auth header ────────────────────────────────────────────────
    const token = await resolveToken();
    const authHeader: Record<string, string> = token
      ? { Authorization: `Bearer ${token}` }
      : {};

    // Merge caller-supplied headers on top of the auth header so callers
    // can override if they need to (e.g. Content-Type).
    const mergedOptions: RequestInit = {
      ...options,
      headers: {
        ...authHeader,
        ...(options?.headers ?? {}),
      },
    };
    // ─────────────────────────────────────────────────────────────────────

    const response = await fetch(fullUrl, mergedOptions);
    const contentType = response.headers.get("content-type") || "";
    const isJson = contentType.includes("application/json");

    // ── 401 handling: evict stale cache entry and retry once ──────────────
    if (response.status === 401 && !_retrying) {
      cache.delete(url);
      return fetchAPI(url, options, true);
    }
    // ─────────────────────────────────────────────────────────────────────

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


// ── React hook ─────────────────────────────────────────────────────────────

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
