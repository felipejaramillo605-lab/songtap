import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import SongTapLayout from "@/components/SongTapLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Cog, Music2, Shield } from "lucide-react";
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { getLoginUrl } from "@/const";
import { MusicProvider, musicProviderInfo, providerConnectionMessage } from "@/lib/musicProvider";

export default function ManagerSettings() {
  const { user, isAuthenticated, loading } = useAuth();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (!loading && !isAuthenticated) window.location.href = getLoginUrl();
    if (!loading && isAuthenticated && user?.role !== "manager" && user?.role !== "owner") navigate("/");
    if (!loading && isAuthenticated && !user?.venueId) {
      toast.error("Sin local asignado");
      navigate("/manager/dashboard");
    }
  }, [loading, isAuthenticated, user, navigate]);

  const venueId = user?.venueId;
  const { data: venue, refetch } = trpc.venues.getById.useQuery({ id: venueId! }, { enabled: !!venueId });

  const [form, setForm] = useState({ name: "", address: "", phone: "", email: "", socialLinks: "" });
  const [musicMode, setMusicMode] = useState<"auto" | "manual">("manual");
  const [musicProvider, setMusicProvider] = useState<MusicProvider>("manual");
  const [musicConnectionStatus, setMusicConnectionStatus] = useState<"not_configured" | "pending" | "connected">("not_configured");
  const [privacyAccepted, setPrivacyAccepted] = useState(false);

  useEffect(() => {
    if (venue) {
      setForm({ name: venue.name, address: venue.address ?? "", phone: venue.phone ?? "", email: venue.email ?? "", socialLinks: venue.socialLinks ?? "" });
      setMusicMode(venue.musicMode);
      setMusicProvider(venue.musicProvider ?? "manual");
      setMusicConnectionStatus(venue.musicConnectionStatus ?? "not_configured");
      setPrivacyAccepted(venue.privacyPolicyAccepted);
    }
  }, [venue]);

  const update = trpc.venues.update.useMutation({
    onSuccess: () => { toast.success("Configuración guardada"); refetch(); },
    onError: (e) => toast.error(e.message),
  });

  if (loading) return null;

  return (
    <SongTapLayout role="manager" title="Configuración del Local">
      <div className="space-y-6 animate-slide-up max-w-2xl">
        <div>
          <h2 className="text-xl font-bold text-foreground">Configuración</h2>
          <p className="text-sm text-muted-foreground">Ajustes generales del local</p>
        </div>

        <Card className="bg-card border-border">
          <CardHeader><CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2"><Cog size={16} /> Información general</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {[
              { key: "name", label: "Nombre del local *", placeholder: "Bar Central" },
              { key: "address", label: "Dirección", placeholder: "Calle 123, Ciudad" },
              { key: "phone", label: "Teléfono de contacto", placeholder: "+57 300 000 0000" },
              { key: "email", label: "Email", placeholder: "bar@ejemplo.com" },
              { key: "socialLinks", label: "Redes sociales (JSON)", placeholder: '{"instagram":"@bar","facebook":"bar"}' },
            ].map((f) => (
              <div key={f.key}>
                <Label className="text-xs text-muted-foreground">{f.label}</Label>
                <Input className="mt-1 bg-input border-border text-foreground" placeholder={f.placeholder} value={(form as Record<string, string>)[f.key]} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader><CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2"><Music2 size={16} /> Modo musical</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-muted-foreground">Selecciona cómo se gestionan las peticiones musicales</p>
            <Select value={musicMode} onValueChange={(v) => setMusicMode(v as "auto" | "manual")}>
              <SelectTrigger className="bg-input border-border text-foreground">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border">
                <SelectItem value="manual">Manual — El staff reproduce las canciones</SelectItem>
                <SelectItem value="auto" disabled>Automático — Disponible al conectar un proveedor</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-primary bg-primary/10 border border-primary/20 rounded-lg p-3">El control manual continúa activo hasta que una conexión externa sea validada.</p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader><CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2"><Music2 size={16} /> Fuente de metadatos</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-muted-foreground">Elige el proveedor que este local desea conectar. La cola y reproducción manual siguen disponibles mientras la conexión esté pendiente.</p>
            <Select value={musicProvider} onValueChange={(value) => {
              const provider = value as MusicProvider;
              setMusicProvider(provider);
              setMusicConnectionStatus(provider === "manual" ? "not_configured" : "pending");
              setMusicMode("manual");
            }}>
              <SelectTrigger className="bg-input border-border text-foreground"><SelectValue /></SelectTrigger>
              <SelectContent className="bg-popover border-border">
                {Object.entries(musicProviderInfo).map(([value, info]) => <SelectItem key={value} value={value}>{info.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <p className={`text-xs rounded-lg border p-3 ${musicProvider === "manual" ? "border-primary/20 bg-primary/10 text-primary" : "border-yellow-400/20 bg-yellow-400/10 text-yellow-300"}`}>
              {providerConnectionMessage(musicProvider, musicConnectionStatus)}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader><CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2"><Shield size={16} /> Política de privacidad</CardTitle></CardHeader>
          <CardContent>
            <div className="flex items-start gap-3">
              <Switch checked={privacyAccepted} onCheckedChange={setPrivacyAccepted} />
              <div>
                <p className="text-sm text-foreground">Acepto la Política de Privacidad y Tratamiento de Datos Personales</p>
                <p className="text-xs text-muted-foreground mt-1">Al activar confirmas que el local cumple con las políticas de SongTap.</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Button
          className="bg-primary text-primary-foreground hover:bg-primary/90 w-full"
          onClick={() => update.mutate({ id: venueId!, ...form, musicMode, musicProvider, privacyPolicyAccepted: privacyAccepted })}
          disabled={update.isPending}
        >
          {update.isPending ? "Guardando..." : "Guardar configuración"}
        </Button>
      </div>
    </SongTapLayout>
  );
}
