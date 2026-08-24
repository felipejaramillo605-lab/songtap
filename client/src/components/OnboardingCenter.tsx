import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { AlertTriangle, ArrowLeft, ArrowRight, BookOpenCheck, Bug, Check, CircleHelp, ClipboardCheck, FileBarChart2, Lightbulb, ListChecks, Music2, QrCode, ShieldCheck, Store, UserRoundCog, UtensilsCrossed } from "lucide-react";
import { toast } from "sonner";

type Role = "owner" | "manager" | "staff";

type GuideStep = {
  title: string;
  description: string;
  action: string;
  href: string;
  icon: typeof Store;
  preview: "owner-dashboard" | "action" | "checklist";
  errorTip: string;
};

const OWNER_SCREENSHOT = "/manus-storage/onboarding-owner-dashboard_75358e59.png";
const ACCESS_DENIED_SCREENSHOT = "/manus-storage/onboarding-access-denied_dd6f310b.png";

const guides: Record<Role, { title: string; description: string; steps: GuideStep[]; selfManagement: string[] }> = {
  owner: {
    title: "Controla SongTap con visión global",
    description: "Aprende a organizar locales, atender solicitudes, revisar la operación y mantener el control de la plataforma.",
    steps: [
      { title: "Lee tu panorama", description: "El Dashboard resume locales, usuarios, ingresos y actividad de la plataforma.", action: "Usa Generar reporte ahora para crear un consolidado cuando lo necesites.", href: "/owner", icon: FileBarChart2, preview: "owner-dashboard", errorTip: "Si las métricas aparecen en cero, revisa el periodo y confirma que existan pedidos entregados." },
      { title: "Aprueba nuevos locales", description: "Gestiona solicitudes de empresas y asignaciones desde el módulo Solicitudes.", action: "Abre Solicitudes, revisa los datos y aprueba o rechaza dejando trazabilidad.", href: "/owner/venue-requests", icon: Store, preview: "action", errorTip: "No apruebes una solicitud incompleta; pide al manager completar datos antes de decidir." },
      { title: "Protege y audita", description: "Auditoría registra acciones relevantes; Modo de pruebas permite verificar vistas sin afectar operaciones.", action: "En Modo de pruebas, elige local y rol. Usa Reportar error si encuentras un comportamiento inesperado.", href: "/owner/test-mode", icon: ShieldCheck, preview: "checklist", errorTip: "El modo de pruebas no permite mutaciones: es la forma segura de reproducir un error." },
      { title: "Mantén a todos informados", description: "Notificaciones reúne alertas, reportes internos e incidencias recibidas del equipo.", action: "Abre Notificaciones para revisar alertas y descargar reportes en PDF o Excel.", href: "/owner/notifications", icon: CircleHelp, preview: "action", errorTip: "Si no recibes alertas, confirma la configuración de notificaciones y actualiza la bandeja." },
    ],
    selfManagement: ["Actualiza tu perfil, idioma y contraseña desde Mi Perfil.", "Usa Modo de pruebas antes de responder un incidente de Manager o Staff.", "Consulta Notificaciones para verificar reportes e incidencias nuevas."],
  },
  manager: {
    title: "Pon tu local en operación",
    description: "Configura tu empresa, publica el menú, genera QR y organiza al equipo desde un único panel.",
    steps: [
      { title: "Configura tu local", description: "Revisa los datos comerciales y políticas del local antes de abrirlo al público.", action: "Abre Configuración y completa la información esencial de tu empresa.", href: "/manager/settings", icon: Store, preview: "action", errorTip: "Si aún no tienes local asignado, completa la solicitud de empresa y espera aprobación del Owner." },
      { title: "Publica menú y equipo", description: "Crea categorías, productos y gestiona perfiles del personal autorizado.", action: "En Menú agrega productos; en Personal asigna y actualiza la información de tu equipo.", href: "/manager/menu", icon: UtensilsCrossed, preview: "checklist", errorTip: "Si una foto no carga, verifica el formato permitido y vuelve a intentar desde el cargador." },
      { title: "Activa mesas con QR", description: "Cada mesa tiene un QR único para iniciar pedidos, música y PQRS de manera segura.", action: "Ve a Mesas & QR, crea la mesa y descarga o imprime su código.", href: "/manager/tables", icon: QrCode, preview: "action", errorTip: "Un QR inválido normalmente indica que la mesa está inactiva o que se usó un código antiguo." },
      { title: "Coordina la operación", description: "Da seguimiento a finanzas, actividades del staff y PQRS sin perder el control del local.", action: "Asigna actividades desde Actividades y revisa PQRS para responder al cliente.", href: "/manager/activities", icon: ClipboardCheck, preview: "checklist", errorTip: "Un Staff no puede convertirse en Manager desde el panel; solicita cambios de rol al Owner." },
    ],
    selfManagement: ["Actualiza datos, idioma y contraseña desde Mi Perfil.", "Comprueba que tu local esté asignado antes de crear menú o mesas.", "Revisa las decisiones de acceso recibidas desde tu perfil."],
  },
  staff: {
    title: "Atiende cada mesa sin perder el ritmo",
    description: "Gestiona pedidos, música, tareas y PQRS asignadas por el Manager de tu local.",
    steps: [
      { title: "Procesa pedidos", description: "Los pedidos entrantes se organizan por estado para que el equipo tenga visibilidad de la operación.", action: "Abre Pedidos y cambia el estado solo cuando la preparación o entrega realmente avance.", href: "/staff", icon: ListChecks, preview: "action", errorTip: "Si no ves un pedido esperado, actualiza la pantalla y confirma que pertenece a tu local." },
      { title: "Gestiona la música", description: "La cola musical muestra solicitudes por mesa; el Staff marca la canción en reproducción.", action: "Ve a Música, valida título y artista y marca la canción actual al iniciar su reproducción.", href: "/staff/music", icon: Music2, preview: "checklist", errorTip: "No elimines una solicitud por error: verifica primero mesa, canción y turno en la cola." },
      { title: "Cierra tus actividades", description: "Registra el resultado de las tareas asignadas con comentario, evidencia o ambos.", action: "En Mis actividades actualiza el estado y adjunta evidencia solo cuando corresponda.", href: "/staff/activities", icon: ClipboardCheck, preview: "action", errorTip: "Si no puedes completar una tarea, deja un comentario claro para que el Manager pueda reasignarla." },
      { title: "Responde con contexto", description: "Las PQRS se atienden dentro del alcance del local y quedan trazadas.", action: "Abre PQRS, revisa el detalle y usa una respuesta concreta y respetuosa.", href: "/staff/pqrs", icon: CircleHelp, preview: "checklist", errorTip: "No intentes abrir módulos de Manager: SongTap bloqueará ese acceso para proteger los datos." },
    ],
    selfManagement: ["Edita datos personales, idioma y contraseña desde Mi Perfil.", "Usa los comentarios de actividades para dejar contexto al Manager.", "Revisa tus decisiones de acceso en el perfil cuando el Owner responda una solicitud."],
  },
};

