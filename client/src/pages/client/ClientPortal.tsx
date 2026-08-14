import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Music2, MapPin, Phone, QrCode, ChevronRight } from "lucide-react";
import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { toast } from "sonner";

export default function ClientPortal() {
  const { qrToken } = useParams<{ qrToken: string }>();
  const [, navigate] = useLocation();
  const [clientName, setClientName] = useState("");
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false);
  const [step, setStep] = useState<"loading" | "enter-name" | "error">("loading");

  // Check if already has a session
  useEffect(() => {
    const stored = sessionStorage.getItem("songtap_session");
    if (stored) {
      try {
        const session = JSON.parse(stored);
        if (session.sessionToken && session.venueId) {
          navigate(`/menu?session=${session.sessionToken}`);
          return;
        }
      } catch {}
    }
    setStep("enter-name");
  }, [navigate]);

  const { data: tableInfo, isError } = trpc.qr.validateTable.useQuery(
    { qrToken: qrToken ?? "" },
    { enabled: !!qrToken && step === "enter-name", retry: false }
  );

  useEffect(() => {
    if (isError) setStep("error");
  }, [isError]);

  const startSession = trpc.qr.startSession.useMutation({
    onSuccess: (data) => {
      sessionStorage.setItem("songtap_session", JSON.stringify(data));
      navigate(`/menu?session=${data.sessionToken}`);
    },
    onError: (e) => toast.error(e.message),
  });

  if (step === "loading") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (step === "error") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center space-y-5 max-w-sm mx-auto p-6 rounded-2xl bg-card border border-border shadow-2xl">
          <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mx-auto">
            <QrCode size={28} className="text-red-400" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-bold text-foreground">¡Código QR no disponible!</h2>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Lo sentimos, este código QR no corresponde a una mesa activa o ya ha expirado. Por favor, solicita asistencia a nuestro personal o escanea nuevamente el código ubicado en tu mesa.
            </p>
          </div>
          <Button
            className="w-full bg-primary text-primary-foreground font-bold hover:bg-primary/90"
            onClick={() => navigate("/")}
          >
            Volver al inicio
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/10 to-transparent" />
        <div className="relative px-6 py-8 text-center">
          <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center mx-auto mb-4 neon-glow">
            <Music2 size={28} className="text-primary-foreground" />
          </div>
          {tableInfo ? (
            <>
              <h1 className="text-2xl font-bold text-foreground">{tableInfo.venueName}</h1>
              <p className="text-primary font-semibold mt-1">{tableInfo.tableName}</p>
              {tableInfo.venueAddress && (
                <p className="text-xs text-muted-foreground flex items-center justify-center gap-1 mt-2">
                  <MapPin size={11} /> {tableInfo.venueAddress}
                </p>
              )}
              {tableInfo.venuePhone && (
                <p className="text-xs text-muted-foreground flex items-center justify-center gap-1 mt-1">
                  <Phone size={11} /> {tableInfo.venuePhone}
                </p>
              )}
            </>
          ) : (
            <div className="h-16 flex items-center justify-center">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </div>
      </div>

      {/* Name entry */}
      <div className="px-6 py-8 max-w-sm mx-auto space-y-6">
        <div className="text-center">
          <h2 className="text-lg font-semibold text-foreground">¿Cómo te llamamos?</h2>
          <p className="text-sm text-muted-foreground mt-1">Ingresa tu nombre para acceder al menú</p>
        </div>

        <div className="space-y-3">
          <div>
            <Label className="text-xs text-muted-foreground">Tu nombre (real o inventado)</Label>
            <Input
              className="mt-1 bg-input border-border text-foreground text-center text-lg h-12"
              placeholder="Ej: Juan, El Pelado, DJ..."
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && clientName.trim()) {
                  startSession.mutate({ qrToken: qrToken ?? "", clientName: clientName.trim() });
                }
              }}
              maxLength={64}
              autoFocus
            />
          </div>

          <div className="flex items-start gap-2 pt-1">
            <input
              type="checkbox"
              id="privacy"
              checked={acceptedPrivacy}
              onChange={(e) => setAcceptedPrivacy(e.target.checked)}
              className="mt-1 rounded border-border text-primary focus:ring-primary"
            />
            <label htmlFor="privacy" className="text-xs text-muted-foreground leading-relaxed cursor-pointer">
              Acepto la{" "}
              <a href="/privacy-policy" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-medium">
                Política de Tratamiento de Datos Personales
              </a>{" "}
              (Habeas Data) y el uso de mis datos para la gestión del pedido y música.
            </label>
          </div>

          <Button
            className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-bold h-12 text-base neon-glow mt-2"
            onClick={() => startSession.mutate({ qrToken: qrToken ?? "", clientName: clientName.trim() })}
            disabled={!clientName.trim() || !acceptedPrivacy || startSession.isPending}
          >
            {startSession.isPending ? "Entrando..." : (
              <>Ver el menú <ChevronRight size={18} className="ml-1" /></>
            )}
          </Button>
        </div>

        <p className="text-xs text-muted-foreground text-center">
          Al ingresar aceptas nuestra{" "}
          <a href="#" className="text-primary hover:underline">Política de Privacidad</a>
        </p>
      </div>
    </div>
  );
}
