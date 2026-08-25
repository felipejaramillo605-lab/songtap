import { useState } from "react";
import { ExternalLink, Link2, Save, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { buildKaraokeProviderSearchUrl, buildKaraokeSearchUrl } from "@/lib/karaokeSearch";

export interface KaraokeProvider {
  id: string;
  name: string;
  searchUrl: string;
}

interface KaraokeSong {
  id: number;
  songName: string;
  artist: string;
  karaokeUrl?: string | null;
  karaokeProviderName?: string | null;
}

interface KaraokeLinkManagerProps {
  song: KaraokeSong;
  providers: KaraokeProvider[];
  isSaving?: boolean;
  onSave: (input: { songId: number; karaokeUrl: string; karaokeProviderName: string | null }) => void;
}

export default function KaraokeLinkManager({ song, providers, isSaving = false, onSave }: KaraokeLinkManagerProps) {
  const [open, setOpen] = useState(false);
  const [karaokeUrl, setKaraokeUrl] = useState(song.karaokeUrl ?? "");
  const [providerName, setProviderName] = useState(song.karaokeProviderName ?? "");

  const openSaveDialog = () => {
    setKaraokeUrl(song.karaokeUrl ?? "");
    setProviderName(song.karaokeProviderName ?? providerName);
    setOpen(true);
  };

  const submit = () => {
    const trimmedUrl = karaokeUrl.trim();
    if (!trimmedUrl) return;
    onSave({
      songId: song.id,
      karaokeUrl: trimmedUrl,
      karaokeProviderName: providerName.trim() || null,
    });
    setOpen(false);
  };

  const providerLinks = providers.map((provider) => ({
    ...provider,
    href: buildKaraokeProviderSearchUrl(provider.searchUrl, song.songName, song.artist),
  })).filter((provider): provider is KaraokeProvider & { href: string } => Boolean(provider.href));

  return (
    <div className="flex flex-wrap items-center gap-2">
      <a
        href={buildKaraokeSearchUrl(song.songName, song.artist)}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => setProviderName("YouTube")}
        className="inline-flex h-8 items-center gap-1 rounded-md border border-border px-2 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        aria-label={`Buscar karaoke de ${song.songName} en YouTube`}
      >
        <Search size={12} /> Buscar karaoke
      </a>
      {providerLinks.map((provider) => (
        <a
          key={provider.id}
          href={provider.href}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => setProviderName(provider.name)}
          className="inline-flex h-8 items-center gap-1 rounded-md border border-primary/30 px-2 text-xs font-medium text-primary transition-colors hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          aria-label={`Buscar karaoke de ${song.songName} en ${provider.name}`}
        >
          <Search size={12} /> {provider.name}
        </a>
      ))}
      {song.karaokeUrl && (
        <a
          href={song.karaokeUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-8 items-center gap-1 rounded-md border border-emerald-400/40 px-2 text-xs font-semibold text-emerald-300 transition-colors hover:bg-emerald-400/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          aria-label={`Abrir enlace de karaoke guardado para ${song.songName}`}
        >
          <ExternalLink size={12} /> Abrir elegido
        </a>
      )}
      <Button
        size="sm"
        variant="outline"
        className="h-8 text-xs"
        onClick={openSaveDialog}
        aria-label={`${song.karaokeUrl ? "Editar" : "Guardar"} enlace de karaoke para ${song.songName}`}
      >
        {song.karaokeUrl ? <Link2 size={12} className="mr-1" /> : <Save size={12} className="mr-1" />}
        {song.karaokeUrl ? "Editar enlace" : "Guardar enlace"}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-card text-card-foreground sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Guardar enlace de karaoke</DialogTitle>
            <DialogDescription>
              Guarda el enlace que seleccionaste para <strong>{song.songName}</strong>. Solo estará disponible para el equipo de este local.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor={`karaoke-url-${song.id}`}>Enlace elegido *</Label>
              <Input
                id={`karaoke-url-${song.id}`}
                type="url"
                inputMode="url"
                placeholder="https://…"
                value={karaokeUrl}
                onChange={(event) => setKaraokeUrl(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`karaoke-provider-${song.id}`}>Proveedor (opcional)</Label>
              <Input
                id={`karaoke-provider-${song.id}`}
                placeholder="Ej. YouTube"
                maxLength={128}
                value={providerName}
                onChange={(event) => setProviderName(event.target.value)}
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={submit} disabled={!karaokeUrl.trim() || isSaving}>
              {isSaving ? "Guardando…" : "Guardar enlace"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
