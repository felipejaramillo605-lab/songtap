import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import SongTapLayout from "@/components/SongTapLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { DollarSign, TrendingUp, TrendingDown, Download, BarChart3 } from "lucide-react";
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { getLoginUrl } from "@/const";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

const COLORS = ["oklch(0.65 0.18 145)", "oklch(0.60 0.15 200)", "oklch(0.65 0.18 60)", "oklch(0.60 0.18 300)", "oklch(0.65 0.18 25)"];

export default function ManagerFinance() {
  const { user, isAuthenticated, loading } = useAuth();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (!loading && !isAuthenticated) window.location.href = getLoginUrl();
    if (!loading && isAuthenticated && user?.role !== "manager" && user?.role !== "owner") navigate("/");
  }, [loading, isAuthenticated, user, navigate]);

  const venueId = user?.venueId;
  const today = new Date().toISOString().split("T")[0];
  const [dateFrom, setDateFrom] = useState(today);
  const [dateTo, setDateTo] = useState(today);

  const fromDate = useState(() => { const d = new Date(dateFrom + "T00:00:00"); return d; })[0];
  const toDate = useState(() => { const d = new Date(dateTo + "T23:59:59"); return d; })[0];

  const { data: summary, refetch: refetchSummary } = trpc.finance.summary.useQuery(
    { venueId: venueId!, dateFrom: new Date(dateFrom + "T00:00:00"), dateTo: new Date(dateTo + "T23:59:59") },
    { enabled: !!venueId }
  );
  const { data: byCategory } = trpc.finance.revenueByCategory.useQuery(
    { venueId: venueId!, dateFrom: new Date(dateFrom + "T00:00:00"), dateTo: new Date(dateTo + "T23:59:59") },
    { enabled: !!venueId }
  );
  const { data: history } = trpc.finance.orderHistory.useQuery(
    { venueId: venueId!, dateFrom: new Date(dateFrom + "T00:00:00"), dateTo: new Date(dateTo + "T23:59:59") },
    { enabled: !!venueId }
  );

  const exportCSV = () => {
    if (!history?.length) { toast.error("No hay datos para exportar"); return; }
    const headers = ["ID", "Mesa", "Cliente", "Estado", "Total", "Costo", "Fecha"];
    const rows = history.map((o) => [o.id, o.tableId, o.clientName, o.status, o.totalAmount, o.totalCost, new Date(o.createdAt).toLocaleString()]);
    const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `songtap_reporte_${dateFrom}_${dateTo}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Reporte exportado");
  };

  if (loading) return null;

  const chartData = byCategory?.map((c) => ({ name: c.categoryName, ingresos: Number(c.revenue), cantidad: Number(c.quantity) })) ?? [];

  return (
    <SongTapLayout role="manager" title="Finanzas">
      <div className="space-y-6 animate-slide-up">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-xl font-bold text-foreground">Dashboard Financiero</h2>
            <p className="text-sm text-muted-foreground">Ingresos, costos y utilidad del local</p>
          </div>
          <Button variant="outline" size="sm" className="border-primary/30 text-primary" onClick={exportCSV}>
            <Download size={14} className="mr-2" /> Exportar CSV
          </Button>
        </div>

        {/* Date filter */}
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-end gap-4 flex-wrap">
              <div>
                <Label className="text-xs text-muted-foreground">Desde</Label>
                <Input type="date" className="mt-1 bg-input border-border text-foreground w-40" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Hasta</Label>
                <Input type="date" className="mt-1 bg-input border-border text-foreground w-40" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
              </div>
              <Button size="sm" className="bg-primary text-primary-foreground" onClick={() => refetchSummary()}>
                Aplicar filtro
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Ingresos", value: `$${(summary?.revenue ?? 0).toLocaleString()}`, icon: <DollarSign size={20} />, color: "text-primary", bg: "bg-primary/10" },
            { label: "Costos", value: `$${(summary?.cost ?? 0).toLocaleString()}`, icon: <TrendingDown size={20} />, color: "text-red-400", bg: "bg-red-400/10" },
            { label: "Utilidad Neta", value: `$${(summary?.profit ?? 0).toLocaleString()}`, icon: <TrendingUp size={20} />, color: (summary?.profit ?? 0) >= 0 ? "text-green-400" : "text-red-400", bg: "bg-green-400/10" },
            { label: "Pedidos completados", value: summary?.orderCount ?? 0, icon: <BarChart3 size={20} />, color: "text-blue-400", bg: "bg-blue-400/10" },
          ].map((stat, i) => (
            <Card key={i} className="bg-card border-border">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">{stat.label}</p>
                  <div className={`w-8 h-8 rounded-lg ${stat.bg} flex items-center justify-center ${stat.color}`}>{stat.icon}</div>
                </div>
                <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Charts */}
        {chartData.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="bg-card border-border">
              <CardHeader><CardTitle className="text-sm font-semibold text-foreground">Ingresos por categoría</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.22 0.005 240)" />
                    <XAxis dataKey="name" tick={{ fill: "oklch(0.55 0.005 240)", fontSize: 11 }} />
                    <YAxis tick={{ fill: "oklch(0.55 0.005 240)", fontSize: 11 }} />
                    <Tooltip contentStyle={{ background: "oklch(0.14 0.005 240)", border: "1px solid oklch(0.22 0.005 240)", borderRadius: "8px" }} itemStyle={{ color: "oklch(0.65 0.18 145)" }} labelStyle={{ color: "oklch(0.97 0.005 240)" }} />
                    <Bar dataKey="ingresos" fill="oklch(0.65 0.18 145)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card className="bg-card border-border">
              <CardHeader><CardTitle className="text-sm font-semibold text-foreground">Distribución de ventas</CardTitle></CardHeader>
              <CardContent className="flex justify-center">
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={chartData} dataKey="ingresos" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                      {chartData.map((_, index) => <Cell key={index} fill={COLORS[index % COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ background: "oklch(0.14 0.005 240)", border: "1px solid oklch(0.22 0.005 240)", borderRadius: "8px" }} itemStyle={{ color: "oklch(0.97 0.005 240)" }} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Order history */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-sm font-semibold text-foreground">Historial de pedidos ({history?.length ?? 0})</CardTitle>
          </CardHeader>
          <CardContent>
            {!history?.length ? (
              <p className="text-center text-muted-foreground text-sm py-8">No hay pedidos en el rango seleccionado.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-muted-foreground text-xs">
                      <th className="text-left py-2 px-3">ID</th>
                      <th className="text-left py-2 px-3">Cliente</th>
                      <th className="text-left py-2 px-3">Estado</th>
                      <th className="text-right py-2 px-3">Total</th>
                      <th className="text-left py-2 px-3">Fecha</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.slice(0, 50).map((o) => (
                      <tr key={o.id} className="border-b border-border/50 hover:bg-secondary/20">
                        <td className="py-2 px-3 text-muted-foreground">#{o.id}</td>
                        <td className="py-2 px-3 text-foreground">{o.clientName}</td>
                        <td className="py-2 px-3">
                          <span className={`text-xs px-2 py-0.5 rounded-full status-${o.status}`}>{o.status}</span>
                        </td>
                        <td className="py-2 px-3 text-right text-primary font-medium">${Number(o.totalAmount).toLocaleString()}</td>
                        <td className="py-2 px-3 text-muted-foreground text-xs">{new Date(o.createdAt).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </SongTapLayout>
  );
}
