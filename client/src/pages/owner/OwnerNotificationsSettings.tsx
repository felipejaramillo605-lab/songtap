import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Bell, Mail, Phone, Volume2, ShieldAlert } from "lucide-react";

export default function OwnerNotificationsSettings() {
  const utils = trpc.useUtils();
  const { data: settings, isLoading } = trpc.notifications.getSettings.useQuery();

  const [enabled, setEnabled] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [notificationEmail, setNotificationEmail] = useState("");
  const [notificationPhone, setNotificationPhone] = useState("");
  const [senderAccountEmail, setSenderAccountEmail] = useState("");
  const [soundType, setSoundType] = useState("chime");

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

  if (isLoading) {
    return <div className="p-8 text-muted-foreground text-center">Cargando configuración...</div>;
  }

  return (
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
    </div>
  );
}
