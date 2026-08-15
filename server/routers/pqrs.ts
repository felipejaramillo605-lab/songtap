import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import {
  createAuditLog,
  createPqrsTicket,
  getPqrsTicketForVenue,
  getPqrsTicketsBySession,
  getPqrsTicketsByVenue,
  getQrSessionByToken,
  updatePqrsTicketForVenue,
} from "../db";

const pqrsTypeSchema = z.enum(["petition", "complaint", "claim", "suggestion", "congratulation"]);
const pqrsStatusSchema = z.enum(["open", "in_review", "resolved", "closed"]);

async function requireQrSession(input: { sessionToken: string; sessionId: number; venueId: number; tableId?: number }) {
  const session = await getQrSessionByToken(input.sessionToken);
  if (
    !session ||
    !session.isActive ||
    session.id !== input.sessionId ||
    session.venueId !== input.venueId ||
    (input.tableId !== undefined && session.tableId !== input.tableId)
  ) {
    throw new TRPCError({ code: "FORBIDDEN", message: "La sesión QR no es válida para gestionar PQRS" });
  }
  return session;
}

function requireVenueAccess(user: { role: string; venueId: number | null }, venueId: number) {
  if (user.role !== "owner" && user.venueId !== venueId) {
    throw new TRPCError({ code: "FORBIDDEN", message: "No tienes acceso a las PQRS de este local" });
  }
}

export const pqrsRouter = router({
  create: publicProcedure
    .input(
      z.object({
        sessionToken: z.string().min(16),
        sessionId: z.number(),
        venueId: z.number(),
        tableId: z.number(),
        type: pqrsTypeSchema,
        subject: z.string().trim().min(3).max(255),
        message: z.string().trim().min(10).max(5000),
      })
    )
    .mutation(async ({ input }) => {
      const session = await requireQrSession(input);
      const result = await createPqrsTicket({
        venueId: session.venueId,
        tableId: session.tableId,
        sessionId: session.id,
        clientName: session.clientName,
        type: input.type,
        subject: input.subject,
        message: input.message,
        status: "open",
      });
      return { success: true, ticketId: Number((result as { insertId?: number }).insertId ?? 0) };
    }),

  getMyTickets: publicProcedure
    .input(z.object({ sessionToken: z.string().min(16), sessionId: z.number(), venueId: z.number() }))
    .query(async ({ input }) => {
      const session = await requireQrSession(input);
      return getPqrsTicketsBySession(session.id, session.venueId);
    }),

  listByVenue: protectedProcedure
    .input(z.object({ venueId: z.number(), status: pqrsStatusSchema.optional() }))
    .query(async ({ ctx, input }) => {
      requireVenueAccess(ctx.user, input.venueId);
      return getPqrsTicketsByVenue(input.venueId, input.status);
    }),

  update: protectedProcedure
    .input(
      z.object({
        venueId: z.number(),
        ticketId: z.number(),
        status: pqrsStatusSchema,
        response: z.string().trim().max(5000).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      requireVenueAccess(ctx.user, input.venueId);
      const ticket = await getPqrsTicketForVenue(input.ticketId, input.venueId);
      if (!ticket) throw new TRPCError({ code: "NOT_FOUND", message: "PQRS no encontrada en este local" });

      const hasResponseUpdate = input.response !== undefined;
      const normalizedResponse = input.response?.trim() || null;
      const updated = await updatePqrsTicketForVenue(input.ticketId, input.venueId, {
        status: input.status,
        response: hasResponseUpdate ? normalizedResponse : ticket.response,
        respondedByUserId: hasResponseUpdate && normalizedResponse ? ctx.user.id : ticket.respondedByUserId,
        respondedAt: hasResponseUpdate && normalizedResponse ? new Date() : ticket.respondedAt,
      });
      if (!updated) throw new TRPCError({ code: "NOT_FOUND", message: "PQRS no encontrada en este local" });

      await createAuditLog({
        venueId: input.venueId,
        userId: ctx.user.id,
        userRole: ctx.user.role,
        module: "PQRS",
        action: `PQRS_${input.status.toUpperCase()}`,
        entity: "pqrs_ticket",
        entityId: input.ticketId,
        details: JSON.stringify({ status: input.status, responseAdded: Boolean(normalizedResponse) }),
      });
      return { success: true };
    }),
});
