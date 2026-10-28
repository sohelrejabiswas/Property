export const AREA_UNITS = [
  { value: "decimal", label: "Decimal" },
  { value: "katha", label: "Katha" },
  { value: "bigha", label: "Bigha" },
  { value: "acre", label: "Acre" },
  { value: "sqft", label: "Square Feet" },
  { value: "sqm", label: "Square Metres" },
] as const;

export const STATUSES = [
  { value: "available", label: "Available" },
  { value: "sold", label: "Sold" },
  { value: "on_hold", label: "On Hold" },
] as const;

export type StatusValue = (typeof STATUSES)[number]["value"];

export function statusLabel(s: string) {
  return STATUSES.find((x) => x.value === s)?.label ?? s;
}

export function unitLabel(u: string) {
  return AREA_UNITS.find((x) => x.value === u)?.label ?? u;
}

export function formatPrice(v: string | number | null | undefined) {
  if (v === null || v === undefined || v === "") return "Price on request";
  const n = Number(v);
  if (!Number.isFinite(n)) return "Price on request";
  return "₹" + new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 }).format(n);
}

export function formatArea(v: string | number | null | undefined, unit: string) {
  if (v === null || v === undefined || v === "") return "—";
  const n = Number(v);
  if (!Number.isFinite(n)) return "—";
  return `${new Intl.NumberFormat("en-IN", { maximumFractionDigits: 4 }).format(n)} ${unitLabel(unit)}`;
}

export function formatDate(d: Date) {
  return new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" }).format(d);
}

/** Digits only; a bare 10-digit Indian number gets the 91 country code. */
export function waDigits(phone: string | null | undefined) {
  const d = (phone ?? "").replace(/\D/g, "");
  if (!d) return "";
  return d.length === 10 ? "91" + d : d.replace(/^0+/, "");
}

export function telHref(phone: string | null | undefined) {
  const p = (phone ?? "").replace(/[^\d+]/g, "");
  return p ? `tel:${p}` : "";
}

export function whatsappContactHref(whatsapp: string | null | undefined, phone: string | null | undefined) {
  const d = waDigits(whatsapp || phone);
  return d ? `https://wa.me/${d}` : "";
}

export function mapsUrl(lat: number | null | undefined, lng: number | null | undefined) {
  if (lat == null || lng == null) return "";
  return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
}

export function locationLabel(p: { locality?: string | null; district?: string | null; state?: string | null }) {
  return [p.locality, p.district, p.state].filter(Boolean).join(", ");
}

type ShareInput = {
  title: string;
  askingPrice: string | null;
  landArea: string | null;
  areaUnit: string;
  locality: string | null;
  district: string | null;
  description: string | null;
};

/** Plain-text message used for WhatsApp / copy. Never includes internal notes. */
export function buildShareText(p: ShareInput, link: string | null) {
  const lines = [`*${p.title}*`];
  lines.push(`Price: ${formatPrice(p.askingPrice)}`);
  if (p.landArea) lines.push(`Area: ${formatArea(p.landArea, p.areaUnit)}`);
  const loc = [p.locality, p.district].filter(Boolean).join(", ");
  if (loc) lines.push(`Location: ${loc}`);
  if (p.description) {
    const d = p.description.trim().replace(/\s+/g, " ");
    lines.push("", d.length > 200 ? d.slice(0, 197) + "..." : d);
  }
  if (link) lines.push("", `View photos & location: ${link}`);
  return lines.join("\n");
}
