import { NOT_ADMIN_ERR_MSG, UNAUTHED_ERR_MSG } from '@shared/const';
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { TrpcContext } from "./context";

const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
});

export const router = t.router;
export const publicProcedure = t.procedure;

const requireAuthenticatedUser = t.middleware(async opts => {
  const { ctx, next } = opts;
  const headers = ctx.req?.headers ?? {};

  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }
  if (opts.type === "mutation" && ctx.user.role === "owner" && headers["x-songtap-preview"] === "1") {
    throw new TRPCError({ code: "FORBIDDEN", message: "El modo de pruebas es de solo lectura. Sal de la previsualización para realizar cambios reales." });
  }

  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});

const requireUser = t.middleware(async opts => {
  const { ctx, next } = opts;
  const headers = ctx.req?.headers ?? {};

  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }
  if (ctx.user.mustChangePassword) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Debes cambiar tu contraseña temporal antes de continuar" });
  }
  if (opts.type === "mutation" && ctx.user.role === "owner" && headers["x-songtap-preview"] === "1") {
    throw new TRPCError({ code: "FORBIDDEN", message: "El modo de pruebas es de solo lectura. Sal de la previsualización para realizar cambios reales." });
  }
  const previewRole = headers["x-songtap-preview-role"];
  const previewVenue = Number(headers["x-songtap-preview-venue"]);
  const canScopePreview = opts.type === "query"
    && ctx.user.role === "owner"
    && headers["x-songtap-preview"] === "1"
    && (previewRole === "manager" || previewRole === "staff")
    && Number.isInteger(previewVenue)
    && previewVenue > 0;
  const effectiveUser = canScopePreview ? { ...ctx.user, role: previewRole, venueId: previewVenue } : ctx.user;

  return next({
    ctx: {
      ...ctx,
      user: effectiveUser,
    },
  });
});

export const temporaryPasswordProcedure = t.procedure.use(requireAuthenticatedUser);
export const protectedProcedure = t.procedure.use(requireUser);

export const previewOwnerProcedure = t.procedure.use(
  t.middleware(async ({ ctx, next }) => {
    const headers = ctx.req?.headers ?? {};
    const previewRole = headers["x-songtap-preview-role"];
    const previewVenue = Number(headers["x-songtap-preview-venue"]);
    if (!ctx.user || ctx.user.role !== "owner" || headers["x-songtap-preview"] !== "1" || (previewRole !== "manager" && previewRole !== "staff") || !Number.isInteger(previewVenue) || previewVenue <= 0) {
      throw new TRPCError({ code: "FORBIDDEN", message: "La captura de incidencias solo está disponible durante una previsualización Owner válida." });
    }
    return next({ ctx });
  })
);

export const adminProcedure = t.procedure.use(
  t.middleware(async opts => {
    const { ctx, next } = opts;
    const headers = ctx.req?.headers ?? {};

    if (!ctx.user || ctx.user.role !== 'owner') {
      throw new TRPCError({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }
    if (opts.type === "mutation" && headers["x-songtap-preview"] === "1") {
      throw new TRPCError({ code: "FORBIDDEN", message: "El modo de pruebas es de solo lectura. Sal de la previsualización para realizar cambios reales." });
    }

    return next({
      ctx: {
        ...ctx,
        user: ctx.user,
      },
    });
  }),
);

// Middleware para validar acceso a un venue especifico
export const requireVenueAccess = (venueId: number) => 
  t.middleware(async opts => {
    const { ctx, next } = opts;

    if (!ctx.user) {
      throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
    }

    // Owner global tiene acceso a todos los venues
    if (ctx.user.role === 'owner' && !ctx.user.venueId) {
      return next({ ctx });
    }

    // Manager/Staff solo pueden acceder a su propio venue
    if (ctx.user.venueId !== venueId) {
      throw new TRPCError({ 
        code: "FORBIDDEN", 
        message: "No tienes permiso para acceder a este local" 
      });
    }

    return next({ ctx });
  });

// Procedimiento protegido con validacion de venue
export const venueProtectedProcedure = (venueId: number) =>
  protectedProcedure.use(requireVenueAccess(venueId));
