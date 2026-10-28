"use server";

import { and, asc, eq, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getDb, schema } from "@/db";
import { assertAdmin, destroySession } from "@/lib/auth";
import { deleteDriveItem, findPropertyFolder, getFileMeta, testDrive } from "@/lib/drive";
import { getPropertyById, isUuid } from "@/lib/properties";
import { parsePropertyInput, type PropertyInput } from "@/lib/validate";

const { properties, propertyMedia } = schema;

type Result<T = object> = ({ ok: true } & T) | { ok: false; error: string };

function fail(e: unknown): { ok: false; error: string } {
  return { ok: false, error: e instanceof Error ? e.message : "Something went wrong. Please try again." };
}

export async function logoutAction() {
  await destroySession();
  redirect("/login");
}

export async function saveProperty(id: string | null, input: PropertyInput): Promise<Result<{ id: string }>> {
  try {
    await assertAdmin();
    const { data, error } = parsePropertyInput(input);
    if (!data) return { ok: false, error: error ?? "Invalid details." };
    const db = getDb();
    if (id) {
      if (!isUuid(id)) return { ok: false, error: "Property not found." };
      const [row] = await db
        .update(properties)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(properties.id, id))
        .returning({ id: properties.id });
      if (!row) return { ok: false, error: "Property not found." };
      revalidatePath("/", "layout");
      return { ok: true, id: row.id };
    }
    const [row] = await db.insert(properties).values(data).returning({ id: properties.id });
    revalidatePath("/", "layout");
    return { ok: true, id: row.id };
  } catch (e) {
    return fail(e);
  }
}

export async function setPublished(id: string, published: boolean): Promise<Result> {
  try {
    await assertAdmin();
    if (!isUuid(id)) return { ok: false, error: "Property not found." };
    await getDb().update(properties).set({ isPublished: published, updatedAt: new Date() }).where(eq(properties.id, id));
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function deleteProperty(id: string): Promise<Result> {
  try {
    await assertAdmin();
    const property = await getPropertyById(id);
    if (!property) return { ok: false, error: "Property not found." };
    // Remove the Drive folder (with all its photos/videos) first; if Drive fails we stop so nothing is orphaned silently.
    const media = await getDb().select({ id: propertyMedia.id }).from(propertyMedia).where(eq(propertyMedia.propertyId, id)).limit(1);
    if (media.length) {
      const folder = await findPropertyFolder(property.propertyCode);
      if (folder) await deleteDriveItem(folder);
    }
    await getDb().delete(properties).where(eq(properties.id, id));
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function registerMedia(input: {
  propertyId: string;
  fileId: string;
  folderId: string;
  fileName: string;
  mimeType: string;
}): Promise<Result> {
  try {
    await assertAdmin();
    if (!isUuid(input.propertyId)) return { ok: false, error: "Property not found." };
    // Verify with Google that this file really exists in the folder we created.
    const meta = await getFileMeta(input.fileId);
    if (meta.trashed || !meta.parents?.includes(input.folderId)) {
      return { ok: false, error: "Uploaded file could not be verified in Google Drive." };
    }
    const fileType = input.mimeType.startsWith("video/") ? "video" : input.mimeType.startsWith("image/") ? "photo" : null;
    if (!fileType) return { ok: false, error: "Unsupported file type." };

    const db = getDb();
    const [existingCover] = await db
      .select({ id: propertyMedia.id })
      .from(propertyMedia)
      .where(and(eq(propertyMedia.propertyId, input.propertyId), eq(propertyMedia.isCover, true)))
      .limit(1);
    const values = {
      propertyId: input.propertyId,
      googleDriveFileId: input.fileId,
      googleDriveFolderId: input.folderId,
      fileName: input.fileName.slice(0, 200),
      fileType,
      mimeType: input.mimeType,
    } as const;
    try {
      await db.insert(propertyMedia).values({ ...values, isCover: fileType === "photo" && !existingCover });
    } catch {
      // Lost a race for the single cover slot: insert as a normal photo.
      await db.insert(propertyMedia).values({ ...values, isCover: false });
    }
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function setCover(mediaId: string): Promise<Result> {
  try {
    await assertAdmin();
    if (!isUuid(mediaId)) return { ok: false, error: "Photo not found." };
    const db = getDb();
    const [m] = await db.select().from(propertyMedia).where(eq(propertyMedia.id, mediaId)).limit(1);
    if (!m || m.fileType !== "photo") return { ok: false, error: "Only photos can be the cover." };
    await db.batch([
      db.update(propertyMedia).set({ isCover: false }).where(and(eq(propertyMedia.propertyId, m.propertyId), ne(propertyMedia.id, m.id))),
      db.update(propertyMedia).set({ isCover: true }).where(eq(propertyMedia.id, m.id)),
    ]);
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function deleteMedia(mediaId: string): Promise<Result> {
  try {
    await assertAdmin();
    if (!isUuid(mediaId)) return { ok: false, error: "File not found." };
    const db = getDb();
    const [m] = await db.select().from(propertyMedia).where(eq(propertyMedia.id, mediaId)).limit(1);
    if (!m) return { ok: true };
    await deleteDriveItem(m.googleDriveFileId);
    await db.delete(propertyMedia).where(eq(propertyMedia.id, m.id));
    if (m.isCover) {
      const [next] = await db
        .select({ id: propertyMedia.id })
        .from(propertyMedia)
        .where(and(eq(propertyMedia.propertyId, m.propertyId), eq(propertyMedia.fileType, "photo")))
        .orderBy(asc(propertyMedia.createdAt))
        .limit(1);
      if (next) await db.update(propertyMedia).set({ isCover: true }).where(eq(propertyMedia.id, next.id));
    }
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function testDriveAction(): Promise<Result<{ email: string }>> {
  try {
    await assertAdmin();
    const r = await testDrive();
    return { ok: true, email: r.email };
  } catch (e) {
    return fail(e);
  }
}
