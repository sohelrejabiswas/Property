import Link from "next/link";
import PropertyCard from "@/components/PropertyCard";
import { requireAdmin } from "@/lib/auth";
import { getStats, listProperties } from "@/lib/properties";

export const metadata = { title: "Dashboard" };
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  await requireAdmin();
  const [stats, recent] = await Promise.all([getStats(), listProperties({ limit: 6 })]);

  const tiles = [
    { label: "Total properties", value: stats.total, href: "/properties", tone: "text-stone-900" },
    { label: "Available", value: stats.available, href: "/properties?status=available", tone: "text-emerald-700" },
    { label: "Sold", value: stats.sold, href: "/properties?status=sold", tone: "text-stone-600" },
  ];

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold md:text-3xl">Dashboard</h1>
          <p className="text-stone-600">Your land listings at a glance</p>
        </div>
        <Link href="/properties/new" className="btn-primary w-full text-lg md:w-auto">+ Add New Land</Link>
      </header>

      <section className="grid grid-cols-3 gap-3 md:gap-4">
        {tiles.map((t) => (
          <Link key={t.label} href={t.href} className="card !p-4 transition hover:border-brand-600 md:!p-6">
            <p className={`text-3xl font-bold md:text-4xl ${t.tone}`}>{t.value}</p>
            <p className="mt-1 text-sm text-stone-600 md:text-base">{t.label}</p>
          </Link>
        ))}
      </section>

      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold">Recently added</h2>
          <Link href="/properties" className="text-sm font-semibold text-brand-700 hover:underline">See all →</Link>
        </div>
        {recent.length === 0 ? (
          <div className="card text-center">
            <p className="text-lg font-medium">No properties yet</p>
            <p className="mb-4 text-stone-600">Add your first piece of land to get started.</p>
            <Link href="/properties/new" className="btn-primary">+ Add New Land</Link>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {recent.map((p) => <PropertyCard key={p.id} p={p} />)}
          </div>
        )}
      </section>
    </div>
  );
}
