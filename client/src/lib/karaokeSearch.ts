export function buildKaraokeSearchUrl(songName: string, artist?: string | null) {
  const normalizedSong = songName.trim().replace(/\s+/g, " ");
  const normalizedArtist = artist?.trim().replace(/\s+/g, " ") ?? "";
  const query = [normalizedSong, normalizedArtist, "karaoke con letra"].filter(Boolean).join(" ");

  return `https://www.youtube.com/results?${new URLSearchParams({ search_query: query }).toString()}`;
}

export function buildKaraokeProviderSearchUrl(searchUrl: string, songName: string, artist?: string | null) {
  const normalizedSong = songName.trim().replace(/\s+/g, " ");
  const normalizedArtist = artist?.trim().replace(/\s+/g, " ") ?? "";
  const query = [normalizedSong, normalizedArtist, "karaoke con letra"].filter(Boolean).join(" ");

  try {
    const candidate = new URL(searchUrl.replace("{query}", encodeURIComponent(query)));
    if (!["http:", "https:"].includes(candidate.protocol)) return null;
    return candidate.toString();
  } catch {
    return null;
  }
}
