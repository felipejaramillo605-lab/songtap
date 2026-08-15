import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import SongTapLayout from "@/components/SongTapLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Users, TrendingUp, Activity, CalendarDays, DollarSign, ReceiptText, Trophy } from "lucide-react";
import { useLocation } from "wouter";
import { useEffect, useMemo, useState } from "react";
import { getLoginUrl } from "@/const";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export default function OwnerDashboard() {
  const { user, isAuthenticated, loading } = useAuth();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (!loading && !isAuthenticated) window.location.href = getLoginUrl();
    if (!loading && isAuthenticated && user?.role !== "owner") navigate("/");
  }, [loading, isAuthenticated, user, navigate]);

  const { data: venues } = trpc.venues.list.useQuery(undefined, { enabled: !!user });
  const { data: users } = trpc.users.list.useQuery(undefined, { enabled: !!user });
  const [periodDays, setPeriodDays] = useState<7 | 30>(7);
  const { dateFrom, dateTo } = useMemo(() => {
    const dateTo = new Date();
    dateTo.setHours(23, 59, 59, 999);
    const dateFrom = new Date(dateTo);
    dateFrom.setDate(dateFrom.getDate() - (periodDays - 1));
    dateFrom.setHours(0, 0, 0, 0);
    return { dateFrom, dateTo };
  }, [periodDays]);
  const { data: analytics, isLoading: isLoadingAnalytics } = trpc.finance.ownerVenueAnalytics.useQuery(
    { dateFrom, dateTo },
    { enabled: isAuthenticated && user?.role === "owner" }
  );

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

        <section className="space-y-4" aria-labelledby="owner-analytics-title">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h3 id="owner-analytics-title" className="text-lg font-bold text-foreground flex items-center gap-2"><TrendingUp className="text-primary" size={20} /> Analítica interlocal</h3>
              <p className="mt-1 text-sm text-muted-foreground">Compara los ingresos entregados entre los locales activos.</p>
            </div>
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <CalendarDays size={16} className="text-primary" /> Periodo
              <select aria-label="Periodo de analítica interlocal" className="h-9 rounded-md border border-border bg-input px-3 text-sm text-foreground" value={periodDays} onChange={(event) => setPeriodDays(Number(event.target.value) as 7 | 30)}>
                <option value={7}>Últimos 7 días</option>
                <option value={30}>Últimos 30 días</option>
              </select>
            </label>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            {[
              { label: "Ingresos del periodo", value: `$${(analytics?.totals.revenue ?? 0).toLocaleString()}`, icon: <DollarSign size={18} />, color: "text-primary" },
              { label: "Pedidos entregados", value: (analytics?.totals.orderCount ?? 0).toLocaleString(), icon: <ReceiptText size={18} />, color: "text-blue-400" },
              { label: "Ticket promedio", value: `$${Math.round(analytics?.totals.averageTicket ?? 0).toLocaleString()}`, icon: <Trophy size={18} />, color: "text-yellow-300" },
            ].map((metric) => (
              <Card key={metric.label} className="border-border bg-card"><CardContent className="flex items-center justify-between p-4"><div><p className="text-xs uppercase tracking-wide text-muted-foreground">{metric.label}</p><p className="mt-1 text-xl font-bold text-foreground">{metric.value}</p></div><span className={metric.color}>{metric.icon}</span></CardContent></Card>
            ))}
          </div>

          <div className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
            <Card className="border-border bg-card">
              <CardHeader><CardTitle className="text-base text-foreground">Tendencia de ingresos</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="h-64" role="img" aria-label="Gráfico de barras de ingresos diarios interlocales" aria-describedby="owner-revenue-chart-description">
                  {isLoadingAnalytics ? <div className="flex h-full items-center justify-center text-sm text-muted-foreground">Cargando tendencia...</div> : !analytics?.dailyRevenue.length ? <div className="flex h-full items-center justify-center text-sm text-muted-foreground">No hay pedidos entregados en este periodo.</div> : (
                    <ResponsiveContainer width="100%" height="100%"><BarChart data={analytics.dailyRevenue} margin={{ top: 8, right: 8, left: -10, bottom: 0 }}><CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} /><XAxis dataKey="date" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} tickFormatter={(date) => new Date(`${date}T00:00:00`).toLocaleDateString("es-CO", { day: "2-digit", month: "short" })} /><YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} tickFormatter={(value) => `$${Number(value).toLocaleString()}`} /><Tooltip cursor={{ fill: "hsl(var(--secondary))" }} contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} formatter={(value) => [`$${Number(value).toLocaleString()}`, "Ingresos"]} labelFormatter={(label) => new Date(`${label}T00:00:00`).toLocaleDateString("es-CO", { dateStyle: "medium" })} /><Bar dataKey="revenue" name="Ingresos" fill="#1DB954" radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer>
                  )}
                </div>
                <p id="owner-revenue-chart-description" className="sr-only">La tabla desplegable siguiente presenta el mismo detalle diario de ingresos y pedidos para lectores de pantalla.</p>
                {!!analytics?.dailyRevenue.length && (
                  <details className="rounded-lg border border-border bg-secondary/20 px-3 py-2 text-sm">
                    <summary className="cursor-pointer font-medium text-foreground">Resumen diario en tabla</summary>
                    <div className="mt-3 overflow-x-auto"><table className="w-full text-left text-xs"><caption className="sr-only">Ingresos y pedidos entregados por día durante el periodo seleccionado.</caption><thead className="border-b border-border text-muted-foreground"><tr><th scope="col" className="pb-2 pr-3 font-medium">Fecha</th><th scope="col" className="pb-2 pr-3 text-right font-medium">Ingresos</th><th scope="col" className="pb-2 text-right font-medium">Pedidos</th></tr></thead><tbody>{analytics.dailyRevenue.map((day) => <tr key={day.date} className="border-b border-border/60 last:border-0"><th scope="row" className="py-2 pr-3 font-medium text-foreground">{new Date(`${day.date}T00:00:00`).toLocaleDateString("es-CO", { dateStyle: "medium" })}</th><td className="py-2 pr-3 text-right text-foreground">${day.revenue.toLocaleString()}</td><td className="py-2 text-right text-foreground">{day.orderCount}</td></tr>)}</tbody></table></div>
                  </details>
                )}
              </CardContent>
            </Card>

            <Card className="border-border bg-card">
              <CardHeader><CardTitle className="text-base text-foreground">Ranking de locales</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {isLoadingAnalytics ? <p className="py-8 text-center text-sm text-muted-foreground">Cargando ranking...</p> : !analytics?.venues.length ? <p className="py-8 text-center text-sm text-muted-foreground">No hay locales registrados.</p> : analytics.venues.slice(0, 5).map((venue, index) => (
                  <div key={venue.venueId} className="flex items-center gap-3 rounded-lg border border-border bg-secondary/30 p-3"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-primary">{index + 1}</span><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-foreground">{venue.venueName}</p><p className="text-xs text-muted-foreground">{venue.orderCount} pedidos · Ticket ${Math.round(venue.averageTicket).toLocaleString()}</p></div><p className="text-sm font-bold text-primary">${venue.revenue.toLocaleString()}</p></div>
                ))}
              </CardContent>
            </Card>
          </div>
        </section>

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
