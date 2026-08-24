import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { AlertTriangle, ArrowLeft, ArrowRight, BookOpenCheck, Bug, Check, CircleHelp, ClipboardCheck, FileBarChart2, Heart, Lightbulb, ListChecks, Maximize2, Minimize2, MousePointer2, Music2, QrCode, RotateCcw, Search, ShieldCheck, Sparkles, Store, ThumbsDown, ThumbsUp, UtensilsCrossed, X } from "lucide-react";
import { toast } from "sonner";

type Role = "owner" | "manager" | "staff";
type Preview = "owner-dashboard" | "action" | "checklist";

type GuideStep = {
  title: string;
  description: string;
  action: string;
  href: string;
  icon: typeof Store;
  preview: Preview;
  errorTip: string;
};

type HelpSolution = {
  key: "access-denied" | "missing-order-or-table" | "invalid-qr" | "cannot-save-change" | "missing-report-or-notification";
  title: string;
  description: string;
  actions: string[];
  keywords: string[];
  roles: Role[];
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

const helpSolutions: HelpSolution[] = [
  { key: "access-denied", title: "Veo Acceso denegado", description: "Tu rol no tiene permiso para el módulo o estás usando una cuenta distinta a la autorizada.", actions: ["Usa Ir a mi panel para volver a tu espacio autorizado.", "Cambia de cuenta si ingresaste con un usuario equivocado.", "Solicita acceso desde la pantalla si el módulo es necesario para tu trabajo."], keywords: ["acceso", "denegado", "permiso", "rol", "cuenta", "ruta"], roles: ["owner", "manager", "staff"] },
  { key: "missing-order-or-table", title: "No encuentro un pedido o una mesa", description: "Los datos operativos están aislados por local y se muestran según el estado de la operación.", actions: ["Actualiza la página una sola vez y espera la sincronización.", "Confirma que seleccionaste el local correcto y que la mesa está activa.", "Si persiste, informa el número de mesa, hora y estado observado."], keywords: ["pedido", "mesa", "qr", "no aparece", "sincronización"], roles: ["manager", "staff"] },
  { key: "invalid-qr", title: "El QR dice que la mesa es inválida", description: "El código puede pertenecer a una mesa inactiva, regenerada o a otro local.", actions: ["Pide al Manager verificar que la mesa esté activa.", "Genera e imprime el QR actualizado desde Mesas & QR.", "No reutilices códigos impresos que hayan sido reemplazados."], keywords: ["qr", "invalido", "mesa", "inactiva", "token"], roles: ["manager", "staff"] },
  { key: "cannot-save-change", title: "No puedo guardar un cambio", description: "Puede tratarse de un campo obligatorio, un formato inválido o una sesión sin permisos para esa acción.", actions: ["Revisa los mensajes bajo cada campo y los datos obligatorios.", "Comprueba que no estés en Modo de pruebas, que es solo lectura.", "Si el error continúa, reporta qué formulario usaste y qué datos intentaste guardar."], keywords: ["guardar", "formulario", "error", "modo pruebas", "lectura"], roles: ["owner", "manager", "staff"] },
  { key: "missing-report-or-notification", title: "No recibo un reporte o notificación", description: "Los reportes internos se almacenan en SongTap y las alertas pueden requerir actualización de la bandeja.", actions: ["Abre Notificaciones y actualiza la bandeja.", "Verifica la configuración del reporte y su próxima ejecución.", "Genera un reporte manual desde el Dashboard si lo necesitas ahora."], keywords: ["reporte", "notificacion", "email", "pdf", "excel", "programado"], roles: ["owner"] },
];

function ActionPreview({ step }: { step: GuideStep }) {
  const Icon = step.icon;
  if (step.preview === "owner-dashboard") {
    return <div className="overflow-hidden rounded-xl border border-primary/40 bg-black"><div className="relative"><img src={OWNER_SCREENSHOT} alt="Captura del Dashboard Owner con el botón Generar reporte ahora" className="h-48 w-full object-cover object-top" /><span aria-hidden className="absolute right-[8%] top-[18%] h-10 w-28 rounded-lg border-2 border-primary motion-safe:animate-pulse" /><MousePointer2 aria-hidden className="absolute right-[13%] top-[27%] h-6 w-6 fill-primary text-primary-foreground drop-shadow-[0_0_10px_rgba(34,197,94,0.8)] motion-safe:animate-bounce" /></div><div className="flex items-center gap-2 border-t border-primary/30 bg-primary/10 px-3 py-2 text-xs text-primary"><Sparkles className="h-4 w-4 motion-safe:animate-pulse" /> Microanimación: identifica y pulsa la acción principal</div></div>;
  }
  if (step.preview === "checklist") {
    return <div className="rounded-xl border border-border bg-secondary/20 p-4"><div className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground"><Icon className="h-4 w-4 text-primary" /> Antes de continuar</div><div className="space-y-2 text-xs text-muted-foreground"><p className="flex gap-2"><Check className="mt-0.5 h-3.5 w-3.5 text-primary motion-safe:animate-pulse" /> Confirma el local y la información mostrada.</p><p className="flex gap-2"><Check className="mt-0.5 h-3.5 w-3.5 text-primary motion-safe:animate-pulse [animation-delay:200ms]" /> Revisa la acción antes de guardarla.</p><p className="flex gap-2"><Check className="mt-0.5 h-3.5 w-3.5 text-primary motion-safe:animate-pulse [animation-delay:400ms]" /> Deja una nota cuando el equipo necesite contexto.</p></div><div className="mt-4 h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full w-2/3 rounded-full bg-primary motion-safe:animate-pulse" /></div></div>;
  }
  return <div className="rounded-xl border border-border bg-gradient-to-br from-secondary/60 to-background p-4"><div className="flex items-center justify-between"><div className="flex items-center gap-2 text-sm font-semibold text-foreground"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15 text-primary"><Icon className="h-4 w-4" /></span>{step.title}</div><span className="relative rounded-md border border-primary/40 bg-primary/10 px-2 py-1 text-[11px] font-medium text-primary"><span aria-hidden className="absolute -inset-1 rounded-md border border-primary/40 motion-safe:animate-ping" />Abrir módulo</span></div><div className="mt-4 rounded-lg border border-border bg-background px-3 py-2 text-xs text-muted-foreground">Busca en el menú lateral: <span className="font-semibold text-foreground">{step.href}</span></div><div className="mt-3 h-2 w-4/5 rounded-full bg-primary/20"><div className="h-full w-1/2 rounded-full bg-primary motion-safe:animate-pulse" /></div><div className="mt-2 h-2 w-3/5 rounded-full bg-muted" /></div>;
}

function WindowControls({ isExpanded, onMinimize, onExpand }: { isExpanded: boolean; onMinimize: () => void; onExpand: () => void }) {
  return <div className="flex shrink-0 items-center gap-1" aria-label="Controles de la guía"><Button type="button" variant="ghost" size="icon" onClick={onMinimize} aria-label="Minimizar guía" title="Minimizar guía"><Minimize2 className="h-4 w-4" /></Button><Button type="button" variant="ghost" size="icon" onClick={onExpand} aria-label={isExpanded ? "Reducir guía" : "Ampliar guía"} title={isExpanded ? "Reducir guía" : "Ampliar guía"}>{isExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}</Button><DialogClose asChild><Button type="button" variant="ghost" size="icon" className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive" aria-label="Cerrar guía" title="Cerrar guía"><X className="h-4 w-4" /></Button></DialogClose></div>;
}

export default function OnboardingCenter({ role, compact = false }: { role: Role; compact?: boolean }) {
  const [, navigate] = useLocation();
  const [location] = useLocation();
  const [open, setOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const [helpQuery, setHelpQuery] = useState("");
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const [issueTitle, setIssueTitle] = useState("");
  const [issueDescription, setIssueDescription] = useState("");
  const guide = guides[role];
  const { data: progress, isLoading } = trpc.onboarding.getProgress.useQuery();
  const { data: tickets = [] } = trpc.onboarding.listSupportTickets.useQuery(undefined, { enabled: open });
  const { data: helpInteractions = { votes: {}, favorites: [] } } = trpc.onboarding.getHelpInteractions.useQuery(undefined, { enabled: open });
  const utils = trpc.useUtils();
  const markOpened = trpc.onboarding.markOpened.useMutation();
  const complete = trpc.onboarding.complete.useMutation({ onSuccess: () => utils.onboarding.getProgress.invalidate() });
  const reset = trpc.onboarding.reset.useMutation({ onSuccess: () => { setActiveStep(0); utils.onboarding.getProgress.invalidate(); } });
  const reportIssue = trpc.onboarding.reportIssue.useMutation({
    onSuccess: async () => { setIssueTitle(""); setIssueDescription(""); toast.success("Incidencia enviada. Recibirás seguimiento en esta ayuda."); await Promise.all([utils.onboarding.listSupportTickets.invalidate(), utils.notifications.getPendingCount.invalidate()]); },
    onError: (error) => toast.error(error.message),
  });
  const setHelpVote = trpc.onboarding.setHelpVote.useMutation({ onSuccess: () => utils.onboarding.getHelpInteractions.invalidate(), onError: error => toast.error(error.message) });
  const toggleHelpFavorite = trpc.onboarding.toggleHelpFavorite.useMutation({ onSuccess: () => utils.onboarding.getHelpInteractions.invalidate(), onError: error => toast.error(error.message) });
  const current = guide.steps[activeStep];
  const Icon = current.icon;
  const isCompleted = Boolean(progress?.completedAt);
  const matchingSolutions = useMemo(() => {
    const query = helpQuery.trim().toLocaleLowerCase("es");
    const roleSolutions = helpSolutions.filter(solution => solution.roles.includes(role));
    if (!query) return roleSolutions;
    const queryMatches = !query ? roleSolutions : roleSolutions.filter(solution => [solution.title, solution.description, ...solution.actions, ...solution.keywords].join(" ").toLocaleLowerCase("es").includes(query));
    return onlyFavorites ? queryMatches.filter(solution => helpInteractions.favorites.includes(solution.key)) : queryMatches;
  }, [helpInteractions.favorites, helpQuery, onlyFavorites, role]);

  useEffect(() => {
    if (!isLoading && !progress?.completedAt) {
      setOpen(true);
      markOpened.mutate();
    }
  }, [isLoading, progress?.completedAt]);

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) { setIsMinimized(false); setIsExpanded(false); }
    if (next) markOpened.mutate();
  };
  const goToStep = (index: number) => setActiveStep(Math.max(0, Math.min(index, guide.steps.length - 1)));
  const openModule = () => { setOpen(false); navigate(current.href); };
  const submitIssue = () => reportIssue.mutate({ route: location, title: issueTitle.trim(), description: issueDescription.trim() });
  const ticketStatus = useMemo(() => ({ open: "Abierta", in_review: "En revisión", resolved: "Resuelta" }), []);
  const voteFor = (articleKey: HelpSolution["key"]) => helpInteractions.votes[articleKey];
  const isFavorite = (articleKey: HelpSolution["key"]) => helpInteractions.favorites.includes(articleKey);
  const updateVote = (articleKey: HelpSolution["key"], vote: "up" | "down") => setHelpVote.mutate({ articleKey, vote: voteFor(articleKey) === vote ? null : vote });
  const contentClass = isMinimized ? "w-[min(92vw,28rem)] gap-0 overflow-hidden p-0" : cn("w-[calc(100vw-1rem)] max-w-5xl gap-0 overflow-hidden p-0 sm:w-[calc(100vw-3rem)]", isExpanded && "h-[calc(100vh-2rem)] max-w-6xl");

  return <Dialog open={open} onOpenChange={handleOpenChange}>
    <DialogTrigger asChild><Button type="button" variant={compact ? "ghost" : "outline"} size="sm" className={cn("gap-2 text-muted-foreground hover:text-foreground", compact && "w-full justify-start px-3")}><BookOpenCheck className="h-4 w-4" />{compact ? "Guía y ayuda" : "Abrir guía"}</Button></DialogTrigger>
    <DialogContent showCloseButton={false} className={contentClass}>
      {isMinimized ? <div className="flex items-center justify-between gap-2 border-l-4 border-primary bg-card px-4 py-3"><div className="flex min-w-0 items-center gap-2"><BookOpenCheck className="h-5 w-5 shrink-0 text-primary" /><div className="min-w-0"><p className="truncate text-sm font-semibold">Guía SongTap minimizada</p><p className="text-xs text-muted-foreground">Tu paso {activeStep + 1} está listo para continuar.</p></div></div><div className="flex shrink-0 gap-1"><Button type="button" size="sm" variant="outline" onClick={() => setIsMinimized(false)}><RotateCcw className="mr-1 h-3.5 w-3.5" />Restaurar</Button><DialogClose asChild><Button type="button" variant="ghost" size="icon" aria-label="Cerrar guía"><X className="h-4 w-4" /></Button></DialogClose></div></div> : <div className="flex max-h-[calc(100vh-2rem)] flex-col"><DialogHeader className="border-b border-border bg-gradient-to-br from-primary/15 via-card to-card px-5 py-4 text-left sm:px-7 sm:py-5"><div className="flex items-start justify-between gap-3"><div className="flex min-w-0 items-start gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground"><BookOpenCheck className="h-5 w-5" /></span><div className="min-w-0"><DialogTitle className="text-xl">Tu guía SongTap</DialogTitle><DialogDescription className="mt-1 max-w-2xl text-sm">{guide.title}. {guide.description}</DialogDescription></div></div><WindowControls isExpanded={isExpanded} onMinimize={() => setIsMinimized(true)} onExpand={() => setIsExpanded(value => !value)} /></div></DialogHeader>
        <Tabs defaultValue="tour" className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-7 sm:py-5">
          <TabsList className="grid w-full grid-cols-2"><TabsTrigger value="tour">Recorrido guiado</TabsTrigger><TabsTrigger value="help">Ayuda y errores</TabsTrigger></TabsList>
          <TabsContent value="tour" className="mt-5 space-y-5"><div className="grid gap-5 lg:grid-cols-[225px_minmax(0,1fr)]"><ol className="grid gap-2 sm:grid-cols-2 lg:block lg:space-y-2" aria-label="Pasos del onboarding">{guide.steps.map((step, index) => <li key={step.title}><button type="button" onClick={() => goToStep(index)} className={cn("flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm transition-colors", index === activeStep ? "bg-primary text-primary-foreground shadow-[0_0_18px_rgba(34,197,94,0.22)]" : "text-muted-foreground hover:bg-secondary hover:text-foreground")}><span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-current text-[11px]">{index + 1}</span><span className="line-clamp-2">{step.title}</span></button></li>)}</ol><article className="rounded-xl border border-border bg-background p-4 sm:p-5"><Badge className="mb-2 bg-primary/15 text-primary hover:bg-primary/15">Paso {activeStep + 1} de {guide.steps.length}</Badge><h3 className="flex items-center gap-2 text-lg font-bold"><Icon className="h-5 w-5 text-primary" />{current.title}</h3><p className="mt-2 text-sm leading-6 text-muted-foreground">{current.description}</p><div className="mt-5"><ActionPreview step={current} /></div><div className="mt-4 rounded-lg border border-primary/30 bg-primary/8 p-3 text-sm"><span className="font-semibold text-primary">Qué debes hacer: </span>{current.action}</div><div className="mt-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-100"><AlertTriangle className="mr-1 inline h-4 w-4 text-amber-400" /><span className="font-semibold">Si algo no sale como esperas: </span>{current.errorTip}</div><div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-between"><Button type="button" variant="outline" onClick={() => goToStep(activeStep - 1)} disabled={activeStep === 0}><ArrowLeft className="mr-1 h-4 w-4" />Anterior</Button><div className="flex flex-col gap-2 sm:flex-row"><Button type="button" variant="outline" onClick={openModule}>Abrir este módulo</Button>{activeStep === guide.steps.length - 1 ? <Button type="button" onClick={() => complete.mutate()} disabled={complete.isPending}>{isCompleted ? "Guía completada" : "Completar guía"}<Check className="ml-1 h-4 w-4" /></Button> : <Button type="button" onClick={() => goToStep(activeStep + 1)}>Siguiente<ArrowRight className="ml-1 h-4 w-4" /></Button>}</div></div></article></div>{isCompleted && <div className="flex flex-col gap-3 rounded-lg border border-border bg-secondary/30 p-4 text-sm sm:flex-row sm:items-center sm:justify-between"><p className="text-muted-foreground">Completaste este recorrido. Puedes reabrirlo cuando quieras o reiniciarlo para repasar cada paso.</p><Button type="button" variant="outline" size="sm" onClick={() => reset.mutate()} disabled={reset.isPending}>Reiniciar guía</Button></div>}</TabsContent>
          <TabsContent value="help" className="mt-5 space-y-5"><section className="rounded-xl border border-primary/25 bg-primary/5 p-4 sm:p-5"><div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start"><div><h3 className="flex items-center gap-2 font-bold"><Search className="h-5 w-5 text-primary" />Encuentra una solución</h3><p className="mt-1 text-sm text-muted-foreground">Busca por error, módulo o acción: QR, acceso, pedido, reporte o guardar.</p></div><div className="flex items-center gap-2"><Button type="button" variant={onlyFavorites ? "default" : "outline"} size="sm" onClick={() => setOnlyFavorites(value => !value)} aria-pressed={onlyFavorites}><Heart className={cn("mr-1 h-3.5 w-3.5", onlyFavorites && "fill-current")} />{onlyFavorites ? "Ver todas" : `Favoritos (${helpInteractions.favorites.length})`}</Button><Badge variant="outline">{matchingSolutions.length} {matchingSolutions.length === 1 ? "resultado" : "resultados"}</Badge></div></div><div className="relative mt-4"><Search aria-hidden className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input value={helpQuery} onChange={event => setHelpQuery(event.target.value)} className="pl-9" placeholder="Ej.: QR inválido, acceso denegado, no puedo guardar…" aria-label="Buscar soluciones de ayuda" /></div><div className="mt-4 grid gap-3 md:grid-cols-2">{matchingSolutions.map(solution => <article key={solution.key} className="rounded-lg border border-border bg-background p-4"><div className="flex gap-3"><div className="min-w-0 flex-1"><h4 className="font-semibold text-foreground">{solution.title}</h4><p className="mt-1 text-sm text-muted-foreground">{solution.description}</p></div><Button type="button" variant="ghost" size="icon" className={cn("shrink-0", isFavorite(solution.key) && "text-rose-500 hover:text-rose-400")} onClick={() => toggleHelpFavorite.mutate({ articleKey: solution.key })} disabled={toggleHelpFavorite.isPending} aria-label={isFavorite(solution.key) ? `Quitar ${solution.title} de favoritos` : `Guardar ${solution.title} en favoritos`} aria-pressed={isFavorite(solution.key)}><Heart className={cn("h-4 w-4", isFavorite(solution.key) && "fill-current")} /></Button></div><ul className="mt-3 space-y-1.5 text-xs text-muted-foreground">{solution.actions.map(action => <li key={action} className="flex gap-2"><Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />{action}</li>)}</ul><div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3"><span className="text-xs font-medium text-muted-foreground">¿Te resultó útil?</span><div className="flex gap-1"><Button type="button" variant={voteFor(solution.key) === "up" ? "default" : "outline"} size="sm" className="h-8 gap-1" onClick={() => updateVote(solution.key, "up")} disabled={setHelpVote.isPending} aria-label={`Esta solución fue útil: ${solution.title}`} aria-pressed={voteFor(solution.key) === "up"}><ThumbsUp className="h-3.5 w-3.5" />Sí</Button><Button type="button" variant={voteFor(solution.key) === "down" ? "destructive" : "outline"} size="sm" className="h-8 gap-1" onClick={() => updateVote(solution.key, "down")} disabled={setHelpVote.isPending} aria-label={`Esta solución no fue útil: ${solution.title}`} aria-pressed={voteFor(solution.key) === "down"}><ThumbsDown className="h-3.5 w-3.5" />No</Button></div></div></article>)}{!matchingSolutions.length && <div className="rounded-lg border border-dashed border-border bg-background p-5 text-sm text-muted-foreground md:col-span-2"><p className="font-medium text-foreground">{onlyFavorites ? "Aún no tienes favoritos que coincidan." : "No encontramos una solución exacta."}</p><p className="mt-1">{onlyFavorites ? "Marca el corazón en una solución para acceder a ella rápidamente desde aquí." : "Prueba otro término o envía una incidencia con el contexto de lo que ocurrió."}</p></div>}</div></section><div className="grid gap-5 lg:grid-cols-2"><section className="space-y-4 rounded-xl border border-border bg-background p-5"><div><h3 className="flex items-center gap-2 font-bold"><Lightbulb className="h-5 w-5 text-primary" />Autogestión</h3><p className="mt-1 text-sm text-muted-foreground">Antes de reportar, intenta estas acciones seguras.</p></div><ul className="space-y-3 text-sm text-muted-foreground">{guide.selfManagement.map(item => <li key={item} className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />{item}</li>)}<li className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />Actualiza la página si una operación queda pendiente; no repitas una acción crítica hasta confirmar el resultado.</li></ul><img src={ACCESS_DENIED_SCREENSHOT} alt="Ejemplo de pantalla Acceso denegado con opciones para volver al panel o cambiar de cuenta" className="rounded-lg border border-border" /><p className="text-xs text-muted-foreground">Si ves Acceso denegado, vuelve a tu panel o cambia de cuenta; no intentes acceder a datos de otro rol.</p></section><section className="rounded-xl border border-border bg-background p-5"><div><h3 className="flex items-center gap-2 font-bold"><Bug className="h-5 w-5 text-destructive" />Reportar un error</h3><p className="mt-1 text-sm text-muted-foreground">Incluye qué ocurrió, qué esperabas y los pasos para reproducirlo. SongTap adjunta la ruta actual automáticamente.</p></div><div className="mt-4 space-y-3"><div><Label htmlFor="support-title">Título</Label><Input id="support-title" value={issueTitle} maxLength={180} onChange={event => setIssueTitle(event.target.value)} placeholder="Ej.: No puedo marcar un pedido como entregado" /></div><div><Label htmlFor="support-description">Descripción</Label><Textarea id="support-description" value={issueDescription} maxLength={5000} onChange={event => setIssueDescription(event.target.value)} placeholder="Qué hiciste, qué esperabas y qué ocurrió…" rows={5} /></div><Button type="button" className="w-full" onClick={submitIssue} disabled={issueTitle.trim().length < 5 || issueDescription.trim().length < 10 || reportIssue.isPending}>{reportIssue.isPending ? "Enviando incidencia…" : "Enviar incidencia"}</Button></div></section></div><section className="rounded-xl border border-border bg-secondary/20 p-4"><h3 className="font-semibold">{role === "owner" ? "Incidencias recientes del equipo" : "Tus incidencias recientes"}</h3>{tickets.length ? <ul className="mt-3 space-y-2">{tickets.slice(0, 5).map(ticket => <li key={ticket.id} className="flex flex-col gap-1 rounded-lg border border-border bg-background p-3 text-sm sm:flex-row sm:items-center sm:justify-between"><div><p className="font-medium">{ticket.title}</p><p className="text-xs text-muted-foreground">{ticket.route} · {new Date(ticket.createdAt).toLocaleString("es-CO")}</p></div><Badge variant="outline">{ticketStatus[ticket.status]}</Badge></li>)}</ul> : <p className="mt-2 text-sm text-muted-foreground">Aún no hay incidencias registradas.</p>}</section></TabsContent>
        </Tabs>
      </div>}
    </DialogContent>
  </Dialog>;
}
