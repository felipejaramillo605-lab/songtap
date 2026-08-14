import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import {
  createCategory,
  createMenuItem,
  deleteCategory,
  deleteMenuItem,
  getCategoriesByVenue,
  getItemsByVenue,
  getQrSessionByToken,
  updateCategory,
  updateMenuItem,
} from "../db";

function requireVenueAccess(userRole: string, userVenueId: number | null | undefined, venueId: number) {
  if (userRole !== "owner" && userVenueId !== venueId) {
    throw new TRPCError({ code: "FORBIDDEN" });
  }
}

export const menuRouter = router({
  // Público: menú completo para el portal del cliente
  getPublicMenu: publicProcedure.input(z.object({ venueId: z.number(), sessionId: z.number(), sessionToken: z.string().min(16) })).query(async ({ input }) => {
    const session = await getQrSessionByToken(input.sessionToken);
    if (!session || !session.isActive || session.id !== input.sessionId || session.venueId !== input.venueId) {
      throw new TRPCError({ code: "FORBIDDEN", message: "La sesión QR no es válida para consultar el menú" });
    }
    const categories = await getCategoriesByVenue(input.venueId);
    const allItems = await getItemsByVenue(input.venueId);

    return categories.map((cat) => ({
      ...cat,
      items: allItems
        .filter((item) => item.categoryId === cat.id && item.isAvailable)
        .map(({ cost: _cost, ...item }) => item), // ocultar costo
    }));
  }),

  // Privado: menú completo con costos para Manager
  getFullMenu: protectedProcedure.input(z.object({ venueId: z.number() })).query(async ({ ctx, input }) => {
    requireVenueAccess(ctx.user.role, ctx.user.venueId, input.venueId);
    const categories = await getCategoriesByVenue(input.venueId);
    const allItems = await getItemsByVenue(input.venueId);

    return categories.map((cat) => ({
      ...cat,
      items: allItems.filter((item) => item.categoryId === cat.id),
    }));
  }),

  // Categorías
  createCategory: protectedProcedure
    .input(z.object({ venueId: z.number(), name: z.string().min(1), description: z.string().optional(), sortOrder: z.number().optional() }))
    .mutation(async ({ ctx, input }) => {
      requireVenueAccess(ctx.user.role, ctx.user.venueId, input.venueId);
      if (ctx.user.role === "staff") throw new TRPCError({ code: "FORBIDDEN" });
      await createCategory({ ...input, isActive: true });
      return { success: true };
    }),

  updateCategory: protectedProcedure
    .input(z.object({ id: z.number(), venueId: z.number(), name: z.string().optional(), description: z.string().optional(), sortOrder: z.number().optional(), isActive: z.boolean().optional() }))
    .mutation(async ({ ctx, input }) => {
      requireVenueAccess(ctx.user.role, ctx.user.venueId, input.venueId);
      if (ctx.user.role === "staff") throw new TRPCError({ code: "FORBIDDEN" });
      const { id, venueId: _v, ...data } = input;
      const updated = await updateCategory(id, input.venueId, data);
      if (!updated) throw new TRPCError({ code: "NOT_FOUND", message: "Categoría no encontrada en este local" });
      return { success: true };
    }),

  deleteCategory: protectedProcedure
    .input(z.object({ id: z.number(), venueId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      requireVenueAccess(ctx.user.role, ctx.user.venueId, input.venueId);
      if (ctx.user.role === "staff") throw new TRPCError({ code: "FORBIDDEN" });
      const deleted = await deleteCategory(input.id, input.venueId);
      if (!deleted) throw new TRPCError({ code: "NOT_FOUND", message: "Categoría no encontrada en este local" });
      return { success: true };
    }),

  // Ítems
  createItem: protectedProcedure
    .input(
      z.object({
        venueId: z.number(),
        categoryId: z.number(),
        name: z.string().min(1),
        description: z.string().optional(),
        price: z.string(),
        cost: z.string().optional(),
        imageUrl: z.string().optional(),
        sortOrder: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      requireVenueAccess(ctx.user.role, ctx.user.venueId, input.venueId);
      if (ctx.user.role === "staff") throw new TRPCError({ code: "FORBIDDEN" });
      const categories = await getCategoriesByVenue(input.venueId);
      if (!categories.some((category) => category.id === input.categoryId)) {
        throw new TRPCError({ code: "NOT_FOUND", message: "La categoría no pertenece a este local" });
      }
      await createMenuItem({ ...input, isAvailable: true });
      return { success: true };
    }),

  updateItem: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        venueId: z.number(),
        name: z.string().optional(),
        description: z.string().optional(),
        price: z.string().optional(),
        cost: z.string().optional(),
        imageUrl: z.string().optional(),
        isAvailable: z.boolean().optional(),
        sortOrder: z.number().optional(),
        categoryId: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      requireVenueAccess(ctx.user.role, ctx.user.venueId, input.venueId);
      if (ctx.user.role === "staff") throw new TRPCError({ code: "FORBIDDEN" });
      const { id, venueId: _v, ...data } = input;
      if (data.categoryId !== undefined) {
        const categories = await getCategoriesByVenue(input.venueId);
        if (!categories.some((category) => category.id === data.categoryId)) {
          throw new TRPCError({ code: "NOT_FOUND", message: "La categoría no pertenece a este local" });
        }
      }
      const updated = await updateMenuItem(id, input.venueId, data);
      if (!updated) throw new TRPCError({ code: "NOT_FOUND", message: "Ítem no encontrado en este local" });
      return { success: true };
    }),

  deleteItem: protectedProcedure
    .input(z.object({ id: z.number(), venueId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      requireVenueAccess(ctx.user.role, ctx.user.venueId, input.venueId);
      if (ctx.user.role === "staff") throw new TRPCError({ code: "FORBIDDEN" });
      const deleted = await deleteMenuItem(input.id, input.venueId);
      if (!deleted) throw new TRPCError({ code: "NOT_FOUND", message: "Ítem no encontrado en este local" });
      return { success: true };
    }),
});
