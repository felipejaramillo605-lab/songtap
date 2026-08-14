import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { ClipboardCheck, Loader2, Plus, UserRound } from "lucide-react";
import { toast } from "sonner";
import SongTapLayout from "@/components/SongTapLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { getLoginUrl } from "@/const";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";

const statusLabel = { pending: "Pendiente", in_progress: "En proceso", completed: "Realizada" };
const statusClass = { pending: "bg-yellow-400/10 text-yellow-400", in_progress: "bg-blue-400/10 text-blue-400", completed: "bg-green-400/10 text-green-400" };

export default function ManagerActivities() {
  const { user, isAuthenticated, loading } = useAuth();
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();
  const [open, setOpen] = useState(false);
  const [assigneeId, setAssigneeId] = useState("unselected");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const venueId = user?.venueId;

  useEffect(() => {
    if (!loading && !isAuthenticated) window.location.href = getLoginUrl();
    if (!loading && isAuthenticated && user?.role !== "manager") navigate("/");
  }, [loading, isAuthenticated, user?.role, navigate]);

  const { data: team = [] } = trpc.users.list.useQuery(undefined, { enabled: !!user && user.role === "manager" });
  const { data: activities = [], isLoading } = trpc.activities.listByVenue.useQuery(
    { venueId: venueId ?? 0 },
    { enabled: !!venueId && user?.role === "manager" }
  );
  const staffMembers = useMemo(() => team.filter((member) => member.venueId === venueId && member.role === "staff"), [team, venueId]);
  const staffById = useMemo(() => new Map(staffMembers.map((member) => [member.id, member])), [staffMembers]);

  const createActivity = trpc.activities.create.useMutation({
    onSuccess: async () => {
      await utils.activities.listByVenue.invalidate();
      toast.success("Actividad asignada al Staff");
      setOpen(false);
      setAssigneeId("unselected");
      setTitle("");
      setDescription("");
    },
    onError: (error) => toast.error(error.message),
  });

  if (loading || !isAuthenticated || user?.role !== "manager") return null;

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!venueId || assigneeId === "unselected") {
      toast.error("Selecciona un integrante Staff");
      return;
    }
    createActivity.mutate({ venueId, assignedToUserId: Number(assigneeId), title, description: description || undefined });
  };

  return (
    <SongTapLayout role="manager" title="Actividades">
      <div className="space-y-6 animate-slide-up">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-xl font-bold text-foreground sm:text-2xl">Actividades del equipo</h2>
            <p className="mt-1 text-sm text-muted-foreground">Asigna tareas a tu Staff y realiza seguimiento de su ejecución.</p>
          </div>
          <Button className="bg-primary text-primary-foreground hover:bg-primary/90" onClick={() => setOpen(true)} disabled={staffMembers.length === 0}>
            <Plus size={16} className="mr-2" /> Asignar actividad
          </Button>
        </div>

        {staffMembers.length === 0 && (
          <Card className="border-border bg-card"><CardContent className="p-6 text-sm text-muted-foreground">Primero asigna integrantes con rol Staff a tu local para poder crear actividades.</CardContent></Card>
        )}

        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><ClipboardCheck size={18} className="text-primary" /> Seguimiento ({activities.length})</CardTitle>
            <CardDescription>Las evidencias, comentarios y cambios de estado quedan trazables para tu local.</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? <p className="py-8 text-center text-sm text-muted-foreground">Cargando actividades...</p> : activities.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">No hay actividades asignadas todavía.</p>
            ) : (
              <div className="space-y-3">
                {activities.map((activity) => {
                  const assignee = staffById.get(activity.assignedToUserId);
                  return (
                    <article key={activity.id} className="rounded-xl border border-border bg-secondary/20 p-4">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold text-foreground">{activity.title}</h3><span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusClass[activity.status]}`}>{statusLabel[activity.status]}</span></div>
                          {activity.description && <p className="mt-1 text-sm text-muted-foreground">{activity.description}</p>}
                        </div>
                        <p className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground"><UserRound size={13} className="text-primary" /> {assignee?.name || assignee?.email || `Staff #${activity.assignedToUserId}`}</p>
                      </div>
                      {(activity.completionComment || activity.evidenceImageUrl) && <div className="mt-3 rounded-lg border border-primary/20 bg-primary/[0.04] p-3 text-sm"><p className="font-medium text-primary">Reporte del Staff</p>{activity.completionComment && <p className="mt-1 text-muted-foreground">{activity.completionComment}</p>}{activity.evidenceImageUrl && <a href={activity.evidenceImageUrl} target="_blank" rel="noreferrer" className="mt-2 inline-block text-xs font-medium text-primary hover:underline">Ver imagen de evidencia</a>}</div>}
                    </article>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="border-border bg-card sm:max-w-lg">
          <DialogHeader><DialogTitle>Asignar actividad</DialogTitle></DialogHeader>
          <form className="space-y-4" onSubmit={submit}>
            <div className="space-y-2"><Label htmlFor="activity-staff">Integrante Staff</Label><Select value={assigneeId} onValueChange={setAssigneeId}><SelectTrigger id="activity-staff" className="border-border bg-input"><SelectValue placeholder="Selecciona Staff" /></SelectTrigger><SelectContent className="border-border bg-card"> <SelectItem value="unselected">Selecciona un integrante</SelectItem>{staffMembers.map((member) => <SelectItem key={member.id} value={String(member.id)}>{member.name || member.email || `Staff #${member.id}`}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-2"><Label htmlFor="activity-title">Actividad</Label><Input id="activity-title" value={title} onChange={(event) => setTitle(event.target.value)} minLength={3} maxLength={255} required className="border-border bg-input" placeholder="Ej. Verificar inventario de barra" /></div>
            <div className="space-y-2"><Label htmlFor="activity-description">Instrucciones</Label><Textarea id="activity-description" value={description} onChange={(event) => setDescription(event.target.value)} className="min-h-28 border-border bg-input" placeholder="Indica el resultado esperado o detalles relevantes." /></div>
            <Button type="submit" className="w-full bg-primary text-primary-foreground hover:bg-primary/90" disabled={createActivity.isPending}>{createActivity.isPending && <Loader2 size={16} className="mr-2 animate-spin" />}Asignar actividad</Button>
          </form>
        </DialogContent>
      </Dialog>
    </SongTapLayout>
  );
}
