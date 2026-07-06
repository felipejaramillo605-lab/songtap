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
      <Card className="spotify-gradient-card border border-border/50 shadow-premium overflow-hidden">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-bold gradient-text">Ingresos por Categoría</CardTitle>
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

  if (!data || data.length === 0) {
    return (
      <Card className="spotify-gradient-card border border-border/50 shadow-premium overflow-hidden">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-bold gradient-text">Ingresos por Categoría</CardTitle>
          <CardDescription className="text-xs text-muted-foreground">Sin datos disponibles</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-80 flex items-center justify-center text-muted-foreground">
            <p className="text-sm">No hay pedidos completados aún</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const sortedData = [...data].sort((a, b) => b.revenue - a.revenue);
  const totalRevenue = sortedData.reduce((sum, d) => sum + d.revenue, 0);
  const totalQuantity = sortedData.reduce((sum, d) => sum + d.quantity, 0);

  return (
    <Card className="spotify-gradient-card border border-border/50 shadow-premium overflow-hidden transition-smooth hover:shadow-premium-lg">
      <CardHeader className="pb-3 border-b border-border/30">
        <div className="space-y-1">
          <CardTitle className="text-lg font-bold gradient-text">Ingresos por Categoría</CardTitle>
          <CardDescription className="text-xs text-muted-foreground">
            Total: <span className="text-primary font-semibold">${totalRevenue.toLocaleString()}</span> • 
            <span className="ml-2">{totalQuantity} ítems vendidos</span>
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="w-full h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={sortedData} margin={{ top: 20, right: 30, left: 0, bottom: 60 }}>
              <defs>
                <linearGradient id="categoryGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="oklch(0.65 0.18 145)" stopOpacity={0.8} />
                  <stop offset="100%" stopColor="oklch(0.65 0.18 145)" stopOpacity={0.3} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.22 0.005 240 / 0.5)" vertical={false} />
              <XAxis
                dataKey="categoryName"
                angle={-45}
                textAnchor="end"
                height={100}
                tick={{ fill: "oklch(0.55 0.005 240)", fontSize: 11 }}
                axisLine={{ stroke: "oklch(0.22 0.005 240 / 0.5)" }}
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
              <Bar dataKey="revenue" name="Ingresos ($)" radius={[8, 8, 0, 0]}>
                {sortedData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Category breakdown table */}
        <div className="mt-6 pt-4 border-t border-border/30">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Detalles por Categoría</p>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {sortedData.map((item, idx) => {
              const percentage = ((item.revenue / totalRevenue) * 100).toFixed(1);
              return (
                <div key={item.categoryId} className="flex items-center justify-between p-3 rounded-lg bg-secondary/20 border border-border/30 hover:bg-secondary/40 transition-smooth">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                    />
                    <span className="text-sm text-foreground font-medium truncate">{item.categoryName}</span>
                  </div>
                  <div className="flex items-center gap-4 flex-shrink-0 ml-2">
                    <div className="text-right">
                      <p className="text-sm font-bold text-primary">${item.revenue.toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">{percentage}%</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">{item.quantity} ítems</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