function ActionPreview({ step }: { step: GuideStep }) {
  const Icon = step.icon;
  if (step.preview === "owner-dashboard") {
    return <div className="overflow-hidden rounded-xl border border-primary/40 bg-black"><img src={OWNER_SCREENSHOT} alt="Captura del Dashboard Owner con el botón Generar reporte ahora" className="h-44 w-full object-cover object-top" /><div className="flex items-center gap-2 border-t border-primary/30 bg-primary/10 px-3 py-2 text-xs text-primary"><Check className="h-4 w-4" /> Acción visible: Generar reporte ahora</div></div>;
  }
  if (step.preview === "checklist") {
    return <div className="rounded-xl border border-border bg-secondary/20 p-4"><div className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground"><Icon className="h-4 w-4 text-primary" /> Antes de continuar</div><div className="space-y-2 text-xs text-muted-foreground"><p className="flex gap-2"><Check className="mt-0.5 h-3.5 w-3.5 text-primary" /> Confirma el local y la información mostrada.</p><p className="flex gap-2"><Check className="mt-0.5 h-3.5 w-3.5 text-primary" /> Revisa la acción antes de guardarla.</p><p className="flex gap-2"><Check className="mt-0.5 h-3.5 w-3.5 text-primary" /> Deja una nota cuando el equipo necesite contexto.</p></div></div>;
  }
  return <div className="rounded-xl border border-border bg-gradient-to-br from-secondary/60 to-background p-4"><div className="flex items-center justify-between"><div className="flex items-center gap-2 text-sm font-semibold text-foreground"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15 text-primary"><Icon className="h-4 w-4" /></span>{step.title}</div><span className="rounded-md border border-primary/40 bg-primary/10 px-2 py-1 text-[11px] font-medium text-primary">Abrir módulo</span></div><div className="mt-4 rounded-lg border border-border bg-background px-3 py-2 text-xs text-muted-foreground">Busca en el menú lateral: <span className="font-semibold text-foreground">{step.href}</span></div><div className="mt-3 h-2 w-4/5 rounded-full bg-primary/20" /><div className="mt-2 h-2 w-3/5 rounded-full bg-muted" /></div>;
}

