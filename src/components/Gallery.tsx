"use client";

import { useCallback, useEffect, useState } from "react";

type Photo = { id: string; fileName: string };

/** Photo grid with a simple full-screen viewer (prev / next / close, keyboard friendly). */
export default function Gallery({ photos }: { photos: Photo[] }) {
  const [open, setOpen] = useState<number | null>(null);
  const close = useCallback(() => setOpen(null), []);
  const step = useCallback((d: number) => setOpen((i) => (i === null ? i : (i + d + photos.length) % photos.length)), [photos.length]);

  useEffect(() => {
    if (open === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "ArrowRight") step(1);
      if (e.key === "ArrowLeft") step(-1);
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [open, close, step]);

  if (photos.length === 0) return null;
  return (
    <>
      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
        {photos.map((p, i) => (
          <li key={p.id}>
            <button type="button" onClick={() => setOpen(i)} className="block aspect-square w-full overflow-hidden rounded-xl bg-stone-100" aria-label={`Open photo ${i + 1}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/api/media/${p.id}`} alt={p.fileName} loading="lazy" className="h-full w-full object-cover" />
            </button>
          </li>
        ))}
      </ul>

      {open !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90" role="dialog" aria-modal="true" onClick={close}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`/api/media/${photos[open].id}`} alt={photos[open].fileName} className="max-h-[88vh] max-w-full object-contain" onClick={(e) => e.stopPropagation()} />
          <button onClick={close} aria-label="Close" className="absolute right-3 top-3 h-12 w-12 rounded-full bg-white/15 text-2xl text-white">×</button>
          {photos.length > 1 && (
            <>
              <button onClick={(e) => { e.stopPropagation(); step(-1); }} aria-label="Previous" className="absolute left-2 h-12 w-12 rounded-full bg-white/15 text-2xl text-white">‹</button>
              <button onClick={(e) => { e.stopPropagation(); step(1); }} aria-label="Next" className="absolute right-2 h-12 w-12 rounded-full bg-white/15 text-2xl text-white">›</button>
              <p className="absolute bottom-4 text-sm text-white/80">{open + 1} / {photos.length}</p>
            </>
          )}
        </div>
      )}
    </>
  );
}
