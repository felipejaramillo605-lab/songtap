import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface CategoryData {
  categoryId: number;
  categoryName: string;
  revenue: number;
  quantity: number;
}

interface RevenueByCategoryChartProps {
  data: CategoryData[];
  isLoading?: boolean;
}

const COLORS = [
  "oklch(0.65 0.18 145)", // Verde neón (Spotify)
  "oklch(0.60 0.15 200)", // Azul
  "oklch(0.65 0.18 60)",  // Amarillo
  "oklch(0.60 0.18 300)", // Magenta
  "oklch(0.65 0.18 25)",  // Rojo
  "oklch(0.55 0.12 240)", // Gris azulado
];

export function RevenueByCategoryChart({ data, isLoading }: RevenueByCategoryChartProps) {
  if (isLoading) {
    return (
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle>Ingresos por Categoría</CardTitle>
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

  if (!data || data.length === 0) {
    return (
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle>Ingresos por Categoría</CardTitle>
          <CardDescription>Sin datos disponibles</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-80 flex items-center justify-center text-muted-foreground">
            <p>No hay pedidos completados aún</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const sortedData = [...data].sort((a, b) => b.revenue - a.revenue);
  const totalRevenue = sortedData.reduce((sum, d) => sum + d.revenue, 0);
  const totalQuantity = sortedData.reduce((sum, d) => sum + d.quantity, 0);

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle>Ingresos por Categoría</CardTitle>
        <CardDescription>
          Total: ${totalRevenue.toLocaleString()} • {totalQuantity} ítems vendidos
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="w-full h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={sortedData} margin={{ top: 20, right: 30, left: 0, bottom: 60 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.22 0.005 240)" />
              <XAxis
                dataKey="categoryName"
                angle={-45}
                textAnchor="end"
                height={100}
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
                labelFormatter={(label: string) => `Categoría: ${label}`}
              />
              <Legend
                wrapperStyle={{
                  paddingTop: "20px",
                  color: "oklch(0.55 0.005 240)",
                }}
              />
              <Bar dataKey="revenue" name="Ingresos ($)" radius={[8, 8, 0, 0]}>
                {sortedData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Tabla de detalles */}
        <div className="mt-6 space-y-2">
          <h4 className="text-sm font-semibold text-foreground">Detalles por categoría</h4>
          <div className="space-y-1 max-h-40 overflow-y-auto">
            {sortedData.map((item, idx) => (
              <div key={item.categoryId} className="flex items-center justify-between text-xs p-2 rounded bg-secondary/30">
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded"
                    style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                  />
                  <span className="text-muted-foreground">{item.categoryName}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-primary font-semibold">${item.revenue.toLocaleString()}</span>
                  <span className="text-muted-foreground">({item.quantity} ítems)</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
