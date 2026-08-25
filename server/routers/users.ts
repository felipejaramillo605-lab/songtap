import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { adminProcedure, protectedProcedure, router, temporaryPasswordProcedure } from "../_core/trpc";
import { createAuditLog, getAllUsers, getUserFavoriteModules, getUsersByVenue, revokeUserSessions, setUserFavoriteModule, updateUserPassword, updateUserRole, getDb } from "../db";
import { users } from "../../drizzle/schema";
import bcrypt from "bcrypt";
import { randomBytes } from "crypto";
import { favoriteModulesByRole, isFavoriteModuleAllowed } from "../../shared/favoriteModules";
import { toClientSafeUser, toTeamSafeUser } from "../userSafety";
import { storageGetSignedUrl } from "../storage";

const PRIVATE_CV_PREFIX = "private-cv://";

function getPrivateCvKey(cvUrl: string | null | undefined, userId: number) {
  if (!cvUrl?.startsWith(PRIVATE_CV_PREFIX)) return null;
  const key = cvUrl.slice(PRIVATE_CV_PREFIX.length);
  const expectedPrefix = `private/cv/${userId}/`;
  if (!key.startsWith(expectedPrefix) || key.includes("..") || key.includes("\\")) return null;
  return key;
}

export const usersRouter = router({
  favoriteModules: protectedProcedure.query(async ({ ctx }) => {
    if (!(ctx.user.role in favoriteModulesByRole)) return [];
    const favoriteKeys = new Set((await getUserFavoriteModules(ctx.user.id)).map((favorite) => favorite.moduleKey));
    return favoriteModulesByRole[ctx.user.role as keyof typeof favoriteModulesByRole].map((module) => ({ ...module, isFavorite: favoriteKeys.has(module.key) }));
  }),

  setFavoriteModule: protectedProcedure
    .input(z.object({ moduleKey: z.string().min(1).max(96), isFavorite: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      if (!isFavoriteModuleAllowed(ctx.user.role, input.moduleKey)) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Este módulo no está disponible para tu rol" });
      }
      await setUserFavoriteModule(ctx.user.id, input.moduleKey, input.isFavorite);
      await createAuditLog({
        userId: ctx.user.id,
        userRole: ctx.user.role,
        action: input.isFavorite ? "PIN_FAVORITE_MODULE" : "UNPIN_FAVORITE_MODULE",
        entity: "user_favorite_module",
        details: JSON.stringify({ moduleKey: input.moduleKey }),
      });
      return { success: true };
    }),

  list: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user.role === "owner") {
      return (await getAllUsers()).map(toTeamSafeUser);
    }
    if (ctx.user.venueId) {
      return (await getUsersByVenue(ctx.user.venueId)).map(toTeamSafeUser);
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
      await updateUserPassword(targetUser.id, await bcrypt.hash(temporaryPassword, 10), true);
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

  revokeBetaSessions: adminProcedure
    .input(z.object({ userId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "owner") throw new TRPCError({ code: "FORBIDDEN" });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const [targetUser] = await db.select().from(users).where(eq(users.id, input.userId)).limit(1);
      if (!targetUser) throw new TRPCError({ code: "NOT_FOUND", message: "Usuario no encontrado" });
      const isBetaAccount = Boolean(targetUser.email?.endsWith("@songtap.test")) && (targetUser.role === "manager" || targetUser.role === "staff");
      if (!isBetaAccount || targetUser.id === ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Solo se pueden revocar sesiones de cuentas beta operativas" });
      }
      const sessionVersion = await revokeUserSessions(targetUser.id);
      await createAuditLog({
        userId: ctx.user.id,
        userRole: ctx.user.role,
        action: "REVOKE_BETA_SESSIONS",
        entity: "user",
        entityId: targetUser.id,
        details: JSON.stringify({ email: targetUser.email, sessionVersion }),
      });
      return { success: true, userId: targetUser.id, sessionVersion };
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

      if (input.cvUrl !== undefined && !getPrivateCvKey(input.cvUrl, targetUser.id)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Por seguridad, el CV debe cargarse nuevamente desde el perfil para guardarse de forma privada.",
        });
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

  getCvDownloadUrl: protectedProcedure
    .input(z.object({ userId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const [targetUser] = await db.select().from(users).where(eq(users.id, input.userId)).limit(1);
      if (!targetUser) throw new TRPCError({ code: "NOT_FOUND", message: "Usuario no encontrado" });

      const isSelf = ctx.user.id === targetUser.id;
      const isOwner = ctx.user.role === "owner";
      const isManagerOfStaff = ctx.user.role === "manager"
        && targetUser.role === "staff"
        && ctx.user.venueId !== null
        && targetUser.venueId === ctx.user.venueId;
      if (!isSelf && !isOwner && !isManagerOfStaff) {
        throw new TRPCError({ code: "FORBIDDEN", message: "No tienes permiso para descargar este CV" });
      }

      const key = getPrivateCvKey(targetUser.cvUrl, targetUser.id);
      if (!key) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "No hay un CV privado disponible. Vuelve a cargarlo desde el perfil.",
        });
      }

      const url = await storageGetSignedUrl(key);
      return { url };
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

  completeTemporaryPassword: temporaryPasswordProcedure
    .input(z.object({ newPassword: z.string().min(10) }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user.mustChangePassword) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "No tienes un cambio de contraseña pendiente" });
      }
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const [userRecord] = await db.select().from(users).where(eq(users.id, ctx.user.id)).limit(1);
      if (!userRecord?.passwordHash) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Esta cuenta no usa contraseña local" });
      }
      await updateUserPassword(ctx.user.id, await bcrypt.hash(input.newPassword, 10), false);
      await createAuditLog({
        userId: ctx.user.id,
        userRole: ctx.user.role,
        action: "COMPLETE_TEMPORARY_PASSWORD_CHANGE",
        entity: "user",
        entityId: ctx.user.id,
      });
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
      await updateUserPassword(ctx.user.id, newHash, false);
      return { success: true, message: "Contraseña actualizada con éxito" };
    }),
});
