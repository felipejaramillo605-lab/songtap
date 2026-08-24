import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { getProtectedRouteMetadata } from "../../shared/accessRegistry";
import { createAccessRequest, recordDeniedAccess } from "../db";
import { temporaryPasswordProcedure, router } from "../_core/trpc";

const protectedPathInput = z.string().min(1).max(128);

function resolveTarget(path: string) {
  const target = getProtectedRouteMetadata(path);
  if (!target) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "La ruta solicitada no es válida." });
  }
  return target;
}

export const accessRouter = router({
  recordDenied: temporaryPasswordProcedure
    .input(z.object({ path: protectedPathInput, reason: z.enum(["role", "password_change"]).default("role") }))
    .mutation(async ({ ctx, input }) => {
      const target = resolveTarget(input.path);
      const recorded = await recordDeniedAccess({
        userId: ctx.user.id,
        userRole: ctx.user.role,
        venueId: ctx.user.venueId,
        targetPath: input.path,
        moduleName: target.moduleName,
        reason: input.reason,
      });
      return { success: true, recorded };
    }),

  request: temporaryPasswordProcedure
    .input(z.object({ path: protectedPathInput }))
    .mutation(async ({ ctx, input }) => {
      const target = resolveTarget(input.path);
      if (ctx.user.role === "owner") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "La cuenta Owner no necesita solicitar acceso." });
      }
      if (target.allowedRoles.includes(ctx.user.role)) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Tu cuenta ya tiene acceso a este módulo." });
      }
      if (ctx.user.mustChangePassword) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Cambia tu contraseña temporal antes de solicitar accesos." });
      }

      const result = await createAccessRequest({
        userId: ctx.user.id,
        userRole: ctx.user.role,
        venueId: ctx.user.venueId,
        userName: ctx.user.name ?? ctx.user.email ?? "Usuario",
        targetPath: input.path,
        moduleName: target.moduleName,
      });

      return { success: true, created: result.created };
    }),
});
