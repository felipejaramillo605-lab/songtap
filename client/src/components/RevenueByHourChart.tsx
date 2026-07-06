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
    if (ratio > 0.7) return "oklch(0.65 0.18 145)"; // Verde neón
    if (ratio > 0.4) return "oklch(0.60 0.15 200)"; // Azul
    return "oklch(0.55 0.12 240)"; // Gris azulado
  };

  if (isLoading) {
    return (
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle>Ingresos por Hora</CardTitle>
          <CardDescription>Cargando datos...</CardDescription>
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

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle>Ingresos por Hora</CardTitle>
        <CardDescription>
          Total: ${totalRevenue.toLocaleString()} • {totalOrders} pedidos
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="w-full h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={fullDayData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.22 0.005 240)" />
              <XAxis
                dataKey="label"
                tick={{ fill: "oklch(0.55 0.005 240)", fontSize: 12 }}
                axisLine={{ stroke: "oklch(0.22 0.005 240)" }}
              />
              <YAxis
                tick={{ fill: "oklch(0.55 0.005 240)", fontSize: 12 }}
                axisLine={{ stroke: "oklch(0.22 0.005 240)" }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "oklch(0.14 0.005 240)",
                  border: "1px solid oklch(0.22 0.005 240)",
                  borderRadius: "8px",
                  color: "oklch(0.97 0.005 240)",
                }}
                formatter={(value: number) => `$${value.toLocaleString()}`}
                labelFormatter={(label: string) => `Hora: ${label}`}
              />
              <Legend
                wrapperStyle={{
                  paddingTop: "20px",
                  color: "oklch(0.55 0.005 240)",
                }}
              />
              <Bar dataKey="revenue" name="Ingresos ($)" radius={[8, 8, 0, 0]}>
                {fullDayData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={getBarColor(entry.revenue)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
