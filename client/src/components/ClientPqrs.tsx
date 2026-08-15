import { useState } from "react";
import { HeartHandshake, ClipboardList, Send } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type ClientSession = {
  sessionToken: string;
  sessionId: number;
  venueId: number;
  tableId: number;
};

const typeLabels = {
  petition: "Petición",
  complaint: "Queja",
  claim: "Reclamo",
  suggestion: "Sugerencia",
  congratulation: "Felicitación",
};

const statusLabels = {
  open: "Recibida",
  in_review: "En revisión",
  resolved: "Resuelta",
  closed: "Cerrada",
};

export default function ClientPqrs({ session }: { session: ClientSession }) {
  const [form, setForm] = useState({ type: "suggestion" as keyof typeof typeLabels, subject: "", message: "" });
  const { data: tickets = [], refetch } = trpc.pqrs.getMyTickets.useQuery(
    { venueId: session.venueId, sessionId: session.sessionId, sessionToken: session.sessionToken },
    { refetchInterval: 10000 }
  );
  const createTicket = trpc.pqrs.create.useMutation({
    onSuccess: () => {
      toast.success("Tu PQRS fue enviada. El equipo del local la revisará.");
      setForm({ type: "suggestion", subject: "", message: "" });
      refetch();
    },
    onError: (error) => toast.error(error.message),
  });

  const submit = () => {
    if (!form.subject.trim() || form.message.trim().length < 10) return;
    createTicket.mutate({
      sessionToken: session.sessionToken,
      sessionId: session.sessionId,
      venueId: session.venueId,
      tableId: session.tableId,
      type: form.type,
      subject: form.subject.trim(),
      message: form.message.trim(),
    });
  };

  return (
    <div className="space-y-4">
      <Card className="bg-card border-border">
        <CardContent className="p-5 space-y-4">
          <div>
            <h3 className="font-semibold text-foreground text-sm flex items-center gap-2"><HeartHandshake size={16} className="text-primary" /> Cuéntanos cómo podemos mejorar</h3>
            <p className="text-xs text-muted-foreground mt-1">Envía una petición, queja, reclamo, sugerencia o felicitación desde esta mesa.</p>
          </div>
          <div className="space-y-3">
            <div>
              <Label className="text-xs text-muted-foreground" htmlFor="pqrs-type">Tipo de solicitud</Label>
              <select id="pqrs-type" className="mt-1 h-9 w-full rounded-md border border-border bg-input px-3 text-sm text-foreground" value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value as keyof typeof typeLabels })}>
                {Object.entries(typeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground" htmlFor="pqrs-subject">Asunto</Label>
              <Input id="pqrs-subject" className="mt-1 bg-input border-border text-foreground text-sm" maxLength={255} placeholder="Resume tu solicitud" value={form.subject} onChange={(event) => setForm({ ...form, subject: event.target.value })} />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground" htmlFor="pqrs-message">Mensaje</Label>
              <textarea id="pqrs-message" className="mt-1 min-h-28 w-full rounded-md border border-border bg-input px-3 py-2 text-sm text-foreground" maxLength={5000} placeholder="Cuéntanos los detalles (mínimo 10 caracteres)" value={form.message} onChange={(event) => setForm({ ...form, message: event.target.value })} />
            </div>
            <Button className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-semibold text-sm" onClick={submit} disabled={!form.subject.trim() || form.message.trim().length < 10 || createTicket.isPending}>
              <Send size={14} className="mr-2" /> {createTicket.isPending ? "Enviando..." : "Enviar PQRS"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-card border-border">
        <CardContent className="p-5 space-y-3">
          <h3 className="font-semibold text-foreground text-sm flex items-center gap-2"><ClipboardList size={16} className="text-primary" /> Mis solicitudes</h3>
          {!tickets.length ? <p className="py-3 text-center text-xs text-muted-foreground">Aún no has enviado solicitudes desde esta sesión.</p> : tickets.map((ticket) => (
            <div key={ticket.id} className="rounded-lg border border-border bg-secondary/30 p-3 space-y-1.5">
              <div className="flex items-start justify-between gap-2"><p className="font-medium text-sm text-foreground">{ticket.subject}</p><span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold text-primary">{statusLabels[ticket.status]}</span></div>
              <p className="text-xs text-muted-foreground">{typeLabels[ticket.type]} · {new Date(ticket.createdAt).toLocaleString()}</p>
              <p className="text-xs text-foreground/90 whitespace-pre-wrap">{ticket.message}</p>
              {ticket.response && <p className="rounded-md border border-primary/20 bg-primary/10 p-2 text-xs text-foreground"><span className="font-semibold text-primary">Respuesta del local: </span>{ticket.response}</p>}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
