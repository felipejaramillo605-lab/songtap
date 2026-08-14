import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import {
  addSongToQueue,
  getCurrentSong,
  getSongQueue,
  updateCurrentSong,
  removeSongFromQueue,
  submitAppauseVote,
  getAppauseScore,
  getQrSessionByToken,
} from "../db";

function assertVenueAccess(user: { role: string; venueId: number | null }, venueId: number) {
  if (user.role !== "owner" && user.venueId !== venueId) {
    throw new TRPCError({ code: "FORBIDDEN" });
  }
}

async function assertClientQrSession(input: {
  sessionToken: string;
  sessionId: number;
  venueId: number;
  tableId?: number;
}) {
  const session = await getQrSessionByToken(input.sessionToken);
  if (
    !session ||
    !session.isActive ||
    session.id !== input.sessionId ||
    session.venueId !== input.venueId ||
    (input.tableId !== undefined && session.tableId !== input.tableId)
  ) {
    throw new TRPCError({ code: "FORBIDDEN", message: "La sesión QR no es válida para este acceso" });
  }
  return session;
}

export const musicRouter = router({
  // Cliente: canción que está sonando actualmente.
  getCurrentSong: publicProcedure
    .input(z.object({ venueId: z.number(), sessionId: z.number(), sessionToken: z.string().min(16) }))
    .query(async ({ input }) => {
      await assertClientQrSession(input);
      return getCurrentSong(input.venueId);
    }),

  // Cliente: cola pública con la canción actual y las próximas canciones.
  getClientQueue: publicProcedure
    .input(z.object({ venueId: z.number(), sessionId: z.number(), sessionToken: z.string().min(16) }))
    .query(async ({ input }) => {
      await assertClientQrSession(input);
      return {
        current: await getCurrentSong(input.venueId),
        queue: await getSongQueue(input.venueId),
      };
    }),

  // Staff/Manager: contrato protegido compatible con la cola operativa existente.
  getQueue: protectedProcedure
    .input(z.object({ venueId: z.number() }))
    .query(async ({ ctx, input }) => {
      assertVenueAccess(ctx.user, input.venueId);
      return getSongQueue(input.venueId);
    }),

  // Staff/Manager: cola operativa incluida la canción actual, sin exponerla públicamente por venueId.
  getStaffQueue: protectedProcedure
    .input(z.object({ venueId: z.number() }))
    .query(async ({ ctx, input }) => {
      assertVenueAccess(ctx.user, input.venueId);
      return {
        current: await getCurrentSong(input.venueId),
        queue: await getSongQueue(input.venueId),
      };
    }),

  // Cliente: solicitar una canción para el final de la cola FIFO.
  requestSong: publicProcedure
    .input(
      z.object({
        venueId: z.number(),
        sessionId: z.number(),
        sessionToken: z.string().min(16),
        songName: z.string().min(1),
        artist: z.string().min(1),
        spotifyTrackId: z.string().optional(),
        addedByTableId: z.number(),
        addedByTableName: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const session = await assertClientQrSession(input);
      if (session.tableId !== input.addedByTableId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "La sesión QR no pertenece a esta mesa" });
      }
      const existingQueue = await getSongQueue(input.venueId);
      const position = existingQueue.length + 1;
      const isCurrentlyPlaying = existingQueue.length === 0;

      await addSongToQueue({
        venueId: input.venueId,
        songName: input.songName,
        artist: input.artist,
        spotifyTrackId: input.spotifyTrackId || null,
        position,
        isCurrentlyPlaying,
        addedByTableId: input.addedByTableId,
        addedByTableName: input.addedByTableName || `Mesa ${session.tableId}`,
      });

      return { success: true };
    }),

  // Staff: marcar una canción como la canción actual.
  playSong: protectedProcedure
    .input(z.object({ venueId: z.number(), songId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      assertVenueAccess(ctx.user, input.venueId);
      const updated = await updateCurrentSong(input.venueId, input.songId);
      if (!updated) throw new TRPCError({ code: "NOT_FOUND", message: "Canción no encontrada en este local" });
      return { success: true };
    }),

  // Staff: remover una canción de su cola.
  removeSong: protectedProcedure
    .input(z.object({ venueId: z.number(), songId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      assertVenueAccess(ctx.user, input.venueId);
      await removeSongFromQueue(input.songId, input.venueId);
      return { success: true };
    }),

  // Cliente: enviar aplausos de 1 a 5 estrellas.
  submitApplause: publicProcedure
    .input(
      z.object({
        venueId: z.number(),
        sessionId: z.number(),
        sessionToken: z.string().min(16),
        songId: z.number(),
        votingTableId: z.number(),
        votingTableName: z.string().optional(),
        performingTableId: z.number().optional(),
        performingTableName: z.string().optional(),
        rating: z.number().int().min(1).max(5),
      })
    )
    .mutation(async ({ input }) => {
      const session = await assertClientQrSession(input);
      if (session.tableId !== input.votingTableId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "La sesión QR no pertenece a esta mesa" });
      }
      await submitAppauseVote(input);
      return { success: true };
    }),

  // Cliente/Staff: puntuación agregada de una canción.
  getApplauseScore: publicProcedure
    .input(z.object({ venueId: z.number(), sessionId: z.number(), sessionToken: z.string().min(16), songId: z.number() }))
    .query(async ({ input }) => {
      await assertClientQrSession(input);
      return getAppauseScore(input.venueId, input.songId);
    }),
});
