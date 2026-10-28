"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { deleteMedia, saveProperty, setCover } from "@/app/actions";
import { AREA_UNITS, STATUSES, formatPrice, mapsUrl, unitLabel } from "@/lib/format";
import type { PropertyInput } from "@/lib/validate";
import MapPicker from "./MapPicker";
import { uploadMedia } from "./upload";

type MediaItem = { id: string; fileName: string; fileType: "photo" | "video"; isCover: boolean };
type InitialProperty = Partial<PropertyInput> & { id: string; propertyCode: string };
type QueueItem = { key: string; file: File; preview: string | null; state: "queued" | "uploading" | "error"; pct: number; error?: string };

const EMPTY: PropertyInput = {
  title: "", description: "", status: "available", askingPrice: "", landArea: "", areaUnit: "decimal",
  state: "", district: "", locality: "", address: "", latitude: "", longitude: "",
  contactName: "", contactPhone: "", whatsappNumber: "", internalNotes: "",
};

export default function PropertyForm({
  property,
  media = [],
  driveReady,
  driveMessage,
}: {
  property?: InitialProperty;
  media?: MediaItem[];
  driveReady: boolean;
  driveMessage: string;
}) {
  const router = useRouter();
  const [v, setV] = useState<PropertyInput>({ ...EMPTY, ...(property ?? {}) });
  const [savedId, setSavedId] = useState<string | null>(property?.id ?? null);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const photoInput = useRef<HTMLInputElement>(null);
  const videoInput = useRef<HTMLInputElement>(null);

  const set = (k: keyof PropertyInput) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setV((p) => ({ ...p, [k]: e.target.value }));

  const perUnit = useMemo(() => {
    const price = Number(v.askingPrice.replace(/,/g, ""));
    const area = Number(v.landArea.replace(/,/g, ""));
    if (!price || !area) return null;
    return `${formatPrice(Math.round((price / area) * 100) / 100)} per ${unitLabel(v.areaUnit)}`;
  }, [v.askingPrice, v.landArea, v.areaUnit]);

  useEffect(() => () => queue.forEach((q) => q.preview && URL.revokeObjectURL(q.preview)), []); // eslint-disable-line react-hooks/exhaustive-deps

  function addFiles(files: FileList | null, kind: "image" | "video") {
    if (!files) return;
    const items: QueueItem[] = Array.from(files)
      .filter((f) => f.type.startsWith(kind + "/"))
      .map((file) => ({
        key: `${file.name}-${file.size}-${Math.random().toString(36).slice(2)}`,
        file,
        preview: kind === "image" ? URL.createObjectURL(file) : null,
        state: "queued" as const,
        pct: 0,
      }));
    setQueue((q) => [...q, ...items]);
    if (photoInput.current) photoInput.current.value = "";
    if (videoInput.current) videoInput.current.value = "";
  }

  const patchQueue = (key: string, patch: Partial<QueueItem>) =>
    setQueue((q) => q.map((i) => (i.key === key ? { ...i, ...patch } : i)));

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    setMediaError(null);

    const res = await saveProperty(savedId, v);
    if (!res.ok) { setError(res.error); setBusy(false); window.scrollTo({ top: 0, behavior: "smooth" }); return; }
    setSavedId(res.id);

    // Upload one by one (keeps the per-property Drive folder creation race-free).
    let failed = 0;
    for (const item of queue) {
      patchQueue(item.key, { state: "uploading", pct: 0, error: undefined });
      try {
        await uploadMedia(res.id, item.file, (pct) => patchQueue(item.key, { pct }));
        setQueue((q) => q.filter((i) => i.key !== item.key));
      } catch (err) {
        failed++;
        patchQueue(item.key, { state: "error", error: err instanceof Error ? err.message : "Upload failed." });
      }
    }
    setBusy(false);
    if (failed) {
      setMediaError(`Property saved, but ${failed} file${failed > 1 ? "s" : ""} did not upload. Fix the problem and press Save again to retry, or remove them.`);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    router.push(`/properties/${res.id}`);
    router.refresh();
  }

  async function onCover(id: string) {
    const r = await setCover(id);
    if (!r.ok) setMediaError(r.error);
    router.refresh();
  }
  async function onDeleteMedia(id: string) {
    if (!confirm("Remove this file? It will also be deleted from Google Drive.")) return;
    const r = await deleteMedia(id);
    if (!r.ok) setMediaError(r.error);
    router.refresh();
  }

  const mapLink = mapsUrl(parseFloat(v.latitude), parseFloat(v.longitude));
  const isEdit = !!property;

  return (
    <form onSubmit={onSubmit} className="space-y-6 pb-24 md:pb-4">
      {(error || mediaError) && (
        <div role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{error ?? mediaError}</div>
      )}

      <section className="card space-y-4">
        <h2 className="section-title !mb-0">Basic information</h2>
        <div>
          <label className="label" htmlFor="title">Property title *</label>
          <input id="title" required maxLength={200} value={v.title} onChange={set("title")} className="input" placeholder="e.g. 5 Katha farm land near NH-31" />
        </div>
        <div>
          <label className="label">Property ID</label>
          <input disabled value={property?.propertyCode ?? "Generated automatically when you save"} className="input" readOnly />
        </div>
        <div>
          <label className="label" htmlFor="description">Description</label>
          <textarea id="description" rows={4} maxLength={5000} value={v.description} onChange={set("description")} className="input" placeholder="Road access, soil, water, nearby landmarks…" />
        </div>
        <div>
          <label className="label" htmlFor="status">Status</label>
          <select id="status" value={v.status} onChange={set("status")} className="input">
            {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>
      </section>

      <section className="card space-y-4">
        <h2 className="section-title !mb-0">Price and area</h2>
        <div>
          <label className="label" htmlFor="price">Asking price (₹)</label>
          <input id="price" inputMode="decimal" value={v.askingPrice} onChange={set("askingPrice")} className="input" placeholder="e.g. 1250000" />
          {v.askingPrice && <p className="hint">{formatPrice(v.askingPrice.replace(/,/g, ""))}</p>}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="area">Land area</label>
            <input id="area" inputMode="decimal" value={v.landArea} onChange={set("landArea")} className="input" placeholder="e.g. 5" />
          </div>
          <div>
            <label className="label" htmlFor="unit">Unit</label>
            <select id="unit" value={v.areaUnit} onChange={set("areaUnit")} className="input">
              {AREA_UNITS.map((u) => <option key={u.value} value={u.value}>{u.label}</option>)}
            </select>
          </div>
        </div>
        {perUnit && <p className="rounded-xl bg-brand-50 px-4 py-3 text-sm font-medium text-brand-800">≈ {perUnit}</p>}
      </section>

      <section className="card space-y-4">
        <h2 className="section-title !mb-0">Location</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="label" htmlFor="state">State</label>
            <input id="state" value={v.state} onChange={set("state")} className="input" />
          </div>
          <div>
            <label className="label" htmlFor="district">District</label>
            <input id="district" value={v.district} onChange={set("district")} className="input" />
          </div>
          <div>
            <label className="label" htmlFor="locality">Village / locality</label>
            <input id="locality" value={v.locality} onChange={set("locality")} className="input" />
          </div>
        </div>
        <div>
          <label className="label" htmlFor="address">Address or nearby landmark</label>
          <input id="address" value={v.address} onChange={set("address")} className="input" />
        </div>

        <div>
          <p className="label">Google Maps location</p>
          <MapPicker
            lat={v.latitude}
            lng={v.longitude}
            initialQuery={[property?.locality, property?.district, property?.state].filter(Boolean).join(", ")}
            onChange={(latitude, longitude) => setV((p) => ({ ...p, latitude, longitude }))}
            onGeocode={(g) =>
              setV((p) => ({ ...p, state: p.state || g.state || "", district: p.district || g.district || "", locality: p.locality || g.locality || "" }))
            }
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="lat">Latitude</label>
            <input id="lat" inputMode="decimal" value={v.latitude} onChange={set("latitude")} className="input" placeholder="25.594100" />
          </div>
          <div>
            <label className="label" htmlFor="lng">Longitude</label>
            <input id="lng" inputMode="decimal" value={v.longitude} onChange={set("longitude")} className="input" placeholder="85.137600" />
          </div>
        </div>
        {mapLink ? (
          <a href={mapLink} target="_blank" rel="noopener noreferrer" className="btn-secondary w-full sm:w-auto">🗺 Open in Google Maps</a>
        ) : (
          <p className="hint">Pick a point on the map to enable “Open in Google Maps”.</p>
        )}
      </section>

      <section className="card space-y-4">
        <h2 className="section-title !mb-0">Contact information</h2>
        <div>
          <label className="label" htmlFor="cname">Contact person</label>
          <input id="cname" value={v.contactName} onChange={set("contactName")} className="input" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="phone">Phone number</label>
            <input id="phone" type="tel" inputMode="tel" value={v.contactPhone} onChange={set("contactPhone")} className="input" placeholder="98765 43210" />
          </div>
          <div>
            <label className="label" htmlFor="wa">WhatsApp number (if different)</label>
            <input id="wa" type="tel" inputMode="tel" value={v.whatsappNumber} onChange={set("whatsappNumber")} className="input" />
          </div>
        </div>
      </section>

      <section className="card space-y-4">
        <h2 className="section-title !mb-0">Photos and videos</h2>

        {!driveReady && (
          <div className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900">
            <p className="font-semibold">Uploads are turned off</p>
            <p className="mt-1">{driveMessage}</p>
          </div>
        )}

        {media.length > 0 && (
          <div>
            <p className="label">Saved files</p>
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {media.map((m) => (
                <li key={m.id} className="overflow-hidden rounded-xl border border-stone-200">
                  <div className="relative aspect-square bg-stone-100">
                    {m.fileType === "photo" ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={`/api/media/${m.id}`} alt={m.fileName} loading="lazy" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full flex-col items-center justify-center gap-1 text-stone-500"><span className="text-3xl">🎬</span><span className="px-2 text-center text-xs">{m.fileName}</span></div>
                    )}
                    {m.isCover && <span className="absolute left-2 top-2 rounded-full bg-brand-700 px-2 py-0.5 text-xs font-semibold text-white">Cover</span>}
                  </div>
                  <div className="flex gap-1 p-2">
                    {m.fileType === "photo" && !m.isCover && (
                      <button type="button" onClick={() => void onCover(m.id)} className="flex-1 rounded-lg bg-stone-100 px-2 py-2 text-xs font-semibold">Set cover</button>
                    )}
                    <button type="button" onClick={() => void onDeleteMedia(m.id)} className="flex-1 rounded-lg bg-red-50 px-2 py-2 text-xs font-semibold text-red-700">Remove</button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          <button type="button" disabled={!driveReady || busy} onClick={() => photoInput.current?.click()} className="btn-secondary">📷 Add photos</button>
          <button type="button" disabled={!driveReady || busy} onClick={() => videoInput.current?.click()} className="btn-secondary">🎬 Add videos</button>
        </div>
        <input ref={photoInput} type="file" accept="image/*" multiple hidden onChange={(e) => addFiles(e.target.files, "image")} />
        <input ref={videoInput} type="file" accept="video/*" multiple hidden onChange={(e) => addFiles(e.target.files, "video")} />

        {queue.length > 0 && (
          <ul className="space-y-2">
            {queue.map((q) => (
              <li key={q.key} className="flex items-center gap-3 rounded-xl border border-stone-200 p-2">
                <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-stone-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {q.preview ? <img src={q.preview} alt="" className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-xl">🎬</div>}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{q.file.name}</p>
                  {q.state === "uploading" && (
                    <div className="mt-1 h-2 overflow-hidden rounded-full bg-stone-200"><div className="h-full bg-brand-600" style={{ width: `${q.pct}%` }} /></div>
                  )}
                  {q.state === "queued" && <p className="text-xs text-stone-500">Will upload when you save</p>}
                  {q.state === "error" && <p className="text-xs text-red-700">{q.error}</p>}
                </div>
                {!busy && (
                  <button type="button" aria-label="Remove from list" onClick={() => setQueue((x) => x.filter((i) => i.key !== q.key))} className="px-3 py-2 text-xl text-stone-500">×</button>
                )}
              </li>
            ))}
          </ul>
        )}
        <p className="hint">Photos are resized automatically. The first photo you add becomes the cover; you can change it any time.</p>
      </section>

      <section className="card space-y-2">
        <h2 className="section-title !mb-0">Internal notes</h2>
        <textarea rows={4} maxLength={5000} value={v.internalNotes} onChange={set("internalNotes")} className="input" placeholder="Owner details, negotiation notes, documents status…" aria-label="Internal notes" />
        <p className="hint">🔒 Private. Never shown on public pages or in shared messages.</p>
      </section>

      <div className="fixed inset-x-0 bottom-16 z-20 border-t border-stone-200 bg-white/95 p-3 backdrop-blur md:static md:z-auto md:border-0 md:bg-transparent md:p-0">
        <div className="mx-auto flex max-w-5xl gap-3">
          <button type="button" onClick={() => router.back()} disabled={busy} className="btn-secondary">Cancel</button>
          <button type="submit" disabled={busy} className="btn-primary flex-1 md:flex-none md:min-w-48">
            {busy ? "Saving…" : isEdit || savedId ? "Save changes" : "Save property"}
          </button>
        </div>
      </div>
    </form>
  );
}
