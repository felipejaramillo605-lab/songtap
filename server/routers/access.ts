import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { getProtectedRouteMetadata, type SongTapRole } from "../../shared/accessRegistry";
import { createAccessRequest, getInternalAccessComments, getOwnerAccessRequestOverview, getPendingAccessRequests, getUserAccessDecisionHistory, recordDeniedAccess, resolveAccessRequest, createAuditLog } from "../db";
import { adminProcedure, temporaryPasswordProcedure, router } from "../_core/trpc";

const protectedPathInput = z.string().min(1).max(128);
const roleRank: Record<SongTapRole, number> = { user: 0, staff: 1, manager: 2, owner: 3 };

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
      const grantedRole = target.allowedRoles[0];
      if (!grantedRole || grantedRole === "owner" || roleRank[grantedRole] <= roleRank[ctx.user.role]) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Este módulo no admite solicitudes de elevación de acceso." });
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

  getPending: adminProcedure.query(async () => getPendingAccessRequests()),

  getOwnerOverview: adminProcedure.query(async () => getOwnerAccessRequestOverview()),

  getInternalComments: adminProcedure
    .input(z.object({ startDate: z.coerce.date().optional(), endDate: z.coerce.date().optional() }).optional())
    .query(async ({ input }) => getInternalAccessComments(input ?? {})),

  getMyDecisionHistory: temporaryPasswordProcedure
    .input(z.object({ limit: z.number().int().min(1).max(100).optional() }).optional())
    .query(async ({ ctx, input }) => getUserAccessDecisionHistory(ctx.user.id, input?.limit ?? 50)),

  resolve: adminProcedure
    .input(z.object({ requestId: z.number().int().positive(), decision: z.enum(["approved", "rejected"]), reason: z.string().trim().max(500).optional(), internalComment: z.string().trim().max(1000).optional() }))
    .mutation(async ({ ctx, input }) => {
      if (input.decision === "rejected" && !input.reason) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Indica el motivo del rechazo." });
      }
      const pending = await getPendingAccessRequests();
      const request = pending.find((item) => item.id === input.requestId);
      if (!request) throw new TRPCError({ code: "NOT_FOUND", message: "La solicitud pendiente no fue encontrada." });

      const target = resolveTarget(request.targetPath);
      const grantedRole = target.allowedRoles[0];
      if (input.decision === "approved" && (!grantedRole || grantedRole === "owner" || !request.venueId || roleRank[grantedRole] <= roleRank[request.requesterRole as SongTapRole])) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Esta solicitud no puede otorgar una elevación de acceso válida." });
      }

      const result = await resolveAccessRequest({
        requestId: input.requestId,
        ownerId: ctx.user.id,
        decision: input.decision,
        reason: input.reason,
        internalComment: input.internalComment,
        grantedRole: input.decision === "approved" ? grantedRole as "manager" | "staff" : undefined,
      });
      await createAuditLog({
        venueId: result.request.venueId,
        userId: ctx.user.id,
        userRole: ctx.user.role,
        module: "Control de acceso",
        action: input.decision === "approved" ? "ACCESS_APPROVED" : "ACCESS_REJECTED",
        entity: "access_request",
        entityId: input.requestId,
        details: JSON.stringify({ targetPath: result.request.targetPath, moduleName: result.request.moduleName, requesterId: result.request.userId, grantedRole: result.grantedRole, reason: input.reason?.trim() || null, internalComment: input.internalComment?.trim() || null }),
      });
      return { success: true, decision: input.decision };
    }),
});
