import { useState, useEffect } from "react";
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
import { Bell, Mail, Phone, Volume2, ShieldAlert, CheckCheck, Clock3, Inbox, CircleCheck } from "lucide-react";

export default function OwnerNotificationsSettings() {
  const { user, isAuthenticated, loading } = useAuth();
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();
  const { data: settings, isLoading } = trpc.notifications.getSettings.useQuery();
  const { data: history = [], isLoading: isLoadingHistory } = trpc.notifications.getHistory.useQuery(undefined, {
    refetchInterval: 10000,
  });
  const { data: unreadCount = 0 } = trpc.notifications.getUnreadCount.useQuery(undefined, {
    refetchInterval: 10000,
  });

  const [enabled, setEnabled] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [notificationEmail, setNotificationEmail] = useState("");
  const [notificationPhone, setNotificationPhone] = useState("");
  const [senderAccountEmail, setSenderAccountEmail] = useState("");
  const [soundType, setSoundType] = useState("chime");

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

  const updateMutation = trpc.notifications.updateSettings.useMutation({
    onSuccess: () => {
      toast.success("Ajustes de notificación actualizados correctamente.");
      utils.notifications.getSettings.invalidate();
    },
    onError: (e) => toast.error(e.message),
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
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Bell className="text-primary" /> Configuración de Notificaciones
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Gestiona las alertas visuales, sonoras y los envíos de correo para solicitudes de nuevos Managers.
        </p>
      </div>

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

        <div className="divide-y divide-border" aria-live="polite">
          {isLoadingHistory ? (
            <div className="p-8 text-center text-sm text-muted-foreground">Cargando alertas anteriores...</div>
          ) : history.length === 0 ? (
            <div className="p-10 text-center">
              <Inbox className="mx-auto h-8 w-8 text-muted-foreground/60" aria-hidden="true" />
              <p className="mt-3 text-sm font-medium text-foreground">No hay notificaciones registradas</p>
              <p className="mt-1 text-xs text-muted-foreground">Las nuevas solicitudes de Manager aparecerán aquí.</p>
            </div>
          ) : (
            history.map((notification) => (
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
