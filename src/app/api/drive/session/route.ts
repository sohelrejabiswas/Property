import { NextResponse } from "next/server";
import { getAdmin } from "@/lib/auth";
import { getPropertyById } from "@/lib/properties";
import { DRIVE_SETUP_MESSAGE, driveConfigured, ensurePropertyFolder, startResumableUpload } from "@/lib/drive";

export const dynamic = "force-dynamic";

const MAX_PHOTO = 25 * 1024 * 1024;
const MAX_VIDEO = 1024 * 1024 * 1024;

export async function POST(req: Request) {
  if (!(await getAdmin())) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  if (!driveConfigured()) return NextResponse.json({ error: DRIVE_SETUP_MESSAGE, setup: true }, { status: 503 });

  const body = (await req.json().catch(() => null)) as {
    propertyId?: string; fileName?: string; mimeType?: string; size?: number;
  } | null;
  if (!body?.propertyId || !body.fileName || !body.mimeType || !body.size) {
    return NextResponse.json({ error: "Missing upload details." }, { status: 400 });
  }
  const isPhoto = body.mimeType.startsWith("image/");
  const isVideo = body.mimeType.startsWith("video/");
  if (!isPhoto && !isVideo) return NextResponse.json({ error: "Only photos and videos can be uploaded." }, { status: 400 });
  if (body.size > (isPhoto ? MAX_PHOTO : MAX_VIDEO)) {
    return NextResponse.json({ error: isPhoto ? "Photo is larger than 25 MB." : "Video is larger than 1 GB." }, { status: 400 });
  }

  const property = await getPropertyById(body.propertyId);
  if (!property) return NextResponse.json({ error: "Property not found." }, { status: 404 });

  try {
    const folderId = await ensurePropertyFolder(property.propertyCode, property.title);
    const origin = req.headers.get("origin") ?? new URL(req.url).origin;
    const uploadUrl = await startResumableUpload({
      folderId,
      fileName: body.fileName.slice(0, 200),
      mimeType: body.mimeType,
      size: body.size,
      origin,
    });
    return NextResponse.json({ uploadUrl, folderId });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Upload could not be started." }, { status: 502 });
  }
}
