import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import SongTapLayout from "@/components/SongTapLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { getLoginUrl } from "@/const";
import { filterAuditLogs } from "@/lib/auditFilters";
import { buildAuditFilename, createAuditCsv, createAuditWorkbook, toAuditExportRows } from "@/lib/auditExport";
import { Activity, Building2, CalendarDays, CheckCircle2, Clock3, Download, FileSpreadsheet, Filter, RotateCcw, Search, Shield, UserRound, XCircle } from "lucide-react";
import { writeFileXLSX } from "xlsx";
import { toast } from "sonner";

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

  const { data: logs = [], isLoading, refetch: refetchLogs } = trpc.finance.auditLogs.useQuery({ limit: 1000 }, { enabled: !!user && user.role === "owner" });
  const { data: pendingAccessRequests = [], isLoading: isLoadingAccessRequests, refetch: refetchPendingAccessRequests } = trpc.access.getPending.useQuery(undefined, { enabled: user?.role === "owner" });
  const [companyFilter, setCompanyFilter] = useState("all");
  const [moduleFilter, setModuleFilter] = useState("all");
  const [userFilter, setUserFilter] = useState("all");
  const [pendingAccessOnly, setPendingAccessOnly] = useState(false);
  const [selectedAccessRequest, setSelectedAccessRequest] = useState<(typeof pendingAccessRequests)[number] | null>(null);
  const [decision, setDecision] = useState<"approved" | "rejected" | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [internalComment, setInternalComment] = useState("");
  const [requesterSearch, setRequesterSearch] = useState("");

  const resolveAccessMutation = trpc.access.resolve.useMutation({
    onSuccess: (_, variables) => {
      toast.success(variables.decision === "approved" ? "Acceso aprobado y usuario notificado." : "Solicitud rechazada y usuario notificado.");
      setSelectedAccessRequest(null);
      setDecision(null);
      setRejectionReason("");
      setInternalComment("");
      void refetchPendingAccessRequests();
      void refetchLogs();
    },
    onError: (error) => toast.error(error.message || "No fue posible resolver la solicitud."),
  });

  const filterOptions = useMemo(() => {
    const companies = new Map<string, string>();
    const modules = new Set<string>();
    const users = new Map<string, string>();

    logs.forEach((log) => {
      companies.set(log.venueId ? String(log.venueId) : "global", log.companyName || "SongTap · Global");
      modules.add(log.module || "Sistema");
      users.set(String(log.userId ?? "unknown"), log.executorName || log.executorEmail || "Usuario no disponible");
    });

    return {
      companies: Array.from(companies.entries()).sort(([, a], [, b]) => a.localeCompare(b, "es-CO")),
      modules: Array.from(modules).sort((a, b) => a.localeCompare(b, "es-CO")),
      users: Array.from(users.entries()).sort(([, a], [, b]) => a.localeCompare(b, "es-CO")),
    };
  }, [logs]);

  const filteredLogs = useMemo(
    () => filterAuditLogs(logs, { company: companyFilter, module: moduleFilter, user: userFilter }),
    [logs, companyFilter, moduleFilter, userFilter]
  );

  const hasActiveFilters = companyFilter !== "all" || moduleFilter !== "all" || userFilter !== "all";
  const clearFilters = () => {
    setCompanyFilter("all");
    setModuleFilter("all");
    setUserFilter("all");
  };

  const openDecision = (request: (typeof pendingAccessRequests)[number], nextDecision: "approved" | "rejected") => {
    setSelectedAccessRequest(request);
    setDecision(nextDecision);
    setRejectionReason("");
    setInternalComment("");
  };

  const filteredPendingAccessRequests = useMemo(() => {
    const search = requesterSearch.trim().toLocaleLowerCase("es-CO");
    if (!search) return pendingAccessRequests;
    return pendingAccessRequests.filter((request) => [request.requesterName, request.requesterEmail, request.moduleName, request.targetPath]
      .filter(Boolean)
      .some((value) => String(value).toLocaleLowerCase("es-CO").includes(search)));
  }, [pendingAccessRequests, requesterSearch]);

  const confirmDecision = () => {
    if (!selectedAccessRequest || !decision) return;
    if (decision === "rejected" && !rejectionReason.trim()) {
      toast.error("Indica el motivo del rechazo para informar al solicitante.");
      return;
    }
    resolveAccessMutation.mutate({
      requestId: selectedAccessRequest.id,
      decision,
      reason: decision === "rejected" ? rejectionReason.trim() : undefined,
      internalComment: internalComment.trim() || undefined,
    });
  };

  const exportFilters = { company: companyFilter, module: moduleFilter, user: userFilter };
  const downloadCsv = () => {
    const rows = toAuditExportRows(filteredLogs);
    const blob = new Blob([`\uFEFF${createAuditCsv(rows)}`], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = buildAuditFilename("csv");
    link.click();
    URL.revokeObjectURL(url);
  };

  const downloadExcel = () => {
    const rows = toAuditExportRows(filteredLogs);
    writeFileXLSX(createAuditWorkbook(rows, exportFilters), buildAuditFilename("xlsx"));
  };

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
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle className="flex flex-wrap items-center gap-2 text-sm font-semibold text-foreground">
                <Shield size={16} className="text-primary" />
                Eventos recientes
                <span className="rounded-full bg-primary/15 px-2 py-0.5 text-xs font-bold text-primary">{filteredLogs.length} / {logs.length}</span>
              </CardTitle>
              <div className="flex flex-wrap gap-2" aria-label="Acciones del log de auditoría">
                <Button type="button" size="sm" variant={pendingAccessOnly ? "default" : "outline"} className={pendingAccessOnly ? "bg-primary text-primary-foreground" : "border-border"} onClick={() => setPendingAccessOnly((value) => !value)} aria-pressed={pendingAccessOnly}>
                  <Clock3 size={14} className="mr-1.5" /> {pendingAccessOnly ? "Ver todos" : `Accesos pendientes (${pendingAccessRequests.length})`}
                </Button>
                <Button type="button" size="sm" variant="outline" className="border-border" disabled={filteredLogs.length === 0} onClick={downloadCsv}>
                  <Download size={14} className="mr-1.5" /> CSV
                </Button>
                <Button type="button" size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90" disabled={filteredLogs.length === 0} onClick={downloadExcel}>
                  <FileSpreadsheet size={14} className="mr-1.5" /> Excel
                </Button>
              </div>
            </div>
          </CardHeader>
          {!pendingAccessOnly && !isLoading && logs.length > 0 && (
            <div className="grid grid-cols-1 gap-3 border-b border-border bg-secondary/10 p-4 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_auto] lg:items-end" aria-label="Filtros del log de auditoría">
              <div className="space-y-2">
                <label htmlFor="audit-company-filter" className="text-xs font-medium text-muted-foreground">Compañía</label>
                <Select value={companyFilter} onValueChange={setCompanyFilter}>
                  <SelectTrigger id="audit-company-filter" className="border-border bg-input text-foreground">
                    <SelectValue placeholder="Todas las compañías" />
                  </SelectTrigger>
                  <SelectContent className="border-border bg-card text-card-foreground">
                    <SelectItem value="all">Todas las compañías</SelectItem>
                    {filterOptions.companies.map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label htmlFor="audit-module-filter" className="text-xs font-medium text-muted-foreground">Módulo</label>
                <Select value={moduleFilter} onValueChange={setModuleFilter}>
                  <SelectTrigger id="audit-module-filter" className="border-border bg-input text-foreground">
                    <SelectValue placeholder="Todos los módulos" />
                  </SelectTrigger>
                  <SelectContent className="border-border bg-card text-card-foreground">
                    <SelectItem value="all">Todos los módulos</SelectItem>
                    {filterOptions.modules.map((module) => <SelectItem key={module} value={module}>{module}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label htmlFor="audit-user-filter" className="text-xs font-medium text-muted-foreground">Usuario ejecutor</label>
                <Select value={userFilter} onValueChange={setUserFilter}>
                  <SelectTrigger id="audit-user-filter" className="border-border bg-input text-foreground">
                    <SelectValue placeholder="Todos los usuarios" />
                  </SelectTrigger>
                  <SelectContent className="border-border bg-card text-card-foreground">
                    <SelectItem value="all">Todos los usuarios</SelectItem>
                    {filterOptions.users.map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <Button type="button" variant="ghost" className="text-muted-foreground hover:bg-secondary hover:text-foreground" disabled={!hasActiveFilters} onClick={clearFilters}>
                <RotateCcw size={15} className="mr-2" /> Limpiar
              </Button>
              <p className="sm:col-span-2 lg:col-span-4 text-xs text-muted-foreground" aria-live="polite">
                <Filter size={13} className="mr-1 inline" aria-hidden="true" /> Mostrando {filteredLogs.length} de {logs.length} movimientos.
              </p>
            </div>
          )}
          <CardContent className="p-0">
            {pendingAccessOnly ? (
              isLoadingAccessRequests ? (
                <p className="py-12 text-center text-sm text-muted-foreground">Cargando solicitudes de acceso...</p>
              ) : pendingAccessRequests.length === 0 ? (
                <div className="py-12 text-center">
                  <CheckCircle2 className="mx-auto h-8 w-8 text-primary" aria-hidden="true" />
                  <p className="mt-3 text-sm font-medium text-foreground">No hay solicitudes de acceso pendientes</p>
                  <p className="mt-1 text-xs text-muted-foreground">Las solicitudes nuevas aparecerán aquí para su revisión.</p>
                </div>
              ) : (
                <div>
                  <div className="border-b border-border bg-secondary/10 p-4">
                    <label htmlFor="access-request-search" className="sr-only">Buscar solicitudes por solicitante</label>
                    <div className="relative max-w-xl">
                      <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                      <Input id="access-request-search" value={requesterSearch} onChange={(event) => setRequesterSearch(event.target.value)} placeholder="Buscar por nombre, correo, módulo o ruta" className="border-border bg-input pl-9" />
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground" aria-live="polite">{filteredPendingAccessRequests.length} de {pendingAccessRequests.length} solicitudes pendientes.</p>
                  </div>
                  {filteredPendingAccessRequests.length === 0 ? (
                    <div className="py-10 text-center text-sm text-muted-foreground">No hay solicitudes que coincidan con la búsqueda.</div>
                  ) : (
                    <div className="divide-y divide-border" aria-label="Solicitudes de acceso pendientes">
                      {filteredPendingAccessRequests.map((request) => (
                    <article key={request.id} className="space-y-4 p-4 sm:p-5">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-primary">Solicitud pendiente</p>
                          <h3 className="mt-1 text-base font-semibold text-foreground">{request.moduleName}</h3>
                          <p className="mt-1 font-mono text-xs text-muted-foreground">{request.targetPath}</p>
                        </div>
                        <span className="w-fit rounded-full bg-yellow-500/15 px-2.5 py-1 text-xs font-semibold text-yellow-300">Pendiente</span>
                      </div>
                      <div className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-3">
                        <p><span className="font-medium text-foreground">Solicita:</span> {request.requesterName || request.requesterEmail || "Usuario"}</p>
                        <p><span className="font-medium text-foreground">Rol actual:</span> {request.requesterRole}</p>
                        <p><span className="font-medium text-foreground">Local:</span> {request.venueName || "Sin local"}</p>
                      </div>
                      <div className="flex flex-col gap-2 sm:flex-row">
                        <Button type="button" size="sm" className="gap-1.5 bg-primary text-primary-foreground" disabled={resolveAccessMutation.isPending} onClick={() => openDecision(request, "approved")}><CheckCircle2 size={15} /> Aprobar acceso</Button>
                        <Button type="button" size="sm" variant="outline" className="gap-1.5 border-destructive/50 text-destructive hover:bg-destructive/10" disabled={resolveAccessMutation.isPending} onClick={() => openDecision(request, "rejected")}><XCircle size={15} /> Rechazar</Button>
                      </div>
                    </article>
                      ))}
                    </div>
                  )}
                </div>
              )
            ) : isLoading ? (
              <p className="py-12 text-center text-sm text-muted-foreground">Cargando eventos de auditoría...</p>
            ) : logs.length === 0 ? (
              <p className="py-12 text-center text-sm text-muted-foreground">No hay eventos registrados.</p>
            ) : filteredLogs.length === 0 ? (
              <div className="py-12 text-center">
                <Filter className="mx-auto h-8 w-8 text-muted-foreground/60" aria-hidden="true" />
                <p className="mt-3 text-sm font-medium text-foreground">No hay movimientos con estos filtros</p>
                <p className="mt-1 text-xs text-muted-foreground">Cambia las opciones seleccionadas o limpia los filtros para volver a ver el historial.</p>
                <Button type="button" variant="outline" className="mt-4 border-border" onClick={clearFilters}>
                  <RotateCcw size={15} className="mr-2" /> Limpiar filtros
                </Button>
              </div>
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
                      {filteredLogs.map((log) => {
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
                  {filteredLogs.map((log) => {
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

        <Dialog open={Boolean(selectedAccessRequest && decision)} onOpenChange={(open) => { if (!open) { setSelectedAccessRequest(null); setDecision(null); setRejectionReason(""); setInternalComment(""); } }}>
          <DialogContent className="border-border bg-card text-card-foreground">
            <DialogHeader>
              <DialogTitle>{decision === "approved" ? "Aprobar solicitud de acceso" : "Rechazar solicitud de acceso"}</DialogTitle>
              <DialogDescription>{selectedAccessRequest?.requesterName || selectedAccessRequest?.requesterEmail || "El usuario"} solicitó acceso a <strong>{selectedAccessRequest?.moduleName}</strong>.</DialogDescription>
            </DialogHeader>
            {decision === "approved" ? (
              <p className="rounded-lg border border-primary/25 bg-primary/10 p-3 text-sm text-muted-foreground">La aprobación actualizará el rol de esta cuenta y le enviará una notificación en su perfil.</p>
            ) : (
              <div className="space-y-2">
                <label htmlFor="access-rejection-reason" className="text-sm font-medium text-foreground">Motivo del rechazo</label>
                <Textarea id="access-rejection-reason" value={rejectionReason} onChange={(event) => setRejectionReason(event.target.value)} placeholder="Explica brevemente la decisión para el solicitante." className="min-h-24 border-border bg-input" />
              </div>
            )}
            <div className="space-y-2 border-t border-border pt-4">
              <label htmlFor="access-internal-comment" className="text-sm font-medium text-foreground">Comentario interno del Owner <span className="font-normal text-muted-foreground">(opcional)</span></label>
              <Textarea id="access-internal-comment" value={internalComment} onChange={(event) => setInternalComment(event.target.value)} placeholder="Visible únicamente para el Owner en la auditoría; no se enviará al solicitante." className="min-h-20 border-border bg-input" />
            </div>
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button type="button" variant="outline" onClick={() => { setSelectedAccessRequest(null); setDecision(null); setInternalComment(""); }}>Cancelar</Button>
              <Button type="button" className={decision === "approved" ? "bg-primary text-primary-foreground" : "bg-destructive text-destructive-foreground hover:bg-destructive/90"} disabled={resolveAccessMutation.isPending || (decision === "rejected" && !rejectionReason.trim())} onClick={confirmDecision}>{resolveAccessMutation.isPending ? "Guardando..." : decision === "approved" ? "Confirmar aprobación" : "Confirmar rechazo"}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </SongTapLayout>
  );
}