export default function OnboardingCenter({ role, compact = false }: { role: Role; compact?: boolean }) {
  const [, navigate] = useLocation();
  const [location] = useLocation();
  const [open, setOpen] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const [issueTitle, setIssueTitle] = useState("");
  const [issueDescription, setIssueDescription] = useState("");
  const guide = guides[role];
  const { data: progress, isLoading } = trpc.onboarding.getProgress.useQuery();
  const { data: tickets = [] } = trpc.onboarding.listSupportTickets.useQuery(undefined, { enabled: open });
  const utils = trpc.useUtils();
  const markOpened = trpc.onboarding.markOpened.useMutation();
  const complete = trpc.onboarding.complete.useMutation({ onSuccess: () => utils.onboarding.getProgress.invalidate() });
  const reset = trpc.onboarding.reset.useMutation({ onSuccess: () => { setActiveStep(0); utils.onboarding.getProgress.invalidate(); } });
  const reportIssue = trpc.onboarding.reportIssue.useMutation({
    onSuccess: async () => { setIssueTitle(""); setIssueDescription(""); toast.success("Incidencia enviada. Recibirás seguimiento en esta ayuda."); await Promise.all([utils.onboarding.listSupportTickets.invalidate(), utils.notifications.getPendingCount.invalidate()]); },
    onError: (error) => toast.error(error.message),
  });
  const current = guide.steps[activeStep];
  const Icon = current.icon;
  const isCompleted = Boolean(progress?.completedAt);

  useEffect(() => {
    if (!isLoading && !progress?.completedAt) {
      setOpen(true);
      markOpened.mutate();
    }
  }, [isLoading, progress?.completedAt]);

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (next) markOpened.mutate();
  };
  const goToStep = (index: number) => setActiveStep(Math.max(0, Math.min(index, guide.steps.length - 1)));
  const openModule = () => { setOpen(false); navigate(current.href); };
  const submitIssue = () => reportIssue.mutate({ route: location, title: issueTitle.trim(), description: issueDescription.trim() });
  const ticketStatus = useMemo(() => ({ open: "Abierta", in_review: "En revisión", resolved: "Resuelta" }), []);

  return <Dialog open={open} onOpenChange={handleOpenChange}>
    <DialogTrigger asChild><Button type="button" variant={compact ? "ghost" : "outline"} size="sm" className={cn("gap-2 text-muted-foreground hover:text-foreground", compact && "w-full justify-start px-3") }><BookOpenCheck className="h-4 w-4" />{compact ? "Guía y ayuda" : "Abrir guía"}</Button></DialogTrigger>
    <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto border-border bg-card p-0 text-card-foreground">
      <DialogHeader className="border-b border-border bg-gradient-to-br from-primary/12 via-card to-card px-6 py-5 text-left">
        <div className="flex items-start gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground"><BookOpenCheck className="h-5 w-5" /></span><div><DialogTitle className="text-xl">Tu guía SongTap</DialogTitle><DialogDescription className="mt-1 max-w-2xl text-sm">{guide.title}. {guide.description}</DialogDescription></div></div>
      </DialogHeader>
      <Tabs defaultValue="tour" className="px-6 py-5">
        <TabsList className="grid w-full grid-cols-2"><TabsTrigger value="tour">Recorrido guiado</TabsTrigger><TabsTrigger value="help">Ayuda y errores</TabsTrigger></TabsList>
        <TabsContent value="tour" className="mt-5 space-y-5">
          <div className="grid gap-5 md:grid-cols-[200px_1fr]">
            <ol className="space-y-2" aria-label="Pasos del onboarding">{guide.steps.map((step, index) => <li key={step.title}><button type="button" onClick={() => goToStep(index)} className={cn("flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors", index === activeStep ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary hover:text-foreground")}><span className="flex h-5 w-5 items-center justify-center rounded-full border border-current text-[11px]">{index + 1}</span><span className="line-clamp-2">{step.title}</span></button></li>)}</ol>
            <article className="rounded-xl border border-border bg-background p-5"><div className="flex items-start justify-between gap-3"><div><Badge className="mb-2 bg-primary/15 text-primary hover:bg-primary/15">Paso {activeStep + 1} de {guide.steps.length}</Badge><h3 className="flex items-center gap-2 text-lg font-bold"><Icon className="h-5 w-5 text-primary" />{current.title}</h3><p className="mt-2 text-sm leading-6 text-muted-foreground">{current.description}</p></div></div><div className="mt-5"><ActionPreview step={current} /></div><div className="mt-4 rounded-lg border border-primary/30 bg-primary/8 p-3 text-sm"><span className="font-semibold text-primary">Qué debes hacer: </span>{current.action}</div><div className="mt-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-100"><AlertTriangle className="mr-1 inline h-4 w-4 text-amber-400" /><span className="font-semibold">Si algo no sale como esperas: </span>{current.errorTip}</div><div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-between"><Button type="button" variant="outline" onClick={() => goToStep(activeStep - 1)} disabled={activeStep === 0}><ArrowLeft className="mr-1 h-4 w-4" />Anterior</Button><div className="flex gap-2"><Button type="button" variant="outline" onClick={openModule}>Abrir este módulo</Button>{activeStep === guide.steps.length - 1 ? <Button type="button" onClick={() => complete.mutate()} disabled={complete.isPending}>{isCompleted ? "Guía completada" : "Completar guía"}<Check className="ml-1 h-4 w-4" /></Button> : <Button type="button" onClick={() => goToStep(activeStep + 1)}>Siguiente<ArrowRight className="ml-1 h-4 w-4" /></Button>}</div></div></article>
          </div>
          {isCompleted && <div className="flex flex-col gap-3 rounded-lg border border-border bg-secondary/30 p-4 text-sm sm:flex-row sm:items-center sm:justify-between"><p className="text-muted-foreground">Completaste este recorrido. Puedes reabrirlo cuando quieras o reiniciarlo para repasar cada paso.</p><Button type="button" variant="outline" size="sm" onClick={() => reset.mutate()} disabled={reset.isPending}>Reiniciar guía</Button></div>}
        </TabsContent>
        <TabsContent value="help" className="mt-5 space-y-5"><div className="grid gap-5 lg:grid-cols-2"><section className="space-y-4 rounded-xl border border-border bg-background p-5"><div><h3 className="flex items-center gap-2 font-bold"><Lightbulb className="h-5 w-5 text-primary" />Autogestión</h3><p className="mt-1 text-sm text-muted-foreground">Antes de reportar, intenta estas acciones seguras.</p></div><ul className="space-y-3 text-sm text-muted-foreground">{guide.selfManagement.map(item => <li key={item} className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />{item}</li>)}<li className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />Actualiza la página si una operación queda pendiente; no repitas una acción crítica hasta confirmar el resultado.</li></ul><img src={ACCESS_DENIED_SCREENSHOT} alt="Ejemplo de pantalla Acceso denegado con opciones para volver al panel o cambiar de cuenta" className="rounded-lg border border-border" /><p className="text-xs text-muted-foreground">Si ves Acceso denegado, vuelve a tu panel o cambia de cuenta; no intentes acceder a datos de otro rol.</p></section><section className="rounded-xl border border-border bg-background p-5"><div><h3 className="flex items-center gap-2 font-bold"><Bug className="h-5 w-5 text-destructive" />Reportar un error</h3><p className="mt-1 text-sm text-muted-foreground">Incluye qué ocurrió, qué esperabas y los pasos para reproducirlo. SongTap adjunta la ruta actual automáticamente.</p></div><div className="mt-4 space-y-3"><div><Label htmlFor="support-title">Título</Label><Input id="support-title" value={issueTitle} maxLength={180} onChange={event => setIssueTitle(event.target.value)} placeholder="Ej.: No puedo marcar un pedido como entregado" /></div><div><Label htmlFor="support-description">Descripción</Label><Textarea id="support-description" value={issueDescription} maxLength={5000} onChange={event => setIssueDescription(event.target.value)} placeholder="Qué hiciste, qué esperabas y qué ocurrió…" rows={5} /></div><Button type="button" className="w-full" onClick={submitIssue} disabled={issueTitle.trim().length < 5 || issueDescription.trim().length < 10 || reportIssue.isPending}>{reportIssue.isPending ? "Enviando incidencia…" : "Enviar incidencia"}</Button></div></section></div><section className="rounded-xl border border-border bg-secondary/20 p-4"><h3 className="font-semibold">{role === "owner" ? "Incidencias recientes del equipo" : "Tus incidencias recientes"}</h3>{tickets.length ? <ul className="mt-3 space-y-2">{tickets.slice(0, 5).map(ticket => <li key={ticket.id} className="flex flex-col gap-1 rounded-lg border border-border bg-background p-3 text-sm sm:flex-row sm:items-center sm:justify-between"><div><p className="font-medium">{ticket.title}</p><p className="text-xs text-muted-foreground">{ticket.route} · {new Date(ticket.createdAt).toLocaleString("es-CO")}</p></div><Badge variant="outline">{ticketStatus[ticket.status]}</Badge></li>)}</ul> : <p className="mt-2 text-sm text-muted-foreground">Aún no hay incidencias registradas.</p>}</section></TabsContent>
      </Tabs>
    </DialogContent>
  </Dialog>;
}
