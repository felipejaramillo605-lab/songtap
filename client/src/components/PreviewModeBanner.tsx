import { EyeOff, Flag, TestTube2 } from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";
import { clearPreviewMode } from "@/lib/previewMode";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export default function PreviewModeBanner() {
  const { actualUser, isPreviewMode, previewMode } = useAuth();
  const [path, navigate] = useLocation();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const createIncident = trpc.testIncidents.create.useMutation({
    onSuccess: () => {
      setOpen(false);
      setTitle("");
      setDescription("");
      toast.success("Incidencia registrada para revisión.");
    },
    onError: (error) => toast.error(error.message || "No fue posible registrar la incidencia."),
  });
  if (!isPreviewMode || actualUser?.role !== "owner" || !previewMode) return null;

  const exitPreview = () => {
    clearPreviewMode();
    navigate("/owner");
  };

  const submitIncident = (event: React.FormEvent) => {
    event.preventDefault();
    if (title.trim().length < 4 || description.trim().length < 10) {
      toast.error("Incluye un título y una descripción clara del error observado.");
      return;
    }
    createIncident.mutate({ route: path, title: title.trim(), description: description.trim() });
  };

  return (
    <>
      <aside className="fixed inset-x-0 bottom-3 z-50 mx-auto flex w-[min(94%,760px)] flex-col gap-2 rounded-xl border border-primary/40 bg-card/95 p-3 shadow-2xl backdrop-blur sm:flex-row sm:items-center sm:justify-between" role="status" aria-live="polite">
        <p className="flex items-center gap-2 text-sm text-foreground"><TestTube2 className="h-5 w-5 shrink-0 text-primary" /><span><strong>Modo de pruebas:</strong> vista {previewMode.role === "manager" ? "Manager" : "Staff"} · {previewMode.venueName || `Local #${previewMode.venueId}`}. Cambios bloqueados.</span></p>
        <div className="flex shrink-0 gap-2">
          <button type="button" onClick={() => setOpen(true)} className="inline-flex items-center justify-center gap-1.5 rounded-md border border-border px-3 py-2 text-sm font-semibold text-foreground transition-transform hover:bg-secondary active:scale-95"><Flag className="h-4 w-4" /> Reportar error</button>
          <button type="button" onClick={exitPreview} className="inline-flex items-center justify-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground transition-transform active:scale-95"><EyeOff className="h-4 w-4" /> Salir del modo</button>
        </div>
      </aside>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="border-border bg-card text-card-foreground sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Reportar incidencia de prueba</DialogTitle>
            <DialogDescription>Se guardará el rol, local y ruta actual para que puedas reproducir el error después.</DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={submitIncident}>
            <div className="rounded-lg border border-border bg-secondary/20 p-3 text-xs text-muted-foreground"><strong className="text-foreground">Contexto:</strong> {previewMode.role === "manager" ? "Manager" : "Staff"} · {previewMode.venueName || `Local #${previewMode.venueId}`} · {path}</div>
            <div className="space-y-2"><label htmlFor="preview-incident-title" className="text-sm font-medium">Título</label><Input id="preview-incident-title" value={title} onChange={(event) => setTitle(event.target.value)} maxLength={180} placeholder="Ej.: El botón de guardar no responde" autoFocus /></div>
            <div className="space-y-2"><label htmlFor="preview-incident-description" className="text-sm font-medium">Qué ocurrió</label><Textarea id="preview-incident-description" value={description} onChange={(event) => setDescription(event.target.value)} maxLength={4000} rows={5} placeholder="Describe los pasos, resultado esperado y resultado observado." /></div>
            <button type="submit" disabled={createIncident.isPending} className="inline-flex w-full items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60">{createIncident.isPending ? "Registrando…" : "Registrar incidencia"}</button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
