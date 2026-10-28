import type { Metadata } from "next";
import { notFound } from "next/navigation";
import CopyLinkButton from "@/components/CopyLinkButton";
import Gallery from "@/components/Gallery";
import MapView from "@/components/MapView";
import StatusBadge from "@/components/StatusBadge";
import { formatArea, formatPrice, locationLabel, mapsUrl, telHref, whatsappContactHref } from "@/lib/format";
import { getMedia, getPublishedByCode } from "@/lib/properties";
import { getBaseUrl } from "@/lib/url";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ code: string }> }): Promise<Metadata> {
  const { code } = await params;
  const p = await getPublishedByCode(code);
  if (!p) return { title: "Property not found", robots: { index: false } };
  const base = await getBaseUrl();
  const media = await getMedia(p.id);
  const cover = media.find((m) => m.isCover && m.fileType === "photo") ?? media.find((m) => m.fileType === "photo");
  const desc = `${formatPrice(p.askingPrice)} · ${formatArea(p.landArea, p.areaUnit)} · ${locationLabel(p)}`;
  return {
    title: p.title,
    description: desc,
    robots: { index: true, follow: true },
    openGraph: {
      title: p.title,
      description: desc,
      url: `${base}/p/${p.propertyCode}`,
      type: "website",
      images: cover ? [`${base}/api/media/${cover.id}`] : undefined,
    },
  };
}

export default async function PublicPropertyPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const p = await getPublishedByCode(code); // returns null unless explicitly published
  if (!p) notFound();

  const media = await getMedia(p.id);
  const photos = media.filter((m) => m.fileType === "photo");
  const videos = media.filter((m) => m.fileType === "video");
  const base = await getBaseUrl();
  const link = `${base}/p/${p.propertyCode}`;
  const maps = mapsUrl(p.latitude, p.longitude);
  const tel = telHref(p.contactPhone);
  const wa = whatsappContactHref(p.whatsappNumber, p.contactPhone);
  const waMessage = encodeURIComponent(`Hello, I am interested in "${p.title}" (${p.propertyCode}). ${link}`);
  const waHref = wa ? `${wa}?text=${waMessage}` : "";
  const loc = locationLabel(p);

  return (
    <div className="min-h-screen pb-28">
      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-700 text-white">⌂</div>
          <span className="font-semibold">Land for sale</span>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-6 px-4 py-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2"><StatusBadge status={p.status} /><span className="text-sm text-stone-500">{p.propertyCode}</span></div>
          <h1 className="text-2xl font-bold leading-tight md:text-3xl">{p.title}</h1>
          {loc && <p className="text-stone-600">📍 {loc}</p>}
          <p className="text-3xl font-bold text-brand-800">{formatPrice(p.askingPrice)}</p>
        </div>

        {photos.length > 0 && <Gallery photos={photos.map((m) => ({ id: m.id, fileName: m.fileName }))} />}

        <section className="card">
          <h2 className="section-title">Details</h2>
          <dl className="grid grid-cols-2 gap-4">
            <div><dt className="text-sm text-stone-500">Land area</dt><dd className="font-semibold">{formatArea(p.landArea, p.areaUnit)}</dd></div>
            <div><dt className="text-sm text-stone-500">Status</dt><dd className="font-semibold">{p.status === "available" ? "Available" : p.status === "sold" ? "Sold" : "On hold"}</dd></div>
            {p.address && <div className="col-span-2"><dt className="text-sm text-stone-500">Address / landmark</dt><dd className="font-semibold">{p.address}</dd></div>}
          </dl>
          {p.description && <p className="mt-4 whitespace-pre-line text-stone-800">{p.description}</p>}
        </section>

        {videos.length > 0 && (
          <section className="card">
            <h2 className="section-title">Videos</h2>
            <div className="space-y-4">
              {videos.map((v) => <video key={v.id} controls preload="metadata" playsInline className="w-full rounded-xl bg-black" src={`/api/media/${v.id}`} />)}
            </div>
          </section>
        )}

        {p.latitude != null && p.longitude != null && (
          <section className="card space-y-3">
            <h2 className="section-title !mb-0">Location</h2>
            <MapView lat={p.latitude} lng={p.longitude} title={p.title} />
            <a href={maps} target="_blank" rel="noopener noreferrer" className="btn-secondary w-full">🗺 Open in Google Maps</a>
          </section>
        )}

        <section className="card space-y-3">
          <h2 className="section-title !mb-0">Contact</h2>
          {p.contactName && <p className="font-semibold">{p.contactName}</p>}
          {p.contactPhone && <p className="text-stone-700">{p.contactPhone}</p>}
          <CopyLinkButton link={link} className="btn-secondary w-full" />
        </section>
      </main>

      {(tel || waHref) && (
        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-stone-200 bg-white p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <div className="mx-auto grid max-w-3xl grid-cols-2 gap-3">
            {tel ? <a href={tel} className="btn-primary">📞 Call</a> : <span />}
            {waHref ? <a href={waHref} target="_blank" rel="noopener noreferrer" className="btn bg-[#25D366] text-white">💬 WhatsApp</a> : <span />}
          </div>
        </div>
      )}
    </div>
  );
}
