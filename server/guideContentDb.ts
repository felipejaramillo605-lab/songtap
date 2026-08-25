import { and, asc, desc, eq, sql } from "drizzle-orm";
import { guideContentMedia, guideContents, guideSearchMisses } from "../drizzle/schema";
import { getDb } from "./db";

export type GuideContentRole = "owner" | "manager" | "staff";
export type GuideContentType = "tutorial" | "help";

export type GuideContentInput = {
  contentType: GuideContentType;
  slug: string;
  title: string;
  summary: string;
  body: string;
  roles: GuideContentRole[];
  category: string;
  modulePath?: string | null;
  durationMinutes?: number | null;
  sortOrder?: number;
  isActive?: boolean;
};

function normalizeText(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("es");
}

function encodeRoles(roles: GuideContentRole[]) {
  return Array.from(new Set(roles)).sort().join(",");
}

export function decodeGuideRoles(roles: string): GuideContentRole[] {
  return roles.split(",").filter((role): role is GuideContentRole => role === "owner" || role === "manager" || role === "staff");
}

export function normalizeGuideSearch(value: string) {
  return normalizeText(value).replace(/[^a-z0-9\s-]/g, " ").replace(/\s+/g, " ").trim();
}

export async function getManagedGuideContents(input?: { role?: GuideContentRole; activeOnly?: boolean; contentType?: GuideContentType }) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [];
  if (input?.activeOnly) conditions.push(eq(guideContents.isActive, true));
  if (input?.contentType) conditions.push(eq(guideContents.contentType, input.contentType));
  const rows = await db.select().from(guideContents).where(conditions.length ? and(...conditions) : undefined).orderBy(asc(guideContents.sortOrder), asc(guideContents.title));
  return rows.filter((row) => !input?.role || decodeGuideRoles(row.roles).includes(input.role));
}

export async function createManagedGuideContent(input: GuideContentInput & { userId: number }) {
  const db = await getDb();
  if (!db) throw new Error("Base de datos no disponible");
  const result = await db.insert(guideContents).values({
    contentType: input.contentType,
    slug: input.slug,
    title: input.title,
    summary: input.summary,
    body: input.body,
    roles: encodeRoles(input.roles),
    category: input.category,
    modulePath: input.modulePath ?? null,
    durationMinutes: input.durationMinutes ?? null,
    sortOrder: input.sortOrder ?? 0,
    isActive: input.isActive ?? true,
    createdByUserId: input.userId,
    updatedByUserId: input.userId,
  });
  const id = Number((result[0] as { insertId: number }).insertId);
  const [content] = await db.select().from(guideContents).where(eq(guideContents.id, id)).limit(1);
  return content;
}

export async function updateManagedGuideContent(id: number, input: GuideContentInput & { userId: number }) {
  const db = await getDb();
  if (!db) throw new Error("Base de datos no disponible");
  await db.update(guideContents).set({
    contentType: input.contentType,
    slug: input.slug,
    title: input.title,
    summary: input.summary,
    body: input.body,
    roles: encodeRoles(input.roles),
    category: input.category,
    modulePath: input.modulePath ?? null,
    durationMinutes: input.durationMinutes ?? null,
    sortOrder: input.sortOrder ?? 0,
    isActive: input.isActive ?? true,
    updatedByUserId: input.userId,
  }).where(eq(guideContents.id, id));
  const [content] = await db.select().from(guideContents).where(eq(guideContents.id, id)).limit(1);
  return content ?? null;
}

export async function deleteManagedGuideContent(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Base de datos no disponible");
  const [existing] = await db.select({ id: guideContents.id, title: guideContents.title }).from(guideContents).where(eq(guideContents.id, id)).limit(1);
  if (!existing) return null;
  await db.delete(guideContents).where(eq(guideContents.id, id));
  return existing;
}

export async function searchGuideContentSuggestions(query: string, role: GuideContentRole, limit = 6) {
  const rows = await getManagedGuideContents({ role, activeOnly: true });
  const terms = normalizeText(query).split(/\s+/).filter(Boolean);
  if (!terms.length) return rows.slice(0, limit);
  return rows
    .map((row) => ({ row, haystack: normalizeText([row.title, row.summary, row.body, row.category, row.modulePath ?? ""].join(" ")) }))
    .filter(({ haystack }) => terms.every((term) => haystack.includes(term)))
    .sort((left, right) => Number(normalizeText(left.row.title).startsWith(terms[0] ?? "")) - Number(normalizeText(right.row.title).startsWith(terms[0] ?? "")))
    .map(({ row }) => row)
    .slice(0, limit);
}

export async function createGuideContentMedia(input: { storageKey: string; url: string; altText: string; mimeType: string; uploadedByUserId: number }) {
  const db = await getDb();
  if (!db) throw new Error("Base de datos no disponible");
  const result = await db.insert(guideContentMedia).values(input);
  const id = Number((result[0] as { insertId: number }).insertId);
  const [media] = await db.select().from(guideContentMedia).where(eq(guideContentMedia.id, id)).limit(1);
  return media;
}

export async function getGuideContentMedia(limit = 60) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(guideContentMedia).orderBy(desc(guideContentMedia.createdAt)).limit(limit);
}

export async function recordGuideSearchMiss(input: { query: string; role: GuideContentRole }) {
  const normalizedQuery = normalizeGuideSearch(input.query);
  if (normalizedQuery.length < 2) return null;
  const db = await getDb();
  if (!db) return null;
  await db.insert(guideSearchMisses).values({ normalizedQuery, displayQuery: input.query.trim().slice(0, 160), role: input.role }).onDuplicateKeyUpdate({
    set: {
      displayQuery: input.query.trim().slice(0, 160),
      searchCount: sql`${guideSearchMisses.searchCount} + 1`,
      lastSearchedAt: new Date(),
    },
  });
  const [result] = await db.select().from(guideSearchMisses).where(and(eq(guideSearchMisses.normalizedQuery, normalizedQuery), eq(guideSearchMisses.role, input.role))).limit(1);
  return result ?? null;
}

export async function getGuideSearchMisses(limit = 40) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(guideSearchMisses).orderBy(desc(guideSearchMisses.searchCount), desc(guideSearchMisses.lastSearchedAt)).limit(limit);
}
