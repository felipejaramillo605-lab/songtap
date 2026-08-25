import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import SongTapLayout from "@/components/SongTapLayout";
import FavoriteModules from "@/components/FavoriteModules";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { buildPqrsFilename, createPqrsCsv, createPqrsWorkbook, toPqrsExportRows } from "@/lib/pqrsExport";
import { getPreviousPqrsPeriod } from "@/lib/pqrsPeriod";
import { getSlaRisk } from "@/lib/pqrsSlaRisk";
import { buildKaraokeMetricsFilename, createKaraokeMetricsCsv } from "@/lib/karaokeMetricsExport";
import { Building2, Users, TrendingUp, Activity, CalendarDays, DollarSign, ReceiptText, Trophy, MessageSquareText, Timer, Download, FileSpreadsheet, ShieldCheck, TriangleAlert, FilePlus2, BookOpenCheck, Music2 } from "lucide-react";
import { useLocation } from "wouter";
import { useEffect, useMemo, useState } from "react";
import { getLoginUrl } from "@/const";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { writeFileXLSX } from "xlsx";
import { toast } from "sonner";

function toDateInputValue(date: Date) {
  return date.toISOString().slice(0, 10);
}

export default function OwnerDashboard() {
  const { user, isAuthenticated, loading } = useAuth();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (!loading && !isAuthenticated) window.location.href = getLoginUrl();
    if (!loading && isAuthenticated && user?.role !== "owner") navigate("/");
  }, [loading, isAuthenticated, user, navigate]);

  const { data: venues } = trpc.venues.list.useQuery(undefined, { enabled: !!user });
  const { data: users } = trpc.users.list.useQuery(undefined, { enabled: !!user });
  const { data: onboardingAnalytics, isLoading: isLoadingOnboardingAnalytics } = trpc.onboarding.getAnalytics.useQuery(undefined, { enabled: isAuthenticated && user?.role === "owner" });
  const { data: karaokeMetrics, isLoading: isLoadingKaraokeMetrics } = trpc.music.getOwnerKaraokeLinkMetrics.useQuery(undefined, { enabled: isAuthenticated && user?.role === "owner" });
  const [periodDays, setPeriodDays] = useState<7 | 30>(7);
  const [selectedPqrsVenueIds, setSelectedPqrsVenueIds] = useState<number[] | null>(null);
  const [pqrsType, setPqrsType] = useState<"all" | "petition" | "complaint" | "claim" | "suggestion" | "congratulation">("all");
  const [pqrsStatus, setPqrsStatus] = useState<"all" | "open" | "in_review" | "resolved" | "closed">("all");
  const [useCustomPqrsRange, setUseCustomPqrsRange] = useState(false);
  const [slaVenueId, setSlaVenueId] = useState<number | null>(null);
  const [slaType, setSlaType] = useState<"petition" | "complaint" | "claim" | "suggestion" | "congratulation">("complaint");
  const [slaTargetMinutes, setSlaTargetMinutes] = useState(1440);
  const [isSlaTargetDirty, setIsSlaTargetDirty] = useState(false);
  const [awaitingSlaTarget, setAwaitingSlaTarget] = useState<number | null>(null);
  const { dateFrom, dateTo } = useMemo(() => {
    const dateTo = new Date();
    dateTo.setHours(23, 59, 59, 999);
    const dateFrom = new Date(dateTo);
    dateFrom.setDate(dateFrom.getDate() - (periodDays - 1));
    dateFrom.setHours(0, 0, 0, 0);
    return { dateFrom, dateTo };
  }, [periodDays]);
  const [pqrsStartDate, setPqrsStartDate] = useState(() => toDateInputValue(dateFrom));
  const [pqrsEndDate, setPqrsEndDate] = useState(() => toDateInputValue(dateTo));
  const pqrsDateRange = useMemo(() => {
    if (!useCustomPqrsRange) return { dateFrom, dateTo, isValid: true };
    const start = new Date(`${pqrsStartDate}T00:00:00`);
    const end = new Date(`${pqrsEndDate}T23:59:59.999`);
    const isValid = !Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime()) && start <= end;
    return { dateFrom: start, dateTo: end, isValid };
  }, [dateFrom, dateTo, pqrsStartDate, pqrsEndDate, useCustomPqrsRange]);
  const automaticPreviousPqrsDateRange = useMemo(() => getPreviousPqrsPeriod(pqrsDateRange.dateFrom, pqrsDateRange.dateTo), [pqrsDateRange.dateFrom, pqrsDateRange.dateTo]);
  const [useManualSlaComparisonRange, setUseManualSlaComparisonRange] = useState(false);
  const [slaComparisonStartDate, setSlaComparisonStartDate] = useState(() => toDateInputValue(automaticPreviousPqrsDateRange.dateFrom));
  const [slaComparisonEndDate, setSlaComparisonEndDate] = useState(() => toDateInputValue(automaticPreviousPqrsDateRange.dateTo));
  const comparisonPqrsDateRange = useMemo(() => {
    if (!useManualSlaComparisonRange) return { ...automaticPreviousPqrsDateRange, isValid: true };
    const start = new Date(`${slaComparisonStartDate}T00:00:00`);
    const end = new Date(`${slaComparisonEndDate}T23:59:59.999`);
    const isValid = !Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime()) && start <= end;
    return { dateFrom: start, dateTo: end, isValid };
  }, [automaticPreviousPqrsDateRange, slaComparisonEndDate, slaComparisonStartDate, useManualSlaComparisonRange]);
  const { data: analytics, isLoading: isLoadingAnalytics } = trpc.finance.ownerVenueAnalytics.useQuery(
    { dateFrom, dateTo },
    { enabled: isAuthenticated && user?.role === "owner" }
  );
  const { data: pqrsAnalytics, isLoading: isLoadingPqrsAnalytics } = trpc.pqrs.ownerAnalytics.useQuery(
    { dateFrom: pqrsDateRange.dateFrom, dateTo: pqrsDateRange.dateTo, type: pqrsType, status: pqrsStatus },
    { enabled: isAuthenticated && user?.role === "owner" && pqrsDateRange.isValid }
  );
  const { data: previousPqrsAnalytics, isLoading: isLoadingPreviousPqrsAnalytics } = trpc.pqrs.ownerAnalytics.useQuery(
    { dateFrom: comparisonPqrsDateRange.dateFrom, dateTo: comparisonPqrsDateRange.dateTo, type: pqrsType, status: pqrsStatus },
    { enabled: isAuthenticated && user?.role === "owner" && pqrsDateRange.isValid && comparisonPqrsDateRange.isValid }
  );
  const utils = trpc.useUtils();
  const generateManualReport = trpc.ownerReports.generateManual.useMutation({
    onSuccess: async (result) => {
      toast.success(result.status === "duplicate" ? "El reporte ya fue generado para esta solicitud." : "Reporte interno generado y añadido al historial.");
      await Promise.all([utils.ownerReports.list.invalidate(), utils.notifications.getHistory.invalidate(), utils.notifications.getUnreadCount.invalidate()]);
    },
    onError: (error) => toast.error(error.message),
  });
  const { data: slaTargets } = trpc.pqrs.slaTargets.useQuery(undefined, { enabled: isAuthenticated && user?.role === "owner" });
  const upsertSlaTarget = trpc.pqrs.upsertSlaTarget.useMutation({
    onSuccess: async (_result, variables) => {
      setSlaTargetMinutes(variables.targetMinutes);
      setIsSlaTargetDirty(false);
      setAwaitingSlaTarget(variables.targetMinutes);
      await Promise.all([utils.pqrs.slaTargets.invalidate(), utils.pqrs.ownerAnalytics.invalidate()]);
    },
  });

  useEffect(() => {
    if (slaVenueId === null && venues?.[0]?.id) setSlaVenueId(venues[0].id);
  }, [slaVenueId, venues]);

  useEffect(() => {
    if (slaVenueId === null) return;
    const existing = slaTargets?.find((target) => target.venueId === slaVenueId && target.type === slaType);
    const persistedTarget = existing?.targetMinutes ?? 1440;
    if (isSlaTargetDirty || (awaitingSlaTarget !== null && persistedTarget !== awaitingSlaTarget)) return;
    setSlaTargetMinutes(persistedTarget);
    if (awaitingSlaTarget === persistedTarget) setAwaitingSlaTarget(null);
  }, [awaitingSlaTarget, isSlaTargetDirty, slaTargets, slaType, slaVenueId]);

  const previousPqrsVenueMap = useMemo(() => new Map((previousPqrsAnalytics?.venues ?? []).map((venue) => [venue.venueId, venue])), [previousPqrsAnalytics]);
  if (loading) return <div className="min-h-screen bg-background flex items-center justify-center"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  const activeVenues = venues?.filter((v) => v.isActive).length ?? 0;
  const totalUsers = users?.length ?? 0;
  const managers = users?.filter((u) => u.role === "manager").length ?? 0;
  const staff = users?.filter((u) => u.role === "staff").length ?? 0;
  const allPqrsVenues = (pqrsAnalytics?.venues ?? []).map((venue) => {
    const previousVenue = previousPqrsVenueMap.get(venue.venueId);
    const previousSlaComplianceRate = previousVenue?.slaComplianceRate ?? 0;
    return { ...venue, previousSlaComplianceRate, slaComplianceChange: venue.slaComplianceRate - previousSlaComplianceRate };
  });
  const selectedPqrsVenues = selectedPqrsVenueIds === null ? allPqrsVenues : allPqrsVenues.filter((venue) => selectedPqrsVenueIds.includes(venue.venueId));
  const selectedPqrsTotals = selectedPqrsVenues.reduce((totals, venue) => ({
    total: totals.total + venue.total,
    open: totals.open + venue.open,
    inReview: totals.inReview + venue.inReview,
    resolved: totals.resolved + venue.resolved,
    slaEvaluated: totals.slaEvaluated + venue.slaEvaluated,
    slaMet: totals.slaMet + venue.slaMet,
    slaBreached: totals.slaBreached + venue.slaBreached,
    resolutionRate: 0,
    slaComplianceRate: 0,
    previousSlaComplianceRate: 0,
    slaComplianceChange: 0,
  }), { total: 0, open: 0, inReview: 0, resolved: 0, slaEvaluated: 0, slaMet: 0, slaBreached: 0, resolutionRate: 0, slaComplianceRate: 0, previousSlaComplianceRate: 0, slaComplianceChange: 0 });
  selectedPqrsTotals.resolutionRate = selectedPqrsTotals.total ? Math.round((selectedPqrsTotals.resolved / selectedPqrsTotals.total) * 100) : 0;
  selectedPqrsTotals.slaComplianceRate = selectedPqrsTotals.slaEvaluated ? Math.round((selectedPqrsTotals.slaMet / selectedPqrsTotals.slaEvaluated) * 100) : 0;
  const selectedPreviousSlaEvaluated = selectedPqrsVenues.reduce((total, venue) => total + (previousPqrsVenueMap.get(venue.venueId)?.slaEvaluated ?? 0), 0);
  const selectedPreviousSlaMet = selectedPqrsVenues.reduce((total, venue) => total + (previousPqrsVenueMap.get(venue.venueId)?.slaMet ?? 0), 0);
  selectedPqrsTotals.previousSlaComplianceRate = selectedPreviousSlaEvaluated ? Math.round((selectedPreviousSlaMet / selectedPreviousSlaEvaluated) * 100) : 0;
  selectedPqrsTotals.slaComplianceChange = selectedPqrsTotals.slaComplianceRate - selectedPqrsTotals.previousSlaComplianceRate;
  const selectedSlaRisk = getSlaRisk(selectedPqrsTotals.slaComplianceChange);
  const significantDropVenues = selectedPqrsVenues.filter((venue) => getSlaRisk(venue.slaComplianceChange) === "significant_drop");
  const pqrsTypeLabel = { all: "Todos los tipos", petition: "Petición", complaint: "Queja", claim: "Reclamo", suggestion: "Sugerencia", congratulation: "Felicitación" }[pqrsType];
  const pqrsStatusLabel = { all: "Todos los estados", open: "Abierta", in_review: "En revisión", resolved: "Resuelta", closed: "Cerrada" }[pqrsStatus];
  const pqrsExportFilters = { typeLabel: pqrsTypeLabel, statusLabel: pqrsStatusLabel };
  const pqrsExportRows = toPqrsExportRows(selectedPqrsVenues, pqrsExportFilters);
  const canExportPqrs = pqrsExportRows.length > 0 && pqrsDateRange.isValid && comparisonPqrsDateRange.isValid && !isLoadingPqrsAnalytics && !isLoadingPreviousPqrsAnalytics;
  const togglePqrsVenue = (venueId: number) => {
    const currentIds = selectedPqrsVenueIds ?? allPqrsVenues.map((venue) => venue.venueId);
    setSelectedPqrsVenueIds(currentIds.includes(venueId) ? currentIds.filter((id) => id !== venueId) : [...currentIds, venueId]);
  };
  const downloadPqrsCsv = () => {
    const csv = createPqrsCsv(pqrsExportRows, pqrsDateRange.dateFrom, pqrsDateRange.dateTo);
    const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = buildPqrsFilename("csv");
    link.click();
    URL.revokeObjectURL(url);
  };
  const downloadPqrsExcel = () => {
    if (!pqrsAnalytics) return;
    writeFileXLSX(createPqrsWorkbook(pqrsExportRows, selectedPqrsTotals, pqrsDateRange.dateFrom, pqrsDateRange.dateTo, pqrsExportFilters), buildPqrsFilename("xlsx"));
  };
  const downloadKaraokeMetricsCsv = () => {
    if (!karaokeMetrics) return;
    const url = URL.createObjectURL(new Blob([`\uFEFF${createKaraokeMetricsCsv(karaokeMetrics)}`], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = buildKaraokeMetricsFilename();
    link.click();
    URL.revokeObjectURL(url);
  };
  const saveSlaTarget = () => {
    if (slaVenueId === null) return;
    upsertSlaTarget.mutate({ venueId: slaVenueId, type: slaType, targetMinutes: slaTargetMinutes });
  };

  const createManualOwnerReport = () => {
    if (!globalThis.crypto?.randomUUID) {
      toast.error("Este navegador no permite crear un identificador seguro para el reporte.");
      return;
    }
    generateManualReport.mutate({ requestId: globalThis.crypto.randomUUID() });
  };

  return (
    <SongTapLayout role="owner" title="Panel Owner">
      <div className="space-y-6 animate-slide-up">
        <FavoriteModules role="owner" />
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Bienvenido, {user?.name}</h2>
            <p className="text-muted-foreground mt-1">Vista global de la plataforma SongTap</p>
          </div>
          <Button type="button" className="bg-[#1DB954] font-semibold text-black hover:bg-[#1ed760]" onClick={createManualOwnerReport} disabled={generateManualReport.isPending}>
            <FilePlus2 className="mr-2 h-4 w-4" />
            {generateManualReport.isPending ? "Generando reporte..." : "Generar reporte ahora"}
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Locales activos", value: activeVenues, icon: <Building2 size={20} />, color: "text-primary" },
            { label: "Total usuarios", value: totalUsers, icon: <Users size={20} />, color: "text-blue-400" },
            { label: "Managers", value: managers, icon: <TrendingUp size={20} />, color: "text-purple-400" },
            { label: "Staff", value: staff, icon: <Activity size={20} />, color: "text-yellow-400" },
          ].map((stat, i) => (
            <Card key={i} className="bg-card border-border">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">{stat.label}</p>
                    <p className="text-3xl font-bold text-foreground mt-1">{stat.value}</p>
                  </div>
                  <div className={`${stat.color} opacity-80`}>{stat.icon}</div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <section aria-labelledby="onboarding-analytics-title" className="rounded-xl border border-primary/25 bg-primary/5 p-4 sm:p-5">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div><h3 id="onboarding-analytics-title" className="flex items-center gap-2 text-lg font-bold"><BookOpenCheck className="h-5 w-5 text-primary" />Adopción del onboarding</h3><p className="mt-1 text-sm text-muted-foreground">Seguimiento básico de la guía por rol. Omitido representa cuentas que desactivaron su apertura automática sin completarla.</p></div>
            <Badge variant="outline" className="w-fit border-primary/40 text-primary">Solo Owner</Badge>
          </div>
          {isLoadingOnboardingAnalytics ? <div className="py-6 text-sm text-muted-foreground">Cargando métricas de onboarding…</div> : <><div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{[
            { label: "Completaron", value: onboardingAnalytics?.overall.completed ?? 0, color: "text-primary" },
            { label: "Omitieron", value: onboardingAnalytics?.overall.skipped ?? 0, color: "text-amber-300" },
            { label: "Pendientes", value: onboardingAnalytics?.overall.pending ?? 0, color: "text-muted-foreground" },
            { label: "Finalización", value: `${onboardingAnalytics?.overall.completionRate ?? 0}%`, color: "text-foreground" },
          ].map(metric => <div key={metric.label} className="rounded-lg border border-border bg-card p-3"><p className="text-xs uppercase tracking-wide text-muted-foreground">{metric.label}</p><p className={`mt-1 text-2xl font-bold ${metric.color}`}>{metric.value}</p></div>)}</div>
          <div className="mt-4 grid gap-3 md:grid-cols-3">{(["owner", "manager", "staff"] as const).map(role => { const metric = onboardingAnalytics?.byRole[role] ?? { total: 0, completed: 0, skipped: 0, completionRate: 0 }; const label = role === "owner" ? "Owner" : role === "manager" ? "Managers" : "Staff"; return <div key={role} className="rounded-lg border border-border bg-background p-3"><div className="flex items-center justify-between gap-2"><span className="font-medium text-foreground">{label}</span><span className="text-xs text-muted-foreground">{metric.completed}/{metric.total} completaron</span></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-secondary"><div className="h-full rounded-full bg-primary" style={{ width: `${metric.completionRate}%` }} /></div><p className="mt-2 text-xs text-muted-foreground">{metric.completionRate}% finalización · {metric.skipped} omitieron</p></div> })}</div></>}
        </section>

        <section aria-labelledby="karaoke-metrics-title" className="rounded-xl border border-emerald-400/25 bg-emerald-400/5 p-4 sm:p-5">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div><h3 id="karaoke-metrics-title" className="flex items-center gap-2 text-lg font-bold"><Music2 className="h-5 w-5 text-emerald-300" />Salud de enlaces de karaoke</h3><p className="mt-1 text-sm text-muted-foreground">Proporción de enlaces que el Staff confirmó como funcionales en cada local activo.</p></div>
            <div className="flex flex-wrap items-center gap-2"><Button type="button" variant="outline" size="sm" onClick={downloadKaraokeMetricsCsv} disabled={!karaokeMetrics?.venues.length} aria-label="Descargar métricas de salud de karaoke en CSV"><Download size={14} className="mr-2" />CSV</Button><Badge variant="outline" className="w-fit border-emerald-400/40 text-emerald-300">Solo Owner</Badge></div>
          </div>
          {isLoadingKaraokeMetrics ? <div className="py-6 text-sm text-muted-foreground">Cargando métricas de karaoke…</div> : <>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{[
              { label: "Enlaces guardados", value: karaokeMetrics?.totals.totalLinks ?? 0, color: "text-foreground" },
              { label: "Funcionan", value: karaokeMetrics?.totals.workingLinks ?? 0, color: "text-emerald-300" },
              { label: "Requieren revisión", value: karaokeMetrics?.totals.needsReviewLinks ?? 0, color: "text-amber-200" },
              { label: "Proporción funcional", value: `${karaokeMetrics?.totals.workingRate ?? 0}%`, color: "text-emerald-300" },
            ].map((metric) => <div key={metric.label} className="rounded-lg border border-border bg-card p-3"><p className="text-xs uppercase tracking-wide text-muted-foreground">{metric.label}</p><p className={`mt-1 text-2xl font-bold ${metric.color}`}>{metric.value}</p></div>)}</div>
            {!karaokeMetrics?.venues.length ? <p className="py-6 text-center text-sm text-muted-foreground">No hay locales activos para medir.</p> : <div className="mt-4 space-y-3">{karaokeMetrics.venues.map((venue) => <div key={venue.venueId} className="rounded-lg border border-border bg-background p-3"><div className="flex flex-wrap items-center justify-between gap-2"><div><p className="font-semibold text-foreground">{venue.venueName}</p><p className="text-xs text-muted-foreground">{venue.workingLinks}/{venue.totalLinks} enlaces funcionales · {venue.unverifiedLinks} sin verificar · {venue.needsReviewLinks} en revisión</p></div><span className="text-lg font-bold text-emerald-300">{venue.workingRate}%</span></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-secondary" role="progressbar" aria-label={`Enlaces funcionales de ${venue.venueName}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={venue.workingRate}><div className="h-full rounded-full bg-emerald-400" style={{ width: `${venue.workingRate}%` }} /></div></div>)}</div>}
          </>}
        </section>

        <section className="space-y-4" aria-labelledby="owner-analytics-title">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h3 id="owner-analytics-title" className="text-lg font-bold text-foreground flex items-center gap-2"><TrendingUp className="text-primary" size={20} /> Analítica interlocal</h3>
              <p className="mt-1 text-sm text-muted-foreground">Compara los ingresos entregados entre los locales activos.</p>
            </div>
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <CalendarDays size={16} className="text-primary" /> Periodo
              <select aria-label="Periodo de analítica interlocal" className="h-9 rounded-md border border-border bg-input px-3 text-sm text-foreground" value={periodDays} onChange={(event) => setPeriodDays(Number(event.target.value) as 7 | 30)}>
                <option value={7}>Últimos 7 días</option>
                <option value={30}>Últimos 30 días</option>
              </select>
            </label>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            {[
              { label: "Ingresos del periodo", value: `$${(analytics?.totals.revenue ?? 0).toLocaleString()}`, icon: <DollarSign size={18} />, color: "text-primary" },
              { label: "Pedidos entregados", value: (analytics?.totals.orderCount ?? 0).toLocaleString(), icon: <ReceiptText size={18} />, color: "text-blue-400" },
              { label: "Ticket promedio", value: `$${Math.round(analytics?.totals.averageTicket ?? 0).toLocaleString()}`, icon: <Trophy size={18} />, color: "text-yellow-300" },
            ].map((metric) => (
              <Card key={metric.label} className="border-border bg-card"><CardContent className="flex items-center justify-between p-4"><div><p className="text-xs uppercase tracking-wide text-muted-foreground">{metric.label}</p><p className="mt-1 text-xl font-bold text-foreground">{metric.value}</p></div><span className={metric.color}>{metric.icon}</span></CardContent></Card>
            ))}
          </div>

          <div className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
            <Card className="border-border bg-card">
              <CardHeader><CardTitle className="text-base text-foreground">Tendencia de ingresos</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="h-64" role="img" aria-label="Gráfico de barras de ingresos diarios interlocales" aria-describedby="owner-revenue-chart-description">
                  {isLoadingAnalytics ? <div className="flex h-full items-center justify-center text-sm text-muted-foreground">Cargando tendencia...</div> : !analytics?.dailyRevenue.length ? <div className="flex h-full items-center justify-center text-sm text-muted-foreground">No hay pedidos entregados en este periodo.</div> : (
                    <ResponsiveContainer width="100%" height="100%"><BarChart data={analytics.dailyRevenue} margin={{ top: 8, right: 8, left: -10, bottom: 0 }}><CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} /><XAxis dataKey="date" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} tickFormatter={(date) => new Date(`${date}T00:00:00`).toLocaleDateString("es-CO", { day: "2-digit", month: "short" })} /><YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} tickFormatter={(value) => `$${Number(value).toLocaleString()}`} /><Tooltip cursor={{ fill: "hsl(var(--secondary))" }} contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} formatter={(value) => [`$${Number(value).toLocaleString()}`, "Ingresos"]} labelFormatter={(label) => new Date(`${label}T00:00:00`).toLocaleDateString("es-CO", { dateStyle: "medium" })} /><Bar dataKey="revenue" name="Ingresos" fill="#1DB954" radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer>
                  )}
                </div>
                <p id="owner-revenue-chart-description" className="sr-only">La tabla desplegable siguiente presenta el mismo detalle diario de ingresos y pedidos para lectores de pantalla.</p>
                {!!analytics?.dailyRevenue.length && (
                  <details className="rounded-lg border border-border bg-secondary/20 px-3 py-2 text-sm">
                    <summary className="cursor-pointer font-medium text-foreground">Resumen diario en tabla</summary>
                    <div className="mt-3 overflow-x-auto"><table className="w-full text-left text-xs"><caption className="sr-only">Ingresos y pedidos entregados por día durante el periodo seleccionado.</caption><thead className="border-b border-border text-muted-foreground"><tr><th scope="col" className="pb-2 pr-3 font-medium">Fecha</th><th scope="col" className="pb-2 pr-3 text-right font-medium">Ingresos</th><th scope="col" className="pb-2 text-right font-medium">Pedidos</th></tr></thead><tbody>{analytics.dailyRevenue.map((day) => <tr key={day.date} className="border-b border-border/60 last:border-0"><th scope="row" className="py-2 pr-3 font-medium text-foreground">{new Date(`${day.date}T00:00:00`).toLocaleDateString("es-CO", { dateStyle: "medium" })}</th><td className="py-2 pr-3 text-right text-foreground">${day.revenue.toLocaleString()}</td><td className="py-2 text-right text-foreground">{day.orderCount}</td></tr>)}</tbody></table></div>
                  </details>
                )}
              </CardContent>
            </Card>

            <Card className="border-border bg-card">
              <CardHeader><CardTitle className="text-base text-foreground">Ranking de locales</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {isLoadingAnalytics ? <p className="py-8 text-center text-sm text-muted-foreground">Cargando ranking...</p> : !analytics?.venues.length ? <p className="py-8 text-center text-sm text-muted-foreground">No hay locales registrados.</p> : analytics.venues.slice(0, 5).map((venue, index) => (
                  <div key={venue.venueId} className="flex items-center gap-3 rounded-lg border border-border bg-secondary/30 p-3"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-primary">{index + 1}</span><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-foreground">{venue.venueName}</p><p className="text-xs text-muted-foreground">{venue.orderCount} pedidos · Ticket ${Math.round(venue.averageTicket).toLocaleString()}</p></div><p className="text-sm font-bold text-primary">${venue.revenue.toLocaleString()}</p></div>
                ))}
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="space-y-4" aria-labelledby="owner-pqrs-analytics-title">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h3 id="owner-pqrs-analytics-title" className="text-lg font-bold text-foreground flex items-center gap-2"><MessageSquareText className="text-primary" size={20} /> Desempeño PQRS por local</h3>
              <p className="mt-1 text-sm text-muted-foreground">Seguimiento de solicitudes creadas, atención en curso, resolución y tiempo de respuesta en el mismo periodo seleccionado.</p>
            </div>
            <div className="flex flex-wrap gap-2" role="group" aria-label="Exportar desempeño PQRS">
              <Button variant="outline" size="sm" onClick={downloadPqrsCsv} disabled={!canExportPqrs} aria-label="Descargar comparativo PQRS en CSV"><Download size={14} className="mr-2" /> CSV</Button>
              <Button variant="outline" size="sm" onClick={downloadPqrsExcel} disabled={!canExportPqrs} aria-label="Descargar comparativo PQRS en Excel"><FileSpreadsheet size={14} className="mr-2" /> Excel</Button>
            </div>
          </div>
          <fieldset className="rounded-lg border border-border bg-muted/20 p-3" aria-describedby="pqrs-venue-filter-description">
            <legend className="px-1 text-sm font-semibold text-foreground">Sucursales incluidas</legend>
            <p id="pqrs-venue-filter-description" className="mb-3 text-xs text-muted-foreground">La selección actual modifica las métricas, la tabla y los archivos CSV y Excel.</p>
            <div className="flex flex-wrap gap-x-5 gap-y-2">
              <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-foreground"><input type="checkbox" checked={selectedPqrsVenueIds === null} onChange={(event) => setSelectedPqrsVenueIds(event.target.checked ? null : [])} aria-label="Incluir todas las sucursales" className="size-4 accent-primary" /> Todas las sucursales</label>
              {allPqrsVenues.map((venue) => <label key={venue.venueId} className="flex cursor-pointer items-center gap-2 text-sm text-foreground"><input type="checkbox" checked={selectedPqrsVenueIds === null || selectedPqrsVenueIds.includes(venue.venueId)} onChange={() => togglePqrsVenue(venue.venueId)} aria-label={`Incluir sucursal ${venue.venueName}`} className="size-4 accent-primary" /> {venue.venueName}</label>)}
            </div>
          </fieldset>
          <div className="grid gap-3 sm:grid-cols-2" aria-label="Filtros de tipo y estado PQRS">
            <label className="grid gap-1 text-sm font-medium text-foreground">Tipo de PQRS
              <select aria-label="Filtrar PQRS por tipo" className="h-9 rounded-md border border-border bg-input px-3 text-sm text-foreground" value={pqrsType} onChange={(event) => setPqrsType(event.target.value as typeof pqrsType)}>
                <option value="all">Todos los tipos</option><option value="petition">Peticiones</option><option value="complaint">Quejas</option><option value="claim">Reclamos</option><option value="suggestion">Sugerencias</option><option value="congratulation">Felicitaciones</option>
              </select>
            </label>
            <label className="grid gap-1 text-sm font-medium text-foreground">Estado de PQRS
              <select aria-label="Filtrar PQRS por estado" className="h-9 rounded-md border border-border bg-input px-3 text-sm text-foreground" value={pqrsStatus} onChange={(event) => setPqrsStatus(event.target.value as typeof pqrsStatus)}>
                <option value="all">Todos los estados</option><option value="open">Abiertas</option><option value="in_review">En revisión</option><option value="resolved">Resueltas</option><option value="closed">Cerradas</option>
              </select>
            </label>
          </div>
          <fieldset className="rounded-lg border border-border bg-muted/20 p-3" aria-describedby="pqrs-custom-range-description">
            <legend className="px-1 text-sm font-semibold text-foreground">Rango de fechas PQRS</legend>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-foreground"><input type="checkbox" checked={useCustomPqrsRange} onChange={(event) => { setUseCustomPqrsRange(event.target.checked); if (event.target.checked) { setPqrsStartDate(toDateInputValue(dateFrom)); setPqrsEndDate(toDateInputValue(dateTo)); } }} aria-label="Usar rango de fechas personalizado para PQRS" className="size-4 accent-primary" /> Usar rango personalizado</label>
                <p id="pqrs-custom-range-description" className="mt-1 text-xs text-muted-foreground">Si está desactivado se usa el periodo general seleccionado arriba.</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <label className="grid gap-1 text-xs font-medium text-foreground">Desde<input aria-label="Fecha inicial personalizada de PQRS" type="date" value={pqrsStartDate} disabled={!useCustomPqrsRange} onChange={(event) => setPqrsStartDate(event.target.value)} className="h-9 rounded-md border border-border bg-input px-2 text-sm text-foreground disabled:cursor-not-allowed disabled:opacity-50" /></label>
                <label className="grid gap-1 text-xs font-medium text-foreground">Hasta<input aria-label="Fecha final personalizada de PQRS" type="date" value={pqrsEndDate} disabled={!useCustomPqrsRange} onChange={(event) => setPqrsEndDate(event.target.value)} className="h-9 rounded-md border border-border bg-input px-2 text-sm text-foreground disabled:cursor-not-allowed disabled:opacity-50" /></label>
              </div>
            </div>
            {useCustomPqrsRange && !pqrsDateRange.isValid && <p role="alert" className="mt-3 text-sm text-destructive">La fecha inicial debe ser anterior o igual a la fecha final.</p>}
          </fieldset>
          <fieldset className="rounded-lg border border-border bg-muted/20 p-3" aria-describedby="sla-comparison-range-description">
            <legend className="px-1 text-sm font-semibold text-foreground">Período de referencia SLA</legend>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-foreground"><input type="checkbox" checked={useManualSlaComparisonRange} onChange={(event) => { setUseManualSlaComparisonRange(event.target.checked); if (event.target.checked) { setSlaComparisonStartDate(toDateInputValue(automaticPreviousPqrsDateRange.dateFrom)); setSlaComparisonEndDate(toDateInputValue(automaticPreviousPqrsDateRange.dateTo)); } }} aria-label="Usar período de referencia manual para SLA" className="size-4 accent-primary" /> Usar período manual</label>
                <p id="sla-comparison-range-description" className="mt-1 text-xs text-muted-foreground">Al desactivarlo, SongTap compara automáticamente contra el período anterior equivalente.</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <label className="grid gap-1 text-xs font-medium text-foreground">Desde<input aria-label="Fecha inicial de referencia SLA" type="date" value={slaComparisonStartDate} disabled={!useManualSlaComparisonRange} onChange={(event) => setSlaComparisonStartDate(event.target.value)} className="h-9 rounded-md border border-border bg-input px-2 text-sm text-foreground disabled:cursor-not-allowed disabled:opacity-50" /></label>
                <label className="grid gap-1 text-xs font-medium text-foreground">Hasta<input aria-label="Fecha final de referencia SLA" type="date" value={slaComparisonEndDate} disabled={!useManualSlaComparisonRange} onChange={(event) => setSlaComparisonEndDate(event.target.value)} className="h-9 rounded-md border border-border bg-input px-2 text-sm text-foreground disabled:cursor-not-allowed disabled:opacity-50" /></label>
              </div>
            </div>
            {useManualSlaComparisonRange && <div className="mt-3 flex flex-wrap items-center justify-between gap-2"><p className="text-xs text-muted-foreground">Referencia automática disponible: {automaticPreviousPqrsDateRange.dateFrom.toLocaleDateString("es-CO")} – {automaticPreviousPqrsDateRange.dateTo.toLocaleDateString("es-CO")}</p><Button type="button" variant="outline" size="sm" onClick={() => setUseManualSlaComparisonRange(false)}>Restaurar período automático</Button></div>}
            {useManualSlaComparisonRange && !comparisonPqrsDateRange.isValid && <p role="alert" className="mt-3 text-sm text-destructive">La fecha inicial del período de referencia debe ser anterior o igual a la fecha final.</p>}
          </fieldset>
          <Card className="border-border bg-secondary/20">
            <CardContent className="p-4">
              <div className="mb-3 flex items-center gap-2"><ShieldCheck size={17} className="text-primary" /><h4 className="font-semibold text-foreground">Objetivo SLA de respuesta</h4></div>
              <p className="mb-3 text-xs text-muted-foreground">Configura el máximo de minutos para responder una PQRS por sucursal y tipo. Si no existe un objetivo guardado, se aplican 24 horas.</p>
              <div className="grid gap-3 sm:grid-cols-4">
                <label className="grid gap-1 text-xs font-medium text-foreground">Sucursal<select aria-label="Sucursal para objetivo SLA" value={slaVenueId ?? ""} onChange={(event) => { setSlaVenueId(Number(event.target.value)); setIsSlaTargetDirty(false); setAwaitingSlaTarget(null); }} className="h-9 rounded-md border border-border bg-input px-2 text-sm text-foreground">{venues?.map((venue) => <option key={venue.id} value={venue.id}>{venue.name}</option>)}</select></label>
                <label className="grid gap-1 text-xs font-medium text-foreground">Tipo<select aria-label="Tipo para objetivo SLA" value={slaType} onChange={(event) => { setSlaType(event.target.value as typeof slaType); setIsSlaTargetDirty(false); setAwaitingSlaTarget(null); }} className="h-9 rounded-md border border-border bg-input px-2 text-sm text-foreground"><option value="petition">Petición</option><option value="complaint">Queja</option><option value="claim">Reclamo</option><option value="suggestion">Sugerencia</option><option value="congratulation">Felicitación</option></select></label>
                <label className="grid gap-1 text-xs font-medium text-foreground">Minutos objetivo<input aria-label="Minutos objetivo SLA" type="number" min={15} max={10080} value={slaTargetMinutes} onChange={(event) => { setSlaTargetMinutes(Math.max(15, Math.min(10080, Number(event.target.value) || 15))); setIsSlaTargetDirty(true); }} className="h-9 rounded-md border border-border bg-input px-2 text-sm text-foreground" /></label>
                <Button type="button" className="self-end" onClick={saveSlaTarget} disabled={slaVenueId === null || upsertSlaTarget.isPending}>{upsertSlaTarget.isPending ? "Guardando..." : "Guardar SLA"}</Button>
              </div>
              {upsertSlaTarget.isSuccess && <p role="status" className="mt-3 text-sm text-primary">Objetivo SLA guardado para la sucursal seleccionada.</p>}
              {upsertSlaTarget.error && <p role="alert" className="mt-3 text-sm text-destructive">No fue posible guardar el objetivo SLA. Intenta nuevamente.</p>}
            </CardContent>
          </Card>
          <div className="grid gap-4 sm:grid-cols-5">
            {[
              { label: "PQRS recibidas", value: selectedPqrsTotals.total, color: "text-foreground" },
              { label: "Abiertas", value: selectedPqrsTotals.open, color: "text-yellow-300" },
              { label: "En revisión", value: selectedPqrsTotals.inReview, color: "text-blue-300" },
              { label: "Resolución", value: `${selectedPqrsTotals.resolutionRate}%`, color: "text-primary" },
              { label: "Cumplimiento SLA", value: `${selectedPqrsTotals.slaComplianceRate}%`, color: "text-emerald-300" },
            ].map((metric) => <Card key={metric.label} className="border-border bg-card"><CardContent className="p-4"><p className="text-xs uppercase tracking-wide text-muted-foreground">{metric.label}</p><p className={`mt-1 text-2xl font-bold ${metric.color}`}>{metric.value}</p></CardContent></Card>)}
          </div>
          <Card className="border-border bg-secondary/20" aria-live="polite">
            <CardContent className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div><p className="text-sm font-semibold text-foreground">Comparación SLA frente al periodo anterior</p><p className="text-xs text-muted-foreground">Actual: {pqrsDateRange.dateFrom.toLocaleDateString("es-CO")} – {pqrsDateRange.dateTo.toLocaleDateString("es-CO")} · {useManualSlaComparisonRange ? "Referencia manual" : "Anterior equivalente"}: {comparisonPqrsDateRange.dateFrom.toLocaleDateString("es-CO")} – {comparisonPqrsDateRange.dateTo.toLocaleDateString("es-CO")}</p></div>
              {isLoadingPreviousPqrsAnalytics ? <span className="text-sm text-muted-foreground">Calculando comparación…</span> : <div className="text-left sm:text-right"><p className="text-sm text-muted-foreground">Anterior: <span className="font-semibold text-foreground">{selectedPqrsTotals.previousSlaComplianceRate}%</span></p><p className={`text-lg font-bold ${selectedPqrsTotals.slaComplianceChange > 0 ? "text-primary" : selectedPqrsTotals.slaComplianceChange < 0 ? "text-destructive" : "text-muted-foreground"}`}>{selectedPqrsTotals.slaComplianceChange >= 0 ? "+" : ""}{selectedPqrsTotals.slaComplianceChange} pp</p></div>}
            </CardContent>
          </Card>
          {selectedSlaRisk === "significant_drop" && <div role="alert" className="flex items-start gap-3 rounded-lg border border-destructive/60 bg-destructive/10 p-4 text-destructive"><TriangleAlert size={20} className="mt-0.5 shrink-0" /><div><p className="font-semibold">Caída significativa de cumplimiento SLA</p><p className="mt-1 text-sm">El cumplimiento cayó {Math.abs(selectedPqrsTotals.slaComplianceChange)} puntos porcentuales frente al {useManualSlaComparisonRange ? "período de referencia manual" : "período anterior equivalente"}. Revisa las sucursales señaladas antes de que aumenten los vencimientos.</p></div></div>}
          {significantDropVenues.length > 0 && <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-3" aria-label="Sucursales con caída significativa de SLA"><p className="flex items-center gap-2 text-sm font-semibold text-destructive"><TriangleAlert size={16} /> Sucursales con caída SLA significativa</p><div className="mt-2 flex flex-wrap gap-2">{significantDropVenues.map((venue) => <span key={`risk-${venue.venueId}`} className="rounded-full border border-destructive/40 bg-destructive/10 px-2 py-1 text-xs font-medium text-destructive">{venue.venueName}: {venue.slaComplianceChange} pp</span>)}</div></div>}

          <Card className="border-border bg-card">
            <CardHeader><CardTitle className="text-base text-foreground flex items-center gap-2"><Timer size={17} className="text-primary" /> Comparativo de atención</CardTitle></CardHeader>
            <CardContent>
              {isLoadingPqrsAnalytics ? <p className="py-8 text-center text-sm text-muted-foreground">Cargando desempeño PQRS...</p> : !allPqrsVenues.length ? <p className="py-8 text-center text-sm text-muted-foreground">No hay locales disponibles para comparar.</p> : !selectedPqrsVenues.length ? <p className="py-8 text-center text-sm text-muted-foreground">Selecciona al menos una sucursal para visualizar y exportar el desempeño PQRS.</p> : (
                <div className="overflow-x-auto"><table className="w-full min-w-[720px] text-left text-sm"><caption className="sr-only">Indicadores de desempeño de PQRS por sucursal seleccionada para el periodo activo.</caption><thead className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground"><tr><th scope="col" className="pb-3 pr-4 font-medium">Local</th><th scope="col" className="pb-3 px-3 text-right font-medium">Total</th><th scope="col" className="pb-3 px-3 text-right font-medium">Abiertas</th><th scope="col" className="pb-3 px-3 text-right font-medium">En revisión</th><th scope="col" className="pb-3 px-3 text-right font-medium">Resueltas</th><th scope="col" className="pb-3 px-3 font-medium">Tasa de resolución</th><th scope="col" className="pb-3 pl-3 text-right font-medium">Respuesta media</th></tr></thead><tbody>{selectedPqrsVenues.map((venue) => { const response = venue.averageResponseMinutes >= 60 ? `${Math.floor(venue.averageResponseMinutes / 60)} h ${venue.averageResponseMinutes % 60} min` : `${venue.averageResponseMinutes} min`; return <tr key={venue.venueId} className="border-b border-border/60 last:border-0"><th scope="row" className="py-3 pr-4 font-semibold text-foreground">{venue.venueName}</th><td className="px-3 py-3 text-right text-foreground">{venue.total}</td><td className="px-3 py-3 text-right text-yellow-200">{venue.open}</td><td className="px-3 py-3 text-right text-blue-200">{venue.inReview}</td><td className="px-3 py-3 text-right text-primary">{venue.resolved}</td><td className="px-3 py-3"><div className="flex min-w-28 items-center gap-2"><progress className="h-2 flex-1 accent-primary" value={venue.resolutionRate} max={100} aria-label={`Tasa de resolución de ${venue.venueName}: ${venue.resolutionRate}%`} /><span className="w-9 text-right text-xs text-foreground">{venue.resolutionRate}%</span></div></td><td className="py-3 pl-3 text-right text-muted-foreground">{response}</td></tr>; })}</tbody></table></div>
              )}
              {!isLoadingPqrsAnalytics && selectedPqrsVenues.length > 0 && <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3" aria-label="Cumplimiento SLA por sucursal">{selectedPqrsVenues.map((venue) => <div key={`sla-${venue.venueId}`} className="rounded-lg border border-border bg-secondary/25 p-3"><div className="flex items-center justify-between gap-3"><p className="text-sm font-semibold text-foreground">{venue.venueName}</p><span className="text-xs font-medium text-amber-300">{venue.slaBreached} vencidas</span></div><div className="mt-2 flex items-center gap-2"><progress className="h-2 flex-1 accent-emerald-400" value={venue.slaComplianceRate} max={100} aria-label={`Cumplimiento SLA de ${venue.venueName}: ${venue.slaComplianceRate}%`} /><span className="w-9 text-right text-xs text-foreground">{venue.slaComplianceRate}%</span></div><p className="mt-2 text-xs text-muted-foreground">Anterior: {venue.previousSlaComplianceRate}% · <span className={venue.slaComplianceChange > 0 ? "text-primary" : venue.slaComplianceChange < 0 ? "text-destructive" : ""}>{venue.slaComplianceChange >= 0 ? "+" : ""}{venue.slaComplianceChange} pp</span></p><p className="mt-1 text-xs text-muted-foreground">{venue.slaMet} de {venue.slaEvaluated} PQRS evaluadas cumplen el objetivo.</p></div>)}</div>}
            </CardContent>
          </Card>
        </section>

        {/* Venues list */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-base font-semibold text-foreground">Locales registrados</CardTitle>
          </CardHeader>
          <CardContent>
            {!venues?.length ? (
              <p className="text-muted-foreground text-sm text-center py-8">No hay locales registrados aún.</p>
            ) : (
              <div className="space-y-3">
                {venues.map((venue) => (
                  <div key={venue.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/50 border border-border">
                    <div>
                      <p className="font-medium text-foreground text-sm">{venue.name}</p>
                      <p className="text-xs text-muted-foreground">{venue.address ?? "Sin dirección"}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${venue.isActive ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"}`}>
                        {venue.isActive ? "Activo" : "Inactivo"}
                      </span>
                      <span className="text-xs text-muted-foreground">Modo: {venue.musicMode}</span>
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
