import "server-only";
import { headers } from "next/headers";

/** Base URL for share links: NEXT_PUBLIC_APP_URL if set, otherwise the host of the current request. */
export async function getBaseUrl() {
  const env = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, "");
  if (env) return env;
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}
