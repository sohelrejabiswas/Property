import { sql } from "drizzle-orm";
import { getDb } from "@/db";
import DriveTest from "@/components/DriveTest";
import { logoutAction } from "@/app/actions";
import { requireAdmin } from "@/lib/auth";
import { driveConfigured } from "@/lib/drive";
import { getBaseUrl } from "@/lib/url";

export const metadata = { title: "Settings" };
export const dynamic = "force-dynamic";

async function dbStatus() {
  if (!process.env.DATABASE_URL) return { ok: false, text: "DATABASE_URL is not set" };
  try {
    await getDb().execute(sql`select 1`);
    return { ok: true, text: "Connected to Neon" };
  } catch (e) {
    return { ok: false, text: "Connection failed: " + (e instanceof Error ? e.message.slice(0, 120) : "unknown error") };
  }
}

function Status({ ok, text }: { ok: boolean; text: string }) {
  return (
    <span className={`inline-flex items-center gap-2 text-sm font-medium ${ok ? "text-emerald-700" : "text-amber-700"}`}>
      <span aria-hidden>{ok ? "●" : "○"}</span>{text}
    </span>
  );
}

export default async function SettingsPage() {
  const email = await requireAdmin();
  const [db, base] = await Promise.all([dbStatus(), getBaseUrl()]);
  const mapsOk = !!process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const driveOk = driveConfigured();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold md:text-3xl">Settings</h1>

      <section className="card space-y-3">
        <h2 className="section-title !mb-0">Account</h2>
        <p className="text-stone-700">Signed in as <strong>{email}</strong></p>
        <form action={logoutAction}><button className="btn-secondary">Sign out</button></form>
      </section>

      <section className="card space-y-4">
        <h2 className="section-title !mb-0">Connections</h2>
        <div className="space-y-1">
          <p className="font-medium">Database (Neon)</p>
          <Status ok={db.ok} text={db.text} />
        </div>
        <div className="space-y-1">
          <p className="font-medium">Google Maps</p>
          <Status ok={mapsOk} text={mapsOk ? "API key is set (open any property with a map to confirm it works)" : "NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is missing"} />
        </div>
        <div className="space-y-2">
          <p className="font-medium">Google Drive (photos &amp; videos)</p>
          <Status ok={driveOk} text={driveOk ? "Credentials are set" : "Not configured. Uploads are disabled until you add the Google credentials."} />
          {driveOk && <DriveTest />}
        </div>
        <div className="space-y-1">
          <p className="font-medium">Public link address</p>
          <p className="break-all text-sm text-stone-700">{base}</p>
          {!process.env.NEXT_PUBLIC_APP_URL && <p className="hint">Set NEXT_PUBLIC_APP_URL to your final domain so shared links never change.</p>}
        </div>
      </section>

      <p className="text-sm text-stone-500">Setup help for Maps, Drive and deployment is in the README that came with this project.</p>
    </div>
  );
}
