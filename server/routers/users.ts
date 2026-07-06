import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { adminProcedure, protectedProcedure, router } from "../_core/trpc";
import { createAuditLog, getAllUsers, getUsersByVenue, updateUserRole } from "../db";

export const usersRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user.role === "owner") {
      return getAllUsers();
    }
    if (ctx.user.venueId) {
      return getUsersByVenue(ctx.user.venueId);
    }
    return [];
  }),

  updateRole: adminProcedure
    .input(
      z.object({
        userId: z.number(),
        role: z.enum(["owner", "manager", "staff", "user"]),
        venueId: z.number().nullable().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await updateUserRole(input.userId, input.role, input.venueId);
      await createAuditLog({
        userId: ctx.user.id,
        userRole: ctx.user.role,
        action: "UPDATE_USER_ROLE",
        entity: "user",
        entityId: input.userId,
        details: JSON.stringify({ role: input.role, venueId: input.venueId }),
      });
      return { success: true };
    }),

  assignToVenue: protectedProcedure
    .input(z.object({ userId: z.number(), venueId: z.number(), role: z.enum(["manager", "staff"]) }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "owner" && ctx.user.role !== "manager") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      if (ctx.user.role === "manager" && ctx.user.venueId !== input.venueId) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      await updateUserRole(input.userId, input.role, input.venueId);
      await createAuditLog({
        venueId: input.venueId,
        userId: ctx.user.id,
        userRole: ctx.user.role,
        action: "ASSIGN_USER_TO_VENUE",
        entity: "user",
        entityId: input.userId,
        details: JSON.stringify(input),
      });
      return { success: true };
    }),
});
