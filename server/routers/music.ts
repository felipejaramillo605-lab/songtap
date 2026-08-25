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
  getSongByIdForVenue,
  updateSongMetadataForVenue,
  getSongPlaybackHistory,
  getVenueKaraokeProviders,
  saveKaraokeLinkForSong,
  updateKaraokeLinkStatusForSong,
  notifyVenueManagersOfKaraokeReview,
  getOwnerKaraokeLinkMetrics,
} from "../db";
import { normalizeMusicMetadata } from "../musicMetadata";

const karaokeUrlSchema = z.string().url().max(2048).refine((value) => {
  try {
    return ["http:", "https:"].includes(new URL(value).protocol);
  } catch {
    return false;
  }
}, "El enlace debe usar HTTP o HTTPS");

function sanitizeSongForClient<T extends Record<string, unknown> | null>(song: T) {
  if (!song) return null;
  const {
    karaokeUrl,
    karaokeProviderName,
    karaokeSavedByUserId,
    karaokeSavedAt,
    karaokeLinkStatus,
    karaokeLinkReviewNote,
    karaokeReviewDueAt,
    karaokeLinkStatusUpdatedByUserId,
    karaokeLinkStatusUpdatedAt,
    playedByUserId,
    playedByUserName,
    ...publicSong
  } = song;
  return publicSong;
}

function assertVenueAccess(user: { role: string; venueId: number | null }, venueId: number) {
  if (user.role !== "owner" && user.venueId !== venueId) {
    throw new TRPCError({ code: "FORBIDDEN" });
  }
}

