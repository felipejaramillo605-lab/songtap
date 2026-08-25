import { useState } from "react";
import { ExternalLink, Link2, Save, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { buildKaraokeProviderSearchUrl, buildKaraokeSearchUrl } from "@/lib/karaokeSearch";

type KaraokeLinkStatus = "unverified" | "working" | "needs_review";

const karaokeStatusMeta: Record<KaraokeLinkStatus, { label: string; className: string }> = {
  unverified: { label: "Sin verificar", className: "border-slate-400/30 bg-slate-400/10 text-slate-300" },
  working: { label: "Funciona", className: "border-emerald-400/30 bg-emerald-400/10 text-emerald-300" },
  needs_review: { label: "Revisar", className: "border-amber-400/30 bg-amber-400/10 text-amber-200" },
};

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
  karaokeLinkStatus?: KaraokeLinkStatus | null;
  karaokeLinkReviewNote?: string | null;
  karaokeReviewDueAt?: Date | string | null;
}

interface KaraokeLinkManagerProps {
  song: KaraokeSong;
  providers: KaraokeProvider[];
  isSaving?: boolean;
  isUpdatingStatus?: boolean;
  onSave: (input: { songId: number; karaokeUrl: string; karaokeProviderName: string | null }) => void;
  onUpdateStatus?: (input: { songId: number; status: KaraokeLinkStatus; reviewNote?: string; reviewDueAt?: Date }) => void;
}

export default function KaraokeLinkManager({ song, providers, isSaving = false, isUpdatingStatus = false, onSave, onUpdateStatus }: KaraokeLinkManagerProps) {
  const [open, setOpen] = useState(false);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [karaokeUrl, setKaraokeUrl] = useState(song.karaokeUrl ?? "");
  const [providerName, setProviderName] = useState(song.karaokeProviderName ?? "");
  const [reviewNote, setReviewNote] = useState(song.karaokeLinkReviewNote ?? "");
  const [reviewDueDate, setReviewDueDate] = useState(() => song.karaokeReviewDueAt ? new Date(song.karaokeReviewDueAt).toISOString().slice(0, 10) : "");

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
  const linkStatus = song.karaokeLinkStatus ?? "unverified";
  const requestStatusChange = (status: KaraokeLinkStatus) => {
    if (status === "needs_review") {
      setReviewNote(song.karaokeLinkReviewNote ?? "");
      setReviewDueDate(song.karaokeReviewDueAt ? new Date(song.karaokeReviewDueAt).toISOString().slice(0, 10) : "");
      setReviewDialogOpen(true);
      return;
    }
    onUpdateStatus?.({ songId: song.id, status });
  };

  const confirmNeedsReview = () => {
    const note = reviewNote.trim();
    const dueAt = reviewDueDate ? new Date(`${reviewDueDate}T23:59:59.999`) : null;
    if (!note || !dueAt || Number.isNaN(dueAt.getTime())) return;
    onUpdateStatus?.({ songId: song.id, status: "needs_review", reviewNote: note, reviewDueAt: dueAt });
    setReviewDialogOpen(false);
  };

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
        <>
          <a
            href={song.karaokeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-8 items-center gap-1 rounded-md border border-emerald-400/40 px-2 text-xs font-semibold text-emerald-300 transition-colors hover:bg-emerald-400/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            aria-label={`Abrir enlace de karaoke guardado para ${song.songName}`}
          >
            <ExternalLink size={12} /> Abrir elegido
          </a>
          <span className={`inline-flex h-8 items-center rounded-md border px-2 text-xs font-semibold ${karaokeStatusMeta[linkStatus].className}`} aria-label={`Estado del enlace: ${karaokeStatusMeta[linkStatus].label}`}>
            {karaokeStatusMeta[linkStatus].label}
          </span>
          {onUpdateStatus && (
            <Select value={linkStatus} onValueChange={(status) => requestStatusChange(status as KaraokeLinkStatus)} disabled={isUpdatingStatus}>
              <SelectTrigger className="h-8 w-[142px] border-border bg-input text-xs text-foreground" aria-label={`Cambiar estado del enlace de ${song.songName}`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="border-border bg-popover text-popover-foreground">
                <SelectItem value="unverified">Sin verificar</SelectItem>
                <SelectItem value="working">Funciona</SelectItem>
                <SelectItem value="needs_review">Requiere revisión</SelectItem>
              </SelectContent>
            </Select>
          )}
          {linkStatus === "needs_review" && (song.karaokeLinkReviewNote || song.karaokeReviewDueAt) && <div className="w-full rounded-md border border-amber-400/20 bg-amber-400/5 px-2 py-1 text-xs text-amber-100">{song.karaokeLinkReviewNote && <p>Nota: {song.karaokeLinkReviewNote}</p>}{song.karaokeReviewDueAt && <p className="mt-1">Fecha límite: {new Date(song.karaokeReviewDueAt).toLocaleDateString("es-CO", { dateStyle: "medium" })}</p>}</div>}
        </>
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

      <Dialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen}>
        <DialogContent className="bg-card text-card-foreground sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Explicar revisión del enlace</DialogTitle>
            <DialogDescription>Indica qué debe revisar el equipo en el enlace de <strong>{song.songName}</strong>. Esta nota solo estará disponible para el personal del local.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor={`karaoke-review-note-${song.id}`}>Nota de revisión *</Label>
            <Textarea id={`karaoke-review-note-${song.id}`} value={reviewNote} onChange={(event) => setReviewNote(event.target.value)} maxLength={500} placeholder="Ej. El video no tiene audio o ya no está disponible." className="min-h-24 bg-input text-foreground" />
            <p className="text-right text-xs text-muted-foreground">{reviewNote.length}/500</p>
            <div className="grid gap-1">
              <Label htmlFor={`karaoke-review-due-${song.id}`}>Fecha límite *</Label>
              <Input id={`karaoke-review-due-${song.id}`} type="date" value={reviewDueDate} onChange={(event) => setReviewDueDate(event.target.value)} className="bg-input text-foreground" />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setReviewDialogOpen(false)}>Cancelar</Button>
            <Button onClick={confirmNeedsReview} disabled={!reviewNote.trim() || !reviewDueDate || isUpdatingStatus}>Guardar como Requiere revisión</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
