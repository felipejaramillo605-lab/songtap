import { useEffect, useMemo, useRef, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import SongTapLayout from "@/components/SongTapLayout";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { filterNotificationHistory } from "@/lib/notificationFilters";
import { Bell, Mail, Phone, Volume2, ShieldAlert, CheckCheck, Clock3, Inbox, CircleCheck, Search, RotateCcw, CalendarDays, RefreshCw, FileText } from "lucide-react";

const reportWeekdays = [
  { value: "1", label: "Lunes" },
  { value: "2", label: "Martes" },
  { value: "3", label: "Miércoles" },
  { value: "4", label: "Jueves" },
  { value: "5", label: "Viernes" },
  { value: "6", label: "Sábado" },
  { value: "7", label: "Domingo" },
];

export default function OwnerNotificationsSettings() {
  const { user, isAuthenticated, loading } = useAuth();
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();
  const { data: settings, isLoading } = trpc.notifications.getSettings.useQuery();
  const { data: reportSchedule, isLoading: isLoadingReportSchedule } = trpc.ownerReports.getSchedule.useQuery();
  const { data: scheduledReports = [], isLoading: isLoadingScheduledReports } = trpc.ownerReports.list.useQuery({ limit: 6 });
  const {
    data: history = [],
    isLoading: isLoadingHistory,
    isFetching: isFetchingHistory,
    dataUpdatedAt: historyUpdatedAt,
    refetch: refetchHistory,
  } = trpc.notifications.getHistory.useQuery(undefined, {
    refetchInterval: 10000,
    refetchIntervalInBackground: false,
  });
  const {
    data: unreadCount = 0,
    isFetching: isFetchingUnreadCount,
    dataUpdatedAt: unreadCountUpdatedAt,
    refetch: refetchUnreadCount,
  } = trpc.notifications.getUnreadCount.useQuery(undefined, {
    refetchInterval: 10000,
    refetchIntervalInBackground: false,
  });

  const [enabled, setEnabled] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [notificationEmail, setNotificationEmail] = useState("");
  const [notificationPhone, setNotificationPhone] = useState("");
  const [senderAccountEmail, setSenderAccountEmail] = useState("");
  const [soundType, setSoundType] = useState("chime");
  const [reportWeekday, setReportWeekday] = useState("1");
  const [reportTime, setReportTime] = useState("08:00");
  const [reportsEnabled, setReportsEnabled] = useState(false);
  const [historySearch, setHistorySearch] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [lastRefreshAt, setLastRefreshAt] = useState<Date | null>(null);
  const [manualRefreshError, setManualRefreshError] = useState<string | null>(null);
  const previousUnreadCountRef = useRef<number | null>(null);
  const isRefreshingHistory = isFetchingHistory || isFetchingUnreadCount;

  useEffect(() => {
    if (!loading && !isAuthenticated) window.location.href = getLoginUrl();
    if (!loading && isAuthenticated && user?.role !== "owner") navigate("/");
  }, [loading, isAuthenticated, user?.role, navigate]);

  useEffect(() => {
    if (settings) {
      setEnabled(settings.enabled);
      setEmailNotifications(settings.emailNotifications);
      setNotificationEmail(settings.notificationEmail || "");
      setNotificationPhone(settings.notificationPhone || "");
      setSenderAccountEmail(settings.senderAccountEmail || "");
      setSoundType(settings.soundType || "chime");
    }
  }, [settings]);

  useEffect(() => {
    if (!reportSchedule) return;
    setReportWeekday(String(reportSchedule.weekday));
    setReportTime(`${String(reportSchedule.hour).padStart(2, "0")}:${String(reportSchedule.minute).padStart(2, "0")}`);
    setReportsEnabled(reportSchedule.isEnabled);
  }, [reportSchedule]);

  useEffect(() => {
    const latestUpdate = Math.max(historyUpdatedAt || 0, unreadCountUpdatedAt || 0);
    if (latestUpdate > 0) {
      setLastRefreshAt(new Date(latestUpdate));
      setManualRefreshError(null);
    }
  }, [historyUpdatedAt, unreadCountUpdatedAt]);

  useEffect(() => {
    const previousUnreadCount = previousUnreadCountRef.current;
    if (previousUnreadCount !== null && unreadCount > previousUnreadCount) {
      const createdCount = unreadCount - previousUnreadCount;
      toast.info(
        createdCount === 1
          ? "Hay una nueva alerta en el historial."
          : `Hay ${createdCount} nuevas alertas en el historial.`
      );
    }
    previousUnreadCountRef.current = unreadCount;
  }, [unreadCount]);

  const updateMutation = trpc.notifications.updateSettings.useMutation({
    onSuccess: () => {
      toast.success("Ajustes de notificación actualizados correctamente.");
      utils.notifications.getSettings.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const updateReportScheduleMutation = trpc.ownerReports.configure.useMutation({
    onSuccess: async () => {
      toast.success("Configuración del reporte interno actualizada.");
      await Promise.all([utils.ownerReports.getSchedule.invalidate(), utils.ownerReports.list.invalidate()]);
    },
    onError: (error) => toast.error(error.message),
  });

  const markReadMutation = trpc.notifications.markRead.useMutation({
    onSuccess: async () => {
      await Promise.all([
        utils.notifications.getHistory.invalidate(),
        utils.notifications.getUnreadCount.invalidate(),
      ]);
    },
    onError: (e) => toast.error(e.message),
  });

  const markAllReadMutation = trpc.notifications.markAllRead.useMutation({
    onSuccess: async () => {
      toast.success("Todas las notificaciones fueron marcadas como leídas.");
      await Promise.all([
        utils.notifications.getHistory.invalidate(),
        utils.notifications.getUnreadCount.invalidate(),
      ]);
    },
    onError: (e) => toast.error(e.message),
  });

  const filteredHistory = useMemo(
    () => filterNotificationHistory(history, { query: historySearch, startDate, endDate }),
    [history, historySearch, startDate, endDate]
  );

  const clearHistoryFilters = () => {
    setHistorySearch("");
    setStartDate("");
    setEndDate("");
  };

  const refreshNotificationHistory = async () => {
    setManualRefreshError(null);
    try {
      const [historyResult, unreadResult] = await Promise.all([refetchHistory(), refetchUnreadCount()]);
      if (historyResult.error || unreadResult.error) {
        throw historyResult.error || unreadResult.error;
      }
      toast.success("Historial de notificaciones actualizado.");
    } catch {
      const message = "No se pudo actualizar el historial. Revisa tu conexión e inténtalo de nuevo.";
      setManualRefreshError(message);
      toast.error(message);
    }
  };

  const playTestSound = (type: string) => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);

      if (type === "chime") {
        osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
        osc.frequency.setValueAtTime(880, audioCtx.currentTime + 0.15); // A5
      } else if (type === "bell") {
        osc.frequency.setValueAtTime(1046.5, audioCtx.currentTime); // C6
      } else {
        osc.frequency.setValueAtTime(440, audioCtx.currentTime); // A4
      }

      gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.5);

      osc.start();
      osc.stop(audioCtx.currentTime + 0.5);
      toast.info(`Reproduciendo sonido de prueba: ${type}`);
    } catch {
      toast.error("No se pudo reproducir el sonido en este navegador.");
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate({
      enabled,
      emailNotifications,
      notificationEmail,
      notificationPhone,
      senderAccountEmail,
      soundType,
    });
  };

  const saveReportSchedule = () => {
    const [hourText, minuteText] = reportTime.split(":");
    updateReportScheduleMutation.mutate({
      weekday: Number(reportWeekday),
      hour: Number(hourText),
      minute: Number(minuteText),
      isEnabled: reportsEnabled,
    });
  };

  if (loading || !isAuthenticated || user?.role !== "owner") {
    return null;
  }

  if (isLoading) {
    return (
      <SongTapLayout role="owner" title="Notificaciones">
        <div className="p-8 text-center text-muted-foreground">Cargando configuración...</div>
      </SongTapLayout>
    );
  }

  return (
    <SongTapLayout role="owner" title="Notificaciones">
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Bell className="text-primary" /> Configuración de Notificaciones
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gestiona las alertas visuales, sonoras y los envíos de correo para solicitudes de nuevos Managers.
          </p>
        </div>
        <div className="flex items-center gap-2" aria-live="polite">
          <span className="hidden text-xs text-muted-foreground sm:inline">
            {isRefreshingHistory
              ? "Actualizando alertas..."
              : lastRefreshAt
                ? `Actualizado ${lastRefreshAt.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })}`
                : "Actualización automática activa"}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="border-border text-foreground hover:bg-secondary"
            onClick={refreshNotificationHistory}
            disabled={isRefreshingHistory}
            aria-label="Actualizar historial de notificaciones ahora"
          >
            <RefreshCw className={`mr-1.5 h-4 w-4 ${isRefreshingHistory ? "animate-spin" : ""}`} aria-hidden="true" />
            {isRefreshingHistory ? "Actualizando" : "Actualizar"}
          </Button>
        </div>
      </div>
      {manualRefreshError && (
        <p role="alert" className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {manualRefreshError}
        </p>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Interruptor general */}
        <div className="glass-card rounded-xl p-6 border border-border bg-card space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <label className="text-base font-semibold text-foreground">Activar Notificaciones de Sistema</label>
              <p className="text-xs text-muted-foreground">
                Habilita o deshabilita por completo las alertas de nuevas solicitudes de empresa.
              </p>
            </div>
            <Switch checked={enabled} onCheckedChange={setEnabled} />
          </div>

          <div className="pt-4 border-t border-border flex items-center justify-between">
            <div className="space-y-0.5">
              <label className="text-base font-semibold text-foreground">Notificaciones por Correo Electrónico</label>
              <p className="text-xs text-muted-foreground">
                Enviar un correo al Owner cada vez que un manager solicite un nuevo local.
              </p>
            </div>
            <Switch checked={emailNotifications} onCheckedChange={setEmailNotifications} disabled={!enabled} />
          </div>
        </div>

        {/* Datos de contacto y cuenta */}
        <div className="glass-card rounded-xl p-6 border border-border bg-card space-y-4">
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary" /> Datos de Cuenta y Destino
          </h2>
          <p className="text-xs text-muted-foreground">
            Configura el correo y teléfono donde deseas recibir las alertas y la cuenta emisora de respaldo.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Correo de Notificación (Destino)</Label>
              <Input
                type="email"
                placeholder="owner@songtap.com"
                value={notificationEmail}
                onChange={(e) => setNotificationEmail(e.target.value)}
                className="bg-input border-border text-foreground"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Teléfono de Alerta (WhatsApp / SMS)</Label>
              <Input
                type="text"
                placeholder="+57 300 123 4567"
                value={notificationPhone}
                onChange={(e) => setNotificationPhone(e.target.value)}
                className="bg-input border-border text-foreground"
              />
            </div>
          </div>

          <div className="space-y-2 pt-2">
            <Label className="text-xs text-muted-foreground">Correo Emisora / Cuenta del Sistema (Sender)</Label>
            <Input
              type="email"
              placeholder="no-reply@songtap.com"
              value={senderAccountEmail}
              onChange={(e) => setSenderAccountEmail(e.target.value)}
              className="bg-input border-border text-foreground"
            />
            <p className="text-[11px] text-muted-foreground">
              Dirección de correo utilizada como remitente oficial para los avisos automatizados.
            </p>
          </div>
        </div>

        {/* Sonido de notificación */}
        <div className="glass-card rounded-xl p-6 border border-border bg-card space-y-4">
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Volume2 className="h-5 w-5 text-primary" /> Sonido de Alerta
          </h2>
          <p className="text-xs text-muted-foreground">
            Elige el tono que se reproducirá en el panel cuando haya solicitudes pendientes.
          </p>

          <div className="flex items-center gap-4 pt-2">
            <div className="w-64">
              <Select value={soundType} onValueChange={setSoundType}>
                <SelectTrigger className="bg-input border-border text-foreground">
                  <SelectValue placeholder="Selecciona un tono" />
                </SelectTrigger>
                <SelectContent className="bg-card border-border text-card-foreground">
                  <SelectItem value="chime">Campana Armónica (Chime)</SelectItem>
                  <SelectItem value="bell">Timbre Clásico (Bell)</SelectItem>
                  <SelectItem value="beep">Beep Digital</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={() => playTestSound(soundType)}
              className="border-border text-foreground hover:bg-secondary flex items-center gap-2"
            >
              <Volume2 size={16} /> Probar Tono
            </Button>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Button
            type="submit"
            className="bg-[#1DB954] hover:bg-[#1ed760] text-black font-semibold px-6 py-2.5 shadow-lg"
            disabled={updateMutation.isPending}
          >
            {updateMutation.isPending ? "Guardando..." : "Guardar Configuración"}
          </Button>
        </div>
      </form>

      <section className="glass-card rounded-xl border border-border bg-card p-6" aria-labelledby="scheduled-report-title">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 id="scheduled-report-title" className="flex items-center gap-2 text-lg font-semibold text-foreground">
              <FileText className="h-5 w-5 text-primary" /> Reporte consolidado interno
            </h2>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              Genera un resumen semanal dentro de SongTap con ventas entregadas, locales, ticket promedio y PQRS. Se conserva aquí y crea una alerta cuando está disponible.
            </p>
          </div>
          <div className="rounded-full border border-border bg-secondary/50 px-3 py-1 text-xs font-medium text-muted-foreground">
            Zona horaria: Colombia (UTC−5)
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-4 border-y border-border py-5 sm:grid-cols-[minmax(0,1fr)_10rem_10rem] sm:items-end">
          <div className="space-y-2">
            <Label htmlFor="report-weekday" className="text-xs text-muted-foreground">Día de ejecución</Label>
            <Select value={reportWeekday} onValueChange={setReportWeekday} disabled={isLoadingReportSchedule}>
              <SelectTrigger id="report-weekday" className="border-border bg-input text-foreground"><SelectValue /></SelectTrigger>
              <SelectContent className="border-border bg-card text-card-foreground">
                {reportWeekdays.map(day => <SelectItem key={day.value} value={day.value}>{day.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="report-time" className="text-xs text-muted-foreground">Hora local</Label>
            <Input id="report-time" type="time" value={reportTime} onChange={(event) => setReportTime(event.target.value)} className="border-border bg-input text-foreground" disabled={isLoadingReportSchedule} />
          </div>
          <div className="flex min-h-10 items-center justify-between gap-3 rounded-lg border border-border bg-secondary/20 px-3">
            <Label htmlFor="enable-scheduled-report" className="text-xs font-medium text-foreground">Activar</Label>
            <Switch id="enable-scheduled-report" checked={reportsEnabled} onCheckedChange={setReportsEnabled} disabled={isLoadingReportSchedule} />
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-xs text-muted-foreground" aria-live="polite">
            {reportSchedule?.isEnabled
              ? reportSchedule.nextExecutionAt
                ? `Próxima ejecución: ${new Date(reportSchedule.nextExecutionAt).toLocaleString("es-CO", { dateStyle: "medium", timeStyle: "short" })}.`
                : "La programación está activa; la próxima ejecución se actualizará automáticamente."
              : "La programación permanece desactivada hasta que la actives en producción."}
          </div>
          <Button type="button" onClick={saveReportSchedule} disabled={isLoadingReportSchedule || updateReportScheduleMutation.isPending} className="bg-[#1DB954] font-semibold text-black hover:bg-[#1ed760]">
            {updateReportScheduleMutation.isPending ? "Guardando..." : "Guardar programación"}
          </Button>
        </div>

        <div className="mt-5 rounded-lg border border-border bg-secondary/10 p-4">
          <h3 className="text-sm font-semibold text-foreground">Últimos reportes generados</h3>
          {isLoadingScheduledReports ? (
            <p className="mt-2 text-sm text-muted-foreground">Cargando reportes internos...</p>
          ) : scheduledReports.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">Aún no hay reportes programados generados. Al activarlo tras publicar, el primero aparecerá aquí.</p>
          ) : (
            <div className="mt-3 divide-y divide-border">
              {scheduledReports.map(report => {
                let summary: { totalRevenue?: number; deliveredOrderCount?: number; pqrsReceived?: number } = {};
                try { summary = JSON.parse(report.summaryJson); } catch { /* Conserva el registro si un resumen histórico no es legible. */ }
                return (
                  <div key={report.id} className="flex flex-col gap-1 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-medium text-foreground">Periodo del {new Date(report.periodStart).toLocaleDateString("es-CO")} al {new Date(report.periodEnd).toLocaleDateString("es-CO")}</p>
                      <p className="text-xs text-muted-foreground">{summary.deliveredOrderCount ?? 0} pedidos entregados · {summary.pqrsReceived ?? 0} PQRS</p>
                    </div>
                    <p className="font-semibold text-primary">${Number(summary.totalRevenue ?? 0).toLocaleString("es-CO", { maximumFractionDigits: 0 })}</p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      <section className="glass-card rounded-xl border border-border bg-card overflow-hidden" aria-labelledby="notification-history-title">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between p-6 border-b border-border">
          <div>
            <h2 id="notification-history-title" className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Inbox className="h-5 w-5 text-primary" /> Historial de Notificaciones
              {unreadCount > 0 && (
                <span className="rounded-full bg-primary/15 px-2 py-0.5 text-xs font-bold text-primary" aria-label={`${unreadCount} alertas sin leer`}>
                  {unreadCount} nuevas
                </span>
              )}
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Revisa las alertas enviadas por solicitudes de Manager y conserva el control de su lectura.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            className="border-border text-foreground hover:bg-secondary"
            onClick={() => markAllReadMutation.mutate()}
            disabled={unreadCount === 0 || markAllReadMutation.isPending}
          >
            <CheckCheck size={16} className="mr-2" />
            {markAllReadMutation.isPending ? "Actualizando..." : "Marcar todas como leídas"}
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-3 border-b border-border bg-secondary/10 p-5 md:grid-cols-[minmax(0,1fr)_11rem_11rem_auto] md:items-end" aria-label="Filtros del historial de notificaciones">
          <div className="space-y-2">
            <Label htmlFor="notification-search" className="text-xs text-muted-foreground">Buscar alertas</Label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
              <Input
                id="notification-search"
                value={historySearch}
                onChange={(event) => setHistorySearch(event.target.value)}
                placeholder="Buscar por local, manager o contenido..."
                className="border-border bg-input pl-9 text-foreground"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="notification-start-date" className="text-xs text-muted-foreground">Desde</Label>
            <Input
              id="notification-start-date"
              type="date"
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
              className="border-border bg-input text-foreground"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="notification-end-date" className="text-xs text-muted-foreground">Hasta</Label>
            <Input
              id="notification-end-date"
              type="date"
              min={startDate || undefined}
              value={endDate}
              onChange={(event) => setEndDate(event.target.value)}
              className="border-border bg-input text-foreground"
            />
          </div>
          <Button
            type="button"
            variant="ghost"
            className="text-muted-foreground hover:bg-secondary hover:text-foreground"
            onClick={clearHistoryFilters}
            disabled={!historySearch && !startDate && !endDate}
          >
            <RotateCcw size={15} className="mr-2" /> Limpiar
          </Button>
          <p className="md:col-span-4 text-xs text-muted-foreground" aria-live="polite">
            <CalendarDays size={13} className="mr-1 inline" aria-hidden="true" />
            Mostrando {filteredHistory.length} de {history.length} {history.length === 1 ? "alerta" : "alertas"}.
          </p>
        </div>

        <div className="divide-y divide-border" aria-live="polite">
          {isLoadingHistory ? (
            <div className="p-8 text-center text-sm text-muted-foreground">Cargando alertas anteriores...</div>
          ) : history.length === 0 ? (
            <div className="p-10 text-center">
              <Inbox className="mx-auto h-8 w-8 text-muted-foreground/60" aria-hidden="true" />
              <p className="mt-3 text-sm font-medium text-foreground">No hay notificaciones registradas</p>
              <p className="mt-1 text-xs text-muted-foreground">Las nuevas solicitudes de Manager aparecerán aquí.</p>
            </div>
          ) : filteredHistory.length === 0 ? (
            <div className="p-10 text-center">
              <Search className="mx-auto h-8 w-8 text-muted-foreground/60" aria-hidden="true" />
              <p className="mt-3 text-sm font-medium text-foreground">No encontramos alertas con esos filtros</p>
              <p className="mt-1 text-xs text-muted-foreground">Prueba con otro texto o amplía el rango de fechas.</p>
              <Button type="button" variant="outline" className="mt-4 border-border" onClick={clearHistoryFilters}>
                <RotateCcw size={15} className="mr-2" /> Limpiar filtros
              </Button>
            </div>
          ) : (
            filteredHistory.map((notification) => (
              <article
                key={notification.id}
                className={`flex flex-col gap-3 p-5 sm:flex-row sm:items-start sm:justify-between ${
                  notification.isRead ? "bg-card" : "bg-primary/[0.045]"
                }`}
              >
                <div className="flex min-w-0 gap-3">
                  <div className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${notification.isRead ? "bg-secondary text-muted-foreground" : "bg-primary/15 text-primary"}`}>
                    {notification.isRead ? <CircleCheck size={18} aria-hidden="true" /> : <Bell size={18} aria-hidden="true" />}
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-semibold text-foreground">{notification.title}</h3>
                      {!notification.isRead && <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-primary-foreground">NUEVA</span>}
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">{notification.content}</p>
                    <p className="mt-2 flex items-center gap-1 text-[11px] text-muted-foreground">
                      <Clock3 size={12} aria-hidden="true" />
                      {new Date(notification.createdAt).toLocaleString("es-CO", { dateStyle: "medium", timeStyle: "short" })}
                      {notification.isRead && notification.readAt ? " · Leída" : " · Sin leer"}
                    </p>
                  </div>
                </div>
                {!notification.isRead && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="shrink-0 text-primary hover:bg-primary/10 hover:text-primary"
                    onClick={() => markReadMutation.mutate({ id: notification.id })}
                    disabled={markReadMutation.isPending}
                    aria-label={`Marcar como leída: ${notification.title}`}
                  >
                    <CheckCheck size={15} className="mr-1.5" /> Marcar leída
                  </Button>
                )}
              </article>
            ))
          )}
        </div>
      </section>
    </div>
    </SongTapLayout>
  );
}
