import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { CheckCircle2, ClipboardCheck, Clock3, ImagePlus, Loader2, MessageSquare, PlayCircle } from "lucide-react";
import { toast } from "sonner";
import SongTapLayout from "@/components/SongTapLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { getLoginUrl } from "@/const";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";

const statusLabel = { pending: "Pendiente", in_progress: "En proceso", completed: "Realizada" };
const statusClass = { pending: "bg-yellow-400/10 text-yellow-400", in_progress: "bg-blue-400/10 text-blue-400", completed: "bg-green-400/10 text-green-400" };

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function StaffActivities() {
  const { user, isAuthenticated, loading } = useAuth();
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();
  const [selected, setSelected] = useState<any>(null);
  const [status, setStatus] = useState<"pending" | "in_progress" | "completed">("pending");
  const [comment, setComment] = useState("");
  const [evidenceUrl, setEvidenceUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const upload = trpc.upload.uploadFile.useMutation();

  useEffect(() => {
    if (!loading && !isAuthenticated) window.location.href = getLoginUrl();
    if (!loading && isAuthenticated && user?.role !== "staff") navigate("/");
  }, [loading, isAuthenticated, user?.role, navigate]);

  const { data: activities = [], isLoading } = trpc.activities.myActivities.useQuery(undefined, { enabled: !!user && user.role === "staff" });
  const updateStatus = trpc.activities.updateMyStatus.useMutation({
    onSuccess: async () => {
      await utils.activities.myActivities.invalidate();
      toast.success("Actividad actualizada");
      setSelected(null);
    },
    onError: (error) => toast.error(error.message),
  });

  if (loading || !isAuthenticated || user?.role !== "staff") return null;

  const openActivity = (activity: any) => {
    setSelected(activity);
    setStatus(activity.status);
    setComment(activity.completionComment || "");
    setEvidenceUrl(activity.evidenceImageUrl || "");
  };

  const uploadEvidence = async (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/") || file.size > 5 * 1024 * 1024) {
      toast.error("La evidencia debe ser una imagen de máximo 5MB");
      return;
    }
    setUploading(true);
    try {
      const base64Data = await readFileAsDataUrl(file);
      const result = await upload.mutateAsync({ filename: file.name, base64Data, contentType: file.type });
      setEvidenceUrl(result.url);
      toast.success("Imagen de evidencia cargada");
    } catch (error: any) {
      toast.error(error.message || "No fue posible cargar la evidencia");
    } finally {
      setUploading(false);
    }
  };

  const save = (event: React.FormEvent) => {
    event.preventDefault();
    if (!selected) return;
    updateStatus.mutate({ activityId: selected.id, status, completionComment: comment || undefined, evidenceImageUrl: evidenceUrl || undefined });
  };

  return (
    <SongTapLayout role="staff" title="Mis actividades">
      <div className="space-y-6 animate-slide-up">
        <div><h2 className="text-xl font-bold text-foreground sm:text-2xl">Mis actividades</h2><p className="mt-1 text-sm text-muted-foreground">Actualiza el avance y adjunta comentarios o imágenes como evidencia.</p></div>
        <Card className="border-border bg-card"><CardHeader><CardTitle className="flex items-center gap-2 text-base"><ClipboardCheck size={18} className="text-primary" /> Actividades asignadas ({activities.length})</CardTitle><CardDescription>Solo tú puedes actualizar tus propias actividades.</CardDescription></CardHeader><CardContent>{isLoading ? <p className="py-8 text-center text-sm text-muted-foreground">Cargando actividades...</p> : activities.length === 0 ? <p className="py-8 text-center text-sm text-muted-foreground">No tienes actividades asignadas.</p> : <div className="space-y-3">{activities.map((activity) => <article key={activity.id} className="rounded-xl border border-border bg-secondary/20 p-4"><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold text-foreground">{activity.title}</h3><span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusClass[activity.status]}`}>{statusLabel[activity.status]}</span></div>{activity.description && <p className="mt-1 text-sm text-muted-foreground">{activity.description}</p>}</div><Button size="sm" variant="outline" className="border-primary text-primary hover:bg-primary/10" onClick={() => openActivity(activity)}>{activity.status === "completed" ? <CheckCircle2 size={15} className="mr-1.5" /> : <PlayCircle size={15} className="mr-1.5" />}{activity.status === "completed" ? "Ver reporte" : "Actualizar"}</Button></div>{activity.completedAt && <p className="mt-3 flex items-center gap-1 text-xs text-muted-foreground"><Clock3 size={13} /> Actualizada: {new Date(activity.updatedAt).toLocaleString("es-CO")}</p>}</article>)}</div>}</CardContent></Card>
      </div>
      <Dialog open={!!selected} onOpenChange={(open) => { if (!open) setSelected(null); }}><DialogContent className="max-h-[90vh] overflow-y-auto border-border bg-card sm:max-w-lg"><DialogHeader><DialogTitle>Actualizar actividad</DialogTitle></DialogHeader>{selected && <form className="space-y-4" onSubmit={save}><div className="rounded-lg border border-border bg-secondary/20 p-3"><p className="font-semibold text-foreground">{selected.title}</p>{selected.description && <p className="mt-1 text-sm text-muted-foreground">{selected.description}</p>}</div><div className="space-y-2"><Label htmlFor="activity-status">Estado</Label><Select value={status} onValueChange={(value) => setStatus(value as typeof status)}><SelectTrigger id="activity-status" className="border-border bg-input"><SelectValue /></SelectTrigger><SelectContent className="border-border bg-card"><SelectItem value="pending">Pendiente</SelectItem><SelectItem value="in_progress">En proceso</SelectItem><SelectItem value="completed">Realizada</SelectItem></SelectContent></Select></div><div className="space-y-2"><Label htmlFor="activity-comment" className="flex items-center gap-1"><MessageSquare size={14} className="text-primary" /> Comentarios</Label><Textarea id="activity-comment" value={comment} onChange={(event) => setComment(event.target.value)} className="min-h-24 border-border bg-input" placeholder="Describe lo realizado, novedades o motivo de pendiente." /></div><div className="space-y-2"><Label htmlFor="activity-evidence" className="flex items-center gap-1"><ImagePlus size={14} className="text-primary" /> Imagen de evidencia</Label><input id="activity-evidence" type="file" accept="image/*" className="block w-full text-sm text-muted-foreground file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-2 file:text-sm file:font-medium file:text-primary-foreground" onChange={(event) => uploadEvidence(event.target.files?.[0])} />{uploading && <p className="text-xs text-primary">Cargando imagen...</p>}{evidenceUrl && <a href={evidenceUrl} target="_blank" rel="noreferrer" className="text-xs font-medium text-primary hover:underline">Imagen adjunta correctamente</a>}</div><Button type="submit" className="w-full bg-primary text-primary-foreground hover:bg-primary/90" disabled={uploading || updateStatus.isPending}>{updateStatus.isPending && <Loader2 size={16} className="mr-2 animate-spin" />}Guardar actualización</Button></form>}</DialogContent></Dialog>
    </SongTapLayout>
  );
}
