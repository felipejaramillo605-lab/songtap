import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import SongTapLayout from "@/components/SongTapLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, Clock } from "lucide-react";
import { useEffect } from "react";
import { useLocation } from "wouter";
import { getLoginUrl } from "@/const";

export default function OwnerAudit() {
  const { user, isAuthenticated, loading } = useAuth();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (!loading && !isAuthenticated) window.location.href = getLoginUrl();
    if (!loading && isAuthenticated && user?.role !== "owner") navigate("/");
  }, [loading, isAuthenticated, user, navigate]);

  const { data: logs } = trpc.finance.auditLogs.useQuery({ limit: 100 }, { enabled: !!user });

  if (loading) return null;

  const actionColors: Record<string, string> = {
    CREATE_VENUE: "text-green-400",
    UPDATE_VENUE: "text-blue-400",
    CREATE_TABLE: "text-primary",
    RESET_TABLE_QR: "text-yellow-400",
    UPDATE_USER_ROLE: "text-purple-400",
    ORDER_DELIVERED: "text-green-400",
    ORDER_CANCELLED: "text-red-400",
    ORDER_PREPARING: "text-blue-400",
  };

  return (
    <SongTapLayout role="owner" title="Auditoría del Sistema">
      <div className="space-y-6 animate-slide-up">
        <div>
          <h2 className="text-xl font-bold text-foreground">Log de Auditoría</h2>
          <p className="text-sm text-muted-foreground">Registro completo de acciones del sistema</p>
        </div>

        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Shield size={16} /> Eventos recientes ({logs?.length ?? 0})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!logs?.length ? (
              <p className="text-center text-muted-foreground py-8 text-sm">No hay eventos registrados.</p>
            ) : (
              <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
                {logs.map((log) => (
                  <div key={log.id} className="flex items-start gap-3 p-3 rounded-lg bg-secondary/20 border border-border/50">
                    <div className="flex-shrink-0 mt-0.5">
                      <div className="w-2 h-2 rounded-full bg-primary mt-1.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-xs font-mono font-semibold ${actionColors[log.action] ?? "text-foreground"}`}>
                          {log.action}
                        </span>
                        {log.entity && (
                          <span className="text-xs text-muted-foreground">→ {log.entity}{log.entityId ? ` #${log.entityId}` : ""}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs text-muted-foreground">
                          Rol: <span className="text-foreground">{log.userRole ?? "—"}</span>
                        </span>
                        {log.details && (
                          <span className="text-xs text-muted-foreground truncate max-w-xs">{log.details}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground flex-shrink-0">
                      <Clock size={10} />
                      {new Date(log.createdAt).toLocaleString()}
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
