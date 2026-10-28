"use client";

import { useEffect, useRef, useState } from "react";
import { MAPS_AUTH_MESSAGE, loadMaps, mapsAuthFailed } from "./maps";

/** Read-only map with a marker. Falls back to a message if Maps is not configured. */
export default function MapView({ lat, lng, title }: { lat: number; lng: number; title?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await loadMaps();
        const { Map } = (await google.maps.importLibrary("maps")) as google.maps.MapsLibrary;
        const { Marker } = (await google.maps.importLibrary("marker")) as google.maps.MarkerLibrary;
        if (cancelled || !ref.current) return;
        const map = new Map(ref.current, {
          center: { lat, lng },
          zoom: 16,
          mapTypeId: "hybrid",
          streetViewControl: false,
          fullscreenControl: true,
        });
        new Marker({ position: { lat, lng }, map, title });
        setTimeout(() => mapsAuthFailed() && !cancelled && setError(MAPS_AUTH_MESSAGE), 2500);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Map failed to load.");
      }
    })();
    return () => { cancelled = true; };
  }, [lat, lng, title]);

  if (error) return <p className="rounded-xl bg-amber-50 p-4 text-sm text-amber-800">{error}</p>;
  return <div ref={ref} className="h-64 w-full overflow-hidden rounded-xl bg-stone-100 md:h-80" />;
}
