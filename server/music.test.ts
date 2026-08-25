import { beforeEach, describe, expect, it, vi } from "vitest";

const dbMocks = vi.hoisted(() => ({
  addSongToQueue: vi.fn(),
  getCurrentSong: vi.fn(),
  getSongQueue: vi.fn(),
  updateCurrentSong: vi.fn(),
  removeSongFromQueue: vi.fn(),
  submitAppauseVote: vi.fn(),
  getAppauseScore: vi.fn(),
  getQrSessionByToken: vi.fn(),
  getSongByIdForVenue: vi.fn(),
  updateSongMetadataForVenue: vi.fn(),
  getSongPlaybackHistory: vi.fn(),
  getVenueKaraokeProviders: vi.fn(),
  saveKaraokeLinkForSong: vi.fn(),
  updateKaraokeLinkStatusForSong: vi.fn(),
  notifyVenueManagersOfKaraokeReview: vi.fn(),
  getOwnerKaraokeLinkMetrics: vi.fn(),
}));

vi.mock("./db", () => dbMocks);

import { musicRouter } from "./routers/music";

const publicContext = {
  user: null,
  req: {} as any,
  res: {} as any,
};

describe("music router", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dbMocks.getSongQueue.mockResolvedValue([]);
    dbMocks.getCurrentSong.mockResolvedValue(null);
    dbMocks.addSongToQueue.mockResolvedValue(undefined);
    dbMocks.submitAppauseVote.mockResolvedValue(undefined);
    dbMocks.getAppauseScore.mockResolvedValue({ averageRating: 0, totalVotes: 0, ratingsByPerformingTable: [] });
    dbMocks.getQrSessionByToken.mockResolvedValue({ id: 70, venueId: 7, tableId: 3, isActive: true });
    dbMocks.getSongByIdForVenue.mockResolvedValue({ id: 14, venueId: 7, songName: "  Vivir Mi Vida - Marc Anthony ", artist: "Artista desconocido" });
    dbMocks.updateSongMetadataForVenue.mockResolvedValue(true);
    dbMocks.updateCurrentSong.mockResolvedValue(true);
    dbMocks.getSongPlaybackHistory.mockResolvedValue([]);
    dbMocks.getVenueKaraokeProviders.mockResolvedValue([]);
    dbMocks.saveKaraokeLinkForSong.mockResolvedValue(true);
    dbMocks.updateKaraokeLinkStatusForSong.mockResolvedValue(true);
    dbMocks.notifyVenueManagersOfKaraokeReview.mockResolvedValue(1);
    dbMocks.getOwnerKaraokeLinkMetrics.mockResolvedValue({ totals: { totalLinks: 0, workingLinks: 0, unverifiedLinks: 0, needsReviewLinks: 0, workingRate: 0 }, venues: [] });
  });

  it("adds a requested song at the end of the FIFO queue", async () => {
    dbMocks.getSongQueue.mockResolvedValue([
      { id: 10, position: 1 },
      { id: 11, position: 2 },
    ]);

    const caller = musicRouter.createCaller(publicContext as any);
    const result = await caller.requestSong({
      venueId: 7,
      sessionId: 70,
      sessionToken: "valid-music-session-token",
      songName: "La Camisa Negra",
      artist: "Juanes",
      addedByTableId: 3,
      addedByTableName: "Mesa 3",
    });

    expect(result).toEqual({ success: true });
    expect(dbMocks.addSongToQueue).toHaveBeenCalledWith(expect.objectContaining({
      venueId: 7,
      songName: "La Camisa Negra",
      artist: "Juanes",
      position: 3,
      isCurrentlyPlaying: false,
      addedByTableId: 3,
      addedByTableName: "Mesa 3",
    }));
  });

  it("returns current song and ordered queue for the client portal", async () => {
    const current = { id: 12, songName: "Vivir Mi Vida", artist: "Marc Anthony", isCurrentlyPlaying: true };
    const queue = [current, { id: 13, songName: "Bailando", artist: "Enrique Iglesias", isCurrentlyPlaying: false }];
    dbMocks.getCurrentSong.mockResolvedValue(current);
    dbMocks.getSongQueue.mockResolvedValue(queue);

    const caller = musicRouter.createCaller(publicContext as any);
    const result = await caller.getClientQueue({ venueId: 7, sessionId: 70, sessionToken: "valid-music-session-token" });

    expect(result).toEqual({ current, queue });
    expect(dbMocks.getCurrentSong).toHaveBeenCalledWith(7);
    expect(dbMocks.getSongQueue).toHaveBeenCalledWith(7);
  });

  it("no expone enlaces de karaoke guardados al portal público por QR", async () => {
    const storedSong = {
      id: 12,
      songName: "Vivir Mi Vida",
      artist: "Marc Anthony",
      isCurrentlyPlaying: true,
      karaokeUrl: "https://private-provider.example/watch/123",
      karaokeProviderName: "Proveedor privado",
      karaokeSavedByUserId: 5,
      karaokeSavedAt: new Date(),
      karaokeLinkReviewNote: "El video no tiene audio",
    };
    dbMocks.getCurrentSong.mockResolvedValue(storedSong);
    dbMocks.getSongQueue.mockResolvedValue([storedSong]);
    const caller = musicRouter.createCaller(publicContext as any);

    const result = await caller.getClientQueue({ venueId: 7, sessionId: 70, sessionToken: "valid-music-session-token" });

    expect(result.current).not.toHaveProperty("karaokeUrl");
    expect(result.current).not.toHaveProperty("karaokeProviderName");
    expect(result.current).not.toHaveProperty("karaokeLinkStatus");
    expect(result.current).not.toHaveProperty("karaokeLinkReviewNote");
    expect(result.current).not.toHaveProperty("playedByUserName");
    expect(result.queue[0]).not.toHaveProperty("karaokeUrl");
  });

  it("accepts an applause rating from 1 to 5 and rejects non-integer values", async () => {
    const caller = musicRouter.createCaller(publicContext as any);

    await caller.submitApplause({
      venueId: 7,
      sessionId: 70,
      sessionToken: "valid-music-session-token",
      songId: 12,
      votingTableId: 3,
      votingTableName: "Mesa 3",
      performingTableId: 4,
      performingTableName: "Mesa 4",
      rating: 5,
    });

    expect(dbMocks.submitAppauseVote).toHaveBeenCalledWith(expect.objectContaining({
      venueId: 7,
      songId: 12,
      votingTableId: 3,
      rating: 5,
    }));

    await expect(caller.submitApplause({
      venueId: 7,
      sessionId: 70,
      sessionToken: "valid-music-session-token",
      songId: 12,
      votingTableId: 3,
      rating: 3.5,
    })).rejects.toThrow();
  });

  it("returns the aggregated applause score for the current song", async () => {
    const score = { averageRating: 4.5, totalVotes: 6, ratingsByPerformingTable: [{ tableName: "Mesa 4", averageRating: 4.5, totalVotes: 6 }] };
    dbMocks.getAppauseScore.mockResolvedValue(score);

    const caller = musicRouter.createCaller(publicContext as any);
    await expect(caller.getApplauseScore({ venueId: 7, sessionId: 70, sessionToken: "valid-music-session-token", songId: 12 })).resolves.toEqual(score);
    expect(dbMocks.getAppauseScore).toHaveBeenCalledWith(7, 12);
  });

  it("normaliza una canción sólo dentro del local que la contiene", async () => {
    const caller = musicRouter.createCaller({ user: { id: 5, role: "staff", venueId: 7 }, req: {}, res: {} } as any);
    await expect(caller.normalizeSongMetadata({ venueId: 7, songId: 14 })).resolves.toMatchObject({ success: true, normalized: { songName: "Vivir Mi Vida", artist: "Marc Anthony" } });
    expect(dbMocks.updateSongMetadataForVenue).toHaveBeenCalledWith(14, 7, "Vivir Mi Vida", "Marc Anthony");
    await expect(caller.normalizeSongMetadata({ venueId: 8, songId: 14 })).rejects.toThrow("FORBIDDEN");
  });

  it("registra quién inició la reproducción manual de una canción", async () => {
    const caller = musicRouter.createCaller({ user: { id: 5, name: "Laura Staff", role: "staff", venueId: 7 }, req: {}, res: {} } as any);
    await expect(caller.playSong({ venueId: 7, songId: 14 })).resolves.toEqual({ success: true });
    expect(dbMocks.updateCurrentSong).toHaveBeenCalledWith(7, 14, { id: 5, name: "Laura Staff" });
  });

  it("guarda un enlace de karaoke únicamente dentro del local del Staff", async () => {
    const caller = musicRouter.createCaller({ user: { id: 5, role: "staff", venueId: 7 }, req: {}, res: {} } as any);
    await expect(caller.saveKaraokeLink({
      venueId: 7,
      songId: 14,
      karaokeUrl: "https://www.youtube.com/watch?v=chosen-karaoke",
      karaokeProviderName: "YouTube",
    })).resolves.toEqual({ success: true });
    expect(dbMocks.saveKaraokeLinkForSong).toHaveBeenCalledWith({
      venueId: 7,
      songId: 14,
      karaokeUrl: "https://www.youtube.com/watch?v=chosen-karaoke",
      karaokeProviderName: "YouTube",
      karaokeSavedByUserId: 5,
    });
    await expect(caller.saveKaraokeLink({
      venueId: 8,
      songId: 14,
      karaokeUrl: "https://www.youtube.com/watch?v=chosen-karaoke",
    })).rejects.toThrow("FORBIDDEN");
  });

  it("expone historial y proveedores solo al personal del local correspondiente", async () => {
    const history = [{ id: 12, venueId: 7, songName: "Vivir Mi Vida", playedAt: new Date() }];
    const providers = [{ id: "youtube", name: "YouTube", searchUrl: "https://www.youtube.com/results?search_query={query}" }];
    dbMocks.getSongPlaybackHistory.mockResolvedValue(history);
    dbMocks.getVenueKaraokeProviders.mockResolvedValue(providers);
    const caller = musicRouter.createCaller({ user: { id: 5, role: "staff", venueId: 7 }, req: {}, res: {} } as any);

    const from = new Date("2026-08-01T00:00:00.000Z");
    const to = new Date("2026-08-31T23:59:59.999Z");
    await expect(caller.getPlaybackHistory({ venueId: 7, limit: 20, from, to })).resolves.toEqual(history);
    await expect(caller.getKaraokeProviders({ venueId: 7 })).resolves.toEqual(providers);
    expect(dbMocks.getSongPlaybackHistory).toHaveBeenCalledWith(7, { limit: 20, from, to });
    await expect(caller.getPlaybackHistory({ venueId: 8 })).rejects.toThrow("FORBIDDEN");
    await expect(caller.getKaraokeProviders({ venueId: 8 })).rejects.toThrow("FORBIDDEN");
  });

  it("permite al Staff marcar un enlace como funcional solo dentro de su local", async () => {
    dbMocks.getSongByIdForVenue.mockResolvedValue({ id: 14, venueId: 7, karaokeUrl: "https://example.com/karaoke" });
    const caller = musicRouter.createCaller({ user: { id: 5, role: "staff", venueId: 7 }, req: {}, res: {} } as any);

    await expect(caller.updateKaraokeLinkStatus({ venueId: 7, songId: 14, status: "working" })).resolves.toEqual({ success: true });
    expect(dbMocks.updateKaraokeLinkStatusForSong).toHaveBeenCalledWith({ venueId: 7, songId: 14, status: "working", reviewNote: null, reviewDueAt: null, updatedByUserId: 5 });
    await expect(caller.updateKaraokeLinkStatus({ venueId: 8, songId: 14, status: "needs_review", reviewNote: "El enlace pertenece a otro local", reviewDueAt: new Date("2030-08-31T23:59:59.999Z") })).rejects.toThrow("FORBIDDEN");
  });

  it("requiere una nota explicativa cuando el Staff marca un enlace para revisión", async () => {
    dbMocks.getSongByIdForVenue.mockResolvedValue({ id: 14, venueId: 7, songName: "Vivir Mi Vida", artist: "Marc Anthony", karaokeUrl: "https://example.com/karaoke" });
    const caller = musicRouter.createCaller({ user: { id: 5, role: "staff", venueId: 7 }, req: {}, res: {} } as any);

    const deadline = new Date("2030-08-31T23:59:59.999Z");
    await expect(caller.updateKaraokeLinkStatus({ venueId: 7, songId: 14, status: "needs_review" })).rejects.toThrow("Explica por qué el enlace requiere revisión");
    await expect(caller.updateKaraokeLinkStatus({ venueId: 7, songId: 14, status: "needs_review", reviewNote: "El video abre sin audio" })).rejects.toThrow("Define una fecha límite para la revisión");
    await expect(caller.updateKaraokeLinkStatus({ venueId: 7, songId: 14, status: "needs_review", reviewNote: "El video abre sin audio", reviewDueAt: deadline })).resolves.toEqual({ success: true });
    expect(dbMocks.updateKaraokeLinkStatusForSong).toHaveBeenLastCalledWith({ venueId: 7, songId: 14, status: "needs_review", reviewNote: "El video abre sin audio", reviewDueAt: deadline, updatedByUserId: 5 });
    expect(dbMocks.notifyVenueManagersOfKaraokeReview).toHaveBeenCalledWith(expect.objectContaining({ venueId: 7, songName: "Vivir Mi Vida", artist: "Marc Anthony", reviewDueAt: deadline, actorUserId: 5 }));
  });

  it("expone métricas agregadas de karaoke solo al Owner", async () => {
    const metrics = { totals: { totalLinks: 4, workingLinks: 3, unverifiedLinks: 0, needsReviewLinks: 1, workingRate: 75 }, venues: [{ venueId: 7, venueName: "Local Centro", totalLinks: 4, workingLinks: 3, unverifiedLinks: 0, needsReviewLinks: 1, workingRate: 75 }] };
    dbMocks.getOwnerKaraokeLinkMetrics.mockResolvedValue(metrics);
    const ownerCaller = musicRouter.createCaller({ user: { id: 1, role: "owner", venueId: null }, req: {}, res: {} } as any);
    const staffCaller = musicRouter.createCaller({ user: { id: 5, role: "staff", venueId: 7 }, req: {}, res: {} } as any);

    await expect(ownerCaller.getOwnerKaraokeLinkMetrics()).resolves.toEqual(metrics);
    await expect(staffCaller.getOwnerKaraokeLinkMetrics()).rejects.toThrow("FORBIDDEN");
  });
});
