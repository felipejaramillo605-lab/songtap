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
});
