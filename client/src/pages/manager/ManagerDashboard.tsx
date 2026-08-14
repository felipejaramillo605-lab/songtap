import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import SongTapLayout from "@/components/SongTapLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DollarSign, TrendingUp, ShoppingBag, TrendingDown, BarChart3, Clock, Zap } from "lucide-react";
import { useEffect, useState, useMemo } from "react";
import { useLocation } from "wouter";
import { getLoginUrl } from "@/const";
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
  const [selectedDate, setSelectedDate] = useState(() => {
    const d = new Date();
    return d.toISOString().split("T")[0];
  });

  const dateFrom = useMemo(() => {
    const d = new Date(selectedDate + "T00:00:00");
    return d;
  }, [selectedDate]);

  const dateTo = useMemo(() => {
    const d = new Date(selectedDate + "T23:59:59.999");
    return d;
  }, [selectedDate]);

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

  const stats = [
    { 
      label: "Ingresos", 
      value: `$${(summary?.revenue ?? 0).toLocaleString()}`, 
      icon: <DollarSign size={20} />, 
      color: "text-primary", 
      bg: "bg-primary/10",
      trend: "+12%"
    },
    { 
      label: "Costos", 
      value: `$${(summary?.cost ?? 0).toLocaleString()}`, 
      icon: <TrendingDown size={20} />, 
      color: "text-red-400", 
      bg: "bg-red-400/10",
      trend: "-5%"
    },
    { 
      label: "Utilidad", 
      value: `$${(summary?.profit ?? 0).toLocaleString()}`, 
      icon: <TrendingUp size={20} />, 
      color: "text-green-400", 
      bg: "bg-green-400/10",
      trend: "+18%"
    },
    { 
      label: "Pedidos", 
      value: summary?.orderCount ?? 0, 
      icon: <ShoppingBag size={20} />, 
      color: "text-blue-400", 
      bg: "bg-blue-400/10",
      trend: "+8%"
    },
  ];

  return (
    <SongTapLayout role="manager" title="Dashboard Manager">
      <div className="space-y-8 animate-slide-up">
        {/* Header Section */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold gradient-text">Dashboard</h1>
              <p className="text-sm text-muted-foreground mt-1">
                {new Date().toLocaleDateString("es-CO", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 bg-card border border-border px-3 py-1.5 rounded-lg">
                <span className="text-xs text-muted-foreground font-medium">Filtrar día:</span>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="bg-transparent text-sm text-foreground focus:outline-none cursor-pointer"
                />
              </div>
              <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/30">
                <Zap size={14} className="text-primary" />
                <span className="text-xs font-semibold text-primary">En Vivo</span>
              </div>
            </div>
          </div>
        </div>

        {/* KPI Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat, i) => (
            <Card key={i} className="spotify-gradient-card border border-border/50 shadow-premium hover-lift overflow-hidden group">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className={`w-10 h-10 rounded-lg ${stat.bg} flex items-center justify-center ${stat.color} transition-smooth group-hover:scale-110`}>
                    {stat.icon}
                  </div>
                  <span className="text-xs font-bold text-green-400 bg-green-400/10 px-2 py-1 rounded-full">
                    {stat.trend}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-1">{stat.label}</p>
                <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Active Orders Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="spotify-gradient-card border border-border/50 shadow-premium hover-lift">
            <CardContent className="p-6 text-center">
              <div className="w-12 h-12 rounded-lg bg-yellow-400/10 flex items-center justify-center mx-auto mb-3">
                <Clock size={24} className="text-yellow-400" />
              </div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-2">Pendientes</p>
              <p className="text-4xl font-bold text-yellow-400">{pending}</p>
            </CardContent>
          </Card>
          <Card className="spotify-gradient-card border border-border/50 shadow-premium hover-lift">
            <CardContent className="p-6 text-center">
              <div className="w-12 h-12 rounded-lg bg-blue-400/10 flex items-center justify-center mx-auto mb-3">
                <Zap size={24} className="text-blue-400" />
              </div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-2">En Preparación</p>
              <p className="text-4xl font-bold text-blue-400">{preparing}</p>
            </CardContent>
          </Card>
        </div>

        {/* Charts Section with Tabs */}
        <div className="space-y-4">
          <Tabs defaultValue="hourly" className="w-full">
            <TabsList className="w-full bg-secondary/50 border border-border/50 p-1 rounded-lg">
              <TabsTrigger 
                value="hourly" 
                className="flex-1 data-[state=active]:bg-primary/20 data-[state=active]:text-primary data-[state=active]:shadow-glow transition-smooth"
              >
                <Clock size={14} className="mr-2" /> Por Hora
              </TabsTrigger>
              <TabsTrigger 
                value="category" 
                className="flex-1 data-[state=active]:bg-primary/20 data-[state=active]:text-primary data-[state=active]:shadow-glow transition-smooth"
              >
                <BarChart3 size={14} className="mr-2" /> Por Categoría
              </TabsTrigger>
            </TabsList>

            <TabsContent value="hourly" className="space-y-4 animate-fade-in">
              <RevenueByHourChart data={byHour ?? []} isLoading={isLoadingByHour} />
            </TabsContent>

            <TabsContent value="category" className="space-y-4 animate-fade-in">
              <RevenueByCategoryChart data={byCategory ?? []} isLoading={isLoadingByCategory} />
            </TabsContent>
          </Tabs>
        </div>

        {/* No Venue Message */}
        {!venueId && (
          <Card className="spotify-gradient-card border border-border/50 shadow-premium">
            <CardContent className="p-8 text-center">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <AlertCircle size={32} className="text-primary" />
              </div>
              <p className="text-muted-foreground text-sm font-medium">Tu cuenta no está asignada a ningún local.</p>
              <p className="text-muted-foreground text-xs mt-1">Contacta al Owner para que te asigne a un local.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </SongTapLayout>
  );
}

// Import AlertCircle icon
import { AlertCircle } from "lucide-react";
