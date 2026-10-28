import { eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { getAdmin } from "@/lib/auth";
import { downloadFile, driveConfigured } from "@/lib/drive";
import { isUuid } from "@/lib/properties";

export const dynamic = "force-dynamic";

/**
 * Streams a photo/video from Google Drive. Files are never made public on Drive:
 * this route only serves media of published properties, or anything to a signed-in admin.
 */
export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!isUuid(id) || !driveConfigured()) return new Response("Not found", { status: 404 });

  const [row] = await getDb()
    .select({
      fileId: schema.propertyMedia.googleDriveFileId,
      mimeType: schema.propertyMedia.mimeType,
      published: schema.properties.isPublished,
    })
    .from(schema.propertyMedia)
    .innerJoin(schema.properties, eq(schema.properties.id, schema.propertyMedia.propertyId))
    .where(eq(schema.propertyMedia.id, id))
    .limit(1);
  if (!row) return new Response("Not found", { status: 404 });

  const admin = !!(await getAdmin());
  if (!row.published && !admin) return new Response("Not found", { status: 404 });

  const upstream = await downloadFile(row.fileId, req.headers.get("range"));
  if (!upstream.ok && upstream.status !== 206) return new Response("Media unavailable", { status: 502 });

  const headers = new Headers();
  headers.set("Content-Type", row.mimeType);
  for (const h of ["content-length", "content-range", "accept-ranges"]) {
    const v = upstream.headers.get(h);
    if (v) headers.set(h, v);
  }
  if (!headers.has("accept-ranges")) headers.set("Accept-Ranges", "bytes");
  headers.set("Cache-Control", row.published ? "public, max-age=3600, s-maxage=3600" : "private, max-age=300");
  headers.set("X-Content-Type-Options", "nosniff");
  return new Response(upstream.body, { status: upstream.status, headers });
}
