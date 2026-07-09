import { NOT_ADMIN_ERR_MSG, UNAUTHED_ERR_MSG } from '@shared/const';
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { TrpcContext } from "./context";

const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
});

export const router = t.router;
export const publicProcedure = t.procedure;

const requireUser = t.middleware(async opts => {
  const { ctx, next } = opts;

  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }

  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});

export const protectedProcedure = t.procedure.use(requireUser);

export const adminProcedure = t.procedure.use(
  t.middleware(async opts => {
    const { ctx, next } = opts;

    if (!ctx.user || ctx.user.role !== 'owner') {
      throw new TRPCError({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
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
