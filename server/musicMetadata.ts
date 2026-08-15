export type NormalizedMusicMetadata = {
  songName: string;
  artist: string;
  changed: boolean;
};

const unknownArtistValues = new Set(["", "artista desconocido", "unknown artist", "n/a", "na"]);

function compact(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function cleanSeparator(value: string) {
  return compact(value.replace(/\s*[–—]\s*/g, " - "));
}

/**
 * Normaliza únicamente la forma introducida por el cliente; no consulta ni transmite datos a terceros.
 * Si el artista está pendiente, aprovecha separadores habituales "Título - Artista" para sugerirlo.
 */
export function normalizeMusicMetadata(songName: string, artist: string): NormalizedMusicMetadata {
  const originalSongName = songName;
  const originalArtist = artist;
  let normalizedSongName = cleanSeparator(songName);
  let normalizedArtist = cleanSeparator(artist);

  if (unknownArtistValues.has(normalizedArtist.toLowerCase())) {
    const parts = normalizedSongName.split(/\s+-\s+/).map(compact).filter(Boolean);
    if (parts.length === 2) {
      normalizedSongName = parts[0];
      normalizedArtist = parts[1];
    }
  }

  if (!normalizedArtist) normalizedArtist = "Artista por confirmar";
  return {
    songName: normalizedSongName || "Canción sin título",
    artist: normalizedArtist,
    changed: normalizedSongName !== originalSongName || normalizedArtist !== originalArtist,
  };
}
