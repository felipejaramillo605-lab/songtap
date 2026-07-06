import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import SongTapLayout from "@/components/SongTapLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DollarSign, TrendingUp, ShoppingBag, TrendingDown, BarChart3, Clock } from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { getLoginUrl } from "@/const";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { RevenueByHourChart } from "@/components/RevenueByHourChart";
import { RevenueByCategoryChart } from "@/components/RevenueByCategoryChart";

export default function ManagerDashboard() {
  const { user, isAuthenticated, loading } = useAuth();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (!loading && !isAuthenticated) window.location.href = getLoginUrl();
    if (!loading && isAuthenticated && user?.role !== "manager" && user?.role !== "owner") navigate("/");
  }, [loading, isAuthenticated, user, navigate]);

  const venueId = user?.venueId;
  const [dateFrom] = useState(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const [dateTo] = useState(() => {
    const d = new Date();
    d.setHours(23, 59, 59, 999);
    return d;
  });

  const { data: summary } = trpc.finance.summary.useQuery(
    { venueId: venueId!, dateFrom, dateTo },
    { enabled: !!venueId }
  );
  const { data: byCategory, isLoading: isLoadingByCategory } = trpc.finance.revenueByCategory.useQuery(
    { venueId: venueId!, dateFrom, dateTo },
    { enabled: !!venueId }
  );
  const { data: byHour, isLoading: isLoadingByHour } = trpc.finance.revenueByHour.useQuery(
    { venueId: venueId!, dateFrom, dateTo },
    { enabled: !!venueId }
  );
  const { data: orders } = trpc.orders.getByVenue.useQuery(
    { venueId: venueId! },
    { enabled: !!venueId, refetchInterval: 10000 }
  );

  if (loading) return <div className="min-h-screen bg-background flex items-center justify-center"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  const pending = orders?.filter((o) => o.status === "pending").length ?? 0;
  const preparing = orders?.filter((o) => o.status === "preparing").length ?? 0;

  const chartData = byCategory?.map((c) => ({
    name: c.categoryName,
    ingresos: Number(c.revenue),
    cantidad: Number(c.quantity),
  })) ?? [];

  return (
    <SongTapLayout role="manager" title="Dashboard Manager">
      <div className="space-y-6 animate-slide-up">
        <div>
          <h2 className="text-xl font-bold text-foreground">Resumen del día</h2>
          <p className="text-sm text-muted-foreground">{new Date().toLocaleDateString("es-CO", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</p>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Ingresos", value: `$${(summary?.revenue ?? 0).toLocaleString()}`, icon: <DollarSign size={20} />, color: "text-primary", bg: "bg-primary/10" },
            { label: "Costos", value: `$${(summary?.cost ?? 0).toLocaleString()}`, icon: <TrendingDown size={20} />, color: "text-red-400", bg: "bg-red-400/10" },
            { label: "Utilidad", value: `$${(summary?.profit ?? 0).toLocaleString()}`, icon: <TrendingUp size={20} />, color: "text-green-400", bg: "bg-green-400/10" },
            { label: "Pedidos", value: summary?.orderCount ?? 0, icon: <ShoppingBag size={20} />, color: "text-blue-400", bg: "bg-blue-400/10" },
          ].map((stat, i) => (
            <Card key={i} className="bg-card border-border">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">{stat.label}</p>
                  <div className={`w-8 h-8 rounded-lg ${stat.bg} flex items-center justify-center ${stat.color}`}>
                    {stat.icon}
                  </div>
                </div>
                <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Active orders */}
        <div className="grid grid-cols-2 gap-4">
          <Card className="bg-card border-border">
            <CardContent className="p-5 text-center">
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Pedidos Pendientes</p>
              <p className="text-4xl font-bold text-yellow-400">{pending}</p>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="p-5 text-center">
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">En Preparación</p>
              <p className="text-4xl font-bold text-blue-400">{preparing}</p>
            </CardContent>
          </Card>
        </div>

        {/* Interactive charts with tabs */}
        <Tabs defaultValue="hourly" className="w-full">
          <TabsList className="w-full bg-secondary border border-border mb-4">
            <TabsTrigger value="hourly" className="flex-1 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Clock size={14} className="mr-2" /> Por Hora
            </TabsTrigger>
            <TabsTrigger value="category" className="flex-1 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <BarChart3 size={14} className="mr-2" /> Por Categoría
            </TabsTrigger>
          </TabsList>

          <TabsContent value="hourly" className="space-y-4">
            <RevenueByHourChart data={byHour ?? []} isLoading={isLoadingByHour} />
          </TabsContent>

          <TabsContent value="category" className="space-y-4">
            <RevenueByCategoryChart data={byCategory ?? []} isLoading={isLoadingByCategory} />
          </TabsContent>
        </Tabs>

        {!venueId && (
          <Card className="bg-card border-border">
            <CardContent className="p-8 text-center">
              <p className="text-muted-foreground text-sm">Tu cuenta no está asignada a ningún local. Contacta al Owner.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </SongTapLayout>
  );
}
