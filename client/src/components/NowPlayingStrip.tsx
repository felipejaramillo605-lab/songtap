import { Music2, Play } from "lucide-react";

interface NowPlayingSong {
  songName: string;
  artist: string;
}

interface NowPlayingStripProps {
  current: NowPlayingSong | null | undefined;
}

export default function NowPlayingStrip({ current }: NowPlayingStripProps) {
  return (
    <section
      className="mb-4 rounded-xl border border-primary/30 bg-gradient-to-r from-primary/15 via-card to-card px-4 py-3 shadow-sm"
      role="status"
      aria-live="polite"
      aria-label="Canción en reproducción"
    >
      <div className="flex items-center gap-3">
        <span className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/20 text-primary">
          {current ? <Play size={14} className="fill-current" /> : <Music2 size={15} />}
          {current && <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-card bg-primary" />}
        </span>
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-wide text-primary">Sonando ahora</p>
          {current ? (
            <>
              <p className="truncate text-sm font-semibold text-foreground">{current.songName}</p>
              <p className="truncate text-xs text-muted-foreground">{current.artist}</p>
            </>
          ) : (
            <p className="text-xs text-muted-foreground">El Staff aún no ha marcado una canción en reproducción.</p>
          )}
        </div>
      </div>
    </section>
  );
}
