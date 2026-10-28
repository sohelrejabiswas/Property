import "server-only";
import { and, desc, eq, ilike, or, sql, asc } from "drizzle-orm";
import { getDb, schema } from "@/db";

const { properties, propertyMedia } = schema;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isUuid = (s: string) => UUID.test(s);

export type ListFilters = { q?: string; status?: string; limit?: number };

export async function listProperties({ q, status, limit }: ListFilters = {}) {
  const db = getDb();
  const conds = [];
  if (status === "available" || status === "sold" || status === "on_hold") {
    conds.push(eq(properties.status, status));
  }
  const term = q?.trim();
  if (term) {
    const like = `%${term.replace(/[\\%_]/g, (c) => "\\" + c)}%`;
    conds.push(
      or(ilike(properties.title, like), ilike(properties.propertyCode, like), ilike(properties.locality, like))!,
    );
  }
  const query = db
    .select({
      id: properties.id,
      propertyCode: properties.propertyCode,
      title: properties.title,
      status: properties.status,
      askingPrice: properties.askingPrice,
      landArea: properties.landArea,
      areaUnit: properties.areaUnit,
      locality: properties.locality,
      district: properties.district,
      isPublished: properties.isPublished,
      createdAt: properties.createdAt,
      coverMediaId: propertyMedia.id,
    })
    .from(properties)
    .leftJoin(
      propertyMedia,
      and(eq(propertyMedia.propertyId, properties.id), eq(propertyMedia.isCover, true), eq(propertyMedia.fileType, "photo")),
    )
    .where(conds.length ? and(...conds) : undefined)
    .orderBy(desc(properties.createdAt));
  return limit ? query.limit(limit) : query;
}

export async function getStats() {
  const [row] = await getDb()
    .select({
      total: sql<number>`count(*)::int`,
      available: sql<number>`count(*) filter (where ${properties.status} = 'available')::int`,
      sold: sql<number>`count(*) filter (where ${properties.status} = 'sold')::int`,
      onHold: sql<number>`count(*) filter (where ${properties.status} = 'on_hold')::int`,
    })
    .from(properties);
  return row;
}

export async function getPropertyById(id: string) {
  if (!isUuid(id)) return null;
  const [row] = await getDb().select().from(properties).where(eq(properties.id, id)).limit(1);
  return row ?? null;
}

/** Only returns a property that has been explicitly published. */
export async function getPublishedByCode(code: string) {
  const [row] = await getDb()
    .select()
    .from(properties)
    .where(and(eq(properties.propertyCode, code.toUpperCase()), eq(properties.isPublished, true)))
    .limit(1);
  return row ?? null;
}

export async function getMedia(propertyId: string) {
  return getDb()
    .select()
    .from(propertyMedia)
    .where(eq(propertyMedia.propertyId, propertyId))
    .orderBy(desc(propertyMedia.isCover), asc(propertyMedia.createdAt));
}
