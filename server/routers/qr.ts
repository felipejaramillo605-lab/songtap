import { TRPCError } from "@trpc/server";
import { nanoid } from "nanoid";
import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import { closeQrSession, createQrSession, getQrSessionByToken, getTableByToken, getVenueById } from "../db";

export const qrRouter = router({
  // Validar el token QR de una mesa y obtener info del local
  validateTable: publicProcedure.input(z.object({ qrToken: z.string() })).query(async ({ input }) => {
    const table = await getTableByToken(input.qrToken);
    if (!table || !table.isActive) throw new TRPCError({ code: "NOT_FOUND", message: "Mesa no encontrada o inactiva" });

    const venue = await getVenueById(table.venueId);
    if (!venue || !venue.isActive) throw new TRPCError({ code: "NOT_FOUND", message: "Local no disponible" });

    return {
      tableId: table.id,
      tableName: table.name,
      venueId: venue.id,
      venueName: venue.name,
      venueAddress: venue.address,
      venuePhone: venue.phone,
      venueLogo: venue.logoUrl,
      socialLinks: venue.socialLinks,
      musicMode: venue.musicMode,
    };
  }),

  // Crear sesión de cliente (el cliente ingresa su nombre)
  startSession: publicProcedure
    .input(z.object({ qrToken: z.string(), clientName: z.string().min(1).max(64) }))
    .mutation(async ({ input }) => {
      const table = await getTableByToken(input.qrToken);
      if (!table || !table.isActive) throw new TRPCError({ code: "NOT_FOUND", message: "Mesa no disponible" });

      const sessionToken = nanoid(48);
      await createQrSession({
        tableId: table.id,
        venueId: table.venueId,
        clientName: input.clientName,
        sessionToken,
        isActive: true,
      });

      const session = await getQrSessionByToken(sessionToken);
      if (!session) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      return { sessionId: session.id, sessionToken, tableId: table.id, venueId: table.venueId, tableName: table.name };
    }),

  // Validar sesión activa del cliente
  validateSession: publicProcedure.input(z.object({ sessionToken: z.string() })).query(async ({ input }) => {
    const session = await getQrSessionByToken(input.sessionToken);
    if (!session || !session.isActive) throw new TRPCError({ code: "UNAUTHORIZED", message: "Sesión inválida o expirada" });



    return {
      sessionId: session.id,
      tableId: session.tableId,
      venueId: session.venueId,
      clientName: session.clientName,
    };
  }),

  // Cerrar sesión del cliente
  closeSession: publicProcedure.input(z.object({ sessionToken: z.string() })).mutation(async ({ input }) => {
    const session = await getQrSessionByToken(input.sessionToken);
    if (!session) throw new TRPCError({ code: "NOT_FOUND" });
    await closeQrSession(session.id);
    return { success: true };
  }),
});
