import { TRPCError } from "@trpc/server";
import { randomUUID } from "crypto";
import { z } from "zod";
import { createAuditLog } from "../db";
import {
  createGuideContentMedia,
  createManagedGuideContent,
  deleteManagedGuideContent,
  getGuideContentMedia,
  getGuideResolutionStats,
  getManagedGuideContents,
  getGuideSearchMisses,
  recordGuideSearchResolution,
  recordGuideSearchMiss,
  searchGuideContentSuggestions,
  updateManagedGuideContent,
  type GuideContentRole,
} from "../guideContentDb";
import { adminProcedure, protectedProcedure, router } from "../_core/trpc";
import { storagePut } from "../storage";

const rolesSchema = z.array(z.enum(["owner", "manager", "staff"])).min(1).max(3);
const contentInput = z.object({
  contentType: z.enum(["tutorial", "help"]),
  slug: z.string().trim().toLowerCase().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(96),
  title: z.string().trim().min(3).max(180),
  summary: z.string().trim().min(10).max(2000),
  body: z.string().trim().min(10).max(8000),
  roles: rolesSchema,
  category: z.string().trim().min(2).max(96),
  modulePath: z.string().trim().regex(/^\/[a-z0-9/?=&_-]*$/i, "La ruta debe ser interna y comenzar con '/'.").max(255).nullable().optional(),
  durationMinutes: z.number().int().min(1).max(180).nullable().optional(),
  sortOrder: z.number().int().min(0).max(10000).optional(),
  isActive: z.boolean().optional(),
});

const guideImageTypes = ["image/jpeg", "image/png", "image/webp"] as const;
const guideImageExtension: Record<(typeof guideImageTypes)[number], string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

function validGuideImage(buffer: Buffer, mime: string) {
  if (mime === "image/jpeg") return buffer.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]));
  if (mime === "image/png") return buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  if (mime === "image/webp") return buffer.subarray(0, 4).toString("ascii") === "RIFF" && buffer.subarray(8, 12).toString("ascii") === "WEBP";
  return false;
}

export const learningRouter = router({
  available: protectedProcedure.query(({ ctx }) => {
    const role = ctx.user.role;
    if (role !== "owner" && role !== "manager" && role !== "staff") return [];
    return getManagedGuideContents({ role: role as GuideContentRole, activeOnly: true });
  }),

  suggestions: protectedProcedure
    .input(z.object({ query: z.string().trim().max(120) }))
    .query(({ ctx, input }) => {
      const role = ctx.user.role;
      if (role !== "owner" && role !== "manager" && role !== "staff") return [];
      return searchGuideContentSuggestions(input.query, role as GuideContentRole);
    }),

  recordSearchMiss: protectedProcedure
    .input(z.object({ query: z.string().trim().min(2).max(160) }))
    .mutation(async ({ ctx, input }) => {
      const role = ctx.user.role;
      if (role !== "owner" && role !== "manager" && role !== "staff") return { success: true };
      await recordGuideSearchMiss({ query: input.query, role: role as GuideContentRole });
      return { success: true };
    }),

  recordSearchResolution: protectedProcedure
    .input(z.object({ query: z.string().trim().min(2).max(160), guideContentId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const role = ctx.user.role;
      if (role !== "owner" && role !== "manager" && role !== "staff") return { success: true };
      const resolution = await recordGuideSearchResolution({ query: input.query, role: role as GuideContentRole, guideContentId: input.guideContentId });
      if (!resolution) throw new TRPCError({ code: "NOT_FOUND", message: "Este artículo de ayuda ya no está disponible." });
      return { success: true };
    }),

  adminList: adminProcedure.query(() => getManagedGuideContents()),
  adminMedia: adminProcedure.query(() => getGuideContentMedia()),
  adminSearchMisses: adminProcedure.query(() => getGuideSearchMisses()),
  adminResolutionStats: adminProcedure.query(() => getGuideResolutionStats()),

  uploadGuideImage: adminProcedure
    .input(z.object({ filename: z.string().trim().min(1).max(120), base64Data: z.string().min(1).max(5_600_000), contentType: z.enum(guideImageTypes), altText: z.string().trim().min(3).max(240) }))
    .mutation(async ({ ctx, input }) => {
      const match = input.base64Data.match(/^data:(.+);base64,(.+)$/);
      const actualMime = match ? match[1] : input.contentType;
      if (!guideImageTypes.includes(actualMime as (typeof guideImageTypes)[number]) || actualMime !== input.contentType) throw new TRPCError({ code: "BAD_REQUEST", message: "La imagen debe ser JPEG, PNG o WEBP y coincidir con el formato declarado." });
      const buffer = Buffer.from(match ? match[2] : input.base64Data, "base64");
      if (buffer.length > 4 * 1024 * 1024) throw new TRPCError({ code: "BAD_REQUEST", message: "La imagen excede el límite de 4 MB." });
      if (!validGuideImage(buffer, actualMime)) throw new TRPCError({ code: "BAD_REQUEST", message: "El contenido de la imagen no coincide con el formato declarado." });
      const key = `guides/${ctx.user.id}/${randomUUID()}.${guideImageExtension[actualMime as (typeof guideImageTypes)[number]]}`;
      const stored = await storagePut(key, buffer, actualMime);
      const media = await createGuideContentMedia({ storageKey: stored.key, url: stored.url, altText: input.altText, mimeType: actualMime, uploadedByUserId: ctx.user.id });
      await createAuditLog({ venueId: null, userId: ctx.user.id, userRole: "owner", module: "Guías", action: "GUIDE_IMAGE_UPLOADED", entity: "guide_content_media", entityId: media?.id, details: JSON.stringify({ altText: input.altText, mimeType: actualMime, filename: input.filename }) });
      return media;
    }),

  adminCreate: adminProcedure
    .input(contentInput)
    .mutation(async ({ ctx, input }) => {
      const content = await createManagedGuideContent({ ...input, userId: ctx.user.id });
      await createAuditLog({ venueId: null, userId: ctx.user.id, userRole: "owner", module: "Guías", action: "GUIDE_CONTENT_CREATED", entity: "guide_content", entityId: content?.id, details: JSON.stringify({ slug: input.slug, contentType: input.contentType, roles: input.roles }) });
      return content;
    }),

  adminUpdate: adminProcedure
    .input(z.object({ id: z.number().int().positive(), content: contentInput }))
    .mutation(async ({ ctx, input }) => {
      const content = await updateManagedGuideContent(input.id, { ...input.content, userId: ctx.user.id });
      if (!content) throw new TRPCError({ code: "NOT_FOUND", message: "El contenido de guía ya no existe." });
      await createAuditLog({ venueId: null, userId: ctx.user.id, userRole: "owner", module: "Guías", action: "GUIDE_CONTENT_UPDATED", entity: "guide_content", entityId: content.id, details: JSON.stringify({ slug: content.slug, contentType: content.contentType, active: content.isActive }) });
      return content;
    }),

  adminDelete: adminProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const content = await deleteManagedGuideContent(input.id);
      if (!content) throw new TRPCError({ code: "NOT_FOUND", message: "El contenido de guía ya no existe." });
      await createAuditLog({ venueId: null, userId: ctx.user.id, userRole: "owner", module: "Guías", action: "GUIDE_CONTENT_DELETED", entity: "guide_content", entityId: content.id, details: JSON.stringify({ title: content.title }) });
      return { success: true };
    }),
});
