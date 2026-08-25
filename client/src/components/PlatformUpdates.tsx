import { useState } from "react";
import { CalendarDays, CheckCircle2, Megaphone, Newspaper, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface PlatformUpdatesProps {
  compact?: boolean;
}

const updates = [
  {
    title: "Guía de inicio más estable",
    description: "El onboarding solo se abre automáticamente para cuentas operativas nuevas. Puedes revisarlo manualmente desde Guía y ayuda cuando lo necesites.",
    icon: <CheckCircle2 className="h-5 w-5 text-primary" />,
  },
  {
    title: "Ayuda y reporte de incidencias",
    description: "La guía ahora reúne soluciones frecuentes, favoritos personales, valoración de artículos y un canal para reportar incidencias al equipo Owner.",
    icon: <Megaphone className="h-5 w-5 text-blue-700 dark:text-blue-400" />,
  },
  {
    title: "Control y seguimiento para Owner",
    description: "El panel Owner incorpora reportes manuales y programados, comparativos de PQRS y métricas de adopción del onboarding por rol.",
    icon: <ShieldCheck className="h-5 w-5 text-purple-700 dark:text-purple-400" />,
  },
];

export default function PlatformUpdates({ compact = false }: PlatformUpdatesProps) {
  const [open, setOpen] = useState(false);
  return <>
    <Button type="button" variant="ghost" size="sm" className="w-full justify-start gap-2 text-xs text-muted-foreground hover:bg-primary/10 hover:text-primary" onClick={() => setOpen(true)} title="Ver novedades de SongTap" aria-haspopup="dialog">
      <Newspaper className="h-4 w-4 shrink-0" />
      {!compact && <span>Novedades</span>}
    </Button>
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-h-[85dvh] max-w-2xl overflow-y-auto border-border bg-card p-0 text-card-foreground sm:rounded-xl">
        <div className="border-b border-border bg-gradient-to-br from-primary/20 via-card to-card px-5 py-5 sm:px-7">
          <DialogHeader className="text-left"><div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground neon-glow"><Newspaper className="h-5 w-5" /></div><DialogTitle className="text-xl">Novedades de SongTap</DialogTitle><DialogDescription className="mt-1 text-sm text-muted-foreground">Actualizaciones relevantes de la plataforma. Este espacio es independiente de tu guía de inicio y nunca cambia su progreso.</DialogDescription></DialogHeader>
        </div>
        <div className="space-y-3 px-5 py-5 sm:px-7">
          <div className="flex items-center gap-2 text-xs text-muted-foreground"><CalendarDays className="h-4 w-4 text-primary" />Actualizado el 24 de agosto de 2026</div>
          {updates.map((update) => <article key={update.title} className="rounded-xl border border-border bg-background/70 p-4"><div className="flex gap-3"><div className="mt-0.5 shrink-0">{update.icon}</div><div><h3 className="font-semibold text-foreground">{update.title}</h3><p className="mt-1 text-sm leading-6 text-muted-foreground">{update.description}</p></div></div></article>)}
        </div>
        <DialogFooter className="border-t border-border bg-card px-5 py-4 sm:px-7"><Button type="button" onClick={() => setOpen(false)} className="w-full sm:w-auto">Entendido</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  </>;
}
