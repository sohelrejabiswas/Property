import Link from "next/link";
import { notFound } from "next/navigation";
import DeleteButton from "@/components/DeleteButton";
import Gallery from "@/components/Gallery";
import MapView from "@/components/MapView";
import ShareButtons from "@/components/ShareButtons";
import StatusBadge from "@/components/StatusBadge";
import { requireAdmin } from "@/lib/auth";
import { buildShareText, formatArea, formatDate, formatPrice, locationLabel, mapsUrl, telHref, unitLabel, whatsappContactHref } from "@/lib/format";
import { getMedia, getPropertyById } from "@/lib/properties";
import { getBaseUrl } from "@/lib/url";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const p = await getPropertyById(id);
  return { title: p?.title ?? "Property" };
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  if (children === null || children === undefined || children === "") return null;
  return (
    <div className="flex flex-col gap-0.5 py-2 sm:flex-row sm:gap-4">
      <dt className="w-40 shrink-0 text-sm text-stone-500">{label}</dt>
      <dd className="font-medium">{children}</dd>
    </div>
  );
}

export default async function PropertyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const p = await getPropertyById(id);
  if (!p) notFound();

  const media = await getMedia(p.id);
  const photos = media.filter((m) => m.fileType === "photo");
  const videos = media.filter((m) => m.fileType === "video");
  const base = await getBaseUrl();
  const link = `${base}/p/${p.propertyCode}`;
  const shareInput = { ...p };
  const maps = mapsUrl(p.latitude, p.longitude);
  const tel = telHref(p.contactPhone);
  const wa = whatsappContactHref(p.whatsappNumber, p.contactPhone);
  const perUnit = p.askingPrice && p.landArea && Number(p.landArea) > 0
    ? `${formatPrice(Math.round((Number(p.askingPrice) / Number(p.landArea)) * 100) / 100)} per ${unitLabel(p.areaUnit)}`
    : null;

  return (
    <div className="space-y-6">
      <header className="space-y-3">
        <Link href="/properties" className="text-sm font-semibold text-brand-700">← All properties</Link>
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={p.status} />
          {p.isPublished && <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold text-sky-800">Published</span>}
          <span className="text-sm font-medium text-stone-500">{p.propertyCode}</span>
        </div>
        <h1 className="text-2xl font-bold leading-tight md:text-3xl">{p.title}</h1>
        <p className="text-3xl font-bold text-brand-800">{formatPrice(p.askingPrice)}</p>
      </header>

      <div className="grid grid-cols-2 gap-3 sm:flex sm:flex-wrap">
        <Link href={`/properties/${p.id}/edit`} className="btn-primary">✏️ Edit</Link>
        {maps ? <a href={maps} target="_blank" rel="noopener noreferrer" className="btn-secondary">🗺 Open Maps</a> : <span className="btn-secondary opacity-50" aria-disabled>🗺 No location</span>}
        {tel ? <a href={tel} className="btn-secondary">📞 Call</a> : <span className="btn-secondary opacity-50" aria-disabled>📞 No phone</span>}
        {wa ? <a href={wa} target="_blank" rel="noopener noreferrer" className="btn-secondary">💬 WhatsApp</a> : <span className="btn-secondary opacity-50" aria-disabled>💬 No number</span>}
        <DeleteButton id={p.id} title={p.title} hasMedia={media.length > 0} />
      </div>

      <ShareButtons
        propertyId={p.id}
        title={p.title}
        isPublished={p.isPublished}
        link={link}
        text={buildShareText(shareInput, null)}
        textWithLink={buildShareText(shareInput, link)}
      />

      <section className="card">
        <h2 className="section-title">Photos</h2>
        {photos.length ? <Gallery photos={photos.map((m) => ({ id: m.id, fileName: m.fileName }))} /> : (
          <p className="text-stone-600">No photos yet. <Link href={`/properties/${p.id}/edit`} className="font-semibold text-brand-700">Add photos</Link></p>
        )}
      </section>

      {videos.length > 0 && (
        <section className="card">
          <h2 className="section-title">Videos</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {videos.map((v) => (
              <video key={v.id} controls preload="metadata" playsInline className="w-full rounded-xl bg-black" src={`/api/media/${v.id}`} />
            ))}
          </div>
        </section>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <section className="card">
          <h2 className="section-title">Price and area</h2>
          <dl className="divide-y divide-stone-100">
            <Row label="Asking price">{formatPrice(p.askingPrice)}</Row>
            <Row label="Land area">{formatArea(p.landArea, p.areaUnit)}</Row>
            <Row label="Price per unit">{perUnit}</Row>
            <Row label="Added">{formatDate(p.createdAt)}</Row>
            <Row label="Last updated">{formatDate(p.updatedAt)}</Row>
          </dl>
        </section>

        <section className="card">
          <h2 className="section-title">Contact</h2>
          <dl className="divide-y divide-stone-100">
            <Row label="Name">{p.contactName}</Row>
            <Row label="Phone">{p.contactPhone && <a className="text-brand-800 underline" href={tel}>{p.contactPhone}</a>}</Row>
            <Row label="WhatsApp">{p.whatsappNumber}</Row>
            {!p.contactName && !p.contactPhone && <p className="py-2 text-stone-600">No contact saved.</p>}
          </dl>
        </section>
      </div>

      <section className="card space-y-4">
        <h2 className="section-title !mb-0">Location</h2>
        <dl className="divide-y divide-stone-100">
          <Row label="State">{p.state}</Row>
          <Row label="District">{p.district}</Row>
          <Row label="Village / locality">{p.locality}</Row>
          <Row label="Address / landmark">{p.address}</Row>
          <Row label="Coordinates">{p.latitude != null && p.longitude != null ? `${p.latitude}, ${p.longitude}` : null}</Row>
        </dl>
        {!locationLabel(p) && !p.address && p.latitude == null && <p className="text-stone-600">No location saved.</p>}
        {p.latitude != null && p.longitude != null && <MapView lat={p.latitude} lng={p.longitude} title={p.title} />}
      </section>

      {p.description && (
        <section className="card">
          <h2 className="section-title">Description</h2>
          <p className="whitespace-pre-line text-stone-800">{p.description}</p>
        </section>
      )}

      <section className="card border-amber-200 bg-amber-50/50">
        <h2 className="section-title">🔒 Internal notes <span className="text-sm font-normal text-stone-500">(private, only visible to you)</span></h2>
        <p className="whitespace-pre-line text-stone-800">{p.internalNotes || "No notes."}</p>
      </section>
    </div>
  );
}
