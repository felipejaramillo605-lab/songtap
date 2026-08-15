import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { CheckCircle2, Clock3, MessageSquareText, Send, XCircle } from "lucide-react";
import { toast } from "sonner";
import SongTapLayout from "@/components/SongTapLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";

const statusLabels = {
  open: "Recibida",
  in_review: "En revisión",
  resolved: "Resuelta",
  closed: "Cerrada",
};

const typeLabels = {
  petition: "Petición",
  complaint: "Queja",
  claim: "Reclamo",
  suggestion: "Sugerencia",
  congratulation: "Felicitación",
};

const statusClass = {
  open: "border-yellow-400/30 bg-yellow-400/10 text-yellow-200",
  in_review: "border-blue-400/30 bg-blue-400/10 text-blue-200",
  resolved: "border-primary/30 bg-primary/10 text-primary",
  closed: "border-muted bg-secondary text-muted-foreground",
};

export default function ManagerPqrs() {
  const { user, isAuthenticated, loading } = useAuth();
  const [, navigate] = useLocation();
  const [statusFilter, setStatusFilter] = useState<"all" | keyof typeof statusLabels>("all");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [response, setResponse] = useState("");
  const [nextStatus, setNextStatus] = useState<keyof typeof statusLabels>("in_review");
  const venueId = user?.venueId;

  useEffect(() => {
    if (!loading && !isAuthenticated) window.location.href = getLoginUrl();
    if (!loading && isAuthenticated && !["owner", "manager", "staff"].includes(user?.role ?? "")) navigate("/");
  }, [loading, isAuthenticated, navigate, user?.role]);

  const { data: tickets = [], isLoading, refetch } = trpc.pqrs.listByVenue.useQuery(
    { venueId: venueId!, status: statusFilter === "all" ? undefined : statusFilter },
    { enabled: !!venueId, refetchInterval: 10000 }
  );
  const selected = useMemo(() => tickets.find((ticket) => ticket.id === selectedId) ?? null, [tickets, selectedId]);

  useEffect(() => {
    if (selected) {
      setResponse(selected.response ?? "");
      setNextStatus(selected.status);
    }
  }, [selected]);

  const updateTicket = trpc.pqrs.update.useMutation({
    onSuccess: () => {
      toast.success("PQRS actualizada correctamente.");
      setSelectedId(null);
      refetch();
    },
    onError: (error) => toast.error(error.message),
  });

  if (loading || !isAuthenticated || !user || !["owner", "manager", "staff"].includes(user.role)) return null;

  const saveSelected = () => {
    if (!selected || !venueId) return;
    updateTicket.mutate({ venueId, ticketId: selected.id, status: nextStatus, response });
  };

  return (
    <SongTapLayout role={user.role === "owner" ? "owner" : user.role === "manager" ? "manager" : "staff"} title="PQRS">
      <div className="space-y-6 animate-slide-up">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-xl font-bold text-foreground flex items-center gap-2"><MessageSquareText className="text-primary" /> Bandeja PQRS</h2>
            <p className="mt-1 text-sm text-muted-foreground">Revisa y responde solicitudes enviadas desde las mesas de tu local.</p>
          </div>
          <div className="w-full sm:w-48">
            <Label htmlFor="pqrs-status-filter" className="text-xs text-muted-foreground">Estado</Label>
            <select id="pqrs-status-filter" className="mt-1 h-9 w-full rounded-md border border-border bg-input px-3 text-sm text-foreground" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}>
              <option value="all">Todos los estados</option>
              {Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </div>
        </div>

        {isLoading ? <div className="py-12 text-center text-sm text-muted-foreground">Cargando PQRS...</div> : !tickets.length ? (
          <Card className="border-dashed border-border bg-card"><CardContent className="py-12 text-center"><MessageSquareText className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" /><p className="text-sm text-muted-foreground">No hay PQRS para este filtro.</p></CardContent></Card>
        ) : (
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(340px,0.8fr)]">
            <div className="space-y-3">
              {tickets.map((ticket) => (
                <button key={ticket.id} type="button" onClick={() => setSelectedId(ticket.id)} className={`w-full rounded-xl border p-4 text-left transition-colors ${selectedId === ticket.id ? "border-primary bg-primary/10" : "border-border bg-card hover:border-primary/40"}`}>
                  <div className="flex flex-wrap items-start justify-between gap-2"><div><p className="font-semibold text-foreground">{ticket.subject}</p><p className="mt-0.5 text-xs text-muted-foreground">{typeLabels[ticket.type]} · {ticket.clientName} · Mesa {ticket.tableId}</p></div><span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${statusClass[ticket.status]}`}>{statusLabels[ticket.status]}</span></div>
                  <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{ticket.message}</p>
                  <p className="mt-2 text-[11px] text-muted-foreground">{new Date(ticket.createdAt).toLocaleString()}</p>
                </button>
              ))}
            </div>

            <Card className="h-fit border-border bg-card xl:sticky xl:top-6">
              <CardContent className="p-5">
                {!selected ? <div className="py-10 text-center"><Clock3 className="mx-auto mb-3 h-8 w-8 text-muted-foreground/40" /><p className="text-sm text-muted-foreground">Selecciona una PQRS para responderla.</p></div> : (
                  <div className="space-y-4">
                    <div><p className="text-xs font-semibold uppercase tracking-wide text-primary">{typeLabels[selected.type]}</p><h3 className="mt-1 text-lg font-bold text-foreground">{selected.subject}</h3><p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{selected.message}</p><p className="mt-3 text-xs text-muted-foreground">Enviada por {selected.clientName} desde la mesa {selected.tableId}</p></div>
                    <div><Label htmlFor="pqrs-next-status" className="text-xs text-muted-foreground">Estado de atención</Label><select id="pqrs-next-status" className="mt-1 h-9 w-full rounded-md border border-border bg-input px-3 text-sm text-foreground" value={nextStatus} onChange={(event) => setNextStatus(event.target.value as keyof typeof statusLabels)}>{Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>
                    <div><Label htmlFor="pqrs-response" className="text-xs text-muted-foreground">Respuesta para el cliente</Label><textarea id="pqrs-response" className="mt-1 min-h-32 w-full rounded-md border border-border bg-input px-3 py-2 text-sm text-foreground" maxLength={5000} placeholder="Escribe una respuesta clara y respetuosa" value={response} onChange={(event) => setResponse(event.target.value)} /></div>
                    <Button className="w-full bg-primary text-primary-foreground hover:bg-primary/90" onClick={saveSelected} disabled={updateTicket.isPending}><Send size={15} className="mr-2" />{updateTicket.isPending ? "Guardando..." : "Guardar seguimiento"}</Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </SongTapLayout>
  );
}
