"use client";

let loading: Promise<void> | null = null;
let authFailed = false;

export const mapsKey = () => process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";
export const mapsAuthFailed = () => authFailed;

/** Loads the Google Maps JS API once. Rejects with a readable message if the key is missing or rejected. */
export function loadMaps(): Promise<void> {
  const key = mapsKey();
  if (!key) return Promise.reject(new Error("Google Maps is not configured (NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is missing)."));
  if (typeof window === "undefined") return Promise.reject(new Error("Maps can only load in the browser."));
  if (loading) return loading;
  loading = new Promise<void>((resolve, reject) => {
    (window as unknown as { gm_authFailure?: () => void }).gm_authFailure = () => {
      authFailed = true;
    };
    const s = document.createElement("script");
    s.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&loading=async&v=weekly`;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => {
      loading = null;
      reject(new Error("Could not load Google Maps. Check your internet connection."));
    };
    document.head.appendChild(s);
  });
  return loading;
}

export const MAPS_AUTH_MESSAGE =
  "Google rejected the Maps key. Enable 'Maps JavaScript API' and 'Geocoding API', turn on billing, and check the key's website restrictions (see README).";
