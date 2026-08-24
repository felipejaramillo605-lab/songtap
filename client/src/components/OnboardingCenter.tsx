import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
type GuideMode = "brief" | "complete";

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
    description: "Organiza locales, atiende solicitudes y revisa la operación de toda la plataforma.",
    steps: [
      { title: "Lee tu panorama", description: "El Dashboard resume locales, usuarios, ingresos y actividad de la plataforma.", action: "Usa Generar reporte ahora para crear un consolidado cuando lo necesites.", href: "/owner", icon: FileBarChart2, preview: "owner-dashboard", errorTip: "Si las métricas aparecen en cero, revisa el periodo y confirma que existan pedidos entregados." },
      { title: "Aprueba nuevos locales", description: "Gestiona solicitudes de empresas y asignaciones desde Solicitudes.", action: "Revisa los datos y aprueba o rechaza dejando trazabilidad.", href: "/owner/venue-requests", icon: Store, preview: "action", errorTip: "No apruebes una solicitud incompleta; pide al manager completar los datos." },
      { title: "Protege y audita", description: "Auditoría registra acciones relevantes; Modo de pruebas reproduce vistas sin afectar operaciones.", action: "Elige local y rol en Modo de pruebas. Usa Reportar error si hallas un comportamiento inesperado.", href: "/owner/test-mode", icon: ShieldCheck, preview: "checklist", errorTip: "El modo de pruebas no permite mutaciones: es la forma segura de reproducir un error." },
      { title: "Mantén a todos informados", description: "Notificaciones reúne alertas, reportes internos e incidencias recibidas del equipo.", action: "Abre Notificaciones para revisar alertas y descargar reportes en PDF o Excel.", href: "/owner/notifications", icon: CircleHelp, preview: "action", errorTip: "Si no recibes alertas, confirma la configuración y actualiza la bandeja." },
    ],
    selfManagement: ["Actualiza tu perfil, idioma y contraseña desde Mi Perfil.", "Usa Modo de pruebas antes de responder un incidente de Manager o Staff.", "Consulta Notificaciones para verificar reportes e incidencias nuevas."],
  },
  manager: {
    title: "Pon tu local en operación",
    description: "Configura tu empresa, publica el menú, genera QR y organiza al equipo desde un único panel.",
    steps: [
      { title: "Configura tu local", description: "Revisa los datos comerciales y políticas del local antes de abrirlo al público.", action: "Abre Configuración y completa la información esencial de tu empresa.", href: "/manager/settings", icon: Store, preview: "action", errorTip: "Si aún no tienes local asignado, completa la solicitud de empresa y espera aprobación." },
      { title: "Publica menú y equipo", description: "Crea categorías, productos y perfiles del personal autorizado.", action: "En Menú agrega productos; en Equipo administra la información del personal.", href: "/manager/menu", icon: UtensilsCrossed, preview: "checklist", errorTip: "Si una foto no carga, verifica el formato permitido e inténtalo de nuevo." },
      { title: "Activa mesas con QR", description: "Cada mesa tiene un QR único para iniciar pedidos, música y PQRS de manera segura.", action: "Ve a Mesas & QR, crea la mesa y descarga o imprime su código.", href: "/manager/tables", icon: QrCode, preview: "action", errorTip: "Un QR inválido suele indicar que la mesa está inactiva o se usó un código antiguo." },
      { title: "Coordina la operación", description: "Da seguimiento a actividades del staff y PQRS sin perder el control del local.", action: "Asigna actividades y revisa PQRS para responder al cliente.", href: "/manager/activities", icon: ClipboardCheck, preview: "checklist", errorTip: "Un Staff no puede convertirse en Manager desde el panel; solicita cambios de rol al Owner." },
    ],
    selfManagement: ["Actualiza datos, idioma y contraseña desde Mi Perfil.", "Comprueba que tu local esté asignado antes de crear menú o mesas.", "Revisa las decisiones de acceso recibidas desde tu perfil."],
  },
  staff: {
    title: "Atiende cada mesa sin perder el ritmo",
    description: "Gestiona pedidos, música, tareas y PQRS asignadas por el Manager de tu local.",
    steps: [
      { title: "Procesa pedidos", description: "Los pedidos entrantes se organizan por estado para que el equipo tenga visibilidad.", action: "Abre Pedidos y cambia el estado solo cuando la preparación o entrega realmente avance.", href: "/staff", icon: ListChecks, preview: "action", errorTip: "Si no ves un pedido, actualiza una vez y confirma que pertenece a tu local." },
      { title: "Gestiona la música", description: "La cola muestra solicitudes por mesa; el Staff marca la canción en reproducción.", action: "Valida título y artista y marca la canción actual al iniciar su reproducción.", href: "/staff/music", icon: Music2, preview: "checklist", errorTip: "No elimines una solicitud por error: verifica mesa, canción y turno." },
      { title: "Cierra tus actividades", description: "Registra el resultado de tareas con comentario, evidencia o ambos.", action: "En Mis actividades actualiza el estado y adjunta evidencia cuando corresponda.", href: "/staff/activities", icon: ClipboardCheck, preview: "action", errorTip: "Si no puedes completar una tarea, deja un comentario claro para el Manager." },
      { title: "Responde con contexto", description: "Las PQRS se atienden dentro del alcance del local y quedan trazadas.", action: "Abre PQRS, revisa el detalle y usa una respuesta concreta y respetuosa.", href: "/staff/pqrs", icon: CircleHelp, preview: "checklist", errorTip: "No intentes abrir módulos de Manager: SongTap bloqueará ese acceso para proteger los datos." },
    ],
    selfManagement: ["Edita datos personales, idioma y contraseña desde Mi Perfil.", "Usa los comentarios de actividades para dejar contexto al Manager.", "Revisa tus decisiones de acceso en el perfil cuando el Owner responda."],
  },
};

