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
  getPublicMenu: publicProcedure.input(z.object({ venueId: z.number() })).query(async ({ input }) => {
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
      await updateCategory(id, data);
      return { success: true };
    }),

  deleteCategory: protectedProcedure
    .input(z.object({ id: z.number(), venueId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      requireVenueAccess(ctx.user.role, ctx.user.venueId, input.venueId);
      if (ctx.user.role === "staff") throw new TRPCError({ code: "FORBIDDEN" });
      await deleteCategory(input.id);
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
      await updateMenuItem(id, data);
      return { success: true };
    }),

  deleteItem: protectedProcedure
    .input(z.object({ id: z.number(), venueId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      requireVenueAccess(ctx.user.role, ctx.user.venueId, input.venueId);
      if (ctx.user.role === "staff") throw new TRPCError({ code: "FORBIDDEN" });
      await deleteMenuItem(input.id);
      return { success: true };
    }),
});
