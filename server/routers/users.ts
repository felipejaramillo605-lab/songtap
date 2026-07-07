import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { adminProcedure, protectedProcedure, router } from "../_core/trpc";
import { createAuditLog, getAllUsers, getUsersByVenue, updateUserRole, getDb } from "../db";
import { users } from "../../drizzle/schema";

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

  updateProfile: protectedProcedure
    .input(
      z.object({
        userId: z.number(),
        name: z.string().optional(),
        email: z.string().email().optional(),
        phone: z.string().optional(),
        cedula: z.string().optional(),
        address: z.string().optional(),
        photoUrl: z.string().optional(),
        cvUrl: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Solo el usuario puede editar su propio perfil, o un manager/owner de su venue
      if (ctx.user.id !== input.userId && ctx.user.role !== "owner" && ctx.user.role !== "manager") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      
      const { userId, ...updateData } = input;
      await db.update(users).set(updateData).where(eq(users.id, userId));
      
      await createAuditLog({
        userId: ctx.user.id,
        userRole: ctx.user.role,
        action: "UPDATE_USER_PROFILE",
        entity: "user",
        entityId: userId,
        details: JSON.stringify(updateData),
      });
      return { success: true };
    }),

  deleteUser: protectedProcedure
    .input(z.object({ userId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "owner" && ctx.user.role !== "manager") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      
      // No permitir eliminar al owner
      const userToDelete = await db.select().from(users).where(eq(users.id, input.userId)).limit(1);
      if (userToDelete[0]?.role === "owner") {
        throw new TRPCError({ code: "FORBIDDEN", message: "No se puede eliminar al owner" });
      }
      
      // Manager solo puede eliminar staff de su venue
      if (ctx.user.role === "manager" && userToDelete[0]?.venueId !== ctx.user.venueId) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      
      await db.delete(users).where(eq(users.id, input.userId));
      
      await createAuditLog({
        userId: ctx.user.id,
        userRole: ctx.user.role,
        action: "DELETE_USER",
        entity: "user",
        entityId: input.userId,
        details: JSON.stringify({}),
      });
      return { success: true };
    }),
});
