import Link from "next/link";
import PropertyCard from "@/components/PropertyCard";
import { requireAdmin } from "@/lib/auth";
import { listProperties } from "@/lib/properties";

export const metadata = { title: "All Properties" };
export const dynamic = "force-dynamic";

const chips = [
  { value: "", label: "All" },
  { value: "available", label: "Available" },
  { value: "sold", label: "Sold" },
  { value: "on_hold", label: "On Hold" },
];

export default async function PropertiesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  await requireAdmin();
  const { q = "", status = "" } = await searchParams;
  const list = await listProperties({ q, status });

  const href = (s: string) => {
    const p = new URLSearchParams();
    if (q) p.set("q", q);
    if (s) p.set("status", s);
    const qs = p.toString();
    return qs ? `/properties?${qs}` : "/properties";
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold md:text-3xl">All Properties</h1>
        <Link href="/properties/new" className="btn-primary w-full md:w-auto">+ Add New Land</Link>
      </header>

      <form action="/properties" className="flex gap-2">
        {status && <input type="hidden" name="status" value={status} />}
        <input
          name="q"
          defaultValue={q}
          type="search"
          placeholder="Search title, property ID or village"
          className="input"
          aria-label="Search properties"
        />
        <button className="btn-primary shrink-0" type="submit">Search</button>
      </form>

      <div className="flex flex-wrap gap-2">
        {chips.map((c) => (
          <Link
            key={c.value}
            href={href(c.value)}
            className={`rounded-full border px-4 py-2 text-sm font-semibold ${
              status === c.value ? "border-brand-700 bg-brand-700 text-white" : "border-stone-300 bg-white text-stone-700"
            }`}
          >
            {c.label}
          </Link>
        ))}
      </div>

      <p className="text-sm text-stone-600">
        {list.length} {list.length === 1 ? "property" : "properties"}
        {q && <> matching “{q}”</>}
        {q || status ? <> · <Link href="/properties" className="font-semibold text-brand-700">Clear</Link></> : null}
      </p>

      {list.length === 0 ? (
        <div className="card text-center text-stone-600">No properties found.</div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((p) => <PropertyCard key={p.id} p={p} />)}
        </div>
      )}
    </div>
  );
}
