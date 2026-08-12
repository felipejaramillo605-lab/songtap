import { Card, CardContent } from "@/components/ui/card";
import { Music2, Play, Clock } from "lucide-react";

export interface QueueSong {
  id: number;
  songName: string;
  artist: string;
  addedByTableName: string | null;
  isCurrentlyPlaying: boolean;
  createdAt: Date;
}

interface MusicQueueProps {
  current: QueueSong | null | undefined;
  queue: QueueSong[];
}

export default function MusicQueue({ current, queue }: MusicQueueProps) {
  const upcoming = queue.filter((song) => !song.isCurrentlyPlaying);

  return (
    <div className="space-y-3">
      <Card className="bg-gradient-to-br from-primary/20 via-card to-card border-primary/40">
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-primary tracking-wider uppercase flex items-center gap-1.5">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary" />
              </span>
              Reproduciendo ahora
            </span>
            <Play size={15} className="text-primary fill-primary" />
          </div>

          {current ? (
            <div>
              <h3 className="text-lg font-bold text-foreground truncate">{current.songName}</h3>
              <p className="text-sm text-muted-foreground truncate">
                {current.artist} · <span className="text-primary font-medium">{current.addedByTableName || "Mesa invitada"}</span>
              </p>
            </div>
          ) : (
            <div className="text-center py-4">
              <Music2 size={30} className="mx-auto mb-2 text-muted-foreground opacity-30" />
              <p className="text-sm text-muted-foreground">No hay una canción reproduciéndose.</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="bg-card border-border">
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-foreground text-sm flex items-center gap-2">
              <Music2 size={16} className="text-primary" /> Próximas canciones
            </h3>
            <span className="text-xs text-muted-foreground">{upcoming.length} en cola</span>
          </div>

          {upcoming.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">No hay canciones en cola. ¡Sé el primero en pedir una!</p>
          ) : (
            <div className="space-y-2">
              {upcoming.map((song, index) => (
                <div key={song.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 border border-border">
                  <div className="min-w-0 pr-2">
                    <p className="font-medium text-foreground text-sm truncate">{song.songName}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {song.artist} · <span className="text-primary">{song.addedByTableName || "Mesa invitada"}</span>
                    </p>
                    <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-1">
                      <Clock size={10} /> {new Date(song.createdAt).toLocaleTimeString()}
                    </p>
                  </div>
                  <span className="text-xs bg-secondary text-muted-foreground px-2 py-1 rounded-full font-mono flex-shrink-0">#{index + 1}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
