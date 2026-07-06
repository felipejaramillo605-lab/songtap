import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import SongTapLayout from "@/components/SongTapLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Users, TrendingUp, Activity } from "lucide-react";
import { useLocation } from "wouter";
import { useEffect } from "react";
import { getLoginUrl } from "@/const";

export default function OwnerDashboard() {
  const { user, isAuthenticated, loading } = useAuth();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (!loading && !isAuthenticated) window.location.href = getLoginUrl();
    if (!loading && isAuthenticated && user?.role !== "owner") navigate("/");
  }, [loading, isAuthenticated, user, navigate]);

  const { data: venues } = trpc.venues.list.useQuery(undefined, { enabled: !!user });
  const { data: users } = trpc.users.list.useQuery(undefined, { enabled: !!user });

  if (loading) return <div className="min-h-screen bg-background flex items-center justify-center"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  const activeVenues = venues?.filter((v) => v.isActive).length ?? 0;
  const totalUsers = users?.length ?? 0;
  const managers = users?.filter((u) => u.role === "manager").length ?? 0;
  const staff = users?.filter((u) => u.role === "staff").length ?? 0;

  return (
    <SongTapLayout role="owner" title="Panel Owner">
      <div className="space-y-6 animate-slide-up">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Bienvenido, {user?.name}</h2>
          <p className="text-muted-foreground mt-1">Vista global de la plataforma SongTap</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Locales activos", value: activeVenues, icon: <Building2 size={20} />, color: "text-primary" },
            { label: "Total usuarios", value: totalUsers, icon: <Users size={20} />, color: "text-blue-400" },
            { label: "Managers", value: managers, icon: <TrendingUp size={20} />, color: "text-purple-400" },
            { label: "Staff", value: staff, icon: <Activity size={20} />, color: "text-yellow-400" },
          ].map((stat, i) => (
            <Card key={i} className="bg-card border-border">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">{stat.label}</p>
                    <p className="text-3xl font-bold text-foreground mt-1">{stat.value}</p>
                  </div>
                  <div className={`${stat.color} opacity-80`}>{stat.icon}</div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Venues list */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-base font-semibold text-foreground">Locales registrados</CardTitle>
          </CardHeader>
          <CardContent>
            {!venues?.length ? (
              <p className="text-muted-foreground text-sm text-center py-8">No hay locales registrados aún.</p>
            ) : (
              <div className="space-y-3">
                {venues.map((venue) => (
                  <div key={venue.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/50 border border-border">
                    <div>
                      <p className="font-medium text-foreground text-sm">{venue.name}</p>
                      <p className="text-xs text-muted-foreground">{venue.address ?? "Sin dirección"}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${venue.isActive ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"}`}>
                        {venue.isActive ? "Activo" : "Inactivo"}
                      </span>
                      <span className="text-xs text-muted-foreground">Modo: {venue.musicMode}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </SongTapLayout>
  );
}
