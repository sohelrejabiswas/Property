import Link from "next/link";
import StatusBadge from "./StatusBadge";
import { formatArea, formatPrice } from "@/lib/format";

export type CardProperty = {
  id: string;
  propertyCode: string;
  title: string;
  status: string;
  askingPrice: string | null;
  landArea: string | null;
  areaUnit: string;
  locality: string | null;
  district: string | null;
  isPublished: boolean;
  coverMediaId: string | null;
};

export default function PropertyCard({ p }: { p: CardProperty }) {
  return (
    <article className="flex flex-col overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
      <Link href={`/properties/${p.id}`} className="relative block aspect-[4/3] bg-stone-100">
        {p.coverMediaId ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={`/api/media/${p.coverMediaId}`} alt={p.title} loading="lazy" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-1 text-stone-400">
            <span className="text-4xl" aria-hidden>🏞</span>
            <span className="text-sm">No photo yet</span>
          </div>
        )}
        <div className="absolute left-3 top-3 flex gap-2">
          <StatusBadge status={p.status} />
          {p.isPublished && <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold text-sky-800">Published</span>}
        </div>
      </Link>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <div>
          <h3 className="line-clamp-2 text-lg font-semibold leading-snug">{p.title}</h3>
          <p className="text-xs font-medium tracking-wide text-stone-500">{p.propertyCode}</p>
        </div>
        <p className="text-xl font-bold text-brand-800">{formatPrice(p.askingPrice)}</p>
        <dl className="text-sm text-stone-600">
          <div className="flex gap-2"><dt className="text-stone-500">Area:</dt><dd>{formatArea(p.landArea, p.areaUnit)}</dd></div>
          <div className="flex gap-2"><dt className="text-stone-500">Place:</dt><dd>{p.locality || p.district || "—"}</dd></div>
        </dl>
        <Link href={`/properties/${p.id}`} className="btn-secondary mt-auto w-full">View Details</Link>
      </div>
    </article>
  );
}
