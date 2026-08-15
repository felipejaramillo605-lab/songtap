export type MusicProvider = "manual" | "spotify" | "youtube" | "soundcloud";
export type MusicConnectionStatus = "not_configured" | "pending" | "connected";

export const musicProviderInfo: Record<MusicProvider, { label: string; shortLabel: string; description: string }> = {
  manual: {
    label: "Manual",
    shortLabel: "Modo manual",
    description: "El Staff controla la reproducción y la cola desde SongTap.",
  },
  spotify: {
    label: "Spotify",
    shortLabel: "Spotify pendiente",
    description: "La conexión OAuth se habilitará cuando Spotify permita crear la aplicación técnica.",
  },
  youtube: {
    label: "YouTube Data",
    shortLabel: "YouTube pendiente",
    description: "Se podrá usar para metadatos por local; no reemplaza las licencias de reproducción pública.",
  },
  soundcloud: {
    label: "SoundCloud",
    shortLabel: "SoundCloud pendiente",
    description: "La conexión OAuth por local estará disponible tras configurar la aplicación técnica.",
  },
};

export function isExternalMusicProvider(provider: MusicProvider) {
  return provider !== "manual";
}

export function providerConnectionMessage(provider: MusicProvider, status: MusicConnectionStatus) {
  if (provider === "manual") return musicProviderInfo.manual.description;
  if (status === "connected") return `${musicProviderInfo[provider].label} está conectado para este local.`;
  return `${musicProviderInfo[provider].description} Mientras tanto, SongTap mantiene el modo manual activo.`;
}
