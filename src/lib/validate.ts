import { AREA_UNITS, STATUSES } from "./format";

/** Raw values as they come from the form (all strings). */
export type PropertyInput = {
  title: string;
  description: string;
  status: string;
  askingPrice: string;
  landArea: string;
  areaUnit: string;
  state: string;
  district: string;
  locality: string;
  address: string;
  latitude: string;
  longitude: string;
  contactName: string;
  contactPhone: string;
  whatsappNumber: string;
  internalNotes: string;
};

export type CleanProperty = {
  title: string;
  description: string | null;
  status: "available" | "sold" | "on_hold";
  askingPrice: string | null;
  landArea: string | null;
  areaUnit: string;
  state: string | null;
  district: string | null;
  locality: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  contactName: string | null;
  contactPhone: string | null;
  whatsappNumber: string | null;
  internalNotes: string | null;
};

const text = (v: unknown, max: number) => {
  const s = typeof v === "string" ? v.trim() : "";
  return s ? s.slice(0, max) : null;
};

function decimal(v: unknown, label: string, maxIntDigits: number): { value: string | null; error?: string } {
  const s = typeof v === "string" ? v.replace(/,/g, "").trim() : "";
  if (!s) return { value: null };
  if (!/^\d+(\.\d{1,4})?$/.test(s)) return { value: null, error: `${label} must be a positive number.` };
  if (s.split(".")[0].length > maxIntDigits) return { value: null, error: `${label} is too large.` };
  return { value: s };
}

function phone(v: unknown, label: string): { value: string | null; error?: string } {
  const s = text(v, 25);
  if (!s) return { value: null };
  if (!/^[+\d][\d\s\-()]{5,}$/.test(s)) return { value: null, error: `${label} looks invalid.` };
  return { value: s };
}

export function parsePropertyInput(raw: Partial<PropertyInput>): { data?: CleanProperty; error?: string } {
  const title = text(raw.title, 200);
  if (!title) return { error: "Property title is required." };

  const status = STATUSES.find((s) => s.value === raw.status)?.value ?? "available";
  const areaUnit = AREA_UNITS.find((u) => u.value === raw.areaUnit)?.value ?? "decimal";

  const price = decimal(raw.askingPrice, "Asking price", 12);
  if (price.error) return { error: price.error };
  const area = decimal(raw.landArea, "Land area", 10);
  if (area.error) return { error: area.error };

  let latitude: number | null = null;
  let longitude: number | null = null;
  const latS = (raw.latitude ?? "").toString().trim();
  const lngS = (raw.longitude ?? "").toString().trim();
  if (latS || lngS) {
    latitude = Number(latS);
    longitude = Number(lngS);
    if (
      !latS || !lngS ||
      !Number.isFinite(latitude) || !Number.isFinite(longitude) ||
      latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180
    ) {
      return { error: "Latitude and longitude must both be valid numbers (e.g. 25.5941 and 85.1376)." };
    }
  }

  const p1 = phone(raw.contactPhone, "Phone number");
  if (p1.error) return { error: p1.error };
  const p2 = phone(raw.whatsappNumber, "WhatsApp number");
  if (p2.error) return { error: p2.error };

  return {
    data: {
      title,
      description: text(raw.description, 5000),
      status,
      askingPrice: price.value,
      landArea: area.value,
      areaUnit,
      state: text(raw.state, 100),
      district: text(raw.district, 100),
      locality: text(raw.locality, 150),
      address: text(raw.address, 500),
      latitude,
      longitude,
      contactName: text(raw.contactName, 120),
      contactPhone: p1.value,
      whatsappNumber: p2.value,
      internalNotes: text(raw.internalNotes, 5000),
    },
  };
}