const helpSolutions: HelpSolution[] = [
  { key: "access-denied", title: "Veo Acceso denegado", description: "Tu rol no tiene permiso para el módulo o estás usando una cuenta distinta a la autorizada.", actions: ["Usa Ir a mi panel para volver al espacio autorizado.", "Cambia de cuenta si ingresaste con un usuario equivocado.", "Solicita acceso desde la pantalla si el módulo es necesario."], keywords: ["acceso", "denegado", "permiso", "rol", "cuenta", "ruta"], roles: ["owner", "manager", "staff"] },
  { key: "missing-order-or-table", title: "No encuentro un pedido o una mesa", description: "Los datos operativos se muestran solo dentro del local y estado autorizados.", actions: ["Actualiza la página una sola vez.", "Confirma el local correcto y que la mesa está activa.", "Informa mesa, hora y estado si el problema continúa."], keywords: ["pedido", "mesa", "qr", "no aparece", "sincronización"], roles: ["manager", "staff"] },
  { key: "invalid-qr", title: "El QR dice que la mesa es inválida", description: "El código puede pertenecer a una mesa inactiva, regenerada o a otro local.", actions: ["Pide verificar que la mesa esté activa.", "Genera e imprime el QR actualizado desde Mesas & QR.", "No reutilices códigos reemplazados."], keywords: ["qr", "invalido", "mesa", "inactiva", "token"], roles: ["manager", "staff"] },
  { key: "cannot-save-change", title: "No puedo guardar un cambio", description: "Puede faltar un campo, haber un formato inválido o no tener permisos para esa acción.", actions: ["Revisa los mensajes y datos obligatorios.", "Comprueba que no estés en Modo de pruebas.", "Reporta el formulario y los datos usados si persiste."], keywords: ["guardar", "formulario", "error", "modo pruebas", "lectura"], roles: ["owner", "manager", "staff"] },
  { key: "missing-report-or-notification", title: "No recibo un reporte o notificación", description: "Los reportes se almacenan en SongTap y las alertas pueden requerir actualizar la bandeja.", actions: ["Abre Notificaciones y actualiza la bandeja.", "Verifica la configuración y próxima ejecución.", "Genera un reporte manual desde Dashboard si lo necesitas ahora."], keywords: ["reporte", "notificacion", "email", "pdf", "excel", "programado"], roles: ["owner"] },
];

