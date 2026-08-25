import SongTapLayout from "@/components/SongTapLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { AlertTriangle, ArrowDownToLine, Boxes, CalendarClock, FlaskConical, History, PackagePlus, Plus, RefreshCw, Scale, Truck, Warehouse } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

type Dimension = "count" | "volume" | "mass";
type Unit = "unit" | "box" | "ml" | "liter" | "fl_oz" | "g" | "kg" | "oz";

const dimensionLabels: Record<Dimension, string> = { count: "Conteo", volume: "Volumen", mass: "Peso" };
const unitLabels: Record<Unit, string> = { unit: "Unidades", box: "Cajas", ml: "Mililitros", liter: "Litros", fl_oz: "Onzas líquidas", g: "Gramos", kg: "Kilogramos", oz: "Onzas" };
const unitsByDimension: Record<Dimension, Unit[]> = {
  count: ["unit", "box"],
  volume: ["ml", "liter", "fl_oz", "box"],
  mass: ["g", "kg", "oz", "box"],
};

function unitForDimension(dimension: Dimension): Unit {
  return dimension === "count" ? "unit" : dimension === "volume" ? "ml" : "g";
}

function quantity(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export default function ManagerInventory() {
  const { user } = useAuth();
  const venueId = user?.venueId ?? 0;
  const utils = trpc.useUtils();
  const [itemDialogOpen, setItemDialogOpen] = useState(false);
  const [movementDialogOpen, setMovementDialogOpen] = useState(false);
  const [recipeDialogOpen, setRecipeDialogOpen] = useState(false);
  const [supplierDialogOpen, setSupplierDialogOpen] = useState(false);
  const [purchaseDialogOpen, setPurchaseDialogOpen] = useState(false);
  const [itemForm, setItemForm] = useState({ name: "", sku: "", dimension: "count" as Dimension, reorderPoint: "0", reorderUnit: "unit" as Unit, packContent: "", isPerishable: false, expiryAlertDays: "7" });
  const [movementForm, setMovementForm] = useState({ itemId: "", movementType: "restock" as "initial" | "restock" | "adjustment", quantity: "", unit: "unit" as Unit, packContent: "", note: "" });
  const [recipeForm, setRecipeForm] = useState({ menuItemId: "", lines: [{ inventoryItemId: "", quantity: "", unit: "unit" as Unit, packContent: "" }] });
  const [supplierForm, setSupplierForm] = useState({ name: "", contactName: "", email: "", phone: "" });
  const [purchaseForm, setPurchaseForm] = useState({ supplierId: "", reference: "", receivedAt: new Date().toISOString().slice(0, 10), notes: "", lines: [{ inventoryItemId: "", quantity: "", unit: "unit" as Unit, packContent: "", unitCost: "", lotCode: "", expiresAt: "" }] });

  const dashboard = trpc.inventory.dashboard.useQuery({ venueId }, { enabled: venueId > 0 });
  const movements = trpc.inventory.movements.useQuery({ venueId }, { enabled: venueId > 0 });
  const recipeSetup = trpc.inventory.recipeSetup.useQuery({ venueId }, { enabled: venueId > 0 });
  const suppliers = trpc.inventory.suppliers.useQuery({ venueId }, { enabled: venueId > 0 });
  const purchases = trpc.inventory.purchases.useQuery({ venueId }, { enabled: venueId > 0 });
  const expiryAlerts = trpc.inventory.expiryAlerts.useQuery({ venueId }, { enabled: venueId > 0, refetchInterval: 60_000 });
  const refresh = () => {
    void utils.inventory.dashboard.invalidate({ venueId });
    void utils.inventory.movements.invalidate({ venueId });
    void utils.inventory.recipeSetup.invalidate({ venueId });
    void utils.inventory.suppliers.invalidate({ venueId });
    void utils.inventory.purchases.invalidate({ venueId });
    void utils.inventory.expiryAlerts.invalidate({ venueId });
  };

  const createItem = trpc.inventory.createItem.useMutation({
    onSuccess: () => { toast.success("Insumo creado. Registra las existencias iniciales para activarlo."); setItemDialogOpen(false); setItemForm({ name: "", sku: "", dimension: "count", reorderPoint: "0", reorderUnit: "unit", packContent: "", isPerishable: false, expiryAlertDays: "7" }); refresh(); },
    onError: (error) => toast.error(error.message),
  });
  const registerMovement = trpc.inventory.registerMovement.useMutation({
    onSuccess: () => { toast.success("Movimiento registrado y saldo actualizado."); setMovementDialogOpen(false); setMovementForm({ itemId: "", movementType: "restock", quantity: "", unit: "unit", packContent: "", note: "" }); refresh(); },
    onError: (error) => toast.error(error.message),
  });
  const saveRecipe = trpc.inventory.saveRecipe.useMutation({
    onSuccess: () => { toast.success("Fórmula guardada. Se aplicará al entregar los pedidos."); setRecipeDialogOpen(false); setRecipeForm({ menuItemId: "", lines: [{ inventoryItemId: "", quantity: "", unit: "unit", packContent: "" }] }); refresh(); },
    onError: (error) => toast.error(error.message),
  });
  const createSupplier = trpc.inventory.createSupplier.useMutation({
    onSuccess: () => { toast.success("Proveedor registrado."); setSupplierDialogOpen(false); setSupplierForm({ name: "", contactName: "", email: "", phone: "" }); refresh(); },
    onError: (error) => toast.error(error.message),
  });
  const receivePurchase = trpc.inventory.receivePurchase.useMutation({
    onSuccess: (result) => {
      toast.success(`Compra #${result.purchaseId} registrada y stock actualizado.`);
      if (result.expiringLots.length) toast.warning(`Revisa la caducidad de: ${result.expiringLots.join(", ")}.`);
      setPurchaseDialogOpen(false);
      setPurchaseForm({ supplierId: "", reference: "", receivedAt: new Date().toISOString().slice(0, 10), notes: "", lines: [{ inventoryItemId: "", quantity: "", unit: "unit", packContent: "", unitCost: "", lotCode: "", expiresAt: "" }] });
      refresh();
    },
    onError: (error) => toast.error(error.message),
  });

  const itemById = useMemo(() => new Map((dashboard.data?.items ?? []).map((item) => [item.id, item])), [dashboard.data?.items]);
  const lowStockCount = dashboard.data?.alerts.length ?? 0;
  const expiryCount = expiryAlerts.data?.length ?? 0;

  const submitItem = () => {
    if (!itemForm.name.trim()) return toast.error("Define el nombre del insumo.");
    createItem.mutate({
      venueId,
      name: itemForm.name.trim(),
      sku: itemForm.sku.trim() || undefined,
      dimension: itemForm.dimension,
      reorderPointQuantity: quantity(itemForm.reorderPoint),
      reorderPointUnit: itemForm.reorderUnit,
      reorderPointPackBaseQuantity: itemForm.reorderUnit === "box" ? quantity(itemForm.packContent) : undefined,
      isPerishable: itemForm.isPerishable,
      expiryAlertDays: itemForm.isPerishable ? Math.max(1, Number(itemForm.expiryAlertDays) || 7) : 7,
    });
  };

  const selectedMovementItem = itemById.get(Number(movementForm.itemId));
  const submitMovement = () => {
    if (!movementForm.itemId || !movementForm.quantity) return toast.error("Selecciona un insumo e indica la cantidad.");
    registerMovement.mutate({
      venueId,
      inventoryItemId: Number(movementForm.itemId),
      movementType: movementForm.movementType,
      quantity: quantity(movementForm.quantity),
      unit: movementForm.unit,
      packBaseQuantity: movementForm.unit === "box" ? quantity(movementForm.packContent) : undefined,
      note: movementForm.note.trim() || undefined,
    });
  };

  const submitRecipe = () => {
    if (!recipeForm.menuItemId || recipeForm.lines.some((line) => !line.inventoryItemId || !line.quantity)) return toast.error("Selecciona el producto y completa todos los ingredientes.");
    saveRecipe.mutate({
      venueId,
      menuItemId: Number(recipeForm.menuItemId),
      lines: recipeForm.lines.map((line) => ({
        inventoryItemId: Number(line.inventoryItemId),
        quantity: quantity(line.quantity),
        unit: line.unit,
        packBaseQuantity: line.unit === "box" ? quantity(line.packContent) : undefined,
      })),
    });
  };

  const submitSupplier = () => {
    if (!supplierForm.name.trim()) return toast.error("Ingresa el nombre del proveedor.");
    createSupplier.mutate({ venueId, name: supplierForm.name.trim(), contactName: supplierForm.contactName.trim() || undefined, email: supplierForm.email.trim() || undefined, phone: supplierForm.phone.trim() || undefined });
  };

  const submitPurchase = () => {
    if (purchaseForm.lines.some((line) => !line.inventoryItemId || !line.quantity)) return toast.error("Completa el insumo y la cantidad de cada línea.");
    receivePurchase.mutate({
      venueId,
      supplierId: purchaseForm.supplierId ? Number(purchaseForm.supplierId) : undefined,
      reference: purchaseForm.reference.trim() || undefined,
      receivedAt: new Date(`${purchaseForm.receivedAt}T12:00:00`),
      notes: purchaseForm.notes.trim() || undefined,
      lines: purchaseForm.lines.map((line) => ({
        inventoryItemId: Number(line.inventoryItemId),
        quantity: quantity(line.quantity),
        unit: line.unit,
        packBaseQuantity: line.unit === "box" ? quantity(line.packContent) : undefined,
        unitCost: line.unitCost ? quantity(line.unitCost) : undefined,
        lotCode: line.lotCode.trim() || undefined,
        expiresAt: line.expiresAt ? new Date(`${line.expiresAt}T23:59:59`) : undefined,
      })),
    });
  };

  if (!venueId) {
    return <SongTapLayout role="manager" title="Inventario"><Card><CardContent className="p-8 text-center text-muted-foreground">Selecciona o asigna un local para administrar su inventario.</CardContent></Card></SongTapLayout>;
  }

  return (
    <SongTapLayout role="manager" title="Inventario">
      <div className="space-y-6 pb-10">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Operación del local</p>
            <h1 className="mt-1 flex items-center gap-2 text-2xl font-bold text-foreground"><Warehouse className="h-6 w-6 text-primary" /> Inventario y fórmulas</h1>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">Controla insumos, registra entradas y define la receta que se descontará cuando Staff entregue un pedido.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={refresh}><RefreshCw className="mr-2 h-4 w-4" /> Actualizar</Button>
            <Button variant="outline" onClick={() => setSupplierDialogOpen(true)}><Truck className="mr-2 h-4 w-4" /> Proveedor</Button>
            <Button onClick={() => setPurchaseDialogOpen(true)}><PackagePlus className="mr-2 h-4 w-4" /> Registrar compra</Button>
            <Button onClick={() => setItemDialogOpen(true)}><Plus className="mr-2 h-4 w-4" /> Nuevo insumo</Button>
          </div>
        </header>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Card><CardContent className="flex items-center gap-3 p-5"><Boxes className="h-8 w-8 text-primary" /><div><p className="text-2xl font-bold">{dashboard.data?.items.length ?? 0}</p><p className="text-sm text-muted-foreground">Insumos activos</p></div></CardContent></Card>
          <Card className={lowStockCount ? "border-amber-500/40 bg-amber-500/5" : ""}><CardContent className="flex items-center gap-3 p-5"><AlertTriangle className={`h-8 w-8 ${lowStockCount ? "text-amber-500" : "text-muted-foreground"}`} /><div><p className="text-2xl font-bold">{lowStockCount}</p><p className="text-sm text-muted-foreground">Alertas de mínimo</p></div></CardContent></Card>
          <Card><CardContent className="flex items-center gap-3 p-5"><FlaskConical className="h-8 w-8 text-emerald-500" /><div><p className="text-2xl font-bold">{recipeSetup.data?.recipes.length ?? 0}</p><p className="text-sm text-muted-foreground">Fórmulas activas</p></div></CardContent></Card>
          <Card className={expiryCount ? "border-rose-500/40 bg-rose-500/5" : ""}><CardContent className="flex items-center gap-3 p-5"><CalendarClock className={`h-8 w-8 ${expiryCount ? "text-rose-500" : "text-muted-foreground"}`} /><div><p className="text-2xl font-bold">{expiryCount}</p><p className="text-sm text-muted-foreground">Lotes por vencer</p></div></CardContent></Card>
        </section>

        {lowStockCount > 0 && <Card className="border-amber-500/40"><CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-base text-amber-600 dark:text-amber-400"><AlertTriangle className="h-4 w-4" /> Reposición requerida</CardTitle><CardDescription>Estos insumos alcanzaron o bajaron de su mínimo. Registra una entrada para resolver la alerta.</CardDescription></CardHeader><CardContent className="flex flex-wrap gap-2">{dashboard.data?.items.filter((item) => item.isLowStock).map((item) => <span key={item.id} className="rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-sm text-amber-700 dark:text-amber-300">{item.name}: {Number(item.currentStockBase)} {item.baseUnit}</span>)}</CardContent></Card>}
        {expiryCount > 0 && <Card className="border-rose-500/40"><CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-base text-rose-600 dark:text-rose-400"><CalendarClock className="h-4 w-4" /> Caducidad requiere atención</CardTitle><CardDescription>Los lotes vencidos no se consumirán automáticamente; registra un ajuste auditado cuando confirmes la merma física.</CardDescription></CardHeader><CardContent className="flex flex-wrap gap-2">{expiryAlerts.data?.map((lot) => <span key={lot.id} className={`rounded-full border px-3 py-1 text-sm ${lot.state === "expired" ? "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300" : "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300"}`}>{lot.item.name}: {lot.state === "expired" ? "Vencido" : "Vence"} {new Date(lot.expiresAt).toLocaleDateString("es-CO")}</span>)}</CardContent></Card>}

        <Tabs defaultValue="items" className="space-y-4">
          <TabsList className="grid w-full grid-cols-5"><TabsTrigger value="items">Insumos</TabsTrigger><TabsTrigger value="recipes">Fórmulas</TabsTrigger><TabsTrigger value="purchases">Compras</TabsTrigger><TabsTrigger value="expiry">Caducidad</TabsTrigger><TabsTrigger value="movements">Movimientos</TabsTrigger></TabsList>
          <TabsContent value="items"><Card><CardHeader className="flex-row items-center justify-between"><div><CardTitle>Existencias por insumo</CardTitle><CardDescription>Los saldos se expresan en unidad base y no se mezclan entre locales.</CardDescription></div><Button variant="outline" size="sm" onClick={() => setMovementDialogOpen(true)}><PackagePlus className="mr-2 h-4 w-4" /> Registrar entrada</Button></CardHeader><CardContent>{dashboard.isLoading ? <p className="text-sm text-muted-foreground">Cargando inventario…</p> : !dashboard.data?.items.length ? <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">Aún no hay insumos. Crea el primero y registra sus existencias iniciales.</div> : <div className="overflow-x-auto"><table className="w-full min-w-[720px] text-sm"><thead className="border-b text-left text-muted-foreground"><tr><th className="pb-3 font-medium">Insumo</th><th className="pb-3 font-medium">Dimensión</th><th className="pb-3 font-medium">Disponible</th><th className="pb-3 font-medium">Mínimo</th><th className="pb-3 font-medium">Estado</th></tr></thead><tbody>{dashboard.data.items.map((item) => <tr key={item.id} className="border-b last:border-0"><td className="py-3 font-medium">{item.name}<span className="ml-2 text-xs text-muted-foreground">{item.sku || "Sin SKU"}</span></td><td className="py-3">{dimensionLabels[item.dimension as Dimension]}</td><td className="py-3 font-semibold">{Number(item.currentStockBase)} {item.baseUnit}</td><td className="py-3">{Number(item.reorderPointBase)} {item.baseUnit}</td><td className="py-3">{item.isLowStock ? <span className="rounded-full bg-amber-500/10 px-2 py-1 text-xs font-medium text-amber-600 dark:text-amber-400">Reponer</span> : <span className="rounded-full bg-emerald-500/10 px-2 py-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">Disponible</span>}</td></tr>)}</tbody></table></div>}</CardContent></Card></TabsContent>
          <TabsContent value="recipes"><Card><CardHeader className="flex-row items-center justify-between"><div><CardTitle>Fórmulas de productos</CardTitle><CardDescription>Las cantidades se convierten a unidad base y se consumen al entregar el pedido.</CardDescription></div><Button size="sm" onClick={() => setRecipeDialogOpen(true)}><FlaskConical className="mr-2 h-4 w-4" /> Nueva fórmula</Button></CardHeader><CardContent>{!recipeSetup.data?.recipes.length ? <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">No hay fórmulas. Los productos sin fórmula no descuentan inventario.</div> : <div className="space-y-3">{recipeSetup.data.recipes.map((recipe) => { const product = recipeSetup.data.menuItems.find((item) => item.id === recipe.menuItemId); return <div key={recipe.id} className="rounded-lg border p-4"><p className="font-semibold">{product?.name ?? recipe.name ?? `Producto #${recipe.menuItemId}`}</p><div className="mt-2 flex flex-wrap gap-2">{recipe.lines.map((line) => { const item = itemById.get(line.inventoryItemId); return <span key={line.id} className="rounded-full bg-secondary px-2.5 py-1 text-xs">{Number(line.displayQuantity)} {unitLabels[line.displayUnit as Unit] ?? line.displayUnit} de {item?.name ?? "Insumo"}</span>; })}</div></div>; })}</div>}</CardContent></Card></TabsContent>
          <TabsContent value="purchases"><Card><CardHeader className="flex-row items-center justify-between"><div><CardTitle>Compras y proveedores</CardTitle><CardDescription>Una recepción confirmada actualiza el stock y conserva su factura, costo y lote.</CardDescription></div><Button size="sm" onClick={() => setPurchaseDialogOpen(true)}><PackagePlus className="mr-2 h-4 w-4" /> Registrar compra</Button></CardHeader><CardContent>{!purchases.data?.length ? <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">Aún no hay compras registradas. Crea un proveedor o registra una compra directa.</div> : <div className="space-y-3">{purchases.data.map((purchase) => <div key={purchase.id} className="rounded-lg border p-4"><div className="flex flex-wrap items-start justify-between gap-2"><div><p className="font-semibold">{purchase.supplier?.name ?? "Compra directa"}</p><p className="text-xs text-muted-foreground">{purchase.reference || "Sin referencia"} · {new Date(purchase.receivedAt).toLocaleDateString("es-CO")}</p></div><p className="font-semibold">${Number(purchase.totalCost).toLocaleString("es-CO")}</p></div><p className="mt-2 text-sm text-muted-foreground">{purchase.lines.length} línea{purchase.lines.length === 1 ? "" : "s"} recibida{purchase.lines.length === 1 ? "" : "s"}</p></div>)}</div>}<p className="mt-5 text-xs text-muted-foreground">Proveedores activos: {suppliers.data?.length ?? 0}. Puedes registrarlos desde el botón Proveedor.</p></CardContent></Card></TabsContent>
          <TabsContent value="expiry"><Card><CardHeader><CardTitle>Lotes y fechas de caducidad</CardTitle><CardDescription>La revisión automática se ejecuta cada día a las 8:00 a. m. de Colombia. Los lotes vigentes se consumen primero por fecha más próxima.</CardDescription></CardHeader><CardContent>{!expiryAlerts.data?.length ? <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">No hay lotes vencidos ni próximos a vencer dentro de la ventana configurada.</div> : <div className="space-y-3">{expiryAlerts.data.map((lot) => <div key={lot.id} className="flex items-start justify-between gap-4 rounded-lg border p-4"><div><p className="font-semibold">{lot.item.name}{lot.lotCode ? ` · ${lot.lotCode}` : ""}</p><p className="text-xs text-muted-foreground">Caduca: {new Date(lot.expiresAt).toLocaleDateString("es-CO")} · Saldo: {Number(lot.remainingQuantityBase)} {lot.item.baseUnit}</p></div><span className={`rounded-full px-2 py-1 text-xs font-semibold ${lot.state === "expired" ? "bg-rose-500/10 text-rose-600 dark:text-rose-400" : "bg-amber-500/10 text-amber-600 dark:text-amber-400"}`}>{lot.state === "expired" ? "Vencido" : "Próximo"}</span></div>)}</div>}</CardContent></Card></TabsContent>
          <TabsContent value="movements"><Card><CardHeader><CardTitle>Historial de movimientos</CardTitle><CardDescription>Incluye entradas, ajustes y consumos automáticos de pedidos entregados.</CardDescription></CardHeader><CardContent>{!movements.data?.length ? <p className="py-8 text-center text-sm text-muted-foreground">Aún no hay movimientos registrados.</p> : <div className="space-y-3">{movements.data.map((movement) => { const item = itemById.get(movement.inventoryItemId); const outgoing = Number(movement.quantityBase) < 0; return <div key={movement.id} className="flex items-start justify-between gap-4 rounded-lg border p-3"><div><p className="font-medium">{item?.name ?? "Insumo eliminado"}</p><p className="text-xs text-muted-foreground">{movement.movementType === "order_delivery" ? `Consumo automático · Pedido #${movement.orderId}` : movement.movementType} · {new Date(movement.createdAt).toLocaleString("es-CO")}</p>{movement.note && <p className="mt-1 text-xs text-muted-foreground">{movement.note}</p>}</div><div className={`text-right font-semibold ${outgoing ? "text-red-500" : "text-emerald-600 dark:text-emerald-400"}`}>{outgoing ? "−" : "+"}{Math.abs(Number(movement.quantityBase))} {item?.baseUnit}<p className="text-xs font-normal text-muted-foreground">Saldo: {Number(movement.stockAfterBase)}</p></div></div>; })}</div>}</CardContent></Card></TabsContent>
        </Tabs>
      </div>

      <Dialog open={itemDialogOpen} onOpenChange={setItemDialogOpen}><DialogContent><DialogHeader><DialogTitle>Crear insumo</DialogTitle><DialogDescription>Define la dimensión y el mínimo; el saldo se registra después como existencia inicial.</DialogDescription></DialogHeader><div className="grid gap-4 py-2"><div><Label>Nombre</Label><Input value={itemForm.name} onChange={(event) => setItemForm({ ...itemForm, name: event.target.value })} placeholder="Ej. Ron blanco" /></div><div><Label>SKU (opcional)</Label><Input value={itemForm.sku} onChange={(event) => setItemForm({ ...itemForm, sku: event.target.value })} placeholder="RON-750" /></div><div className="grid grid-cols-2 gap-3"><div><Label>Dimensión</Label><Select value={itemForm.dimension} onValueChange={(value) => { const dimension = value as Dimension; setItemForm({ ...itemForm, dimension, reorderUnit: unitForDimension(dimension), packContent: "" }); }}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{Object.entries(dimensionLabels).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select></div><div><Label>Mínimo</Label><Input type="number" min="0" step="0.0001" value={itemForm.reorderPoint} onChange={(event) => setItemForm({ ...itemForm, reorderPoint: event.target.value })} /></div></div><div><Label>Unidad del mínimo</Label><Select value={itemForm.reorderUnit} onValueChange={(value) => setItemForm({ ...itemForm, reorderUnit: value as Unit })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{unitsByDimension[itemForm.dimension].map((unit) => <SelectItem key={unit} value={unit}>{unitLabels[unit]}</SelectItem>)}</SelectContent></Select></div>{itemForm.reorderUnit === "box" && <div><Label>Contenido de cada caja en unidad base</Label><Input type="number" min="0.0001" step="0.0001" value={itemForm.packContent} onChange={(event) => setItemForm({ ...itemForm, packContent: event.target.value })} placeholder="Ej. 8520 ml por caja" /><p className="mt-1 text-xs text-muted-foreground">Define el total real por caja para convertir correctamente.</p></div>}<label className="flex cursor-pointer items-start gap-3 rounded-lg border p-3"><input type="checkbox" checked={itemForm.isPerishable} onChange={(event) => setItemForm({ ...itemForm, isPerishable: event.target.checked })} className="mt-1 h-4 w-4 accent-primary" /><span><span className="block text-sm font-medium">Insumo perecedero</span><span className="text-xs text-muted-foreground">Las compras exigirán fecha de caducidad y se consumirán por vencimiento más cercano.</span></span></label>{itemForm.isPerishable && <div><Label>Días de aviso antes de caducar</Label><Input type="number" min="1" max="90" value={itemForm.expiryAlertDays} onChange={(event) => setItemForm({ ...itemForm, expiryAlertDays: event.target.value })} /><p className="mt-1 text-xs text-muted-foreground">La revisión diaria notifica a los Managers cuando un lote entra en esta ventana.</p></div>}<Button onClick={submitItem} disabled={createItem.isPending}>{createItem.isPending ? "Guardando…" : "Crear insumo"}</Button></div></DialogContent></Dialog>

      <Dialog open={movementDialogOpen} onOpenChange={setMovementDialogOpen}><DialogContent><DialogHeader><DialogTitle>Registrar movimiento</DialogTitle><DialogDescription>Las entradas aumentan stock; el ajuste permite corregir diferencias con trazabilidad.</DialogDescription></DialogHeader><div className="grid gap-4 py-2"><div><Label>Insumo</Label><Select value={movementForm.itemId} onValueChange={(value) => { const item = itemById.get(Number(value)); setMovementForm({ ...movementForm, itemId: value, unit: item ? unitForDimension(item.dimension as Dimension) : "unit", packContent: "" }); }}><SelectTrigger><SelectValue placeholder="Selecciona un insumo" /></SelectTrigger><SelectContent>{dashboard.data?.items.map((item) => <SelectItem key={item.id} value={String(item.id)}>{item.name}</SelectItem>)}</SelectContent></Select></div><div className="grid grid-cols-2 gap-3"><div><Label>Tipo</Label><Select value={movementForm.movementType} onValueChange={(value) => setMovementForm({ ...movementForm, movementType: value as typeof movementForm.movementType })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="initial">Existencia inicial</SelectItem><SelectItem value="restock">Entrada / reposición</SelectItem><SelectItem value="adjustment">Ajuste (+ o −)</SelectItem></SelectContent></Select></div><div><Label>Cantidad</Label><Input type="number" step="0.0001" value={movementForm.quantity} onChange={(event) => setMovementForm({ ...movementForm, quantity: event.target.value })} placeholder={movementForm.movementType === "adjustment" ? "Ej. -2" : "Ej. 1"} /></div></div><div><Label>Unidad</Label><Select value={movementForm.unit} onValueChange={(value) => setMovementForm({ ...movementForm, unit: value as Unit })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{unitsByDimension[(selectedMovementItem?.dimension as Dimension) ?? "count"].map((unit) => <SelectItem key={unit} value={unit}>{unitLabels[unit]}</SelectItem>)}</SelectContent></Select></div>{movementForm.unit === "box" && <div><Label>Contenido por caja (unidad base)</Label><Input type="number" step="0.0001" value={movementForm.packContent} onChange={(event) => setMovementForm({ ...movementForm, packContent: event.target.value })} /></div>}<div><Label>Nota (opcional)</Label><Textarea value={movementForm.note} onChange={(event) => setMovementForm({ ...movementForm, note: event.target.value })} placeholder="Factura, conteo físico o motivo del ajuste" /></div><Button onClick={submitMovement} disabled={registerMovement.isPending}><ArrowDownToLine className="mr-2 h-4 w-4" />{registerMovement.isPending ? "Registrando…" : "Guardar movimiento"}</Button></div></DialogContent></Dialog>

      <Dialog open={recipeDialogOpen} onOpenChange={setRecipeDialogOpen}><DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl"><DialogHeader><DialogTitle>Crear fórmula</DialogTitle><DialogDescription>La fórmula define el consumo por una unidad vendida del producto de menú.</DialogDescription></DialogHeader><div className="grid gap-4 py-2"><div><Label>Producto de menú</Label><Select value={recipeForm.menuItemId} onValueChange={(value) => setRecipeForm({ ...recipeForm, menuItemId: value })}><SelectTrigger><SelectValue placeholder="Selecciona el producto" /></SelectTrigger><SelectContent>{recipeSetup.data?.menuItems.map((item) => <SelectItem key={item.id} value={String(item.id)}>{item.name}</SelectItem>)}</SelectContent></Select></div><div className="space-y-3">{recipeForm.lines.map((line, index) => { const ingredient = itemById.get(Number(line.inventoryItemId)); const dim = ingredient?.dimension as Dimension | undefined; return <div key={index} className="rounded-lg border p-3"><div className="grid gap-3 sm:grid-cols-[1.5fr_.7fr_1fr_auto]"><div><Label>Insumo</Label><Select value={line.inventoryItemId} onValueChange={(value) => { const item = itemById.get(Number(value)); const lines = [...recipeForm.lines]; lines[index] = { ...line, inventoryItemId: value, unit: item ? unitForDimension(item.dimension as Dimension) : "unit", packContent: "" }; setRecipeForm({ ...recipeForm, lines }); }}><SelectTrigger><SelectValue placeholder="Selecciona" /></SelectTrigger><SelectContent>{dashboard.data?.items.map((item) => <SelectItem key={item.id} value={String(item.id)}>{item.name}</SelectItem>)}</SelectContent></Select></div><div><Label>Cantidad</Label><Input type="number" min="0.0001" step="0.0001" value={line.quantity} onChange={(event) => { const lines = [...recipeForm.lines]; lines[index] = { ...line, quantity: event.target.value }; setRecipeForm({ ...recipeForm, lines }); }} /></div><div><Label>Unidad</Label><Select value={line.unit} onValueChange={(value) => { const lines = [...recipeForm.lines]; lines[index] = { ...line, unit: value as Unit }; setRecipeForm({ ...recipeForm, lines }); }}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{unitsByDimension[dim ?? "count"].map((unit) => <SelectItem key={unit} value={unit}>{unitLabels[unit]}</SelectItem>)}</SelectContent></Select></div><Button type="button" variant="ghost" size="icon" className="self-end" disabled={recipeForm.lines.length === 1} onClick={() => setRecipeForm({ ...recipeForm, lines: recipeForm.lines.filter((_, lineIndex) => lineIndex !== index) })}>×</Button></div>{line.unit === "box" && <div className="mt-3"><Label>Contenido por caja (unidad base)</Label><Input type="number" step="0.0001" value={line.packContent} onChange={(event) => { const lines = [...recipeForm.lines]; lines[index] = { ...line, packContent: event.target.value }; setRecipeForm({ ...recipeForm, lines }); }} /></div>}</div>; })}</div><Button type="button" variant="outline" onClick={() => setRecipeForm({ ...recipeForm, lines: [...recipeForm.lines, { inventoryItemId: "", quantity: "", unit: "unit", packContent: "" }] })}><Plus className="mr-2 h-4 w-4" /> Agregar insumo</Button><Button onClick={submitRecipe} disabled={saveRecipe.isPending}><Scale className="mr-2 h-4 w-4" />{saveRecipe.isPending ? "Guardando…" : "Guardar fórmula"}</Button></div></DialogContent></Dialog>
      <Dialog open={supplierDialogOpen} onOpenChange={setSupplierDialogOpen}><DialogContent><DialogHeader><DialogTitle>Registrar proveedor</DialogTitle><DialogDescription>Guarda los datos de contacto para asociarlos a compras futuras del local.</DialogDescription></DialogHeader><div className="grid gap-4 py-2"><div><Label>Nombre del proveedor</Label><Input value={supplierForm.name} onChange={(event) => setSupplierForm({ ...supplierForm, name: event.target.value })} placeholder="Ej. Distribuidora del Norte" /></div><div><Label>Contacto (opcional)</Label><Input value={supplierForm.contactName} onChange={(event) => setSupplierForm({ ...supplierForm, contactName: event.target.value })} /></div><div className="grid gap-3 sm:grid-cols-2"><div><Label>Correo (opcional)</Label><Input type="email" value={supplierForm.email} onChange={(event) => setSupplierForm({ ...supplierForm, email: event.target.value })} /></div><div><Label>Teléfono (opcional)</Label><Input value={supplierForm.phone} onChange={(event) => setSupplierForm({ ...supplierForm, phone: event.target.value })} /></div></div><Button onClick={submitSupplier} disabled={createSupplier.isPending}>{createSupplier.isPending ? "Guardando…" : "Guardar proveedor"}</Button></div></DialogContent></Dialog>

      <Dialog open={purchaseDialogOpen} onOpenChange={setPurchaseDialogOpen}><DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl"><DialogHeader><DialogTitle>Registrar compra recibida</DialogTitle><DialogDescription>La recepción actualiza el stock en una sola operación. Agrega la caducidad de cada lote perecedero.</DialogDescription></DialogHeader><div className="grid gap-4 py-2"><div className="grid gap-3 sm:grid-cols-2"><div><Label>Proveedor</Label><Select value={purchaseForm.supplierId || "direct"} onValueChange={(value) => setPurchaseForm({ ...purchaseForm, supplierId: value === "direct" ? "" : value })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="direct">Compra directa / sin proveedor</SelectItem>{suppliers.data?.map((supplier) => <SelectItem key={supplier.id} value={String(supplier.id)}>{supplier.name}</SelectItem>)}</SelectContent></Select></div><div><Label>Fecha de recepción</Label><Input type="date" value={purchaseForm.receivedAt} onChange={(event) => setPurchaseForm({ ...purchaseForm, receivedAt: event.target.value })} /></div></div><div><Label>Factura o referencia (opcional)</Label><Input value={purchaseForm.reference} onChange={(event) => setPurchaseForm({ ...purchaseForm, reference: event.target.value })} placeholder="Ej. FAC-1024" /></div><div className="space-y-3">{purchaseForm.lines.map((line, index) => { const item = itemById.get(Number(line.inventoryItemId)); const dimension = item?.dimension as Dimension | undefined; return <div key={index} className="rounded-lg border p-3"><div className="grid gap-3 sm:grid-cols-2"><div><Label>Insumo</Label><Select value={line.inventoryItemId} onValueChange={(value) => { const selected = itemById.get(Number(value)); const lines = [...purchaseForm.lines]; lines[index] = { ...line, inventoryItemId: value, unit: selected ? unitForDimension(selected.dimension as Dimension) : "unit", packContent: "", expiresAt: "" }; setPurchaseForm({ ...purchaseForm, lines }); }}><SelectTrigger><SelectValue placeholder="Selecciona" /></SelectTrigger><SelectContent>{dashboard.data?.items.map((inventoryItem) => <SelectItem key={inventoryItem.id} value={String(inventoryItem.id)}>{inventoryItem.name}</SelectItem>)}</SelectContent></Select></div><div><Label>Cantidad</Label><Input type="number" min="0.0001" step="0.0001" value={line.quantity} onChange={(event) => { const lines = [...purchaseForm.lines]; lines[index] = { ...line, quantity: event.target.value }; setPurchaseForm({ ...purchaseForm, lines }); }} /></div><div><Label>Unidad</Label><Select value={line.unit} onValueChange={(value) => { const lines = [...purchaseForm.lines]; lines[index] = { ...line, unit: value as Unit }; setPurchaseForm({ ...purchaseForm, lines }); }}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{unitsByDimension[dimension ?? "count"].map((unit) => <SelectItem key={unit} value={unit}>{unitLabels[unit]}</SelectItem>)}</SelectContent></Select></div><div><Label>Costo por unidad (opcional)</Label><Input type="number" min="0" step="0.01" value={line.unitCost} onChange={(event) => { const lines = [...purchaseForm.lines]; lines[index] = { ...line, unitCost: event.target.value }; setPurchaseForm({ ...purchaseForm, lines }); }} /></div></div>{line.unit === "box" && <div className="mt-3"><Label>Contenido por caja (unidad base)</Label><Input type="number" min="0.0001" step="0.0001" value={line.packContent} onChange={(event) => { const lines = [...purchaseForm.lines]; lines[index] = { ...line, packContent: event.target.value }; setPurchaseForm({ ...purchaseForm, lines }); }} /></div>}<div className="mt-3 grid gap-3 sm:grid-cols-[1fr_1fr_auto]"><div><Label>Lote (opcional)</Label><Input value={line.lotCode} onChange={(event) => { const lines = [...purchaseForm.lines]; lines[index] = { ...line, lotCode: event.target.value }; setPurchaseForm({ ...purchaseForm, lines }); }} placeholder="Ej. LT-0825" /></div><div><Label>{item?.isPerishable ? "Caducidad requerida" : "Caducidad (opcional)"}</Label><Input type="date" value={line.expiresAt} onChange={(event) => { const lines = [...purchaseForm.lines]; lines[index] = { ...line, expiresAt: event.target.value }; setPurchaseForm({ ...purchaseForm, lines }); }} /></div><Button type="button" variant="ghost" className="self-end" disabled={purchaseForm.lines.length === 1} onClick={() => setPurchaseForm({ ...purchaseForm, lines: purchaseForm.lines.filter((_, lineIndex) => lineIndex !== index) })}>Quitar</Button></div></div>; })}</div><Button type="button" variant="outline" onClick={() => setPurchaseForm({ ...purchaseForm, lines: [...purchaseForm.lines, { inventoryItemId: "", quantity: "", unit: "unit", packContent: "", unitCost: "", lotCode: "", expiresAt: "" }] })}><Plus className="mr-2 h-4 w-4" /> Agregar línea</Button><div><Label>Notas (opcional)</Label><Textarea value={purchaseForm.notes} onChange={(event) => setPurchaseForm({ ...purchaseForm, notes: event.target.value })} placeholder="Observaciones de recepción" /></div><Button onClick={submitPurchase} disabled={receivePurchase.isPending}>{receivePurchase.isPending ? "Registrando…" : "Confirmar compra y actualizar stock"}</Button></div></DialogContent></Dialog>
    </SongTapLayout>
  );
}
