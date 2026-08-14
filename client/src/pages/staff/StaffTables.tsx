import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import SongTapLayout from "@/components/SongTapLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { Table2, QrCode } from "lucide-react";
import { useEffect } from "react";
import { useLocation } from "wouter";
import { getLoginUrl } from "@/const";

export default function StaffTables() {
  const { user, isAuthenticated, loading } = useAuth();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (!loading && !isAuthenticated) window.location.href = getLoginUrl();
    if (!loading && isAuthenticated && !["staff", "manager", "owner"].includes(user?.role ?? "")) navigate("/");
  }, [loading, isAuthenticated, user, navigate]);

  const venueId = user?.venueId;
  const { data: tables, refetch } = trpc.tables.list.useQuery({ venueId: venueId! }, { enabled: !!venueId });
  const { data: orders } = trpc.orders.getByVenue.useQuery({ venueId: venueId! }, { enabled: !!venueId, refetchInterval: 8000 });

  if (loading) return null;

  const getTableOrders = (tableId: number) =>
    orders?.filter((o) => o.tableId === tableId && (o.status === "pending" || o.status === "preparing")) ?? [];

  const getQrUrl = (token: string) => `${window.location.origin}/mesa/${token}`;

  return (
    <SongTapLayout role="staff" title="Control de Mesas">
      <div className="space-y-6 animate-slide-up">
        <div>
          <h2 className="text-xl font-bold text-foreground">Mesas activas</h2>
          <p className="text-sm text-muted-foreground">Estado en tiempo real de cada mesa</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {tables?.map((table) => {
            const activeOrders = getTableOrders(table.id);
            const hasOrders = activeOrders.length > 0;
            return (
              <Card key={table.id} className={`bg-card border-border transition-all ${hasOrders ? "border-yellow-500/30" : "border-border"}`}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${hasOrders ? "bg-yellow-400 animate-pulse" : "bg-green-400"}`} />
                      <p className="font-semibold text-foreground">{table.name}</p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${hasOrders ? "bg-yellow-500/15 text-yellow-400" : "bg-green-500/15 text-green-400"}`}>
                      {hasOrders ? `${activeOrders.length} pedido${activeOrders.length > 1 ? "s" : ""}` : "Libre"}
                    </span>
                  </div>

                  <div className="bg-white p-2 rounded-md inline-block">
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=80x80&data=${encodeURIComponent(getQrUrl(table.qrToken))}`}
                      alt="QR"
                      className="w-20 h-20"
                    />
                  </div>

                  {hasOrders && (
                    <div className="space-y-1">
                      {activeOrders.map((o) => (
                        <div key={o.id} className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">#{o.id} {o.clientName}</span>
                          <span className={`px-1.5 py-0.5 rounded status-${o.status}`}>{o.status}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full border-border text-muted-foreground hover:text-primary hover:border-primary/30 text-xs"
                    onClick={() => window.open(getQrUrl(table.qrToken), "_blank")}
                  >
                    <QrCode size={11} className="mr-1" /> Ver enlace QR
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {!tables?.length && (
          <div className="text-center py-16 text-muted-foreground">
            <Table2 size={48} className="mx-auto mb-4 opacity-30" />
            <p>No hay mesas configuradas. El Manager debe crearlas.</p>
          </div>
        )}
      </div>
    </SongTapLayout>
  );
}
