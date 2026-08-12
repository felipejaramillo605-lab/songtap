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
} from "../db";

function assertVenueAccess(user: { role: string; venueId: number | null }, venueId: number) {
  if (user.role !== "owner" && user.venueId !== venueId) {
    throw new TRPCError({ code: "FORBIDDEN" });
  }
}

export const musicRouter = router({
  // Cliente: canción que está sonando actualmente.
  getCurrentSong: publicProcedure
    .input(z.object({ venueId: z.number() }))
    .query(async ({ input }) => getCurrentSong(input.venueId)),

  // Cliente: cola pública con la canción actual y las próximas canciones.
  getClientQueue: publicProcedure
    .input(z.object({ venueId: z.number() }))
    .query(async ({ input }) => ({
      current: await getCurrentSong(input.venueId),
      queue: await getSongQueue(input.venueId),
    })),

  // Staff/Manager: contrato protegido compatible con la cola operativa existente.
  getQueue: protectedProcedure
    .input(z.object({ venueId: z.number() }))
    .query(async ({ ctx, input }) => {
      assertVenueAccess(ctx.user, input.venueId);
      return getSongQueue(input.venueId);
    }),

  // Cliente: solicitar una canción para el final de la cola FIFO.
  requestSong: publicProcedure
    .input(
      z.object({
        venueId: z.number(),
        songName: z.string().min(1),
        artist: z.string().min(1),
        spotifyTrackId: z.string().optional(),
        addedByTableId: z.number().optional(),
        addedByTableName: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
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
        addedByTableId: input.addedByTableId || null,
        addedByTableName: input.addedByTableName || "Mesa Invitada",
      });

      return { success: true };
    }),

  // Staff: marcar una canción como la canción actual.
  playSong: protectedProcedure
    .input(z.object({ venueId: z.number(), songId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      assertVenueAccess(ctx.user, input.venueId);
      await updateCurrentSong(input.venueId, input.songId);
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
        songId: z.number(),
        votingTableId: z.number(),
        votingTableName: z.string().optional(),
        performingTableId: z.number().optional(),
        performingTableName: z.string().optional(),
        rating: z.number().int().min(1).max(5),
      })
    )
    .mutation(async ({ input }) => {
      await submitAppauseVote(input);
      return { success: true };
    }),

  // Cliente/Staff: puntuación agregada de una canción.
  getApplauseScore: publicProcedure
    .input(z.object({ venueId: z.number(), songId: z.number() }))
    .query(async ({ input }) => getAppauseScore(input.venueId, input.songId)),
});
