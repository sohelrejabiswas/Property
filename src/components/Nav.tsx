"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/dashboard", label: "Dashboard", icon: "▦" },
  { href: "/properties", label: "All Properties", short: "Properties", icon: "☰" },
  { href: "/properties/new", label: "Add New Land", short: "Add Land", icon: "＋", highlight: true },
  { href: "/settings", label: "Settings", icon: "⚙" },
];

function isActive(path: string, href: string) {
  if (href === "/properties") return path === "/properties" || (path.startsWith("/properties/") && !path.startsWith("/properties/new"));
  return path === href || path.startsWith(href + "/");
}

export default function Nav() {
  const path = usePathname();
  return (
    <>
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-stone-200 bg-white p-4 md:flex">
        <div className="mb-6 flex items-center gap-3 px-2 pt-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-700 text-xl text-white">⌂</div>
          <span className="text-lg font-bold">Land Management</span>
        </div>
        <nav className="space-y-1">
          {items.map((i) => (
            <Link
              key={i.href}
              href={i.href}
              className={`flex items-center gap-3 rounded-xl px-4 py-3 text-base font-medium ${
                i.highlight
                  ? "bg-brand-700 text-white hover:bg-brand-800"
                  : isActive(path, i.href)
                    ? "bg-brand-50 text-brand-800"
                    : "text-stone-700 hover:bg-stone-100"
              }`}
            >
              <span aria-hidden className="w-5 text-center">{i.icon}</span>
              {i.label}
            </Link>
          ))}
        </nav>
      </aside>

      {/* Mobile bottom bar */}
      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 border-t border-stone-200 bg-white pb-[env(safe-area-inset-bottom)] md:hidden">
        {items.map((i) => (
          <Link
            key={i.href}
            href={i.href}
            className={`flex min-h-16 flex-col items-center justify-center gap-0.5 text-xs font-medium ${
              i.highlight ? "text-brand-700" : isActive(path, i.href) ? "text-brand-700" : "text-stone-500"
            }`}
          >
            <span
              aria-hidden
              className={`flex h-8 w-8 items-center justify-center rounded-full text-lg ${i.highlight ? "bg-brand-700 text-white" : ""}`}
            >
              {i.icon}
            </span>
            {i.short ?? i.label}
          </Link>
        ))}
      </nav>
    </>
  );
}
