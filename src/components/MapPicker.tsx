"use client";

import { useEffect, useRef, useState } from "react";
import { MAPS_AUTH_MESSAGE, loadMaps, mapsAuthFailed } from "./maps";

type Props = {
  lat: string;
  lng: string;
  onChange: (lat: string, lng: string) => void;
  /** Called when a search resolves, so the form can pre-fill state/district/locality if they are empty. */
  onGeocode?: (parts: { state?: string; district?: string; locality?: string }) => void;
  initialQuery?: string;
};

const INDIA = { lat: 22.9, lng: 79.6 };

export default function MapPicker({ lat, lng, onChange, onGeocode, initialQuery }: Props) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<google.maps.Map | null>(null);
  const marker = useRef<google.maps.Marker | null>(null);
  const geocoder = useRef<google.maps.Geocoder | null>(null);
  const cb = useRef({ onChange, onGeocode });
  cb.current = { onChange, onGeocode };

  const [query, setQuery] = useState(initialQuery ?? "");
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const place = (la: number, ln: number, zoom?: number) => {
    const pos = { lat: la, lng: ln };
    marker.current?.setPosition(pos);
    marker.current?.setMap(map.current);
    map.current?.panTo(pos);
    if (zoom) map.current?.setZoom(zoom);
  };

  // Initialise the map once.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await loadMaps();
        const { Map } = (await google.maps.importLibrary("maps")) as google.maps.MapsLibrary;
        const { Marker } = (await google.maps.importLibrary("marker")) as google.maps.MarkerLibrary;
        const { Geocoder } = (await google.maps.importLibrary("geocoding")) as google.maps.GeocodingLibrary;
        if (cancelled || !el.current) return;
        const la = parseFloat(lat), ln = parseFloat(lng);
        const has = Number.isFinite(la) && Number.isFinite(ln);
        map.current = new Map(el.current, {
          center: has ? { lat: la, lng: ln } : INDIA,
          zoom: has ? 16 : 5,
          mapTypeId: "hybrid",
          streetViewControl: false,
          fullscreenControl: true,
          gestureHandling: "greedy",
        });
        marker.current = new Marker({ position: has ? { lat: la, lng: ln } : INDIA, map: has ? map.current : null, draggable: true });
        geocoder.current = new Geocoder();
        map.current.addListener("click", (e: google.maps.MapMouseEvent) => {
          if (!e.latLng) return;
          marker.current?.setMap(map.current);
          marker.current?.setPosition(e.latLng);
          cb.current.onChange(e.latLng.lat().toFixed(6), e.latLng.lng().toFixed(6));
        });
        marker.current.addListener("dragend", () => {
          const p = marker.current?.getPosition();
          if (p) cb.current.onChange(p.lat().toFixed(6), p.lng().toFixed(6));
        });
        setReady(true);
        setTimeout(() => mapsAuthFailed() && !cancelled && setError(MAPS_AUTH_MESSAGE), 2500);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Map failed to load.");
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep the marker in sync when lat/lng are typed manually.
  useEffect(() => {
    if (!ready) return;
    const la = parseFloat(lat), ln = parseFloat(lng);
    if (Number.isFinite(la) && Number.isFinite(ln) && la >= -90 && la <= 90 && ln >= -180 && ln <= 180) place(la, ln);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lat, lng, ready]);

  async function search() {
    const q = query.trim();
    if (!q || !geocoder.current) return;
    setMsg("Searching…");
    try {
      const { results } = await geocoder.current.geocode({ address: q, region: "in" });
      const r = results[0];
      if (!r) { setMsg("No place found. Try a village or district name, or tap the map."); return; }
      const loc = r.geometry.location;
      place(loc.lat(), loc.lng(), 15);
      cb.current.onChange(loc.lat().toFixed(6), loc.lng().toFixed(6));
      const get = (t: string) => r.address_components.find((c) => c.types.includes(t))?.long_name;
      cb.current.onGeocode?.({
        state: get("administrative_area_level_1"),
        district: get("administrative_area_level_3") ?? get("administrative_area_level_2"),
        locality: get("sublocality") ?? get("locality"),
      });
      setMsg(`Found: ${r.formatted_address}. Tap the map or drag the pin to fine-tune.`);
    } catch {
      setMsg("Search failed. Check that the Geocoding API is enabled for your key, or tap the map instead.");
    }
  }

  function useMyLocation() {
    if (!navigator.geolocation) { setMsg("This device does not support location."); return; }
    setMsg("Getting your location…");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        place(pos.coords.latitude, pos.coords.longitude, 17);
        cb.current.onChange(pos.coords.latitude.toFixed(6), pos.coords.longitude.toFixed(6));
        setMsg("Pin placed at your current location.");
      },
      () => setMsg("Could not get your location. Allow location access, or tap the map."),
      { enableHighAccuracy: true, timeout: 15000 },
    );
  }

  return (
    <div className="space-y-3">
      {error ? (
        <p className="rounded-xl bg-amber-50 p-4 text-sm text-amber-800">
          {error} <span className="block mt-1">You can still type the latitude and longitude below.</span>
        </p>
      ) : (
        <>
          <div className="flex gap-2">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void search(); } }}
              placeholder="Search a place, village or landmark"
              className="input"
              aria-label="Search location"
            />
            <button type="button" onClick={() => void search()} disabled={!ready} className="btn-primary shrink-0">Search</button>
          </div>
          <button type="button" onClick={useMyLocation} disabled={!ready} className="btn-secondary w-full sm:w-auto">
            📍 Use my current location
          </button>
          <div ref={el} className="h-72 w-full overflow-hidden rounded-xl bg-stone-100 md:h-96" />
          <p className="hint">Tap anywhere on the map to drop the pin. Drag the pin to adjust it.</p>
          {msg && <p className="text-sm text-stone-700" role="status">{msg}</p>}
        </>
      )}
    </div>
  );
}
