import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { adminProcedure, protectedProcedure, router } from "../_core/trpc";
import { createAuditLog, getAllUsers, getUsersByVenue, updateUserPassword, updateUserRole, getDb } from "../db";
import { users } from "../../drizzle/schema";
import bcrypt from "bcrypt";
import { randomBytes } from "crypto";

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
      if (ctx.user.role !== "owner") throw new TRPCError({ code: "FORBIDDEN" });
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

  resetBetaPassword: adminProcedure
    .input(z.object({ userId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "owner") throw new TRPCError({ code: "FORBIDDEN" });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const [targetUser] = await db.select().from(users).where(eq(users.id, input.userId)).limit(1);
      if (!targetUser) throw new TRPCError({ code: "NOT_FOUND", message: "Usuario no encontrado" });
      const isBetaAccount = Boolean(targetUser.email?.endsWith("@songtap.test")) && (targetUser.role === "manager" || targetUser.role === "staff");
      if (!isBetaAccount) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Solo se pueden restablecer cuentas beta operativas" });
      }

      const temporaryPassword = `Beta!${randomBytes(12).toString("base64url")}`;
      await updateUserPassword(targetUser.id, await bcrypt.hash(temporaryPassword, 10));
      await createAuditLog({
        userId: ctx.user.id,
        userRole: ctx.user.role,
        action: "RESET_BETA_PASSWORD",
        entity: "user",
        entityId: targetUser.id,
        details: JSON.stringify({ email: targetUser.email }),
      });
      return { success: true, userId: targetUser.id, email: targetUser.email, temporaryPassword };
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

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const [targetUser] = await db.select().from(users).where(eq(users.id, input.userId)).limit(1);
      if (!targetUser) throw new TRPCError({ code: "NOT_FOUND", message: "Usuario no encontrado" });

      if (ctx.user.role === "manager") {
        if (input.role !== "staff" || targetUser.id === ctx.user.id) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Un Manager solo puede asignar personal Staff" });
        }
        if (targetUser.role === "owner" || targetUser.role === "manager") {
          throw new TRPCError({ code: "FORBIDDEN", message: "No se puede modificar un usuario con rol superior" });
        }
        if (targetUser.venueId !== null && targetUser.venueId !== ctx.user.venueId) {
          throw new TRPCError({ code: "FORBIDDEN", message: "No se puede mover personal de otra empresa" });
        }
      }

      await updateUserRole(input.userId, input.role, input.venueId);
      await createAuditLog({
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
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const [targetUser] = await db.select().from(users).where(eq(users.id, input.userId)).limit(1);
      if (!targetUser) throw new TRPCError({ code: "NOT_FOUND", message: "Usuario no encontrado" });

      if (ctx.user.id !== input.userId) {
        if (ctx.user.role === "owner") {
          // El Owner tiene alcance global.
        } else if (ctx.user.role === "manager" && targetUser.venueId === ctx.user.venueId && targetUser.role === "staff") {
          // Un Manager solo edita perfiles de Staff de su propio local.
        } else {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
      }
      
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
      
      const userToDelete = await db.select().from(users).where(eq(users.id, input.userId)).limit(1);
      if (!userToDelete[0]) throw new TRPCError({ code: "NOT_FOUND", message: "Usuario no encontrado" });
      if (userToDelete[0]?.role === ("owner" as any)) {
        throw new TRPCError({ code: "FORBIDDEN", message: "No se puede eliminar al owner" });
      }
      
      if (ctx.user.role === "manager") {
        if (userToDelete[0]?.venueId !== ctx.user.venueId || userToDelete[0]?.role === "manager" || userToDelete[0]?.role === ("owner" as any)) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
      }
      
      await db.delete(users).where(eq(users.id, input.userId));
      
      await createAuditLog({
        userId: ctx.user.id,
        userRole: ctx.user.role,
        action: "DELETE_USER",
        entity: "user",
        entityId: input.userId,
      });
      return { success: true };
    }),

  updateMyPreferences: protectedProcedure
    .input(z.object({ language: z.enum(["es", "en"]) }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.update(users).set({ language: input.language }).where(eq(users.id, ctx.user.id));
      return { success: true };
    }),

  updateMyPassword: protectedProcedure
    .input(z.object({ currentPassword: z.string(), newPassword: z.string().min(6) }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const userRecord = await db.select().from(users).where(eq(users.id, ctx.user.id)).limit(1);
      if (!userRecord[0] || !userRecord[0].passwordHash) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Este usuario no usa contraseña local (inicio por OAuth)" });
      }
      const valid = await bcrypt.compare(input.currentPassword, userRecord[0].passwordHash);
      if (!valid) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "La contraseña actual es incorrecta" });
      }
      const newHash = await bcrypt.hash(input.newPassword, 10);
      await db.update(users).set({ passwordHash: newHash }).where(eq(users.id, ctx.user.id));
      return { success: true, message: "Contraseña actualizada con éxito" };
    }),
});
