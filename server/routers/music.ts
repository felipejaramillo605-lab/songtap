import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import { createMusicRequest, getMusicQueue, updateMusicRequestStatus } from "../db";

export const musicRouter = router({
  // Cliente: solicitar canción
  request: publicProcedure
    .input(
      z.object({
        venueId: z.number(),
        sessionId: z.number(),
        clientName: z.string(),
        songTitle: z.string().min(1),
        artist: z.string().optional(),
        spotifyUri: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      await createMusicRequest({ ...input, status: "queued" });
      return { success: true };
    }),

  // Staff/Manager: ver cola de canciones
  getQueue: protectedProcedure.input(z.object({ venueId: z.number() })).query(async ({ ctx, input }) => {
    if (ctx.user.role !== "owner" && ctx.user.venueId !== input.venueId) {
      throw new TRPCError({ code: "FORBIDDEN" });
    }
    return getMusicQueue(input.venueId);
  }),

  // Staff: actualizar estado de canción
  updateStatus: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        venueId: z.number(),
        status: z.enum(["queued", "playing", "played", "rejected"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "owner" && ctx.user.venueId !== input.venueId) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      await updateMusicRequestStatus(input.id, input.status, ctx.user.id);
      return { success: true };
    }),
});
