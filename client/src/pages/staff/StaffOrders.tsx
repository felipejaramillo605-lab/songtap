import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import SongTapLayout from "@/components/SongTapLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ClipboardList, ChefHat, CheckCircle2, XCircle, Clock, RefreshCw } from "lucide-react";
import { useEffect } from "react";
import { useLocation } from "wouter";
import { getLoginUrl } from "@/const";

const statusConfig = {
  pending: { label: "Pendiente", color: "status-pending", icon: <Clock size={12} />, next: "preparing" as const, nextLabel: "Preparar" },
  preparing: { label: "En preparación", color: "status-preparing", icon: <ChefHat size={12} />, next: "delivered" as const, nextLabel: "Entregar" },
  delivered: { label: "Entregado", color: "status-delivered", icon: <CheckCircle2 size={12} />, next: null, nextLabel: "" },
  cancelled: { label: "Cancelado", color: "status-cancelled", icon: <XCircle size={12} />, next: null, nextLabel: "" },
};

export default function StaffOrders() {
  const { user, isAuthenticated, loading } = useAuth();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (!loading && !isAuthenticated) window.location.href = getLoginUrl();
    if (!loading && isAuthenticated && !["staff", "manager", "owner"].includes(user?.role ?? "")) navigate("/");
  }, [loading, isAuthenticated, user, navigate]);

  const venueId = user?.venueId;
  const { data: orders, refetch } = trpc.orders.getByVenue.useQuery(
    { venueId: venueId! },
    { enabled: !!venueId, refetchInterval: 5000 }
  );

  const updateStatus = trpc.orders.updateStatus.useMutation({
    onSuccess: () => { toast.success("Estado actualizado"); refetch(); },
    onError: (e) => toast.error(e.message),
  });

  if (loading) return <div className="min-h-screen bg-background flex items-center justify-center"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  const activeOrders = orders?.filter((o) => o.status !== "delivered" && o.status !== "cancelled") ?? [];
  const completedOrders = orders?.filter((o) => o.status === "delivered" || o.status === "cancelled") ?? [];

  const pending = activeOrders.filter((o) => o.status === "pending").length;
  const preparing = activeOrders.filter((o) => o.status === "preparing").length;

  return (
    <SongTapLayout role="staff" title="Cola de Pedidos">
      <div className="space-y-6 animate-slide-up">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-foreground">Pedidos en tiempo real</h2>
            <p className="text-sm text-muted-foreground">Cola FIFO — primero en entrar, primero en salir</p>
          </div>
          <Button variant="outline" size="sm" className="border-border text-muted-foreground" onClick={() => refetch()}>
            <RefreshCw size={14} className="mr-2" /> Actualizar
          </Button>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Pendientes", value: pending, color: "text-yellow-400" },
            { label: "En preparación", value: preparing, color: "text-blue-400" },
            { label: "Total activos", value: activeOrders.length, color: "text-primary" },
          ].map((s, i) => (
            <Card key={i} className="bg-card border-border">
              <CardContent className="p-4 text-center">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">{s.label}</p>
                <p className={`text-3xl font-bold mt-1 ${s.color}`}>{s.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Active orders (FIFO) */}
        <div>
          <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse-green" />
            Pedidos activos
          </h3>
          {activeOrders.length === 0 ? (
            <Card className="bg-card border-border">
              <CardContent className="p-8 text-center">
                <ClipboardList size={40} className="mx-auto mb-3 text-muted-foreground opacity-40" />
                <p className="text-muted-foreground text-sm">No hay pedidos activos. ¡Todo al día!</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {activeOrders.map((order) => {
                const cfg = statusConfig[order.status as keyof typeof statusConfig];
                return (
                  <Card key={order.id} className={`bg-card border-border ${order.status === "pending" ? "border-yellow-500/30" : order.status === "preparing" ? "border-blue-500/30" : ""}`}>
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-foreground text-sm">#{order.id} — Mesa {order.tableId}</p>
                          <p className="text-xs text-muted-foreground">{order.clientName}</p>
                        </div>
                        <span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${cfg.color}`}>
                          {cfg.icon} {cfg.label}
                        </span>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock size={11} /> {new Date(order.createdAt).toLocaleTimeString()}
                      </div>
                      <div className="text-sm font-bold text-primary">${Number(order.totalAmount).toLocaleString()}</div>
                      <div className="flex gap-2">
                        {cfg.next && (
                          <Button
                            size="sm"
                            className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90 text-xs"
                            onClick={() => updateStatus.mutate({ orderId: order.id, venueId: venueId!, status: cfg.next! })}
                            disabled={updateStatus.isPending}
                          >
                            {cfg.next === "preparing" ? <ChefHat size={12} className="mr-1" /> : <CheckCircle2 size={12} className="mr-1" />}
                            {cfg.nextLabel}
                          </Button>
                        )}
                        {order.status !== "cancelled" && order.status !== "delivered" && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-red-400 hover:bg-red-400/10 text-xs"
                            onClick={() => updateStatus.mutate({ orderId: order.id, venueId: venueId!, status: "cancelled" })}
                          >
                            <XCircle size={12} className="mr-1" /> Cancelar
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* Completed */}
        {completedOrders.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground mb-3">Completados / Cancelados hoy ({completedOrders.length})</h3>
            <div className="space-y-2">
              {completedOrders.slice(0, 10).map((order) => {
                const cfg = statusConfig[order.status as keyof typeof statusConfig];
                return (
                  <div key={order.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/20 border border-border/50">
                    <div className="flex items-center gap-3">
                      <span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${cfg.color}`}>{cfg.icon} {cfg.label}</span>
                      <span className="text-sm text-foreground">#{order.id} — {order.clientName}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-primary">${Number(order.totalAmount).toLocaleString()}</span>
                      <span className="text-xs text-muted-foreground">{new Date(order.createdAt).toLocaleTimeString()}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </SongTapLayout>
  );
}
