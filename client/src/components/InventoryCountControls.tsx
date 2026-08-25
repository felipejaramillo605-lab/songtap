import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { BarChart3, ClipboardCheck, Plus, Settings2, ShieldCheck, Tags } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

export function InventoryCountControls({ venueId, families, onCountStarted }: { venueId: number; families: string[]; onCountStarted: () => void }) {
  const utils = trpc.useUtils();
  const metrics = trpc.inventory.countMetrics.useQuery({ venueId }, { enabled: venueId > 0 });
  const settings = trpc.inventory.controlSettings.useQuery({ venueId }, { enabled: venueId > 0 });
  const templates = trpc.inventory.countTemplates.useQuery({ venueId }, { enabled: venueId > 0 });
  const physicalCounts = trpc.inventory.physicalCounts.useQuery({ venueId }, { enabled: venueId > 0 });
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [templateOpen, setTemplateOpen] = useState(false);
  const [threshold, setThreshold] = useState("0");
  const [enabled, setEnabled] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [selectedFamilies, setSelectedFamilies] = useState<string[]>([]);
  const [editingTemplateId, setEditingTemplateId] = useState<number | null>(null);
  const [approvalNote, setApprovalNote] = useState("");
  const pendingApproval = useMemo(() => physicalCounts.data?.find((count) => count.status === "pending_approval") ?? null, [physicalCounts.data]);
  const hasOpenCount = useMemo(() => physicalCounts.data?.some((count) => ["draft", "in_progress", "pending_approval", "ready_to_reconcile"].includes(count.status)) ?? false, [physicalCounts.data]);
  const invalidate = () => {
    void utils.inventory.countMetrics.invalidate({ venueId });
    void utils.inventory.controlSettings.invalidate({ venueId });
    void utils.inventory.countTemplates.invalidate({ venueId });
    void utils.inventory.physicalCounts.invalidate({ venueId });
  };
  const saveSettings = trpc.inventory.saveControlSettings.useMutation({
    onSuccess: () => { toast.success("Regla de aprobación dual guardada."); setSettingsOpen(false); invalidate(); },
    onError: (error) => toast.error(error.message),
  });
  const saveTemplate = trpc.inventory.saveCountTemplate.useMutation({
    onSuccess: () => { toast.success("Plantilla guardada."); setTemplateName(""); setSelectedFamilies([]); setEditingTemplateId(null); setTemplateOpen(false); invalidate(); },
    onError: (error) => toast.error(error.message),
  });
  const startFromTemplate = trpc.inventory.startPhysicalCount.useMutation({
    onSuccess: () => { toast.success("Conteo iniciado con la plantilla seleccionada."); invalidate(); onCountStarted(); },
    onError: (error) => toast.error(error.message),
  });
  const decideApproval = trpc.inventory.decidePhysicalCountApproval.useMutation({
    onSuccess: (result) => { toast.success(result.status === "approved" ? "Conteo aprobado para conciliación." : "Conteo rechazado sin modificar stock."); setApprovalNote(""); invalidate(); onCountStarted(); },
    onError: (error) => toast.error(error.message),
  });
  const openSettings = () => {
    setEnabled(Boolean(settings.data?.dualApprovalEnabled));
    setThreshold(String(Number(settings.data?.dualApprovalThresholdCost ?? 0)));
    setSettingsOpen(true);
  };
  const openTemplateEditor = (template?: { id: number; name: string; families: string[] }) => {
    setEditingTemplateId(template?.id ?? null);
    setTemplateName(template?.name ?? "");
    setSelectedFamilies(template?.families ?? []);
    setTemplateOpen(true);
  };
  const toggleFamily = (family: string) => setSelectedFamilies((current) => current.includes(family) ? current.filter((value) => value !== family) : [...current, family]);
  const rate = metrics.data?.deviationRateLast30Days;

  return <section className="grid gap-4 xl:grid-cols-[1.35fr_1fr]">
    <Card className="border-primary/25 bg-primary/5"><CardHeader className="flex-row items-start justify-between gap-3 pb-3"><div><CardTitle className="flex items-center gap-2 text-base"><BarChart3 className="h-4 w-4 text-primary" /> Control de conteos</CardTitle><CardDescription>Frecuencia y desviación calculadas únicamente con conteos conciliados.</CardDescription></div><Button size="sm" variant="outline" onClick={openSettings}><Settings2 className="mr-2 h-4 w-4" /> Regla dual</Button></CardHeader><CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><Metric label="Conteos / 30 días" value={metrics.data?.reconciledLast30Days ?? 0} /><Metric label="Desde último conteo" value={metrics.data?.daysSinceLastCount === null || metrics.data?.daysSinceLastCount === undefined ? "Sin datos" : `${metrics.data.daysSinceLastCount} d`} /><Metric label="Frecuencia media" value={metrics.data?.averageDaysBetweenCounts === null || metrics.data?.averageDaysBetweenCounts === undefined ? "Sin datos" : `${metrics.data.averageDaysBetweenCounts} d`} /><Metric label="Desviación valorada" value={`$${Math.round(metrics.data?.totalVarianceCostLast30Days ?? 0).toLocaleString("es-CO")}`} detail={rate === null || rate === undefined ? "Sin base costeada" : `${rate}% del valor contado`} /></CardContent></Card>
    <Card><CardHeader className="flex-row items-start justify-between gap-3 pb-3"><div><CardTitle className="flex items-center gap-2 text-base"><Tags className="h-4 w-4 text-primary" /> Plantillas por familia</CardTitle><CardDescription>Inicia conteos parciales sin incluir insumos de otras familias.</CardDescription></div><Button size="sm" onClick={() => openTemplateEditor()} disabled={!families.length}><Plus className="mr-2 h-4 w-4" /> Plantilla</Button></CardHeader><CardContent className="space-y-2">{templates.data?.length ? templates.data.filter((template) => template.isActive).slice(0, 3).map((template) => <div key={template.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-2.5"><div><p className="text-sm font-semibold">{template.name}</p><p className="text-xs text-muted-foreground">{template.families.join(" · ")}</p></div><div className="flex gap-2"><Button size="sm" variant="ghost" onClick={() => openTemplateEditor(template)}>Editar</Button><Button size="sm" variant="outline" disabled={hasOpenCount || startFromTemplate.isPending} onClick={() => startFromTemplate.mutate({ venueId, templateId: template.id, notes: `Plantilla: ${template.name}` })}>Usar</Button></div></div>) : <p className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">{families.length ? "Crea una plantilla para agilizar conteos por familia." : "Clasifica al menos un insumo con una familia para crear plantillas."}</p>}</CardContent></Card>
    {pendingApproval && <Card className="xl:col-span-2 border-amber-500/40 bg-amber-500/5"><CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-base text-amber-700 dark:text-amber-300"><ShieldCheck className="h-5 w-5" /> Aprobación dual pendiente · Conteo #{pendingApproval.id}</CardTitle><CardDescription>La desviación valorada es ${Math.round(Number(pendingApproval.totalVarianceCost)).toLocaleString("es-CO")}; supera el umbral de ${Math.round(Number(pendingApproval.approvalThresholdCost ?? 0)).toLocaleString("es-CO")}. Debe decidir una persona distinta a quien inició o envió el conteo.</CardDescription></CardHeader><CardContent className="flex flex-col gap-2 sm:flex-row"><Input value={approvalNote} onChange={(event) => setApprovalNote(event.target.value)} placeholder="Observación de aprobación o rechazo (opcional)" maxLength={500} /><Button className="shrink-0" onClick={() => decideApproval.mutate({ venueId, physicalCountId: pendingApproval.id, approved: true, note: approvalNote.trim() || undefined })} disabled={decideApproval.isPending}>Aprobar</Button><Button className="shrink-0" variant="outline" onClick={() => decideApproval.mutate({ venueId, physicalCountId: pendingApproval.id, approved: false, note: approvalNote.trim() || undefined })} disabled={decideApproval.isPending}>Rechazar</Button></CardContent></Card>}

    <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}><DialogContent><DialogHeader><DialogTitle>Regla de aprobación dual</DialogTitle><DialogDescription>Esta regla aplica solo al local actual. Un conteo con diferencias valoradas por encima del umbral requerirá otra aprobación antes de conciliar.</DialogDescription></DialogHeader><div className="grid gap-4 py-2"><label className="flex items-start gap-3 rounded-lg border p-3"><input type="checkbox" checked={enabled} onChange={(event) => setEnabled(event.target.checked)} className="mt-1 h-4 w-4 accent-primary" /><span><span className="block text-sm font-medium">Exigir aprobación dual</span><span className="text-xs text-muted-foreground">La persona que inició o envió el conteo no podrá aprobarlo.</span></span></label><div><Label htmlFor="dual-approval-threshold">Umbral de desviación (COP)</Label><Input id="dual-approval-threshold" type="number" min="0" step="1" value={threshold} onChange={(event) => setThreshold(event.target.value)} disabled={!enabled} /></div><Button onClick={() => saveSettings.mutate({ venueId, dualApprovalEnabled: enabled, dualApprovalThresholdCost: Number(threshold) || 0 })} disabled={saveSettings.isPending}>{saveSettings.isPending ? "Guardando…" : "Guardar regla"}</Button></div></DialogContent></Dialog>
    <Dialog open={templateOpen} onOpenChange={(open) => { setTemplateOpen(open); if (!open) setEditingTemplateId(null); }}><DialogContent><DialogHeader><DialogTitle>{editingTemplateId ? "Editar plantilla de conteo" : "Nueva plantilla de conteo"}</DialogTitle><DialogDescription>Selecciona familias del local. Solo sus insumos activos aparecerán cuando uses la plantilla.</DialogDescription></DialogHeader><div className="grid gap-4 py-2"><div><Label htmlFor="count-template-name">Nombre</Label><Input id="count-template-name" value={templateName} onChange={(event) => setTemplateName(event.target.value)} placeholder="Ej. Cierre de bebidas" /></div><fieldset><legend className="text-sm font-medium">Familias incluidas</legend><div className="mt-2 grid gap-2 sm:grid-cols-2">{families.map((family) => <label key={family} className="flex items-center gap-2 rounded-lg border p-2 text-sm"><input type="checkbox" checked={selectedFamilies.includes(family)} onChange={() => toggleFamily(family)} className="h-4 w-4 accent-primary" />{family}</label>)}</div></fieldset><Button onClick={() => { if (!templateName.trim() || !selectedFamilies.length) return toast.error("Ingresa un nombre y selecciona al menos una familia."); saveTemplate.mutate({ venueId, templateId: editingTemplateId ?? undefined, name: templateName.trim(), families: selectedFamilies }); }} disabled={saveTemplate.isPending}>{saveTemplate.isPending ? "Guardando…" : editingTemplateId ? "Guardar cambios" : "Guardar plantilla"}</Button></div></DialogContent></Dialog>
  </section>;
}

function Metric({ label, value, detail }: { label: string; value: string | number; detail?: string }) {
  return <div className="rounded-lg border bg-background/40 p-3"><p className="text-xs font-medium text-muted-foreground">{label}</p><p className="mt-1 text-lg font-bold text-foreground">{value}</p>{detail && <p className="mt-1 text-xs text-muted-foreground">{detail}</p>}</div>;
}
