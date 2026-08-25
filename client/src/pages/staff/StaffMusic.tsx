import { trpc } from "@/lib/trpc";
import SongTapLayout from "@/components/SongTapLayout";
import KaraokeLinkManager from "@/components/KaraokeLinkManager";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Music2, Play, CheckCircle2, Trash2, Clock, Star, WandSparkles, History } from "lucide-react";
import { useEffect } from "react";
import { useLocation } from "wouter";
import { getLoginUrl } from "@/const";
import { useAuth } from "@/_core/hooks/useAuth";
import { MusicProvider, musicProviderInfo, providerConnectionMessage } from "@/lib/musicProvider";

export default function StaffMusic() {
  const { user, isAuthenticated, loading } = useAuth();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (!loading && !isAuthenticated) window.location.href = getLoginUrl();
    if (!loading && isAuthenticated && !["staff", "manager", "owner"].includes(user?.role ?? "")) navigate("/");
  }, [loading, isAuthenticated, user, navigate]);

  const venueId = user?.venueId;
  const { data: musicData, refetch } = trpc.music.getStaffQueue.useQuery(
    { venueId: venueId! },
    { enabled: !!venueId, refetchInterval: 5000 }
  );
  const { data: venue } = trpc.venues.getById.useQuery({ id: venueId! }, { enabled: !!venueId });
  const { data: karaokeProviders = [] } = trpc.music.getKaraokeProviders.useQuery({ venueId: venueId! }, { enabled: !!venueId });
  const { data: playbackHistory = [], refetch: refetchHistory } = trpc.music.getPlaybackHistory.useQuery(
    { venueId: venueId!, limit: 50 },
    { enabled: !!venueId, refetchInterval: 10000 }
  );

  const playSong = trpc.music.playSong.useMutation({
    onSuccess: () => { toast.success("Canción reproduciéndose"); refetch(); refetchHistory(); },
    onError: (e) => toast.error(e.message),
  });

  const removeSong = trpc.music.removeSong.useMutation({
    onSuccess: () => { toast.success("Canción removida de la cola"); refetch(); },
    onError: (e) => toast.error(e.message),
  });

  const normalizeSong = trpc.music.normalizeSongMetadata.useMutation({
    onSuccess: ({ normalized }) => {
      toast.success(normalized.changed ? "Datos de canción normalizados" : "Los datos ya tienen un formato consistente");
      refetch();
    },
    onError: (e) => toast.error(e.message),
  });

  const saveKaraokeLink = trpc.music.saveKaraokeLink.useMutation({
    onSuccess: () => { toast.success("Enlace de karaoke guardado"); refetch(); refetchHistory(); },
    onError: (error) => toast.error(error.message),
  });

  if (loading) return null;

  const currentSong = musicData?.current;
  const queueList = musicData?.queue || [];
  const provider = (venue?.musicProvider ?? "manual") as MusicProvider;
  const connectionStatus = venue?.musicConnectionStatus ?? "not_configured";

  return (
    <SongTapLayout role="staff" title="Cola Musical">
      <div className="space-y-6 animate-slide-up">
        <div>
          <h2 className="text-xl font-bold text-foreground">Gestión de Reproductor & Cola Musical</h2>
          <p className="text-sm text-muted-foreground">Controla las canciones solicitadas por las mesas y marca la que está sonando actualmente.</p>
        </div>

        <div className={`rounded-xl border px-4 py-3 text-sm ${provider === "manual" ? "border-primary/20 bg-primary/10 text-primary" : "border-yellow-400/20 bg-yellow-400/10 text-yellow-200"}`}>
          <span className="font-semibold">{musicProviderInfo[provider].shortLabel}:</span>{" "}
          {providerConnectionMessage(provider, connectionStatus)}
        </div>

        {/* Canción Actual */}
        <Card className="bg-gradient-to-r from-primary/20 via-card to-card border-primary/40">
          <CardHeader>
            <CardTitle className="text-sm font-semibold text-primary flex items-center gap-2">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-primary"></span>
              </span>
              REPRODUCIENDO AHORA
            </CardTitle>
          </CardHeader>
          <CardContent>
            {currentSong ? (
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h3 className="text-lg font-bold text-foreground">{currentSong.songName}</h3>
                  <p className="text-sm text-muted-foreground">{currentSong.artist} • <span className="text-primary font-medium">{currentSong.addedByTableName}</span></p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs bg-primary/20 text-primary px-3 py-1.5 rounded-full font-medium">En vivo</span>
                  <KaraokeLinkManager
                    song={currentSong}
                    providers={karaokeProviders}
                    isSaving={saveKaraokeLink.isPending}
                    onSave={(input) => saveKaraokeLink.mutate({ venueId: venueId!, ...input })}
                  />
                </div>
              </div>
            ) : (
              <div className="text-center py-6">
                <Music2 size={32} className="mx-auto mb-2 text-muted-foreground opacity-30" />
                <p className="text-muted-foreground text-sm">No hay ninguna canción reproduciéndose actualmente. Selecciona una de la cola abajo.</p>
              </div>
            )}
          </CardContent>
        </Card>

        <p className="-mt-3 text-xs text-muted-foreground">
          El asistente abre una búsqueda externa con el título y artista. El Staff decide qué versión usar; SongTap no descarga, reproduce ni muestra letras.
        </p>

        {/* Cola de Canciones */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Music2 size={16} className="text-primary" />
              Cola de Peticiones ({queueList.length} canciones)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {queueList.length === 0 ? (
              <div className="text-center py-12">
                <Music2 size={48} className="mx-auto mb-4 text-muted-foreground opacity-30" />
                <p className="text-muted-foreground text-sm">No hay canciones en la cola en este momento.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {queueList.map((song, index) => (
                  <div
                    key={song.id}
                    className={`flex items-center gap-4 p-4 rounded-xl border transition-all ${
                      song.isCurrentlyPlaying
                        ? "bg-primary/10 border-primary/30"
                        : "bg-secondary/30 border-border hover:border-border/80"
                    }`}
                  >
                    {/* Position */}
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                      song.isCurrentlyPlaying ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
                    }`}>
                      {song.isCurrentlyPlaying ? <Play size={14} /> : index + 1}
                    </div>

                    {/* Song info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-foreground truncate">{song.songName}</p>
                        {song.isCurrentlyPlaying && (
                          <span className="text-[10px] bg-primary text-primary-foreground px-2 py-0.5 rounded-full font-bold">SONANDO</span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-0.5">
                        <p className="text-xs text-muted-foreground truncate">{song.artist}</p>
                        <span className="text-xs text-primary font-medium">• Pedida por: {song.addedByTableName}</span>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock size={10} /> {new Date(song.createdAt).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <KaraokeLinkManager
                        song={song}
                        providers={karaokeProviders}
                        isSaving={saveKaraokeLink.isPending}
                        onSave={(input) => saveKaraokeLink.mutate({ venueId: venueId!, ...input })}
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs h-8"
                        onClick={() => normalizeSong.mutate({ venueId: venueId!, songId: song.id })}
                        disabled={normalizeSong.isPending}
                        aria-label={`Normalizar datos de ${song.songName}`}
                      >
                        <WandSparkles size={12} className="mr-1" /> Normalizar
                      </Button>
                      {!song.isCurrentlyPlaying && (
                        <Button
                          size="sm"
                          className="bg-primary text-primary-foreground hover:bg-primary/90 text-xs h-8"
                          onClick={() => playSong.mutate({ venueId: venueId!, songId: song.id })}
                        >
                          <Play size={12} className="mr-1" /> Reproducir
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-red-400 hover:bg-red-400/10 h-8 w-8 p-0"
                        onClick={() => removeSong.mutate({ venueId: venueId!, songId: song.id })}
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
              <History size={16} className="text-primary" /> Historial de reproducción
            </CardTitle>
          </CardHeader>
          <CardContent>
            {playbackHistory.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">Aún no hay canciones finalizadas en este local.</p>
            ) : (
              <div className="space-y-2">
                {playbackHistory.map((song) => (
                  <div key={song.id} className="flex flex-col gap-2 rounded-lg border border-border bg-secondary/20 p-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-foreground">{song.songName}</p>
                      <p className="truncate text-xs text-muted-foreground">{song.artist} · {song.playedAt ? new Date(song.playedAt).toLocaleString("es-CO") : "Sin hora registrada"}</p>
                    </div>
                    <KaraokeLinkManager
                      song={song}
                      providers={karaokeProviders}
                      isSaving={saveKaraokeLink.isPending}
                      onSave={(input) => saveKaraokeLink.mutate({ venueId: venueId!, ...input })}
                    />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </SongTapLayout>
  );
}