function assertOwner(user: { role: string }) {
  if (user.role !== "owner") throw new TRPCError({ code: "FORBIDDEN" });
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
      return sanitizeSongForClient(await getCurrentSong(input.venueId));
    }),

  // Cliente: cola pública con la canción actual y las próximas canciones.
  getClientQueue: publicProcedure
    .input(z.object({ venueId: z.number(), sessionId: z.number(), sessionToken: z.string().min(16) }))
    .query(async ({ input }) => {
      await assertClientQrSession(input);
      const [current, queue] = await Promise.all([getCurrentSong(input.venueId), getSongQueue(input.venueId)]);
      return {
        current: sanitizeSongForClient(current),
        queue: queue.map((song) => sanitizeSongForClient(song)!),
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

  // Staff/Manager: proveedores de búsqueda configurados para el propio local.
  getKaraokeProviders: protectedProcedure
    .input(z.object({ venueId: z.number() }))
    .query(async ({ ctx, input }) => {
      assertVenueAccess(ctx.user, input.venueId);
      return getVenueKaraokeProviders(input.venueId);
    }),

  // Owner: métricas agregadas de calidad de enlaces por cada local activo.
  getOwnerKaraokeLinkMetrics: protectedProcedure
    .query(async ({ ctx }) => {
      assertOwner(ctx.user);
      return getOwnerKaraokeLinkMetrics();
    }),

  // Staff/Manager: historial de canciones que terminaron de reproducirse.
  getPlaybackHistory: protectedProcedure
    .input(z.object({
      venueId: z.number(),
      limit: z.number().int().min(1).max(100).default(50),
      from: z.date().optional(),
      to: z.date().optional(),
    }).refine((input) => !input.from || !input.to || input.from <= input.to, {
      message: "La fecha inicial no puede ser posterior a la fecha final",
      path: ["to"],
    }))
    .query(async ({ ctx, input }) => {
      assertVenueAccess(ctx.user, input.venueId);
      return getSongPlaybackHistory(input.venueId, { limit: input.limit, from: input.from, to: input.to });
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
      const isCurrentlyPlaying = false;

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
      const updated = await updateCurrentSong(input.venueId, input.songId, { id: ctx.user.id, name: ctx.user.name ?? null });
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

  // Staff/Manager: conservar el enlace de karaoke seleccionado para una canción del propio local.
  saveKaraokeLink: protectedProcedure
    .input(z.object({
      venueId: z.number(),
      songId: z.number(),
      karaokeUrl: karaokeUrlSchema,
      karaokeProviderName: z.string().trim().min(1).max(128).nullable().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      assertVenueAccess(ctx.user, input.venueId);
      const saved = await saveKaraokeLinkForSong({
        venueId: input.venueId,
        songId: input.songId,
        karaokeUrl: input.karaokeUrl,
        karaokeProviderName: input.karaokeProviderName ?? null,
        karaokeSavedByUserId: ctx.user.id,
      });
      if (!saved) throw new TRPCError({ code: "NOT_FOUND", message: "Canción no encontrada en este local" });
      return { success: true };
    }),

  // Staff/Manager: indicar si un enlace elegido funciona o requiere revisión.
  updateKaraokeLinkStatus: protectedProcedure
    .input(z.object({
      venueId: z.number(),
      songId: z.number(),
      status: z.enum(["unverified", "working", "needs_review"]),
      reviewNote: z.string().trim().max(500).optional(),
      reviewDueAt: z.date().optional(),
    }).superRefine((input, context) => {
      if (input.status === "needs_review" && !input.reviewNote?.trim()) {
        context.addIssue({ code: "custom", path: ["reviewNote"], message: "Explica por qué el enlace requiere revisión" });
      }
      if (input.status === "needs_review" && !input.reviewDueAt) {
        context.addIssue({ code: "custom", path: ["reviewDueAt"], message: "Define una fecha límite para la revisión" });
      }
      if (input.status === "needs_review" && input.reviewDueAt && input.reviewDueAt <= new Date()) {
        context.addIssue({ code: "custom", path: ["reviewDueAt"], message: "La fecha límite debe ser futura" });
      }
    }))
    .mutation(async ({ ctx, input }) => {
      assertVenueAccess(ctx.user, input.venueId);
      const song = await getSongByIdForVenue(input.songId, input.venueId);
      if (!song) throw new TRPCError({ code: "NOT_FOUND", message: "Canción no encontrada en este local" });
      if (!song.karaokeUrl) throw new TRPCError({ code: "BAD_REQUEST", message: "Primero guarda un enlace de karaoke para esta canción" });
      const updated = await updateKaraokeLinkStatusForSong({
        venueId: input.venueId,
        songId: input.songId,
        status: input.status,
        reviewNote: input.reviewNote?.trim() || null,
        reviewDueAt: input.reviewDueAt ?? null,
        updatedByUserId: ctx.user.id,
      });
      if (!updated) throw new TRPCError({ code: "NOT_FOUND", message: "Canción no encontrada en este local" });
      if (input.status === "needs_review" && input.reviewDueAt && input.reviewNote?.trim()) {
        await notifyVenueManagersOfKaraokeReview({
          venueId: input.venueId,
          songName: song.songName,
          artist: song.artist,
          reviewNote: input.reviewNote.trim(),
          reviewDueAt: input.reviewDueAt,
          actorUserId: ctx.user.id,
        });
      }
      return { success: true };
    }),

  // Staff/Manager: sugerir formato consistente de título y artista sin usar proveedores externos.
  normalizeSongMetadata: protectedProcedure
    .input(z.object({ venueId: z.number(), songId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      assertVenueAccess(ctx.user, input.venueId);
      const song = await getSongByIdForVenue(input.songId, input.venueId);
      if (!song) throw new TRPCError({ code: "NOT_FOUND", message: "Canción no encontrada en este local" });
      const normalized = normalizeMusicMetadata(song.songName, song.artist);
      if (normalized.changed) {
        const updated = await updateSongMetadataForVenue(input.songId, input.venueId, normalized.songName, normalized.artist);
        if (!updated) throw new TRPCError({ code: "NOT_FOUND", message: "Canción no encontrada en este local" });
      }
      return { success: true, normalized };
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