function ActionPreview({ step }: { step: GuideStep }) {
  const Icon = step.icon;
  if (step.preview === "owner-dashboard") return <div className="overflow-hidden rounded-xl border border-primary/40 bg-black"><div className="relative"><img src={OWNER_SCREENSHOT} alt="Captura del Dashboard Owner con el botón Generar reporte ahora" className="h-48 w-full object-cover object-top" /><span aria-hidden className="absolute right-[8%] top-[18%] h-10 w-28 rounded-lg border-2 border-primary motion-safe:animate-pulse" /><MousePointer2 aria-hidden className="absolute right-[13%] top-[27%] h-6 w-6 fill-primary text-primary-foreground motion-safe:animate-bounce" /></div><div className="flex items-center gap-2 border-t border-primary/30 bg-primary/10 px-3 py-2 text-xs text-primary"><Sparkles className="h-4 w-4 motion-safe:animate-pulse" />Microanimación: identifica y pulsa la acción principal</div></div>;
  if (step.preview === "checklist") return <div className="rounded-xl border border-border bg-secondary/20 p-4"><div className="mb-3 flex items-center gap-2 text-sm font-semibold"><Icon className="h-4 w-4 text-primary" />Antes de continuar</div><div className="space-y-2 text-xs text-muted-foreground"><p className="flex gap-2"><Check className="mt-0.5 h-3.5 w-3.5 text-primary" />Confirma el local y la información mostrada.</p><p className="flex gap-2"><Check className="mt-0.5 h-3.5 w-3.5 text-primary" />Revisa la acción antes de guardarla.</p><p className="flex gap-2"><Check className="mt-0.5 h-3.5 w-3.5 text-primary" />Deja una nota cuando el equipo necesite contexto.</p></div></div>;
  return <div className="rounded-xl border border-border bg-gradient-to-br from-secondary/60 to-background p-4"><div className="flex items-center gap-2 text-sm font-semibold"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15 text-primary"><Icon className="h-4 w-4" /></span>{step.title}</div><div className="mt-4 rounded-lg border border-border bg-background px-3 py-2 text-xs text-muted-foreground">Busca en el menú lateral: <span className="font-semibold text-foreground">{step.href}</span></div></div>;
}

function WindowControls({ isExpanded, onMinimize, onExpand }: { isExpanded: boolean; onMinimize: () => void; onExpand: () => void }) {
  return <div className="grid w-full grid-cols-3 gap-2 sm:flex sm:w-auto" aria-label="Controles de la guía"><Button type="button" variant="outline" size="sm" onClick={onMinimize} aria-label="Minimizar guía" className="h-9 gap-1.5 text-xs"><Minimize2 className="h-3.5 w-3.5" />Minimizar</Button><Button type="button" variant="outline" size="sm" onClick={onExpand} aria-label={isExpanded ? "Reducir guía" : "Ampliar guía"} className="h-9 gap-1.5 text-xs">{isExpanded ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}{isExpanded ? "Reducir" : "Ampliar"}</Button><DialogClose asChild><Button type="button" variant="outline" size="sm" aria-label="Cerrar guía" className="h-9 gap-1.5 border-destructive/40 text-xs text-destructive hover:bg-destructive hover:text-destructive-foreground"><X className="h-3.5 w-3.5" />Cerrar</Button></DialogClose></div>;
}

