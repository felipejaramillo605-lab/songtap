import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import SongTapLayout from "@/components/SongTapLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Plus, Building2, MapPin, Phone, Mail } from "lucide-react";
import { useState } from "react";
import { getLoginUrl } from "@/const";
import { useEffect } from "react";
import { useLocation } from "wouter";

export default function OwnerVenues() {
  const { user, isAuthenticated, loading } = useAuth();
  const [, navigate] = useLocation();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", address: "", phone: "", email: "" });

  useEffect(() => {
    if (!loading && !isAuthenticated) window.location.href = getLoginUrl();
    if (!loading && isAuthenticated && user?.role !== "owner") navigate("/");
  }, [loading, isAuthenticated, user, navigate]);

  const { data: venues, refetch } = trpc.venues.list.useQuery(undefined, { enabled: !!user });
  const createVenue = trpc.venues.create.useMutation({
    onSuccess: () => { toast.success("Local creado"); setOpen(false); setForm({ name: "", address: "", phone: "", email: "" }); refetch(); },
    onError: (e) => toast.error(e.message),
  });
  const updateVenue = trpc.venues.update.useMutation({
    onSuccess: () => { toast.success("Local actualizado"); refetch(); },
    onError: (e) => toast.error(e.message),
  });

  if (loading) return null;

  return (
    <SongTapLayout role="owner" title="Gestión de Locales">
      <div className="space-y-6 animate-slide-up">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-foreground">Locales</h2>
            <p className="text-sm text-muted-foreground">Administra todos los bares y karaokes registrados</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
                <Plus size={16} className="mr-2" /> Nuevo local
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border">
              <DialogHeader>
                <DialogTitle className="text-foreground">Crear nuevo local</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-2">
                {[
                  { key: "name", label: "Nombre *", placeholder: "Bar Central" },
                  { key: "address", label: "Dirección", placeholder: "Calle 123" },
                  { key: "phone", label: "Teléfono", placeholder: "+57 300 000 0000" },
                  { key: "email", label: "Email", placeholder: "bar@ejemplo.com" },
                ].map((f) => (
                  <div key={f.key}>
                    <Label className="text-muted-foreground text-xs">{f.label}</Label>
                    <Input
                      className="mt-1 bg-input border-border text-foreground"
                      placeholder={f.placeholder}
                      value={(form as Record<string, string>)[f.key]}
                      onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                    />
                  </div>
                ))}
                <Button
                  className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                  onClick={() => createVenue.mutate(form)}
                  disabled={!form.name || createVenue.isPending}
                >
                  {createVenue.isPending ? "Creando..." : "Crear local"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {venues?.map((venue) => (
            <Card key={venue.id} className="bg-card border-border hover:border-primary/30 transition-colors">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                      <Building2 size={18} />
                    </div>
                    <div>
                      <CardTitle className="text-sm font-semibold text-foreground">{venue.name}</CardTitle>
                      <p className="text-xs text-muted-foreground capitalize">Modo: {venue.musicMode}</p>
                    </div>
                  </div>
                  <Switch
                    checked={venue.isActive}
                    onCheckedChange={(v) => updateVenue.mutate({ id: venue.id, isActive: v })}
                  />
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {venue.address && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <MapPin size={12} /> {venue.address}
                  </div>
                )}
                {venue.phone && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Phone size={12} /> {venue.phone}
                  </div>
                )}
                {venue.email && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Mail size={12} /> {venue.email}
                  </div>
                )}
                <div className="flex items-center gap-2 pt-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${venue.privacyPolicyAccepted ? "bg-primary/15 text-primary" : "bg-yellow-500/15 text-yellow-400"}`}>
                    {venue.privacyPolicyAccepted ? "T&C Aceptados" : "T&C Pendientes"}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {!venues?.length && (
          <div className="text-center py-16 text-muted-foreground">
            <Building2 size={48} className="mx-auto mb-4 opacity-30" />
            <p>No hay locales registrados. Crea el primero.</p>
          </div>
        )}
      </div>
    </SongTapLayout>
  );
}
