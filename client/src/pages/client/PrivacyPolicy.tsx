import { Button } from "@/components/ui/button";
import { ShieldCheck, ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";

export default function PrivacyPolicy() {
  const [, navigate] = useLocation();

  return (
    <div className="min-h-screen bg-background text-foreground py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <Button variant="ghost" onClick={() => navigate(-1 as any)} className="text-muted-foreground hover:text-foreground">
          <ArrowLeft size={16} className="mr-2" /> Volver
        </Button>

        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
            <ShieldCheck size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Política de Tratamiento de Datos Personales</h1>
            <p className="text-xs text-muted-foreground">Conforme a la Ley 1581 de 2012 y el Decreto 1377 de 2013 (Colombia)</p>
          </div>
        </div>

        <div className="space-y-4 text-sm text-muted-foreground leading-relaxed bg-card p-6 rounded-2xl border border-border">
          <h2 className="text-base font-semibold text-foreground">1. Responsable del Tratamiento</h2>
          <p>
            SongTap (en adelante "la Plataforma") y el establecimiento comercial que opera el local donde escanea el código QR son responsables del tratamiento de los datos personales recopilados a través de este portal.
          </p>

          <h2 className="text-base font-semibold text-foreground">2. Finalidad del Tratamiento</h2>
          <p>
            Los datos recolectados (nombre temporal o identificación de cliente en mesa, interacciones de pedidos de alimentos/bebidas y solicitudes musicales) tienen como única finalidad gestionar la experiencia interactiva dentro del establecimiento, procesar pedidos en tiempo real, coordinar la lista de reproducción musical y cumplir con obligaciones legales aplicables.
          </p>

          <h2 className="text-base font-semibold text-foreground">3. Derechos del Titular</h2>
          <p>
            Como titular de los datos, usted tiene derecho a:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Conocer, actualizar y rectificar sus datos personales.</li>
            <li>Solicitar prueba de la autorización otorgada.</li>
            <li>Revocar la autorización y/o solicitar la supresión del dato cuando no se respeten los principios, derechos y garantías constitucionales y legales.</li>
            <li>Acceder en forma gratuita a sus datos personales objeto de tratamiento.</li>
          </ul>

          <h2 className="text-base font-semibold text-foreground">4. Consentimiento y Autorización</h2>
          <p>
            Al hacer uso del portal interactivo por QR y marcar la casilla de aceptación de esta política, usted autoriza de manera previa, expresa e informada el tratamiento de sus datos personales bajo los términos aquí expuestos.
          </p>
        </div>
      </div>
    </div>
  );
}
