import { TRPCError } from "@trpc/server";
import { nanoid } from "nanoid";
import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { createAuditLog, createTable, deleteTable, getTablesByVenue, updateTable } from "../db";

function requireVenueAccess(userRole: string, userVenueId: number | null | undefined, venueId: number) {
  if (userRole !== "owner" && userVenueId !== venueId) {
    throw new TRPCError({ code: "FORBIDDEN" });
  }
}

export const tablesRouter = router({
  list: protectedProcedure.input(z.object({ venueId: z.number() })).query(async ({ ctx, input }) => {
    requireVenueAccess(ctx.user.role, ctx.user.venueId, input.venueId);
    return getTablesByVenue(input.venueId);
  }),

  create: protectedProcedure
    .input(z.object({ venueId: z.number(), name: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      requireVenueAccess(ctx.user.role, ctx.user.venueId, input.venueId);
      if (ctx.user.role === "staff") throw new TRPCError({ code: "FORBIDDEN" });
      const qrToken = nanoid(32);
      await createTable({ venueId: input.venueId, name: input.name, qrToken, isActive: true });
      await createAuditLog({
        venueId: input.venueId,
        userId: ctx.user.id,
        userRole: ctx.user.role,
        action: "CREATE_TABLE",
        entity: "table",
        details: JSON.stringify({ name: input.name }),
      });
      return { success: true, qrToken };
    }),

  update: protectedProcedure
    .input(z.object({ id: z.number(), venueId: z.number(), name: z.string().min(1).optional(), isActive: z.boolean().optional() }))
    .mutation(async ({ ctx, input }) => {
      requireVenueAccess(ctx.user.role, ctx.user.venueId, input.venueId);
      const { id, venueId: _v, ...data } = input;
      await updateTable(id, data);
      return { success: true };
    }),

  resetQr: protectedProcedure
    .input(z.object({ id: z.number(), venueId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      requireVenueAccess(ctx.user.role, ctx.user.venueId, input.venueId);
      const newToken = nanoid(32);
      await updateTable(input.id, { qrToken: newToken });
      await createAuditLog({
        venueId: input.venueId,
        userId: ctx.user.id,
        userRole: ctx.user.role,
        action: "RESET_TABLE_QR",
        entity: "table",
        entityId: input.id,
      });
      return { success: true, qrToken: newToken };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number(), venueId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      requireVenueAccess(ctx.user.role, ctx.user.venueId, input.venueId);
      if (ctx.user.role === "staff") throw new TRPCError({ code: "FORBIDDEN" });
      await deleteTable(input.id);
      return { success: true };
    }),
});
