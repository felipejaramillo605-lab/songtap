import { useEffect } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import SongTapLayout from "@/components/SongTapLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getLoginUrl } from "@/const";
import { Activity, Building2, CalendarDays, Clock3, Layers3, Shield, UserRound } from "lucide-react";

const actionColors: Record<string, string> = {
  CREATE_VENUE: "text-green-400",
  UPDATE_VENUE: "text-blue-400",
  CREATE_TABLE: "text-primary",
  RESET_TABLE_QR: "text-yellow-400",
  UPDATE_USER_ROLE: "text-purple-400",
  ASSIGN_USER_TO_VENUE: "text-purple-400",
  UPDATE_USER_PROFILE: "text-blue-400",
  DELETE_USER: "text-red-400",
  ORDER_DELIVERED: "text-green-400",
  ORDER_CANCELLED: "text-red-400",
  ORDER_PREPARING: "text-blue-400",
};

function formatDetails(details: string | null) {
  if (!details) return "Sin detalles adicionales";
  try {
    const parsed = JSON.parse(details);
    return typeof parsed === "string" ? parsed : Object.values(parsed).join(" · ");
  } catch {
    return details;
  }
}

function formatAuditTime(value: Date | string) {
  return new Date(value).toLocaleTimeString("es-CO", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export default function OwnerAudit() {
  const { user, isAuthenticated, loading } = useAuth();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (!loading && !isAuthenticated) window.location.href = getLoginUrl();
    if (!loading && isAuthenticated && user?.role !== "owner") navigate("/");
  }, [loading, isAuthenticated, user?.role, navigate]);

  const { data: logs = [], isLoading } = trpc.finance.auditLogs.useQuery({ limit: 100 }, { enabled: !!user && user.role === "owner" });

  if (loading || !isAuthenticated || user?.role !== "owner") return null;

  return (
    <SongTapLayout role="owner" title="Auditoría del Sistema">
      <div className="space-y-5 animate-slide-up">
        <div>
          <h2 className="text-xl font-bold text-foreground sm:text-2xl">Log de Auditoría</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Trazabilidad de movimientos por compañía, módulo y usuario ejecutor.
          </p>
        </div>

        <Card className="border-border bg-card">
          <CardHeader className="border-b border-border p-4 sm:p-6">
            <CardTitle className="flex flex-wrap items-center gap-2 text-sm font-semibold text-foreground">
              <Shield size={16} className="text-primary" />
              Eventos recientes
              <span className="rounded-full bg-primary/15 px-2 py-0.5 text-xs font-bold text-primary">{logs.length}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <p className="py-12 text-center text-sm text-muted-foreground">Cargando eventos de auditoría...</p>
            ) : logs.length === 0 ? (
              <p className="py-12 text-center text-sm text-muted-foreground">No hay eventos registrados.</p>
            ) : (
              <>
                <div className="hidden overflow-x-auto lg:block">
                  <table className="w-full min-w-[1050px] text-left text-sm">
                    <thead className="bg-secondary/30 text-[11px] uppercase tracking-wide text-muted-foreground">
                      <tr>
                        <th className="px-5 py-3 font-semibold">Compañía</th>
                        <th className="px-5 py-3 font-semibold">Fecha</th>
                        <th className="px-5 py-3 font-semibold">Hora</th>
                        <th className="px-5 py-3 font-semibold">Módulo</th>
                        <th className="px-5 py-3 font-semibold">Usuario ejecutor</th>
                        <th className="px-5 py-3 font-semibold">Acción</th>
                        <th className="px-5 py-3 font-semibold">Detalle</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {logs.map((log) => {
                        const timestamp = new Date(log.createdAt);
                        return (
                          <tr key={log.id} className="transition-colors hover:bg-secondary/20">
                            <td className="px-5 py-4 font-medium text-foreground">{log.companyName || "SongTap · Global"}</td>
                            <td className="whitespace-nowrap px-5 py-4 text-muted-foreground">{timestamp.toLocaleDateString("es-CO")}</td>
                            <td className="whitespace-nowrap px-5 py-4 text-muted-foreground">{formatAuditTime(timestamp)}</td>
                            <td className="px-5 py-4"><span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">{log.module || "Sistema"}</span></td>
                            <td className="px-5 py-4">
                              <p className="font-medium text-foreground">{log.executorName || log.executorEmail || "Usuario no disponible"}</p>
                              <p className="text-xs capitalize text-muted-foreground">{log.userRole || "sin rol"}</p>
                            </td>
                            <td className={`px-5 py-4 font-mono text-xs font-semibold ${actionColors[log.action] ?? "text-foreground"}`}>{log.action}</td>
                            <td className="max-w-xs truncate px-5 py-4 text-xs text-muted-foreground" title={formatDetails(log.details)}>{formatDetails(log.details)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="divide-y divide-border lg:hidden">
                  {logs.map((log) => {
                    const timestamp = new Date(log.createdAt);
                    return (
                      <article key={log.id} className="space-y-3 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="flex items-center gap-1.5 truncate text-sm font-semibold text-foreground"><Building2 size={15} className="shrink-0 text-primary" />{log.companyName || "SongTap · Global"}</p>
                            <p className={`mt-1 font-mono text-xs font-semibold ${actionColors[log.action] ?? "text-foreground"}`}>{log.action}</p>
                          </div>
                          <span className="shrink-0 rounded-full bg-primary/10 px-2 py-1 text-[11px] font-medium text-primary">{log.module || "Sistema"}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1"><CalendarDays size={13} className="text-primary" />{timestamp.toLocaleDateString("es-CO")}</span>
                          <span className="flex items-center gap-1"><Clock3 size={13} className="text-primary" />{formatAuditTime(timestamp)}</span>
                          <span className="col-span-2 flex items-center gap-1 truncate"><UserRound size={13} className="shrink-0 text-primary" />{log.executorName || log.executorEmail || "Usuario no disponible"} · {log.userRole || "sin rol"}</span>
                        </div>
                        <p className="flex gap-1.5 text-xs leading-relaxed text-muted-foreground"><Activity size={13} className="mt-0.5 shrink-0 text-primary" />{formatDetails(log.details)}</p>
                      </article>
                    );
                  })}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </SongTapLayout>
  );
}