export default function OnboardingCenter({ role, compact = false }: { role: Role; compact?: boolean }) {
  const [, navigate] = useLocation();
  const [location] = useLocation();
  const { isPreviewMode } = useAuth();
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("tour");
  const [isMinimized, setIsMinimized] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [guideMode, setGuideMode] = useState<GuideMode>("complete");
  const [activeStep, setActiveStep] = useState(0);
  const [suppressAutoOnboarding, setSuppressAutoOnboarding] = useState(false);
  const [helpQuery, setHelpQuery] = useState("");
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const [issueTitle, setIssueTitle] = useState("");
  const [issueDescription, setIssueDescription] = useState("");
  const autoShowAttempted = useRef(false);
  const guide = guides[role];
  const briefSteps = [guide.steps[0], guide.steps[guide.steps.length - 1]];
  const visibleSteps = guideMode === "brief" ? briefSteps : guide.steps;
  const current = visibleSteps[activeStep];
  const Icon = current.icon;
  const progressPercent = Math.round(((activeStep + 1) / visibleSteps.length) * 100);
  const remainingSteps = Math.max(visibleSteps.length - activeStep - 1, 0);
  const { data: progress, isSuccess: hasResolvedProgress } = trpc.onboarding.getProgress.useQuery();
  const { data: tickets = [] } = trpc.onboarding.listSupportTickets.useQuery(undefined, { enabled: open });
  const { data: helpInteractions = { votes: {}, favorites: [] } } = trpc.onboarding.getHelpInteractions.useQuery(undefined, { enabled: open });
  const utils = trpc.useUtils();
  const markOpened = trpc.onboarding.markOpened.useMutation();
  const markAutoShown = trpc.onboarding.markAutoShown.useMutation({ onSuccess: () => utils.onboarding.getProgress.invalidate() });
  const setAutoSuppressed = trpc.onboarding.setAutoSuppressed.useMutation({ onSuccess: () => utils.onboarding.getProgress.invalidate(), onError: error => toast.error(error.message) });
  const closeGuide = () => { setOpen(false); setIsMinimized(false); setIsExpanded(false); };
  const complete = trpc.onboarding.complete.useMutation({ onSuccess: () => { setSuppressAutoOnboarding(true); closeGuide(); toast.success("Guía completada. No volverá a abrirse automáticamente."); utils.onboarding.getProgress.invalidate(); }, onError: error => toast.error(error.message) });
  const reset = trpc.onboarding.reset.useMutation({ onSuccess: () => { setActiveStep(0); setGuideMode("complete"); utils.onboarding.getProgress.invalidate(); toast.success("Onboarding reiniciado. Puedes recorrerlo de nuevo."); } });
  const reportIssue = trpc.onboarding.reportIssue.useMutation({ onSuccess: async () => { setIssueTitle(""); setIssueDescription(""); toast.success("Incidencia enviada. Recibirás seguimiento en esta ayuda."); await Promise.all([utils.onboarding.listSupportTickets.invalidate(), utils.notifications.getPendingCount.invalidate()]); }, onError: error => toast.error(error.message) });
  const setHelpVote = trpc.onboarding.setHelpVote.useMutation({ onSuccess: () => utils.onboarding.getHelpInteractions.invalidate(), onError: error => toast.error(error.message) });
  const toggleHelpFavorite = trpc.onboarding.toggleHelpFavorite.useMutation({ onSuccess: () => utils.onboarding.getHelpInteractions.invalidate(), onError: error => toast.error(error.message) });
  const isCompleted = Boolean(progress?.completedAt);
  const matchingSolutions = useMemo(() => {
    const query = helpQuery.trim().toLocaleLowerCase("es");
    const roleSolutions = helpSolutions.filter(solution => solution.roles.includes(role));
    const matches = !query ? roleSolutions : roleSolutions.filter(solution => [solution.title, solution.description, ...solution.actions, ...solution.keywords].join(" ").toLocaleLowerCase("es").includes(query));
    return onlyFavorites ? matches.filter(solution => helpInteractions.favorites.includes(solution.key)) : matches;
  }, [helpInteractions.favorites, helpQuery, onlyFavorites, role]);

  useEffect(() => {
    if (progress) setSuppressAutoOnboarding(Boolean(progress.suppressAutoOnboarding));
  }, [progress?.suppressAutoOnboarding]);

  useEffect(() => {
    if (!isPreviewMode && hasResolvedProgress && progress === null && !autoShowAttempted.current) {
      autoShowAttempted.current = true;
      setOpen(true);
      markAutoShown.mutate();
    }
  }, [hasResolvedProgress, isPreviewMode, progress]);

  const changeGuideMode = (mode: GuideMode) => { setGuideMode(mode); setActiveStep(0); };
  const updateSuppression = (next: boolean) => { setSuppressAutoOnboarding(next); setAutoSuppressed.mutate({ suppressAutoOnboarding: next }); };
  const goToStep = (index: number) => setActiveStep(Math.max(0, Math.min(index, visibleSteps.length - 1)));
  const handleOpenChange = (next: boolean) => { if (!next) closeGuide(); else { setOpen(true); markOpened.mutate(); } };
  const openModule = () => { setOpen(false); navigate(current.href); };
  const handleComplete = () => { if (isPreviewMode) { closeGuide(); toast.info("La guía se cerró. El modo de pruebas es de solo lectura, por lo que no se guardaron cambios."); return; } complete.mutate(); };
  const submitIssue = () => reportIssue.mutate({ route: location, title: issueTitle.trim(), description: issueDescription.trim() });
  const voteFor = (key: HelpSolution["key"]) => helpInteractions.votes[key];
  const isFavorite = (key: HelpSolution["key"]) => helpInteractions.favorites.includes(key);
  const updateVote = (key: HelpSolution["key"], vote: "up" | "down") => setHelpVote.mutate({ articleKey: key, vote: voteFor(key) === vote ? null : vote });
  const contentClass = isMinimized ? "w-[calc(100vw-1rem)] max-w-md gap-0 overflow-hidden p-0" : cn("flex w-[calc(100vw-1rem)] max-w-none gap-0 overflow-hidden p-0", isExpanded && "h-[calc(100dvh-1rem)]");
  const contentStyle = isMinimized ? undefined : { maxWidth: isExpanded ? "min(1480px, calc(100vw - 2rem))" : "min(1180px, calc(100vw - 1rem))", maxHeight: "calc(100dvh - 1rem)" };

  return <Dialog open={open} onOpenChange={handleOpenChange}>
    <DialogTrigger asChild><Button type="button" variant={compact ? "ghost" : "outline"} size="sm" className={cn("gap-2 text-muted-foreground hover:text-foreground", compact && "w-full justify-start px-3")}><BookOpenCheck className="h-4 w-4" />{compact ? "Guía y ayuda" : "Abrir guía"}</Button></DialogTrigger>
    <DialogContent showCloseButton={false} className={contentClass} style={contentStyle}>
      {isMinimized ? <div className="flex items-center justify-between gap-2 border-l-4 border-primary bg-card px-4 py-3"><div className="min-w-0"><p className="truncate text-sm font-semibold">Guía SongTap minimizada</p><p className="text-xs text-muted-foreground">Paso {activeStep + 1} de {visibleSteps.length}</p></div><div className="flex gap-1"><Button type="button" size="sm" variant="outline" onClick={() => setIsMinimized(false)}><RotateCcw className="mr-1 h-3.5 w-3.5" />Restaurar</Button><DialogClose asChild><Button type="button" variant="outline" size="sm" className="border-destructive/40 text-destructive"><X className="mr-1 h-3.5 w-3.5" />Cerrar</Button></DialogClose></div></div> : <div className="flex min-h-0 flex-1 flex-col">
        <DialogHeader className="border-b border-border bg-gradient-to-br from-primary/15 via-card to-card px-4 py-4 text-left sm:px-7 sm:py-5"><div className="flex flex-col gap-4"><div className="flex min-w-0 items-start gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground"><BookOpenCheck className="h-5 w-5" /></span><div className="min-w-0"><DialogTitle className="text-xl">Tu guía SongTap</DialogTitle><DialogDescription className="mt-1 max-w-3xl text-sm">{guide.title}. {guide.description}</DialogDescription></div></div><WindowControls isExpanded={isExpanded} onMinimize={() => setIsMinimized(true)} onExpand={() => setIsExpanded(value => !value)} /></div></DialogHeader>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="min-h-0 flex-1 overflow-y-auto px-3 py-4 sm:px-7 sm:py-5">
          <TabsList className="grid w-full grid-cols-2"><TabsTrigger value="tour">Recorrido guiado</TabsTrigger><TabsTrigger value="help">Ayuda y errores</TabsTrigger></TabsList>
          <TabsContent value="tour" className="mt-5 space-y-5">
            <section className="rounded-xl border border-primary/25 bg-primary/5 p-4"><div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between"><div><h3 className="font-semibold">Elige el nivel de detalle</h3><p className="mt-1 text-sm text-muted-foreground">La guía breve muestra los dos pasos esenciales; la completa explica toda la operación.</p></div><div className="grid grid-cols-2 gap-2"><Button type="button" size="sm" variant={guideMode === "brief" ? "default" : "outline"} onClick={() => changeGuideMode("brief")} aria-pressed={guideMode === "brief"}>Guía breve</Button><Button type="button" size="sm" variant={guideMode === "complete" ? "default" : "outline"} onClick={() => changeGuideMode("complete")} aria-pressed={guideMode === "complete"}>Guía completa</Button></div></div></section>
            <section aria-label="Progreso del onboarding" className="rounded-xl border border-border bg-card p-4"><div className="flex flex-wrap items-end justify-between gap-2"><div><p className="font-semibold">Progreso: {activeStep + 1} de {visibleSteps.length}</p><p className="text-sm text-muted-foreground">{remainingSteps === 0 ? "Este es el último paso." : `Te ${remainingSteps === 1 ? "falta" : "faltan"} ${remainingSteps} ${remainingSteps === 1 ? "paso" : "pasos"}.`}</p></div><Badge variant="outline">{progressPercent}% completado</Badge></div><div className="mt-3 h-2.5 overflow-hidden rounded-full bg-secondary" role="progressbar" aria-label="Progreso de la guía" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progressPercent}><div className="h-full rounded-full bg-primary transition-[width] duration-200" style={{ width: `${progressPercent}%` }} /></div></section>
            <section className="flex items-start gap-3 rounded-xl border border-border bg-secondary/20 p-4"><Checkbox id="suppress-auto-onboarding" checked={suppressAutoOnboarding} onCheckedChange={checked => updateSuppression(checked === true)} disabled={isPreviewMode || setAutoSuppressed.isPending} /><div className="grid gap-1.5 leading-none"><Label htmlFor="suppress-auto-onboarding" className={cn("text-sm font-semibold", isPreviewMode ? "cursor-not-allowed text-muted-foreground" : "cursor-pointer")}>No volver a mostrar automáticamente esta información</Label><p className="text-xs leading-5 text-muted-foreground">{isPreviewMode ? "El modo de pruebas es de solo lectura. Sal de este modo para cambiar esta preferencia." : "La guía seguirá disponible desde Guía y ayuda. Al completar el recorrido, esta preferencia se activa automáticamente."}</p></div></section>
            <div className="grid gap-5 lg:grid-cols-[240px_minmax(0,1fr)]"><ol className="grid gap-2 sm:grid-cols-2 lg:block lg:space-y-2" aria-label="Pasos del onboarding">{visibleSteps.map((step, index) => <li key={step.title}><button type="button" onClick={() => goToStep(index)} className={cn("flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm transition-colors", index === activeStep ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary hover:text-foreground")}><span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-current text-[11px]">{index + 1}</span><span className="line-clamp-2">{step.title}</span></button></li>)}</ol>
              <article className="rounded-xl border border-border bg-background p-4 sm:p-5"><Badge className="mb-2 bg-primary/15 text-primary hover:bg-primary/15">Paso {activeStep + 1} de {visibleSteps.length}</Badge><h3 className="flex items-center gap-2 text-lg font-bold"><Icon className="h-5 w-5 text-primary" />{current.title}</h3><p className="mt-2 text-sm leading-6 text-muted-foreground">{current.description}</p><div className="mt-5"><ActionPreview step={current} /></div><div className="mt-4 rounded-lg border border-primary/30 bg-primary/8 p-3 text-sm"><span className="font-semibold text-primary">Qué debes hacer: </span>{current.action}</div><div className="mt-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-100"><AlertTriangle className="mr-1 inline h-4 w-4 text-amber-400" /><span className="font-semibold">Si algo no sale como esperas: </span>{current.errorTip}</div><div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-between"><Button type="button" variant="outline" onClick={() => goToStep(activeStep - 1)} disabled={activeStep === 0}><ArrowLeft className="mr-1 h-4 w-4" />Anterior</Button><div className="flex flex-col gap-2 sm:flex-row"><Button type="button" variant="outline" onClick={openModule}>Abrir este módulo</Button>{activeStep === visibleSteps.length - 1 ? <Button type="button" onClick={handleComplete} disabled={!isPreviewMode && (complete.isPending || isCompleted)}>{isPreviewMode ? "Cerrar guía de prueba" : complete.isPending ? "Guardando…" : isCompleted ? "Guía completada" : "Completar guía"}<Check className="ml-1 h-4 w-4" /></Button> : <Button type="button" onClick={() => goToStep(activeStep + 1)}>Siguiente<ArrowRight className="ml-1 h-4 w-4" /></Button>}</div></div></article></div>
          </TabsContent>
          <TabsContent value="help" className="mt-5 space-y-5">
            <section className="rounded-xl border border-primary/25 bg-primary/5 p-4 sm:p-5"><div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start"><div><h3 className="flex items-center gap-2 font-bold"><Search className="h-5 w-5 text-primary" />Encuentra una solución</h3><p className="mt-1 text-sm text-muted-foreground">Busca por error, módulo o acción: QR, acceso, pedido, reporte o guardar.</p></div><div className="flex items-center gap-2"><Button type="button" variant={onlyFavorites ? "default" : "outline"} size="sm" onClick={() => setOnlyFavorites(value => !value)} aria-pressed={onlyFavorites}><Heart className={cn("mr-1 h-3.5 w-3.5", onlyFavorites && "fill-current")} />{onlyFavorites ? "Ver todas" : `Favoritos (${helpInteractions.favorites.length})`}</Button><Badge variant="outline">{matchingSolutions.length} {matchingSolutions.length === 1 ? "resultado" : "resultados"}</Badge></div></div><div className="relative mt-4"><Search aria-hidden className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input value={helpQuery} onChange={event => setHelpQuery(event.target.value)} className="pl-9" placeholder="Ej.: QR inválido, acceso denegado, no puedo guardar…" aria-label="Buscar soluciones de ayuda" /></div><div className="mt-4 grid gap-3 md:grid-cols-2">{matchingSolutions.map(solution => <article key={solution.key} className="rounded-lg border border-border bg-background p-4"><div className="flex gap-3"><div className="min-w-0 flex-1"><h4 className="font-semibold">{solution.title}</h4><p className="mt-1 text-sm text-muted-foreground">{solution.description}</p></div><Button type="button" variant="ghost" size="icon" className={cn("shrink-0", isFavorite(solution.key) && "text-rose-500")} onClick={() => toggleHelpFavorite.mutate({ articleKey: solution.key })} disabled={toggleHelpFavorite.isPending} aria-label={isFavorite(solution.key) ? `Quitar ${solution.title} de favoritos` : `Guardar ${solution.title} en favoritos`} aria-pressed={isFavorite(solution.key)}><Heart className={cn("h-4 w-4", isFavorite(solution.key) && "fill-current")} /></Button></div><ul className="mt-3 space-y-1.5 text-xs text-muted-foreground">{solution.actions.map(action => <li key={action} className="flex gap-2"><Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />{action}</li>)}</ul><div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3"><span className="text-xs font-medium text-muted-foreground">¿Te resultó útil?</span><div className="flex gap-1"><Button type="button" variant={voteFor(solution.key) === "up" ? "default" : "outline"} size="sm" className="h-8 gap-1" onClick={() => updateVote(solution.key, "up")} disabled={setHelpVote.isPending} aria-label={`Esta solución fue útil: ${solution.title}`} aria-pressed={voteFor(solution.key) === "up"}><ThumbsUp className="h-3.5 w-3.5" />Sí</Button><Button type="button" variant={voteFor(solution.key) === "down" ? "destructive" : "outline"} size="sm" className="h-8 gap-1" onClick={() => updateVote(solution.key, "down")} disabled={setHelpVote.isPending} aria-label={`Esta solución no fue útil: ${solution.title}`} aria-pressed={voteFor(solution.key) === "down"}><ThumbsDown className="h-3.5 w-3.5" />No</Button></div></div></article>)}{!matchingSolutions.length && <div className="rounded-lg border border-dashed border-border bg-background p-5 text-sm text-muted-foreground md:col-span-2"><p className="font-medium text-foreground">{onlyFavorites ? "Aún no tienes favoritos que coincidan." : "No encontramos una solución exacta."}</p><p className="mt-1">Prueba otro término o envía una incidencia con el contexto de lo que ocurrió.</p></div>}</div></section>
            <div className="grid gap-5 lg:grid-cols-2"><section className="space-y-4 rounded-xl border border-border bg-background p-5"><div><h3 className="flex items-center gap-2 font-bold"><Lightbulb className="h-5 w-5 text-primary" />Autogestión</h3><p className="mt-1 text-sm text-muted-foreground">Antes de reportar, intenta estas acciones seguras.</p></div><ul className="space-y-3 text-sm text-muted-foreground">{guide.selfManagement.map(item => <li key={item} className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />{item}</li>)}</ul><img src={ACCESS_DENIED_SCREENSHOT} alt="Ejemplo de pantalla Acceso denegado con opciones para volver al panel o cambiar de cuenta" className="rounded-lg border border-border" /><div className="rounded-lg border border-primary/30 bg-primary/8 p-3"><p className="text-sm font-semibold">¿Quieres ver la guía nuevamente?</p><p className="mt-1 text-xs text-muted-foreground">Reinicia el recorrido completo sin que vuelva a abrirse automáticamente al cambiar de módulo.</p><Button type="button" size="sm" variant="outline" className="mt-3" onClick={() => reset.mutate()} disabled={reset.isPending}><RotateCcw className="mr-1 h-3.5 w-3.5" />Reiniciar onboarding</Button></div></section><section className="rounded-xl border border-border bg-background p-5"><div><h3 className="flex items-center gap-2 font-bold"><Bug className="h-5 w-5 text-destructive" />Reportar un error</h3><p className="mt-1 text-sm text-muted-foreground">Incluye qué ocurrió, qué esperabas y los pasos para reproducirlo. SongTap adjunta la ruta actual automáticamente.</p></div><div className="mt-4 space-y-3"><div><Label htmlFor="support-title">Título</Label><Input id="support-title" value={issueTitle} maxLength={180} onChange={event => setIssueTitle(event.target.value)} placeholder="Ej.: No puedo marcar un pedido como entregado" /></div><div><Label htmlFor="support-description">Descripción</Label><Textarea id="support-description" value={issueDescription} maxLength={5000} onChange={event => setIssueDescription(event.target.value)} placeholder="Qué hiciste, qué esperabas y qué ocurrió…" rows={5} /></div><Button type="button" className="w-full" onClick={submitIssue} disabled={issueTitle.trim().length < 5 || issueDescription.trim().length < 10 || reportIssue.isPending}>{reportIssue.isPending ? "Enviando incidencia…" : "Enviar incidencia"}</Button></div></section></div>
            <section className="rounded-xl border border-border bg-secondary/20 p-4"><h3 className="font-semibold">{role === "owner" ? "Incidencias recientes del equipo" : "Tus incidencias recientes"}</h3>{tickets.length ? <ul className="mt-3 space-y-2">{tickets.slice(0, 5).map(ticket => <li key={ticket.id} className="flex flex-col gap-1 rounded-lg border border-border bg-background p-3 text-sm sm:flex-row sm:items-center sm:justify-between"><div><p className="font-medium">{ticket.title}</p><p className="text-xs text-muted-foreground">{ticket.route} · {new Date(ticket.createdAt).toLocaleString("es-CO")}</p></div><Badge variant="outline">{ticket.status === "open" ? "Abierta" : ticket.status === "in_review" ? "En revisión" : "Resuelta"}</Badge></li>)}</ul> : <p className="mt-2 text-sm text-muted-foreground">Aún no hay incidencias registradas.</p>}</section>
          </TabsContent>
        </Tabs>
      </div>}
    </DialogContent>
  </Dialog>;
}
