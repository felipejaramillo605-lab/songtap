import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface HourlyData {
  hour: number;
  revenue: number;
  orderCount: number;
}

interface RevenueByHourChartProps {
  data: HourlyData[];
  isLoading?: boolean;
}

const GRADIENT_COLORS = [
  "oklch(0.65 0.18 145)",  // Verde neón (pico)
  "oklch(0.62 0.16 145)",  // Verde más oscuro
  "oklch(0.60 0.15 200)",  // Azul
  "oklch(0.55 0.12 240)",  // Gris azulado
];

export function RevenueByHourChart({ data, isLoading }: RevenueByHourChartProps) {
  // Rellenar todas las horas del día (0-23) con datos
  const fullDayData = Array.from({ length: 24 }, (_, i) => {
    const hourData = data.find((d) => d.hour === i);
    return {
      hour: i,
      label: `${i.toString().padStart(2, "0")}:00`,
      revenue: hourData?.revenue ?? 0,
      orderCount: hourData?.orderCount ?? 0,
    };
  });

  const maxRevenue = Math.max(...fullDayData.map((d) => d.revenue), 1);
  
  const getBarColor = (value: number) => {
    const ratio = value / maxRevenue;
    if (ratio > 0.7) return "oklch(0.65 0.18 145)";
    if (ratio > 0.4) return "oklch(0.60 0.15 200)";
    if (ratio > 0.1) return "oklch(0.55 0.12 240)";
    return "oklch(0.30 0.01 240)";
  };

  if (isLoading) {
    return (
      <Card className="spotify-gradient-card border border-border shadow-premium overflow-hidden">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-bold gradient-text">Ingresos por Hora</CardTitle>
          <CardDescription className="text-xs text-muted-foreground">Cargando datos...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-80 flex items-center justify-center text-muted-foreground">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const totalRevenue = fullDayData.reduce((sum, d) => sum + d.revenue, 0);
  const totalOrders = fullDayData.reduce((sum, d) => sum + d.orderCount, 0);
  const avgRevenue = totalOrders > 0 ? (totalRevenue / totalOrders).toFixed(2) : "0";

  return (
    <Card className="spotify-gradient-card border border-border/50 shadow-premium overflow-hidden transition-smooth hover:shadow-premium-lg">
      <CardHeader className="pb-3 border-b border-border/30">
        <div className="space-y-1">
          <CardTitle className="text-lg font-bold gradient-text">Ingresos por Hora</CardTitle>
          <CardDescription className="text-xs text-muted-foreground">
            Total: <span className="text-primary font-semibold">${totalRevenue.toLocaleString()}</span> • 
            <span className="ml-2">{totalOrders} pedidos</span> • 
            <span className="ml-2">Promedio: ${avgRevenue}</span>
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="w-full h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={fullDayData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
              <defs>
                <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="oklch(0.65 0.18 145)" stopOpacity={0.8} />
                  <stop offset="100%" stopColor="oklch(0.65 0.18 145)" stopOpacity={0.3} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.22 0.005 240 / 0.5)" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fill: "oklch(0.55 0.005 240)", fontSize: 11 }}
                axisLine={{ stroke: "oklch(0.22 0.005 240 / 0.5)" }}
                interval={2}
              />
              <YAxis
                tick={{ fill: "oklch(0.55 0.005 240)", fontSize: 11 }}
                axisLine={{ stroke: "oklch(0.22 0.005 240 / 0.5)" }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "oklch(0.12 0.005 240 / 0.95)",
                  border: "1px solid oklch(0.65 0.18 145 / 0.5)",
                  borderRadius: "8px",
                  color: "oklch(0.97 0.005 240)",
                  boxShadow: "0 8px 32px oklch(0 0 0 / 0.3)",
                }}
                formatter={(value: number) => `$${value.toLocaleString()}`}
                labelFormatter={(label: string) => `${label}`}
                cursor={{ fill: "oklch(0.65 0.18 145 / 0.1)" }}
              />
              <Bar dataKey="revenue" name="Ingresos ($)" radius={[8, 8, 0, 0]} fill="url(#barGradient)">
                {fullDayData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={getBarColor(entry.revenue)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Peak hours insight */}
        <div className="mt-6 pt-4 border-t border-border/30">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Horas Pico</p>
          <div className="flex flex-wrap gap-2">
            {fullDayData
              .filter((d) => d.revenue > maxRevenue * 0.5)
              .slice(0, 5)
              .map((d) => (
                <div key={d.hour} className="px-3 py-1 rounded-full bg-primary/10 border border-primary/30 text-xs text-primary font-medium">
                  {d.label}: ${d.revenue.toLocaleString()}
                </div>
              ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
