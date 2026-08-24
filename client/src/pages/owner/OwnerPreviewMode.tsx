import { useEffect } from "react";
import { Eye, ShieldCheck, TestTube2, UserRoundCheck, UsersRound } from "lucide-react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import SongTapLayout from "@/components/SongTapLayout";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { setPreviewMode } from "@/lib/previewMode";

export default function OwnerPreviewMode() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const { data: venues = [], isLoading } = trpc.venues.list.useQuery(undefined, { enabled: user?.role === "owner" });
  const activeVenues = venues.filter((venue) => venue.isActive);

  useEffect(() => {
    if (user?.role !== "owner") navigate("/");
  }, [navigate, user?.role]);

  const startPreview = (role: "manager" | "staff", venue: { id: number; name: string }) => {
    setPreviewMode({ role, venueId: venue.id, venueName: venue.name });
    navigate(role === "manager" ? "/manager" : "/staff");
  };

  return (
    <SongTapLayout role="owner" title="Modo de pruebas">
      <div className="mx-auto w-full max-w-5xl space-y-6 animate-slide-up">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">Control de calidad</p>
          <h2 className="mt-1 flex items-center gap-2 text-2xl font-bold text-foreground"><TestTube2 className="h-6 w-6 text-primary" /> Modo de pruebas por rol</h2>
          <p className="mt-2 max-w-3xl text-sm text-muted-foreground">Previsualiza los módulos de Manager o Staff para un local activo y reproduce su navegación. Tu cuenta continúa siendo Owner y las operaciones de escritura quedan bloqueadas en el servidor.</p>
        </div>

        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="flex flex-col gap-3 p-4 text-sm text-muted-foreground sm:flex-row sm:items-center">
            <ShieldCheck className="h-6 w-6 shrink-0 text-primary" />
            <p><strong className="text-foreground">Solo lectura:</strong> no se modifican roles, pedidos, menús, actividades ni configuraciones. El aviso fijo de previsualización permite volver al Panel Owner en cualquier momento.</p>
          </CardContent>
        </Card>

        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2"><div className="h-40 animate-pulse rounded-xl bg-secondary/40" /><div className="h-40 animate-pulse rounded-xl bg-secondary/40" /></div>
        ) : activeVenues.length === 0 ? (
          <Card className="border-border bg-card"><CardContent className="py-12 text-center text-sm text-muted-foreground">No hay locales activos disponibles para la previsualización.</CardContent></Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {activeVenues.map((venue) => (
              <Card key={venue.id} className="border-border bg-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg"><Eye className="h-5 w-5 text-primary" /> {venue.name}</CardTitle>
                  <CardDescription>Local #{venue.id}. Selecciona la perspectiva que deseas validar.</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-2 sm:flex-row">
                  <Button type="button" className="flex-1 bg-primary text-primary-foreground" onClick={() => startPreview("manager", venue)}><UserRoundCheck className="mr-2 h-4 w-4" /> Ver como Manager</Button>
                  <Button type="button" variant="outline" className="flex-1 border-border" onClick={() => startPreview("staff", venue)}><UsersRound className="mr-2 h-4 w-4" /> Ver como Staff</Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </SongTapLayout>
  );
}
