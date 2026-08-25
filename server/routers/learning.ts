import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createAuditLog } from "../db";
import {
  createManagedGuideContent,
  deleteManagedGuideContent,
  getManagedGuideContents,
  searchGuideContentSuggestions,
  updateManagedGuideContent,
  type GuideContentRole,
} from "../guideContentDb";
import { adminProcedure, protectedProcedure, router } from "../_core/trpc";

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

  adminList: adminProcedure.query(() => getManagedGuideContents()),

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
